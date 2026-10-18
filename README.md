# 🛡️ CodeGuard AI

**An autonomous AI agent for VS Code that reviews your project, fixes bugs, runs your tests to _prove_ the fixes work, and tells you exactly what changed.**

Built for the **Nebius x NVIDIA Global AI Hackathon** (Coding & Agentic Engineering track) on **NVIDIA Nemotron** models served through **Nebius Token Factory** (any OpenAI-compatible endpoint works).

---

## ✨ What it does

1. **Scans** the project (HTML, CSS, JS, JSX, TS, TSX).
2. **Reads & analyses** every file for bugs, security issues and quality problems.
3. **Proposes fixes** as full-file edits. You see a **side-by-side diff** and choose *Apply / Apply all / Skip*.
4. **Verifies** by running your tests. If tests fail, the output is sent back to the model and it tries again (self-correcting loop).
5. **Reports** results in `.codeguard/report.md`: tests before → after, files changed, tokens used, AI summary.

Safety built in: originals are backed up to `.codeguard/backups/`, edits can't leave the project folder, and the agent is **not allowed to edit test files** (it must fix the source, not cheat).

## 🆕 What's new in this hackathon version

CodeGuard started as a single-pass Gemini reviewer. During the submission period it was significantly reworked:

| Before | Now |
|---|---|
| Google Gemini only | **NVIDIA Nemotron on Nebius Token Factory** (OpenAI-compatible, swap URL/model in settings) |
| Fixes written blindly to disk | **Diff review with approve / skip**, automatic backups |
| No verification | **`run_tests` tool + baseline & post-fix test runs + self-correction loop** |
| Single model | **Model escalation**: switches to a stronger model when tests keep failing |
| No external knowledge | Optional **Tavily web search** tool for unfamiliar errors |
| Text popup summary | **Markdown report** with before/after test results and token usage |
| API key in plain settings | Key stored in **VS Code SecretStorage** |
| Path bug (`uri.fspath`), unchecked paths | Fixed; path-traversal protection, truncated-write guard |
| No automated tests | Offline test-suite for the agent loop (`npm test`) |

## 🚀 Quick start

```bash
git clone <this repo> && cd CodeGaurd
npm install
```

1. Open the folder in VS Code and press **F5** (opens an *Extension Development Host* window).
2. In that window run **`CodeGuard: Set API Key`** (Command Palette) and paste your key.
3. Open a project (try `demo/buggy-app`) and run **`CodeGuard: Review Project`**.

### Settings (`Cmd/Ctrl + ,` → "CodeGuard")

| Setting | Default | Meaning |
|---|---|---|
| `codeguard.baseUrl` | `https://integrate.api.nvidia.com/v1` | OpenAI-compatible endpoint |
| `codeguard.model` | `nvidia/nemotron-3-ultra-550b-a55b` | Model ID |
| `codeguard.deepModel` | _(empty)_ | Stronger model used after repeated test failures |
| `codeguard.testCommand` | _(auto)_ | e.g. `npm test`; auto-detected from `package.json` |
| `codeguard.requireApproval` | `true` | Show a diff before each fix |
| `codeguard.maxTurns` | `40` | Agent turn limit |
| `codeguard.disableThinking` | `true` | Faster tool calls (Nemotron chat-template flag) |

### Using Nebius Token Factory

1. Create an API key at <https://tokenfactory.nebius.com> (API keys → Create API key).
2. Set `codeguard.baseUrl` to `https://api.tokenfactory.nebius.com/v1/`.
3. Set `codeguard.model` to the exact Nemotron model ID shown on the Token Factory models page.
4. Run **`CodeGuard: Set API Key`** with your Nebius key.

> Tool calling must be supported by the chosen model on your provider. If a model rejects tool calls, pick another Nemotron model.

### Optional: Tavily web search

Run **`CodeGuard: Set Tavily API Key`**. When set, the agent gets a `web_search` tool for library docs and error messages.

## 🧪 Demo

`demo/buggy-app` contains deliberate bugs (off-by-one, typos, wrong math, null crash, hardcoded secret, `eval`, React key/effect/XSS, missing alt text).

```bash
cd demo/buggy-app && npm test     # 5 of 6 tests fail
```

Open `demo/buggy-app` in the Extension Development Host and run **CodeGuard: Review Project** → tests go from failing to passing, with a report.

## 🏗️ Architecture

```
src/
  extension.js            activation + key commands
  commands/               "Review Project" command, progress UI, report
  agents/reviewAgent.js   agent loop (tool calling, verify & retry, escalation)
  tools/                  list_files, read_file, write_file, run_tests, web_search
  ui/diffApproval.js      diff + apply/skip prompt
  utils/                  path safety, backups, report builder
  prompts/systemPrompt.js agent instructions
test/agent.test.js        offline tests with a fake model server
```

## ✅ Tests

```bash
npm test
```

Runs the agent against a fake OpenAI-compatible server (no key or network needed).

## ⚠️ Known limitations

- Review quality depends on the model; always read the diffs.
- `npm test` for projects with dependencies requires `npm install` first.
- Files over 200 KB are skipped; very large projects may need several runs.
- Do not send confidential code to free public endpoints; the NVIDIA trial endpoint logs usage.

## 🤝 Feedback

Issues and ideas welcome on GitHub.

## 📄 License

MIT — see [LICENSE](LICENSE).
