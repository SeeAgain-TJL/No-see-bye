import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { mkdirSync } from "node:fs";
loadEnvConfig(process.cwd());
const url = process.env.DATABASE_URL;
if (!url?.startsWith("file:"))
  throw new Error("DATABASE_URL must be a SQLite file: URL");
const file = path.resolve("prisma", url.slice(5));
mkdirSync(path.dirname(file), { recursive: true });
const db = new DatabaseSync(file);
db.exec(
  "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
);
try {
  db.exec(`BEGIN IMMEDIATE;
    CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY NOT NULL, email TEXT NOT NULL, username TEXT NOT NULL,
      passwordHash TEXT NOT NULL, avatarKey TEXT, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE UNIQUE INDEX IF NOT EXISTS User_email_key ON User(email);
    CREATE UNIQUE INDEX IF NOT EXISTS User_username_key ON User(username);
    CREATE TABLE IF NOT EXISTS Entry (
      id TEXT PRIMARY KEY NOT NULL, userId TEXT NOT NULL, content TEXT,
      media TEXT NOT NULL DEFAULT '[]', visibility TEXT NOT NULL DEFAULT 'private',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES User(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS Asset (
      id TEXT PRIMARY KEY NOT NULL, ownerId TEXT NOT NULL, driver TEXT NOT NULL, key TEXT NOT NULL,
      mime TEXT NOT NULL, sizeBytes INTEGER NOT NULL, width INTEGER, height INTEGER, durationMs INTEGER,
      capturedAt DATETIME, thumbnailKey TEXT, coverKey TEXT, status TEXT NOT NULL DEFAULT 'pending',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ownerId) REFERENCES User(id) ON DELETE CASCADE);
  `);
  const add = (table, name, type) => {
    if (
      !db
        .prepare(`PRAGMA table_info("${table}")`)
        .all()
        .some((c) => c.name === name)
    ) {
      db.exec(`ALTER TABLE "${table}" ADD COLUMN "${name}" ${type}`);
      return true;
    }
    return false;
  };
  const addedAuthMode = add("User", "hasLocalPassword", "BOOLEAN NOT NULL DEFAULT true");
  add("User", "phone", "TEXT");
  add("User", "displayName", "TEXT NOT NULL DEFAULT ''");
  add("User", "sessionVersion", "INTEGER NOT NULL DEFAULT 0");
  add("Entry", "title", "TEXT NOT NULL DEFAULT ''");
  add("Entry", "tags", "TEXT NOT NULL DEFAULT '[]'");
  add("Entry", "location", "TEXT NOT NULL DEFAULT ''");
  add("Entry", "mood", "TEXT NOT NULL DEFAULT ''");
  add("Entry", "pinned", "BOOLEAN NOT NULL DEFAULT false");
  add("Entry", "happenedAt", "DATETIME");
  add("Entry", "deletedAt", "DATETIME");
  add("Asset", "filename", "TEXT NOT NULL DEFAULT ''");
  db.exec(`UPDATE Entry SET happenedAt=createdAt WHERE happenedAt IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS Asset_key_key ON Asset(key);
    CREATE INDEX IF NOT EXISTS Asset_ownerId_status_idx ON Asset(ownerId,status);
    CREATE INDEX IF NOT EXISTS Asset_createdAt_idx ON Asset(createdAt);
    CREATE INDEX IF NOT EXISTS Entry_userId_deletedAt_happenedAt_idx ON Entry(userId,deletedAt,happenedAt);
    CREATE INDEX IF NOT EXISTS Entry_visibility_deletedAt_happenedAt_idx ON Entry(visibility,deletedAt,happenedAt);
    CREATE TABLE IF NOT EXISTS OAuthAccount (
      id TEXT PRIMARY KEY NOT NULL, provider TEXT NOT NULL, providerAccountId TEXT NOT NULL,
      userId TEXT NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES User(id) ON DELETE CASCADE);
    CREATE UNIQUE INDEX IF NOT EXISTS OAuthAccount_provider_providerAccountId_key ON OAuthAccount(provider,providerAccountId);
    CREATE INDEX IF NOT EXISTS OAuthAccount_userId_idx ON OAuthAccount(userId);
    CREATE TABLE IF NOT EXISTS EntryAsset (
      entryId TEXT NOT NULL, assetId TEXT NOT NULL, position INTEGER NOT NULL,
      PRIMARY KEY(entryId,assetId),
      FOREIGN KEY(entryId) REFERENCES Entry(id) ON DELETE CASCADE,
      FOREIGN KEY(assetId) REFERENCES Asset(id) ON DELETE RESTRICT);
    CREATE UNIQUE INDEX IF NOT EXISTS EntryAsset_assetId_key ON EntryAsset(assetId);
    CREATE UNIQUE INDEX IF NOT EXISTS User_phone_key ON User(phone);
    CREATE TABLE IF NOT EXISTS SmsChallenge (
      phone TEXT PRIMARY KEY NOT NULL, codeHash TEXT NOT NULL,
      expiresAt DATETIME NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      attempts INTEGER NOT NULL DEFAULT 0);
    `);
  if (addedAuthMode) db.exec(`UPDATE User SET hasLocalPassword=false
    WHERE email LIKE '%@oauth.local' AND EXISTS (SELECT 1 FROM OAuthAccount WHERE userId=User.id)`);
  db.exec("PRAGMA user_version=2; COMMIT;");
  console.log("SQLite initialized (additive; existing records preserved).");
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
} finally {
  db.close();
}
