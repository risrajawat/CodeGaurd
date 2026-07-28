const {toolImplementations} = require("../tools/toolRegistery");

async function executeFunctionCall(functionCall){
    const tool = toolImplementations[functionCall.name];

    if(!tool){
        throw new Error(`Unknown tool: ${functionCall.name}`);
    }

    return await tool(functionCall.args);

}

module.exports = {executeFunctionCall}; 