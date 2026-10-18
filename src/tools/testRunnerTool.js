const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const MAX_OUTPUT_CHARS = 6000;
const TIMEOUT_MS = 120000;

// Uses the configured command, or "npm test" when package.json defines a real test script.
function detectTestCommand(root, configured) {
  if (configured && configured.trim()) return configured.trim();
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    const script = pkg.scripts && pkg.scripts.test;
    if (script && !/no test specified/i.test(script)) return "npm test";
  } catch {
    // no package.json
  }
  return null;
}

const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g;

function executeTests(root, command) {
  return new Promise((resolve) => {
    const started = Date.now();
    // If CodeGuard itself is launched by a Node test runner, don't leak its context into the project's tests.
    const env = { ...process.env, CI: "true", FORCE_COLOR: "0" };
    delete env.NODE_TEST_CONTEXT;
    exec(
      command,
      {
        cwd: root,
        timeout: TIMEOUT_MS,
        maxBuffer: 5 * 1024 * 1024,
        env,
      },
      (error, stdout, stderr) => {
        let output = `${stdout}\n${stderr}`.replace(ANSI, "").trim();
        if (output.length > MAX_OUTPUT_CHARS) {
          output = "...(truncated)...\n" + output.slice(-MAX_OUTPUT_CHARS);
        }
        resolve({
          command,
          ok: !error,
          exitCode: error ? (typeof error.code === "number" ? error.code : 1) : 0,
          timedOut: Boolean(error && error.killed),
          durationMs: Date.now() - started,
          output,
        });
      }
    );
  });
}

const declaration = {
  name: "run_tests",
  description:
    "Runs the project's test suite and returns pass/fail plus the output. Call it after writing fixes to verify them.",
  parameters: { type: "object", properties: {} },
};

const isAvailable = (session) => Boolean(session.testCommand);

async function run(_args, session) {
  if (!session.testCommand) {
    return { ran: false, message: "No test command is configured or detected for this project." };
  }
  const result = await executeTests(session.root, session.testCommand);
  session.testRuns.push(result);
  if (!result.ok) session.failedTestRuns++;
  return {
    ran: true,
    passed: result.ok,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    output: result.output,
  };
}

module.exports = { declaration, isAvailable, run, detectTestCommand, executeTests };
