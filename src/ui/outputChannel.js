const vscode = require("vscode");

let outputChannel;

function createOutputChannel() {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel("CodeGuard");
  }

  outputChannel.clear();

  return outputChannel;
}

module.exports = {
  createOutputChannel,
};