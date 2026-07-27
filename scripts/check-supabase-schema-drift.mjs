import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const cliPath = resolve(root, "node_modules", "supabase", "dist", "supabase.js");
const result = spawnSync(
  process.execPath,
  [
    cliPath,
    "--agent",
    "no",
    "db",
    "diff",
    "--from",
    "migrations",
    "--to",
    "linked",
    "--schema",
    "public,private",
  ],
  {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      SUPABASE_TELEMETRY_DISABLED: "1",
    },
  },
);

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const drift = result.stdout.trim();

if (drift) {
  process.stderr.write("Remote schema drift detected:\n");
  process.stderr.write(`${drift}\n`);
  process.exit(1);
}

process.stdout.write("Remote schema matches committed migrations.\n");
