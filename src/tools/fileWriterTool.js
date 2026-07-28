const { Type } = require("@google/genai");
const { writeFileSafe } = require("../utils/fileSystem");

// Tool declaration for Gemini
const declaration = {
  name: "write_file",
  description: "Writes the updated content to a file. Use this only if changes are required.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      filePath: {
        type: Type.STRING,
        description: "Path of the file to update.",
      },
      content: {
        type: Type.STRING,
        description: "Updated file content.",
      },
    },
    required: ["filePath", "content"],
  },
};

async function writeFile({ filePath, content }) {
  writeFileSafe({filePath, content});

  return {
    success: true,
  };
}

module.exports = {
  declaration,
  writeFile,
};