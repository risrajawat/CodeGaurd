const fs = require("fs");
const path = require("path");

const MAX_READ_BYTES = 200 * 1024;

// Resolve a model-supplied path and make sure it cannot escape the project folder.
function resolveInRoot(root, p) {
  if (typeof p !== "string" || !p.trim()) {
    throw new Error("A file path is required.");
  }
  const abs = path.resolve(root, p);
  const rel = path.relative(root, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path "${p}" is outside the project folder.`);
  }
  return abs;
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function readFileSafe(abs) {
  try {
    const size = fs.statSync(abs).size;
    if (size > MAX_READ_BYTES) {
      throw new Error(`file is too large (${Math.round(size / 1024)} KB, limit ${MAX_READ_BYTES / 1024} KB)`);
    }
    return fs.readFileSync(abs, "utf8");
  } catch (error) {
    throw new Error(`Unable to read "${abs}": ${error.message}`);
  }
}

function writeFileSafe(abs, content) {
  try {
    if (typeof content !== "string") {
      throw new Error("Content must be a string.");
    }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, "utf8");
  } catch (error) {
    throw new Error(`Unable to write "${abs}": ${error.message}`);
  }
}

// Copy the original file into .codeguard/backups/<run>/ the first time it is changed.
function backupOnce(session, abs) {
  const rel = path.relative(session.root, abs);
  if (session.backedUp.has(rel)) return;
  if (fs.existsSync(abs)) {
    const dest = path.join(session.backupDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(abs, dest);
    const ignoreFile = path.join(session.root, ".codeguard", ".gitignore");
    if (!fs.existsSync(ignoreFile)) fs.writeFileSync(ignoreFile, "*\n", "utf8");
  }
  session.backedUp.add(rel);
}

module.exports = { resolveInRoot, toPosix, readFileSafe, writeFileSafe, backupOnce, MAX_READ_BYTES };
