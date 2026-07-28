const { Type } = require("@google/genai");
const { scanDirectory } = require("../utils/pathFilters");

// Tool declaration for Gemini
const declaration = {
    name: "list_files",
    description: "Recursively scans a directory and returns all supported source files.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            directory: {
                type: Type.STRING,
                description: "Path of the project directory.",
            },
        },
        required: ["directory"],
    },
};

async function listFiles({directory}){
    const files = scanDirectory(directory);
    return {files};
}

module.exports = {declaration, listFiles};