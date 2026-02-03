import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function isWorkerEnabled() {
  const value = (process.env.RUN_WORKER ?? "true").toString().trim().toLowerCase();
  return value !== "false" && value !== "0" && value !== "no";
}

function waitForExit(child) {
  return new Promise((resolve) => {
    child.on("exit", (code, signal) => resolve({ code, signal }));
  });
}

async function runOrThrow(command, args, name) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  });

  const { code, signal } = await waitForExit(child);
  if (code === 0) {
    return;
  }
  const suffix = signal ? ` (signal=${signal})` : "";
  throw new Error(`[start-all] ${name} failed (code=${code ?? "null"})${suffix}`);
}

function runBackground(command, args) {
  return spawn(command, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  });
}

async function main() {
  await runOrThrow("pnpm", ["db:migrate:deploy"], "db:migrate:deploy");
  await runOrThrow("pnpm", ["db:generate"], "db:generate");

  const web = runBackground("pnpm", ["exec", "next", "start"]);
  const worker = isWorkerEnabled()
    ? runBackground("pnpm", ["worker:create-pipeline"])
    : null;

  const shutdown = (signal) => {
    web.kill(signal);
    worker?.kill(signal);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  const winner = await Promise.race([
    waitForExit(web).then((result) => ({ name: "web", ...result })),
    ...(worker ? [waitForExit(worker).then((result) => ({ name: "worker", ...result }))] : []),
  ]);

  if (winner.name === "web") {
    worker?.kill("SIGTERM");
  } else {
    web.kill("SIGTERM");
  }

  const exitCode = winner.code ?? 1;
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

