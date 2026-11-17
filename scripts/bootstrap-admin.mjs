import nextEnv from "@next/env";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import path from "node:path";
import bcrypt from "bcryptjs";

nextEnv.loadEnvConfig(process.cwd());
const username = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const backupEmail = process.env.ADMIN_BACKUP_EMAIL?.trim().toLowerCase() || null;
const url = process.env.DATABASE_URL;
if (!url?.startsWith("file:")) throw new Error("DATABASE_URL must be a SQLite file URL");
if (!/^[a-z0-9_]{3,20}$/.test(username)) throw new Error("Invalid ADMIN_USERNAME");
const validEmail = value => typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !/@(accounts|oauth)\.local$/i.test(value);
if (!validEmail(email) || (backupEmail && (!validEmail(backupEmail) || email === backupEmail))) throw new Error("Provide distinct valid ADMIN_EMAIL and optional ADMIN_BACKUP_EMAIL");
const database = new DatabaseSync(path.resolve("prisma", url.slice(5)));
database.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
try {
  database.exec("BEGIN IMMEDIATE");
  const previous = database.prepare("SELECT id,role FROM User WHERE username=?").get(username);
  if (previous) {
    if (previous.role !== "admin") throw new Error("Username belongs to a non-admin account; refusing automatic promotion");
    console.log("Administrator already exists; password and recovery emails were not changed.");
  } else {
    if (database.prepare("SELECT id FROM User WHERE email=? OR email=? OR backupEmail=? OR backupEmail=?").get(email, backupEmail || email, email, backupEmail || email)) throw new Error("Recovery email belongs to an existing account; refusing account takeover");
    let passwordHash = process.env.ADMIN_PASSWORD_HASH;
    if (passwordHash) {
      if (!/^\$2[aby]\$12\$[./A-Za-z0-9]{53}$/.test(passwordHash)) throw new Error("ADMIN_PASSWORD_HASH must be a bcrypt hash with cost 12");
    } else {
      const password = process.env.ADMIN_PASSWORD;
      if (!password || password.length < 8 || Buffer.byteLength(password) > 72) throw new Error("Provide ADMIN_PASSWORD of 8–72 UTF-8 bytes or ADMIN_PASSWORD_HASH");
      passwordHash = await bcrypt.hash(password, 12);
    }
    const now = Date.now();
    // Unique indexes and this transaction also protect concurrent bootstrap invocations.
    database.prepare("INSERT INTO User (id,email,username,passwordHash,displayName,hasLocalPassword,role,backupEmail,createdAt,updatedAt) VALUES (?,?,?,?,?,1,'admin',?,?,?)")
      .run(randomUUID(), email, username, passwordHash, "站点管理员", backupEmail, now, now);
    console.log("Administrator created with contact emails. Credentials were not logged.");
  }
  database.exec("COMMIT");
} catch (error) {
  database.exec("ROLLBACK");
  throw error;
} finally { database.close(); }
