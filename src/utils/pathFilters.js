const fs = require("fs");
const path = require("path");

const SUPPORTED_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".html", ".css"];

const IGNORED_FOLDERS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
];

function isIgnorePath(filePath) {
  const folders = filePath.split(path.sep);

  return folders.some((folder) => IGNORED_FOLDERS.includes(folder));
}

function isSupportedFile(filePath) {
  return SUPPORTED_EXTENSIONS.includes(path.extname(filePath));
}

function scanDirectory(rootDirectory) {
  const files = [];

  function walk(currentDirectory) {
    let entries;

    try {
      entries = fs.readdirSync(currentDirectory, {
        withFileTypes: true,
      });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDirectory, entry.name);

      if (isIgnorePath(fullPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isFile() && isSupportedFile(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  walk(rootDirectory);

  return files;
}

module.exports = {
  isIgnorePath,
  isSupportedFile,
  scanDirectory,
  IGNORED_FOLDERS,
  SUPPORTED_EXTENSIONS,
};
