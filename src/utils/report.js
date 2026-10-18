const path = require("path");

function testLine(label, result) {
  if (!result) return `- **${label}:** no tests ran`;
  const status = result.ok ? "✅ passing" : `❌ failing (exit code ${result.exitCode}${result.timedOut ? ", timed out" : ""})`;
  return `- **${label}:** ${status} — \`${result.command}\``;
}

function details(title, result) {
  if (!result || !result.output) return "";
  return `<details><summary>${title}</summary>\n\n\`\`\`\n${result.output}\n\`\`\`\n\n</details>\n`;
}

function buildReport(stats, meta = {}) {
  const seconds = Math.round((stats.durationMs || 0) / 1000);
  const lines = [];

  lines.push("# CodeGuard Report", "");
  lines.push(`- **Project:** \`${meta.projectPath ?? ""}\``);
  lines.push(`- **Model(s):** ${stats.modelsUsed.map((m) => `\`${m}\``).join(", ") || "n/a"}`);
  if (meta.baseUrl) lines.push(`- **Endpoint:** ${meta.baseUrl}`);
  lines.push(
    `- **Run:** ${seconds}s, ${stats.turns} agent turns, ${stats.tokens.prompt + stats.tokens.completion} tokens ` +
      `(${stats.tokens.prompt} in / ${stats.tokens.completion} out)`
  );
  if (stats.searches) lines.push(`- **Web searches (Tavily):** ${stats.searches}`);
  lines.push("");

  if (stats.warning) lines.push(`> ⚠️ ${stats.warning}`, "");

  lines.push("## Test results", "");
  if (stats.testCommand) {
    lines.push(testLine("Before", stats.testsBefore));
    lines.push(testLine("After", stats.testsAfter));
    if (stats.verifyRetries) lines.push(`- Self-correction rounds after failed verification: ${stats.verifyRetries}`);
  } else {
    lines.push("No test command detected. Set `codeguard.testCommand` to enable verification.");
  }
  lines.push("");

  lines.push("## Files", "");
  lines.push(`- Scanned: ${stats.filesScanned}`);
  lines.push(`- Fixed: ${stats.filesModified}`);
  for (const f of stats.modifiedFiles) lines.push(`  - ✅ \`${f}\``);
  if (stats.skippedFiles.length) {
    lines.push(`- Skipped by you: ${stats.skippedFiles.length}`);
    for (const f of stats.skippedFiles) lines.push(`  - ⏭ \`${f}\``);
  }
  if (stats.rejectedTestEdits && stats.rejectedTestEdits.length) {
    lines.push(`- Blocked attempts to edit test files: ${stats.rejectedTestEdits.join(", ")}`);
  }
  if (stats.backupDir && meta.projectPath) {
    lines.push("", `Originals were backed up to \`${path.relative(meta.projectPath, stats.backupDir)}\`.`);
  }
  lines.push("");

  lines.push("## AI summary", "", stats.summaryText || "_The model did not return a summary._", "");

  const extra = details("Test output before", stats.testsBefore) + details("Test output after", stats.testsAfter);
  if (extra) lines.push("## Test output", "", extra);

  return lines.join("\n");
}

module.exports = { buildReport };
