const { Type } = require("@google/genai");
const { readFileSafe } = require("../utils/fileSystem");

// Tool declaration for Gemini
const declaration = {
    name: "read_file",
    description: "Reads the content of a file.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            filePath: {
                type: Type.STRING,
                description: "Path of the file to read.",
            },
        },
        required: ["filePath"],
    },
};

async function readFile({filePath}){
    const content = readFileSafe({filePath});

    return {content};
}

module.exports = {declaration, readFile};