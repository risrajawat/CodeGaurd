const vscode = require("vscode");
const { registerReviewProjectCommand } = require("./commands/reviewProjectCommand");

function activate(context) {
  context.subscriptions.push(registerReviewProjectCommand());
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};