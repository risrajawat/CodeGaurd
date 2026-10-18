const { readFileSafe, resolveInRoot } = require("../utils/fileSystem");

const declaration = {
  name: "read_file",
  description: "Reads the full content of a file. Path is relative to the project root.",
  parameters: {
    type: "object",
    properties: {
      filePath: { type: "string", description: "Path of the file to read, e.g. src/app.js" },
    },
    required: ["filePath"],
  },
};

async function run({ filePath } = {}, session) {
  const abs = resolveInRoot(session.root, filePath);
  return { content: readFileSafe(abs) };
}

module.exports = { declaration, run };
