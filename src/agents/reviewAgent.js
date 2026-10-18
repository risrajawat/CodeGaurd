const OpenAI = require("openai");
const path = require("path");
const { getToolDeclarations } = require("../tools/toolRegistry");
const { executeFunctionCall } = require("./functionCallHandler");
const { buildSystemPrompt } = require("../prompts/systemPrompt");
const { detectTestCommand, executeTests } = require("../tools/testRunnerTool");

const DEFAULT_MAX_TURNS = 40;
const MAX_VERIFY_ROUNDS = 2; // extra "tests still fail, try again" rounds enforced by the extension
const ESCALATE_AFTER_FAILED_RUNS = 2;

// Reasoning models may emit <think>...</think>; keep only the final answer.
const stripThink = (s) => (s ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();

function createSession(root, options) {
  const id = new Date().toISOString().replace(/[:.]/g, "-");
  return {
    id,
    root,
    backupDir: path.join(root, ".codeguard", "backups", id),
    backedUp: new Set(),
    applied: [],
    skipped: [],
    rejectedTestEdits: [],
    testRuns: [],
    failedTestRuns: 0,
    requireApproval: options.requireApproval !== false,
    approve: options.approve || null,
    tavilyKey: options.tavilyKey || "",
    searches: 0,
    testCommand: detectTestCommand(root, options.testCommand),
  };
}

async function complete(client, params, state) {
  const body = state.disableThinking
    ? { ...params, chat_template_kwargs: { enable_thinking: false } }
    : params;
  try {
    return await client.chat.completions.create(body);
  } catch (error) {
    // Some providers reject the extra NVIDIA-specific field; retry once without it.
    if (error.status === 400 && state.disableThinking) {
      state.disableThinking = false;
      return await client.chat.completions.create(params);
    }
    throw error;
  }
}

async function runReviewAgent(projectPath, callbacks = {}, options = {}) {
  const started = Date.now();
  const root = path.resolve(projectPath);

  if (!options.apiKey) throw new Error("API key is missing.");
  if (!options.baseUrl) throw new Error("Base URL is missing.");
  if (!options.model) throw new Error("Model is missing.");

  const client = new OpenAI({
    baseURL: options.baseUrl,
    apiKey: options.apiKey,
    maxRetries: 3,
    timeout: 180000,
  });

  const maxTurns = options.maxTurns || DEFAULT_MAX_TURNS;
  const session = createSession(root, options);
  const state = { disableThinking: options.disableThinking !== false };

  const stats = {
    filesScanned: 0,
    filesModified: 0,
    modifiedFiles: [],
    skippedFiles: [],
    summaryText: "",
    testCommand: session.testCommand,
    testsBefore: null,
    testsAfter: null,
    turns: 0,
    verifyRetries: 0,
    searches: 0,
    modelsUsed: [],
    tokens: { prompt: 0, completion: 0 },
    backupDir: null,
    warning: "",
    durationMs: 0,
  };

  // 1) Baseline: run the tests BEFORE the agent changes anything.
  if (session.testCommand) {
    callbacks.onStatus?.(`Running baseline tests: ${session.testCommand}`);
    stats.testsBefore = await executeTests(root, session.testCommand);
    callbacks.onTestRun?.("before", stats.testsBefore);
  }

  let userMessage = `Review and fix all supported files in this project (root: ${root}). Use relative paths such as "src/app.js".`;
  if (stats.testsBefore) {
    const b = stats.testsBefore;
    userMessage +=
      `\n\nBaseline test run (${b.command}): ${b.ok ? "PASSING" : `FAILING (exit code ${b.exitCode})`}.` +
      (b.ok ? "" : `\nOutput (tail):\n${b.output.slice(-2500)}`);
  }

  const toolDeclarations = getToolDeclarations(session);
  const messages = [
    {
      role: "system",
      content: buildSystemPrompt({
        hasTests: Boolean(session.testCommand),
        hasSearch: Boolean(session.tavilyKey),
      }),
    },
    { role: "user", content: userMessage },
  ];

  let model = options.model;
  let verifyRounds = 0;
  let finished = false;
  let testsAfterAreFresh = false;

  for (let turn = 0; turn < maxTurns; turn++) {
    if (options.isCancelled?.()) {
      stats.warning = "Cancelled by the user.";
      break;
    }

    stats.turns = turn + 1;

    // Escalate to the stronger model once cheap attempts keep failing the tests.
    if (options.deepModel && model !== options.deepModel && session.failedTestRuns >= ESCALATE_AFTER_FAILED_RUNS) {
      model = options.deepModel;
      callbacks.onStatus?.(`Tests keep failing, escalating to ${model}`);
    }
    if (!stats.modelsUsed.includes(model)) stats.modelsUsed.push(model);

    const response = await complete(
      client,
      {
        model,
        messages,
        tools: toolDeclarations,
        tool_choice: "auto",
        temperature: 0.2,
        max_tokens: 8192,
      },
      state
    );

    stats.tokens.prompt += response.usage?.prompt_tokens ?? 0;
    stats.tokens.completion += response.usage?.completion_tokens ?? 0;

    const msg = response.choices?.[0]?.message;
    if (!msg) throw new Error("The model returned an empty response.");

    const toolCalls = msg.tool_calls ?? [];

    if (toolCalls.length === 0) {
      const text = stripThink(msg.content);

      // 2) Verify: after fixes, the extension itself runs the tests and sends failures back.
      if (session.applied.length > 0 && session.testCommand && verifyRounds < MAX_VERIFY_ROUNDS) {
        verifyRounds++;
        callbacks.onStatus?.("Verifying fixes by running the tests...");
        const check = await executeTests(root, session.testCommand);
        stats.testsAfter = check;
        callbacks.onTestRun?.("after", check);

        if (!check.ok && turn < maxTurns - 1) {
          stats.verifyRetries++;
          messages.push({ role: "assistant", content: text || "Done." });
          messages.push({
            role: "user",
            content:
              `I ran the tests after your changes and they are still failing (exit code ${check.exitCode}).\n\n` +
              `${check.output}\n\nFix the SOURCE code (not the tests) with write_file, then finish with your summary.`,
          });
          continue;
        }
        testsAfterAreFresh = true;
      }

      stats.summaryText = text;
      finished = true;
      break;
    }

    messages.push({ role: "assistant", content: msg.content ?? null, tool_calls: toolCalls });

    for (const tc of toolCalls) {
      let toolResponse;
      let args = {};

      try {
        args = JSON.parse(tc.function.arguments || "{}");
        if (!args || typeof args !== "object") args = {};
      } catch {
        toolResponse = { error: "Invalid JSON in tool arguments. Retry with valid JSON." };
      }

      if (!toolResponse) {
        const call = { id: tc.id, name: tc.function.name, args };
        if (call.name === "read_file" && args.filePath) callbacks.onFileStart?.(args.filePath);

        try {
          toolResponse = await executeFunctionCall(call, session);

          if (call.name === "list_files" && Array.isArray(toolResponse.files)) {
            stats.filesScanned = toolResponse.files.length;
          }
          if (call.name === "write_file") {
            if (toolResponse.applied) callbacks.onFileFixed?.(args.filePath);
            else if (toolResponse.message) callbacks.onFileSkipped?.(args.filePath);
          }
          if (call.name === "run_tests" && toolResponse.ran) {
            callbacks.onTestRun?.("agent", session.testRuns[session.testRuns.length - 1]);
          }
        } catch (error) {
          toolResponse = { error: error.message };
        }
      }

      messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(toolResponse) });
    }
  }

  if (!finished && !stats.warning) {
    stats.warning = `Stopped after ${maxTurns} turns without finishing. The project may be too large to review in one pass.`;
  }

  // 3) Final authoritative test run if the last result may be stale.
  if (session.testCommand && session.applied.length > 0 && !testsAfterAreFresh && !options.isCancelled?.()) {
    stats.testsAfter = await executeTests(root, session.testCommand);
    callbacks.onTestRun?.("after", stats.testsAfter);
  } else if (session.testCommand && session.applied.length === 0) {
    stats.testsAfter = stats.testsBefore;
  }

  stats.filesModified = session.applied.length;
  stats.modifiedFiles = [...session.applied];
  stats.skippedFiles = [...session.skipped];
  stats.searches = session.searches;
  stats.backupDir = session.applied.length > 0 ? session.backupDir : null;
  stats.rejectedTestEdits = [...session.rejectedTestEdits];
  stats.durationMs = Date.now() - started;

  return stats;
}

module.exports = { runReviewAgent, DEFAULT_MAX_TURNS };
