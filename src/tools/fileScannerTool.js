const { scanDirectory } = require("../utils/pathFilters");
const { resolveInRoot } = require("../utils/fileSystem");

const declaration = {
  name: "list_files",
  description:
    "Recursively lists all supported source files (html, css, js, jsx, ts, tsx) in the project. Paths are relative to the project root.",
  parameters: {
    type: "object",
    properties: {
      directory: {
        type: "string",
        description: 'Directory to scan, relative to the project root. Use "." for the whole project.',
      },
    },
  },
};

async function run({ directory } = {}, session) {
  const start = resolveInRoot(session.root, directory || ".");
  const { files, truncated } = scanDirectory(session.root, start);
  return truncated ? { files, note: "List truncated; only the first files are shown." } : { files };
}

module.exports = { declaration, run };
