import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputPath = resolve(root, "data", "supabase", "database.types.ts");
const linkedProjectPath = resolve(
  root,
  "supabase",
  ".temp",
  "project-ref",
);
const mode = process.argv[2];

if (mode !== "write" && mode !== "check") {
  throw new Error("Usage: node scripts/supabase-types.mjs <write|check>");
}

const projectId =
  process.env.SUPABASE_PROJECT_ID?.trim() ||
  (existsSync(linkedProjectPath)
    ? readFileSync(linkedProjectPath, "utf8").trim()
    : "");

if (!/^[a-z]{20}$/.test(projectId)) {
  throw new Error(
    "SUPABASE_PROJECT_ID is required when no linked project is available.",
  );
}

const cliPath = resolve(root, "node_modules", "supabase", "dist", "supabase.js");
const result = spawnSync(
  process.execPath,
  [
    cliPath,
    "--agent",
    "no",
    "gen",
    "types",
    "--project-id",
    projectId,
    "--lang",
    "typescript",
    "--schema",
    "public",
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

const generated = result.stdout.replaceAll("\r\n", "\n");

if (mode === "write") {
  writeFileSync(outputPath, generated, "utf8");
  process.stdout.write("Updated data/supabase/database.types.ts\n");
  process.exit(0);
}

const committed = readFileSync(outputPath, "utf8").replaceAll("\r\n", "\n");

if (generated !== committed) {
  process.stderr.write(
    "Supabase database types are stale. Run npm run supabase:types.\n",
  );
  process.exit(1);
}

process.stdout.write("Supabase database types match eventspace-dev.\n");
