import { cp, mkdir, readFile, writeFile, rm, chmod, access, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const release = path.join(dist, "no-see-bye");
const standalone = path.join(root, ".next", "standalone");
await access(path.join(standalone, "server.js"));
if (Number(process.versions.node.split(".")[0]) !== 24)
  throw new Error("Build releases with Node.js 24");
// These fixed paths are generated outputs inside the repository, never user data.
await rm(release, { recursive: true, force: true });
await mkdir(release, { recursive: true });
const excludePrivateFiles = (source) => {
  const name = path.basename(source);
  return !name.startsWith(".env") && name !== "config.env" && source !== path.join(standalone, "data") &&
    !/\.(db|sqlite)(-|$)/i.test(name);
};
await cp(standalone, release, { recursive: true, dereference: true, filter: excludePrivateFiles });
await cp(path.join(root, "public"), path.join(release, "public"), { recursive: true });
await cp(path.join(root, ".next", "static"), path.join(release, ".next", "static"), { recursive: true });
// Maintenance scripts are not Next routes and therefore need explicit dependencies.
for (const moduleName of ["@next/env", "@prisma/client", ".prisma/client"])
  await cp(path.join(root, "node_modules", moduleName), path.join(release, "node_modules", moduleName), { recursive: true, dereference: true });
// A Linux x64 artifact must support both Ubuntu build hosts and Alibaba Linux ECS.
if (process.platform === "linux" && process.arch === "x64") {
  for (const target of ["rhel-openssl-1.1.x", "rhel-openssl-3.0.x", "debian-openssl-1.1.x", "debian-openssl-3.0.x"])
    await access(path.join(release, "node_modules", ".prisma", "client", "libquery_engine-" + target + ".so.node"));
}
for (const script of ["init-db.mjs", "cleanup-assets.mjs", "check-runtime.mjs"])
  await cp(path.join(root, "scripts", script), path.join(release, "scripts", script), { recursive: true });
await cp(path.join(root, "prisma", "schema.prisma"), path.join(release, "prisma", "schema.prisma"), { recursive: true });
await cp(path.join(root, "deploy"), path.join(release, "deploy"), { recursive: true });
await cp(path.join(root, "docs", "deployment.md"), path.join(release, "DEPLOYMENT.md"));
await mkdir(path.join(release, "runtime"), { recursive: true });
const executable = process.platform === "win32" ? "node.exe" : "node";
await cp(process.execPath, path.join(release, "runtime", executable));
await chmod(path.join(release, "runtime", executable), 0o755);
// Ship the license for the exact bundled Node runtime, including third-party notices.
const licenseResponse = await fetch("https://raw.githubusercontent.com/nodejs/node/v" + process.versions.node + "/LICENSE", { signal: AbortSignal.timeout(30_000) });
if (!licenseResponse.ok) throw new Error("Cannot fetch bundled Node license: " + licenseResponse.status);
await writeFile(path.join(release, "runtime", "LICENSE"), await licenseResponse.text());
const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
const manifest = {
  application: "no-see-bye", commit: git.status === 0 ? git.stdout.trim() : null,
  platform: process.platform, arch: process.arch, node: process.version,
  buildId: (await readFile(path.join(root, ".next", "BUILD_ID"), "utf8")).trim(),
  builtAt: new Date().toISOString(),
};
await writeFile(path.join(release, "release.json"), JSON.stringify(manifest, null, 2) + "\n");
// Never ship Next's copied env files, SQLite files, or local uploads.
for (const file of await readdir(release, { recursive: true })) {
  const name = path.basename(file);
  if ((name.startsWith(".env") && name !== ".env.example") || name === "config.env" || /\.(db|sqlite)(-|$)/i.test(name))
    throw new Error("Private data found in release: " + file);
}
const archive = path.join(dist, "no-see-bye-" + process.platform + "-" + process.arch + ".tar.gz");
const tar = spawnSync("tar", ["-czf", archive, "-C", dist, "no-see-bye"], { stdio: "inherit" });
if (tar.status !== 0) throw new Error("tar packaging failed");
const hash = createHash("sha256").update(await readFile(archive)).digest("hex");
await writeFile(archive + ".sha256", hash + "  " + path.basename(archive) + "\n");
console.log("Release: " + archive);
console.log("Target: " + process.platform + "/" + process.arch + "; Node " + process.version);
if (process.platform !== "linux") console.log("Local smoke-test bundle only. Build on matching Linux for ECS.");
