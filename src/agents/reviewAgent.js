const { GoogleGenAI } = require("@google/genai");
const { getGeminiApiKey, getGeminiModel } = require("../config/settings");
const { toolDeclarations } = require("../tools/toolRegistery");
const { executeFunctionCall } = require("./functionCallHandler");
const { buildSystemPrompt } = require("../prompts/systemPrompt");



const MAX_AGENTS_TURNS = 40;

async function runReviewAgent(projectPath, callbacks) {
  const ai = new GoogleGenAI({
    apiKey: getGeminiApiKey(),
  });

  const model = getGeminiModel();

  const history = [
    {
      role: "user",
      parts: [
        {
          text: `Review and fix all supported files in ${projectPath}`,
        },
      ],
    },
  ];

  const stats = {
    filesScanned: 0,
    filesModified: 0,
    modifiedFiles: [],
    summaryText: "",
  }

  for(let turn = 0; turn < MAX_AGENTS_TURNS; turn++){
    const response = await ai.models.generateContent({
        model,
        contents: history,
        config: {
            systemInstruction: buildSystemPrompt(),
            tools: [
                {
                    functionDeclarations: toolDeclarations,
                },
            ],
        },
    });


    const functionCalls = response.functionCalls ?? [];

    if(functionCalls.length === 0){
        stats.summaryText = response.text ?? "";
        return stats;
    }

    history.push(response.candidates[0].content);

    for(const functionCall of functionCalls){
        handleCallbacks(functionCall, callbacks);

        let toolResponse;

        try {
            toolResponse = await executeFunctionCall(functionCall);
            updateStats(functionCall, toolResponse, stats);
        } catch (error) {
            toolResponse = {
                error: error.message,
            };
        }

        history.push({
            role: 'user',
            parts: [
                {
                    functionResponse: {
                        id: functionCall.id,
                        name: functionCall.name,
                        response: toolResponse,
                    },
                },
            ],
        });
    }
  }

  throw new Error(
    `CodeGuard stopped after ${MAX_AGENTS_TURNS} turns without finishing the review. The project may be too large to review in a single pass.`
  );
}

function handleCallbacks(functionCall, callbacks){
    const {name, args} = functionCall;

    if(name === "read_file" && args.filePath){
        callbacks.onFileStart?.(args.filePath);
    }

    if(name === "write_file" && args.filePath){
        callbacks.onFileFixed?.(args.filePath);
    }
}


function updateStats(functionCall, toolResponse, stats){
    if(functionCall.name === "list_files" && Array.isArray(toolResponse.files)){
        stats.filesScanned = toolResponse.files.length;
    }

    if(functionCall.name === "write_file" && functionCall.args.filePath){
        stats.filesModified++;
        stats.modifiedFiles.push(functionCall.args.filePath);
    }
}

module.exports = {runReviewAgent, MAX_AGENTS_TURNS};
