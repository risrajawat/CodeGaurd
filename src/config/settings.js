const vscode = require("vscode");

let secrets = null;

function init(context) {
  secrets = context.secrets;
}

const cfg = () => vscode.workspace.getConfiguration("codeguard");

// API keys live in VS Code SecretStorage (encrypted). The plain setting is only a fallback.
async function readSecret(name, settingName) {
  let value = "";
  if (secrets) {
    value = (await secrets.get(name)) || "";
  }
  if (!value) {
    value = cfg().get(settingName, "") || "";
  }
  return value.trim();
}

const getApiKey = () => readSecret("codeguard.apiKey", "apiKey");
const getTavilyKey = () => readSecret("codeguard.tavilyApiKey", "tavilyApiKey");

async function storeSecret(name, value) {
  if (!secrets) throw new Error("CodeGuard is not initialised yet.");
  await secrets.store(name, value.trim());
}

const setApiKey = (value) => storeSecret("codeguard.apiKey", value);
const setTavilyKey = (value) => storeSecret("codeguard.tavilyApiKey", value);

const getBaseUrl = () => cfg().get("baseUrl", "https://integrate.api.nvidia.com/v1").trim();
const getModel = () => cfg().get("model", "nvidia/nemotron-3-ultra-550b-a55b").trim();
const getDeepModel = () => cfg().get("deepModel", "").trim();
const getTestCommand = () => cfg().get("testCommand", "").trim();
const getRequireApproval = () => cfg().get("requireApproval", true);
const getMaxTurns = () => cfg().get("maxTurns", 40);
const getDisableThinking = () => cfg().get("disableThinking", true);

function openExtensionSettings() {
  return vscode.commands.executeCommand("workbench.action.openSettings", "codeguard");
}

module.exports = {
  init,
  getApiKey,
  setApiKey,
  getTavilyKey,
  setTavilyKey,
  getBaseUrl,
  getModel,
  getDeepModel,
  getTestCommand,
  getRequireApproval,
  getMaxTurns,
  getDisableThinking,
  openExtensionSettings,
};
