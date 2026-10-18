const fs = require("fs");
const path = require("path");

const SUPPORTED_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".html", ".css"];

const IGNORED_FOLDERS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  "coverage",
  ".codeguard",
  ".vscode-test",
];

const MAX_FILES = 300;

// Checks a path RELATIVE to the project root (so a project that lives inside a
// folder called "build" is not ignored by accident).
function isIgnoredRelPath(relPath) {
  return relPath.split(path.sep).some((folder) => IGNORED_FOLDERS.includes(folder));
}

function isSupportedFile(filePath) {
  return SUPPORTED_EXTENSIONS.includes(path.extname(filePath));
}

// Test files are read-only for the agent: it must fix the source, not the tests.
function isTestFile(relPath) {
  const norm = relPath.split(path.sep).join("/");
  return (
    /(^|\/)(test|tests|__tests__)\//i.test(norm) ||
    /\.(test|spec)\.[cm]?[jt]sx?$/i.test(norm)
  );
}

function scanDirectory(root, startDirectory = root) {
  const files = [];
  let truncated = false;

  function walk(currentDirectory) {
    let entries;
    try {
      entries = fs.readdirSync(currentDirectory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files.length >= MAX_FILES) {
        truncated = true;
        return;
      }

      const fullPath = path.join(currentDirectory, entry.name);
      const rel = path.relative(root, fullPath);

      if (isIgnoredRelPath(rel)) continue;

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isFile() && isSupportedFile(fullPath)) {
        files.push(rel.split(path.sep).join("/"));
      }
    }
  }

  walk(startDirectory);
  return { files, truncated };
}

module.exports = {
  isIgnoredRelPath,
  isSupportedFile,
  isTestFile,
  scanDirectory,
  IGNORED_FOLDERS,
  SUPPORTED_EXTENSIONS,
  MAX_FILES,
};
