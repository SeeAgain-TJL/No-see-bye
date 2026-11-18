import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { access, mkdir, rm, rmdir, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import bcrypt from "bcryptjs";

const releaseDir = process.env.TEST_RELEASE_DIR;
const workspace = path.resolve(releaseDir || process.cwd());
const runtime = releaseDir
  ? path.join(workspace, "runtime", process.platform === "win32" ? "node.exe" : "node")
  : process.execPath;
const testRoot = path.resolve("data", "admin-user-lifecycle-" + randomUUID());
assert.equal(path.dirname(testRoot), path.resolve("data"));
await mkdir(testRoot, { recursive: true });
const databasePath = path.join(testRoot, "isolated.sqlite");
const storageRoot = path.join(testRoot, "uploads");
const port = Number(process.env.TEST_ADMIN_LIFECYCLE_PORT || 3104);
const origin = "http://127.0.0.1:" + port;
const env = {
  ...process.env,
  NODE_ENV: "production",
  DATABASE_URL: "file:" + databasePath.replaceAll("\\", "/"),
  STORAGE_DRIVER: "local",
  STORAGE_LOCAL_DIR: storageRoot,
  JWT_SECRET: randomBytes(48).toString("hex"),
  COOKIE_SECURE: "false",
  APP_ORIGIN: origin,
  HOSTNAME: "127.0.0.1",
  PORT: String(port),
};
let db;
let server;
let serverOutput = "";
let checks = 0;

async function call(route, status, { cookie, body, from = origin, type = "application/json" } = {}) {
  const headers = { Origin: from };
  if (cookie) headers.Cookie = cookie;
  if (body) headers["Content-Type"] = type;
  const response = await fetch(origin + route, {
    method: body ? "POST" : "GET",
    headers,
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const raw = await response.text();
  assert.equal(response.status, status, `${route} returned ${response.status}: ${raw}`);
  checks++;
  return {
    body: response.headers.get("content-type")?.startsWith("application/json") ? JSON.parse(raw) : raw,
    cookie: response.headers.get("set-cookie")?.split(";")[0],
    cache: response.headers.get("cache-control"),
  };
}

function insertEntry(id, userId, visibility = "private", deletedAt = null) {
  const now = Date.now();
  db.prepare(`INSERT INTO Entry (id,userId,content,visibility,deletedAt,happenedAt,createdAt,updatedAt)
    VALUES (?,?,?,?,?,?,?,?)`).run(id, userId, "Synthetic test diary", visibility, deletedAt, now, now, now);
}

const file = key => path.join(storageRoot, key);
async function writeMedia(key) {
  await mkdir(path.dirname(file(key)), { recursive: true });
  await writeFile(file(key), "synthetic fixture");
}

async function insertAsset(id, ownerId, { entryId, failCleanup = false } = {}) {
  const key = `users/${ownerId}/test/${id}.jpg`;
  const thumbnail = key + ".thumbnail.webp";
  const cover = key + ".cover.webp";
  db.prepare(`INSERT INTO Asset (id,ownerId,driver,key,mime,sizeBytes,thumbnailKey,coverKey,status,createdAt)
    VALUES (?,?,'local',?,'image/jpeg',17,?,?,'ready',?)`).run(id, ownerId, key, thumbnail, cover, Date.now());
  if (entryId) db.prepare("INSERT INTO EntryAsset (entryId,assetId,position) VALUES (?,?,0)").run(entryId, id);
  if (failCleanup) await mkdir(file(key), { recursive: true });
  else await writeMedia(key);
  await writeMedia(thumbnail);
  await writeMedia(cover);
  return [key, thumbnail, cover];
}

try {
  const initialized = spawnSync(runtime, ["scripts/init-db.mjs"], { cwd: workspace, env, encoding: "utf8" });
  assert.equal(initialized.status, 0, initialized.stderr);
  db = new DatabaseSync(databasePath);
  db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
  const password = randomBytes(18).toString("hex");
  const passwordHash = await bcrypt.hash(password, 10);
  const insertUser = db.prepare("INSERT INTO User (id,email,username,passwordHash,role,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)");
  for (const [id, role] of [["actor", "admin"], ["subject", "user"], ["other", "user"]]) {
    insertUser.run(id, `${id}@example.test`, id, passwordHash, role, Date.now(), Date.now());
  }
  db.prepare("INSERT INTO OAuthAccount (id,provider,providerAccountId,userId) VALUES ('subject-oauth','github','fixture','subject')").run();
  insertEntry("visible-diary", "subject", "public");
  insertEntry("private-diary", "subject");
  insertEntry("trashed-diary", "subject", "public", Date.now());
  insertEntry("unrelated-diary", "other", "public");
  const oldMedia = [
    ...await insertAsset("attached", "subject", { entryId: "visible-diary" }),
    ...await insertAsset("unattached", "subject"),
  ];
  const unrelatedMedia = await insertAsset("unrelated", "other", { entryId: "unrelated-diary" });
  const avatar = "avatars/subject/fixture.webp";
  await writeMedia(avatar);
  db.prepare("UPDATE User SET avatarKey=? WHERE id='subject'").run(avatar);

  server = spawn(runtime, releaseDir ? ["server.js"] : ["node_modules/next/dist/bin/next", "start", "-p", String(port), "--hostname", "127.0.0.1"], {
    cwd: workspace, env, stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", value => { serverOutput += value; });
  server.stderr.on("data", value => { serverOutput += value; });
  let ready = false;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline && server.exitCode === null) {
    try {
      ready = (await fetch(origin + "/api/health", { signal: AbortSignal.timeout(1000) })).ok;
      if (ready) break;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 125));
  }
  assert(ready, "Isolated lifecycle server failed to start");

  const login = username => call("/api/auth/login", 200, { body: { emailOrUsername: username, password } });
  const actor = (await login("actor")).cookie;
  const subject = (await login("subject")).cookie;
  const target = "/api/admin/users/subject";
  const clear = { action: "clear-data", confirmUsername: "subject" };
  const remove = { action: "delete-user", confirmUsername: "subject" };
  await call(target, 401, { body: clear });
  await call(target, 403, { cookie: subject, body: clear });
  await call(target, 403, { cookie: actor, body: clear, from: "https://untrusted.example" });
  await call(target, 415, { cookie: actor, body: clear, type: "text/plain" });
  await call(target, 400, { cookie: actor, body: { ...clear, confirmUsername: "Subject" } });
  await call("/api/admin/users/unknown", 404, { cookie: actor, body: clear });
  for (const action of ["clear-data", "delete-user"]) {
    await call("/api/admin/users/actor", 403, { cookie: actor, body: { action, confirmUsername: "actor" } });
  }
  assert.equal(db.prepare("SELECT count(*) AS count FROM AdminUserAction").get().count, 0);
  await call("/api/assets/attached", 200);
  await call("/api/avatars/subject", 200);

  // Audit and data changes must commit together. Failure must also leave files intact.
  db.exec("CREATE TRIGGER deny_test_audit BEFORE INSERT ON AdminUserAction BEGIN SELECT RAISE(ABORT, 'test audit failure'); END;");
  try {
    await call(target, 500, { cookie: actor, body: clear });
    assert.equal(db.prepare("SELECT count(*) AS count FROM Entry WHERE userId='subject'").get().count, 3);
    assert.equal(db.prepare("SELECT count(*) AS count FROM MediaDeletion").get().count, 0);
    await access(file(oldMedia[0]));
  } finally {
    db.exec("DROP TRIGGER deny_test_audit");
  }

  const cleared = await call(target, 200, { cookie: actor, body: clear });
  assert.deepEqual(cleared.body, { ok: true, removedEntries: 3, removedAssets: 2, cleanupPending: false });
  assert.equal(cleared.cache, "private, no-store");
  assert.equal(db.prepare("SELECT avatarKey FROM User WHERE id='subject'").get().avatarKey, null);
  assert.equal(db.prepare("SELECT count(*) AS count FROM OAuthAccount WHERE userId='subject'").get().count, 1);
  for (const key of [...oldMedia, avatar]) await assert.rejects(access(file(key)), { code: "ENOENT" });
  await call("/api/memories/visible-diary", 404);
  await call("/api/assets/attached", 404);
  await call("/api/avatars/subject", 404);
  await call("/api/account", 401, { cookie: subject });
  const newSubject = (await login("subject")).cookie;
  const created = await call("/api/memories", 201, {
    cookie: newSubject,
    body: { content: "After reset", happenedAt: new Date().toISOString() },
  });
  const remainingMedia = await insertAsset("force-retry", "subject", {
    entryId: created.body.id,
    failCleanup: true,
  });

  const deleted = await call(target, 200, { cookie: actor, body: remove });
  assert.deepEqual(deleted.body, { ok: true, removedEntries: 1, removedAssets: 1, cleanupPending: true });
  await call("/api/account", 401, { cookie: newSubject });
  await call("/api/auth/login", 404, { body: { emailOrUsername: "subject", password } });
  await call(target, 404, { cookie: actor, body: remove });
  assert.equal(db.prepare("SELECT count(*) AS count FROM OAuthAccount WHERE userId='subject'").get().count, 0);
  assert.equal(db.prepare("SELECT count(*) AS count FROM Asset WHERE ownerId='subject'").get().count, 0);
  assert.equal(db.prepare("SELECT count(*) AS count FROM MediaDeletion WHERE ownerId='subject'").get().count, 1);
  const audit = db.prepare("SELECT action,operatorId,targetId,removedEntries,removedAssets FROM AdminUserAction ORDER BY rowid").all();
  assert.deepEqual(audit.map(row => ({ ...row })), [
    { action: "clear-data", operatorId: "actor", targetId: "subject", removedEntries: 3, removedAssets: 2 },
    { action: "delete-user", operatorId: "actor", targetId: "subject", removedEntries: 1, removedAssets: 1 },
  ]);
  // Resolve the fixture's directory-vs-file failure and run the real retry mechanism.
  await rmdir(file(remainingMedia[0]));
  await writeMedia(remainingMedia[0]);
  const cleanup = spawnSync(runtime, ["scripts/cleanup-assets.mjs"], { cwd: workspace, env, encoding: "utf8" });
  assert.equal(cleanup.status, 0, cleanup.stderr);
  assert.equal(db.prepare("SELECT count(*) AS count FROM MediaDeletion").get().count, 0);
  for (const key of remainingMedia) await assert.rejects(access(file(key)), { code: "ENOENT" });
  for (const key of unrelatedMedia) await access(file(key));
  await call("/api/memories/unrelated-diary", 200);
  await call("/api/assets/unrelated", 200);
  console.log(`PASS: ${checks} admin user lifecycle API checks, atomic audit and media retry verified.`);
} catch (error) {
  console.error(serverOutput);
  throw error;
} finally {
  if (server?.exitCode === null && server.signalCode === null) {
    const exited = once(server, "exit");
    server.kill();
    await exited;
  }
  db?.close();
  await rm(testRoot, { recursive: true, force: true });
}
