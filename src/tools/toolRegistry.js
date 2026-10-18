const fileScannerTool = require("./fileScannerTool");
const fileReaderTool = require("./fileReaderTool");
const fileWriterTool = require("./fileWriterTool");
const testRunnerTool = require("./testRunnerTool");
const webSearchTool = require("./webSearchTool");

const tools = [fileScannerTool, fileReaderTool, fileWriterTool, testRunnerTool, webSearchTool];

function availableTools(session) {
  return tools.filter((t) => !t.isAvailable || t.isAvailable(session));
}

// Tool definitions in OpenAI-compatible format (works with Nebius Token Factory and NVIDIA).
function getToolDeclarations(session) {
  return availableTools(session).map((t) => ({ type: "function", function: t.declaration }));
}

function getToolImplementation(name, session) {
  const tool = availableTools(session).find((t) => t.declaration.name === name);
  return tool ? tool.run : null;
}

module.exports = { getToolDeclarations, getToolImplementation };
