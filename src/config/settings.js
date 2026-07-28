const vscode = require("vscode");

function getGeminiApiKey() {
  return vscode.workspace
    .getConfiguration("codeguard")
    .get("geminiApiKey", "")
    .trim();
}

function getGeminiModel() {
  return vscode.workspace
    .getConfiguration("codeguard")
    .get("model", "gemini-3.6-flash");
}

function openExtensionSettings() {
  return vscode.commands.executeCommand(
    "workbench.action.openSettings",
    "codeguard"
  );
}

module.exports = {
  getGeminiApiKey,
  getGeminiModel,
  openExtensionSettings,
};