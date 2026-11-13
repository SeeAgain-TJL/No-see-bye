import { spawn, spawnSync } from "node:child_process";
if (
  !process.env.JWT_SECRET ||
  process.env.JWT_SECRET.length < 32 ||
  /replace-with|change-this|fallback|your-secret/i.test(process.env.JWT_SECRET)
)
  throw new Error("Provide a random JWT_SECRET before starting");
const init = spawnSync(process.execPath, ["scripts/init-db.mjs"], {
  stdio: "inherit",
  env: process.env,
});
if (init.status !== 0) process.exit(init.status || 1);
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "-H",
    "0.0.0.0",
    "-p",
    process.env.PORT || "3000",
  ],
  { stdio: "inherit", env: process.env },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code || 0));
