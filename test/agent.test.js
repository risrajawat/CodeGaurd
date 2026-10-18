// Offline test of the agent loop: a fake OpenAI-compatible server plays the model,
// so no API key or network is needed.  Run with: npm test
const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { runReviewAgent } = require("../src/agents/reviewAgent");

const FIXED_CART = `function totalPrice(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].qty;
  }
  return total;
}

function applyDiscount(total, percent) {
  return total - (total * percent) / 100;
}

function average(numbers) {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

function formatName(user) {
  if (!user || !user.name) return "GUEST";
  return user.name.trim().toUpperCase();
}

module.exports = { totalPrice, applyDiscount, average, formatName };
`;

function toolCall(id, name, args) {
  return {
    role: "assistant",
    content: "",
    tool_calls: [{ id, type: "function", function: { name, arguments: JSON.stringify(args) } }],
  };
}

function startFakeModel(script) {
  const requests = [];
  let step = 0;
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      requests.push(JSON.parse(body));
      const message = script[Math.min(step++, script.length - 1)];
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          id: "fake",
          object: "chat.completion",
          model: "fake",
          choices: [{ index: 0, message, finish_reason: "stop" }],
          usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
        })
      );
    });
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve({ server, requests, url: `http://127.0.0.1:${server.address().port}/v1` }))
  );
}

function copyDemo() {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "cg-demo-"));
  fs.cpSync(path.join(__dirname, "..", "demo", "buggy-app"), dest, { recursive: true });
  return dest;
}

test("agent fixes the demo project, verifies with tests, backs up originals, protects tests", async () => {
  const project = copyDemo();

  const { server, requests, url } = await startFakeModel([
    toolCall("c1", "list_files", { directory: "." }),
    toolCall("c2", "read_file", { filePath: "src/cart.js" }),
    // try to cheat by editing a test -> must be blocked
    toolCall("c3", "write_file", { filePath: "test/cart.test.js", content: "// nothing" }),
    // try to escape the project -> must be blocked
    toolCall("c4", "read_file", { filePath: "../../etc/passwd" }),
    toolCall("c5", "write_file", { filePath: "src/cart.js", content: FIXED_CART }),
    toolCall("c6", "run_tests", {}),
    { role: "assistant", content: "<think>done</think>CODE REVIEW COMPLETE\nFixed cart.js" },
  ]);

  const events = [];
  try {
    const stats = await runReviewAgent(
      project,
      {
        onFileStart: (f) => events.push(`start:${f}`),
        onFileFixed: (f) => events.push(`fixed:${f}`),
        onTestRun: (label, r) => events.push(`test:${label}:${r.ok}`),
      },
      { apiKey: "test", baseUrl: url, model: "fake-model", requireApproval: false }
    );

    assert.strictEqual(stats.testsBefore.ok, false, "baseline tests should fail");
    assert.strictEqual(stats.testsAfter.ok, true, "tests should pass after the fix");
    assert.deepStrictEqual(stats.modifiedFiles, ["src/cart.js"]);
    assert.deepStrictEqual(stats.rejectedTestEdits, ["test/cart.test.js"]);
    assert.ok(stats.filesScanned >= 4);
    assert.ok(stats.summaryText.startsWith("CODE REVIEW COMPLETE"), "think block is stripped");
    assert.ok(stats.tokens.prompt > 0);

    // backup of the original exists and still contains the bug
    const backup = fs.readFileSync(path.join(stats.backupDir, "src", "cart.js"), "utf8");
    assert.ok(backup.includes("numbers.lenght"));
    assert.ok(fs.readFileSync(path.join(project, "src", "cart.js"), "utf8").includes("numbers.length"));

    // test file untouched
    assert.ok(fs.readFileSync(path.join(project, "test", "cart.test.js"), "utf8").includes("formatName"));

    // the first request carried tools in OpenAI format incl. run_tests, and the baseline result
    assert.ok(requests[0].tools.some((t) => t.function.name === "run_tests"));
    assert.ok(requests[0].messages[1].content.includes("FAILING"));
    assert.strictEqual(requests[0].chat_template_kwargs.enable_thinking, false);
    assert.ok(events.includes("fixed:src/cart.js"));
  } finally {
    server.close();
  }
});

test("when tests still fail after the model finishes, the failure is fed back and the agent retries", async () => {
  const project = copyDemo();
  const HALF_FIXED = FIXED_CART.replace("/ 100;", ";"); // discount bug remains

  const { server, requests, url } = await startFakeModel([
    toolCall("a1", "write_file", { filePath: "src/cart.js", content: HALF_FIXED }),
    { role: "assistant", content: "All done." }, // extension runs tests -> still failing -> retry message
    toolCall("a2", "write_file", { filePath: "src/cart.js", content: FIXED_CART }),
    { role: "assistant", content: "Fixed for real." },
  ]);

  try {
    const stats = await runReviewAgent(project, {}, {
      apiKey: "test",
      baseUrl: url,
      model: "fake-model",
      requireApproval: false,
    });

    assert.strictEqual(stats.verifyRetries, 1);
    assert.strictEqual(stats.testsAfter.ok, true);
    assert.strictEqual(stats.summaryText, "Fixed for real.");
    const retryMsg = requests[2].messages.at(-1).content;
    assert.ok(retryMsg.includes("still failing"));
  } finally {
    server.close();
  }
});

test("user rejection is respected and reported", async () => {
  const project = copyDemo();
  const { server, url } = await startFakeModel([
    toolCall("r1", "write_file", { filePath: "src/cart.js", content: FIXED_CART }),
    { role: "assistant", content: "Okay, skipped." },
  ]);

  try {
    const stats = await runReviewAgent(project, {}, {
      apiKey: "test",
      baseUrl: url,
      model: "fake-model",
      requireApproval: true,
      approve: async () => "skip",
    });
    assert.deepStrictEqual(stats.skippedFiles, ["src/cart.js"]);
    assert.strictEqual(stats.filesModified, 0);
    assert.ok(fs.readFileSync(path.join(project, "src", "cart.js"), "utf8").includes("lenght"));
  } finally {
    server.close();
  }
});
