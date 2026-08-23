// Builds prisma/template.db: schema migrated + sources/categories seeded,
// zero articles. This is what ships inside the desktop installer and gets
// copied to the user's app-data folder on first launch (see
// desktop/main.js). Regenerated fresh on every desktop build so it always
// matches the current schema and lib/sources/config.ts — never committed
// to git (see .gitignore).
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const templateDb = path.join(root, "prisma", "template.db");

for (const f of [templateDb, `${templateDb}-journal`]) {
  if (existsSync(f)) rmSync(f);
}

// Prisma resolves sqlite `file:` URLs relative to prisma/schema.prisma,
// so "file:./template.db" lands at prisma/template.db.
const env = { ...process.env, DATABASE_URL: "file:./template.db" };

// Windows can't spawn a .cmd shim (npx.cmd) without a shell, and passing an
// argv array alongside shell:true is unsafe in general — but safe here
// since every command below is a fixed, hardcoded string with no
// interpolated input.
function run(commandLine) {
  const result = spawnSync(commandLine, { cwd: root, env, stdio: "inherit", shell: true });
  if (result.error || result.status !== 0) {
    console.error(`Command failed: ${commandLine}`, result.error ?? "");
    process.exit(result.status ?? 1);
  }
}

run("npx prisma migrate deploy");
run("npx tsx prisma/seed.ts");

console.log(`Template DB ready at ${templateDb}`);
