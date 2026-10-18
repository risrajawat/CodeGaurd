const vscode = require("vscode");
const fs = require("fs");
const os = require("os");
const path = require("path");

// Shows a side-by-side diff and asks the user to apply or skip each fix.
function createApprovalHandler() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codeguard-"));

  return async function approve({ rel, abs, original, proposed }) {
    const proposedPath = path.join(tmpRoot, "proposed", rel);
    fs.mkdirSync(path.dirname(proposedPath), { recursive: true });
    fs.writeFileSync(proposedPath, proposed, "utf8");

    let leftUri = vscode.Uri.file(abs);
    if (original === null) {
      const emptyPath = path.join(tmpRoot, "empty", rel);
      fs.mkdirSync(path.dirname(emptyPath), { recursive: true });
      fs.writeFileSync(emptyPath, "", "utf8");
      leftUri = vscode.Uri.file(emptyPath);
    }

    await vscode.commands.executeCommand(
      "vscode.diff",
      leftUri,
      vscode.Uri.file(proposedPath),
      `CodeGuard: ${rel} (current ↔ proposed)`,
      { preview: true }
    );

    const pick = await vscode.window.showQuickPick(
      [
        { label: "$(check) Apply fix", id: "apply" },
        { label: "$(check-all) Apply this and all remaining fixes", id: "apply_all" },
        { label: "$(close) Skip this file", id: "skip" },
      ],
      {
        title: `CodeGuard: review the proposed change to ${rel}`,
        placeHolder: "Check the diff in the editor, then choose",
        ignoreFocusOut: true,
      }
    );

    return pick ? pick.id : "skip";
  };
}

module.exports = { createApprovalHandler };
