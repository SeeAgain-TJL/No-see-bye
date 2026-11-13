import path from "node:path";
import { mkdirSync, accessSync, constants } from "node:fs";

if (Number(process.versions.node.split(".")[0]) !== 24)
  throw new Error("This release requires Node.js 24");
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32 || /replace-with|change-this|fallback|your-secret/i.test(secret))
  throw new Error("Set JWT_SECRET to a random secret of at least 32 characters");
const database = process.env.DATABASE_URL;
if (!database?.startsWith("file:") || !path.isAbsolute(database.slice(5)))
  throw new Error("Production DATABASE_URL must use an absolute file: path");
if (process.env.STORAGE_DRIVER !== "local" || !path.isAbsolute(process.env.STORAGE_LOCAL_DIR || ""))
  throw new Error("Set STORAGE_DRIVER=local and an absolute STORAGE_LOCAL_DIR");
let origin;
try { origin = new URL(process.env.APP_ORIGIN); } catch { throw new Error("Set APP_ORIGIN to the actual website origin"); }
if (!["https:", "http:"].includes(origin.protocol) || origin.origin !== process.env.APP_ORIGIN)
  throw new Error("APP_ORIGIN must contain only protocol, hostname, and optional port (no trailing slash)");
if (!["true", "false"].includes(process.env.COOKIE_SECURE) ||
    (origin.protocol === "https:" && process.env.COOKIE_SECURE !== "true") ||
    (origin.protocol === "http:" && process.env.COOKIE_SECURE !== "false"))
  throw new Error("COOKIE_SECURE must match APP_ORIGIN: true for HTTPS, false for HTTP");
for (const dir of [path.dirname(database.slice(5)), process.env.STORAGE_LOCAL_DIR]) {
  mkdirSync(dir, { recursive: true });
  accessSync(dir, constants.W_OK);
}
console.log("Runtime configuration and data directories are ready");
