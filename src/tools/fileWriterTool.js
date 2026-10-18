const fs = require("fs");
const path = require("path");
const { writeFileSafe, resolveInRoot, backupOnce, toPosix } = require("../utils/fileSystem");
const { isTestFile } = require("../utils/pathFilters");

const declaration = {
  name: "write_file",
  description:
    "Writes the COMPLETE corrected content of a file (never a snippet). Use only when a change is required. Test files cannot be modified. The user may reject the change.",
  parameters: {
    type: "object",
    properties: {
      filePath: { type: "string", description: "Path of the file to update, relative to the project root." },
      content: { type: "string", description: "The full updated file content." },
    },
    required: ["filePath", "content"],
  },
};

async function run({ filePath, content } = {}, session) {
  const abs = resolveInRoot(session.root, filePath);
  const rel = toPosix(path.relative(session.root, abs));

  if (typeof content !== "string") {
    return { success: false, applied: false, error: "content must be a string with the full file." };
  }

  if (isTestFile(rel)) {
    session.rejectedTestEdits.push(rel);
    return {
      success: false,
      applied: false,
      error: "Test files are read-only. Fix the source code so the tests pass instead.",
    };
  }

  const original = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;

  if (original === content) {
    return { success: true, applied: false, note: "Content identical to the current file; nothing changed." };
  }

  // Guard against accidentally truncated output wiping a file.
  if (original && original.length > 500 && content.length < original.length * 0.3) {
    return {
      success: false,
      applied: false,
      error: "New content is much shorter than the original. Send the COMPLETE file, not a partial one.",
    };
  }

  if (session.requireApproval && session.approve) {
    const decision = await session.approve({ root: session.root, rel, abs, original, proposed: content });
    if (decision === "skip") {
      session.skipped.push(rel);
      return {
        success: false,
        applied: false,
        message: "The user rejected this change. Do not retry this file.",
      };
    }
    if (decision === "apply_all") {
      session.requireApproval = false;
    }
  }

  backupOnce(session, abs);
  writeFileSafe(abs, content);
  if (!session.applied.includes(rel)) session.applied.push(rel);

  return { success: true, applied: true };
}

module.exports = { declaration, run };
