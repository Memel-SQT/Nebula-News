// After `next build` (with output: "standalone" in next.config.mjs), the
// standalone bundle is missing a few things Next's file tracer doesn't
// reliably pick up: static assets, public files, and Prisma's generated
// client + native query-engine binary. Electron's main.js spawns
// .next/standalone/server.js directly (no `next start`), so all of this
// has to be physically alongside it.
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const standalone = path.join(root, ".next", "standalone");

if (!existsSync(standalone)) {
  console.error("No .next/standalone found — run `npm run build` first.");
  process.exit(1);
}

function copy(from, to) {
  if (!existsSync(from)) {
    console.warn(`skip (not found): ${from}`);
    return;
  }
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
  console.log(`copied ${path.relative(root, from)} -> ${path.relative(root, to)}`);
}

copy(path.join(root, "public"), path.join(standalone, "public"));
copy(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"));
copy(
  path.join(root, "node_modules", ".prisma"),
  path.join(standalone, "node_modules", ".prisma")
);
copy(
  path.join(root, "node_modules", "@prisma", "client"),
  path.join(standalone, "node_modules", "@prisma", "client")
);

// `next build` copies the project's .env* files into .next/standalone so
// self-hosted deployments keep working — but that means a local dev secret
// (INGEST_SECRET, ANTHROPIC_API_KEY) would otherwise ship inside the
// installer for every end user. The desktop build gets everything it needs
// from desktop/main.js's own spawn env, so strip these out entirely.
for (const entry of readdirSync(standalone)) {
  if (entry === ".env" || entry.startsWith(".env.")) {
    rmSync(path.join(standalone, entry));
    console.log(`stripped ${entry} from standalone bundle (no secrets shipped)`);
  }
}

console.log("Desktop build prep complete.");
