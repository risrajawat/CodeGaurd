const { getToolImplementation } = require("../tools/toolRegistry");

async function executeFunctionCall(functionCall, session) {
  const tool = getToolImplementation(functionCall.name, session);

  if (!tool) {
    throw new Error(`Unknown or unavailable tool: ${functionCall.name}`);
  }

  return await tool(functionCall.args, session);
}

module.exports = { executeFunctionCall };
