import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const envFile = await readFile(".env.local", "utf8").catch(() => "");
const env = { ...process.env };

for (const line of envFile.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match || match[1] in env) continue;
  const value = match[2].replace(/^(["'])(.*)\1$/, "$2");
  env[match[1]] = value;
}

if (!env.DATABASE_URL || !env.BETTER_AUTH_SECRET) {
  console.error("DATABASE_URL and BETTER_AUTH_SECRET must be set in .env.local before auth migration.");
  process.exit(1);
}

const result = spawnSync("npx", ["--yes", "auth@latest", "migrate", "--config", "./scripts/auth-cli.config.ts", "--yes"], {
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error("Could not start the Better Auth migration command.");
  process.exit(1);
}
process.exit(result.status ?? 1);
