import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const workspaceRoot = process.cwd();
const userProfile = process.env.USERPROFILE;
const taskTempDirectory = userProfile
  ? join(userProfile, "AppData", "Local", "Temp", "ih-ec-vitest")
  : resolve(workspaceRoot, ".tmp", "vitest");
const vitestCli = resolve(workspaceRoot, "node_modules", "vitest", "vitest.mjs");

mkdirSync(taskTempDirectory, { recursive: true });

const child = spawn(process.execPath, [vitestCli, ...process.argv.slice(2)], {
  cwd: workspaceRoot,
  env: {
    ...process.env,
    TEMP: taskTempDirectory,
    TMP: taskTempDirectory,
  },
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(`Unable to start Vitest: ${error.message}`);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal !== null) {
    console.error(`Vitest terminated by signal ${signal}.`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
