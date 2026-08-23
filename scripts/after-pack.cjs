// electron-builder's `extraResources` file copy goes through its own
// filtering, which — even with an explicit `filter: ["**/*"]` override —
// was silently dropping the nested node_modules inside .next/standalone
// (server.js then fails at runtime with "Cannot find module 'next'").
// Copying it here instead, in an afterPack hook, is a plain recursive
// fs.cpSync with no filtering involved, so nothing gets silently pruned.
const fs = require("node:fs");
const path = require("node:path");

module.exports = async function afterPack(context) {
  const projectRoot = path.join(__dirname, "..");
  const source = path.join(projectRoot, ".next", "standalone");
  const dest = path.join(context.appOutDir, "resources", "standalone");

  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(source, dest, { recursive: true });
  console.log(`[after-pack] copied ${source} -> ${dest}`);
};
