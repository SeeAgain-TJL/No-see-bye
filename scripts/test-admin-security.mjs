import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { once } from "node:events";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { smtpInbox } from "./test-support/smtp.mjs";

const release = Boolean(process.env.TEST_RELEASE_DIR);
const workspace = path.resolve(process.env.TEST_RELEASE_DIR || process.cwd());
const runtime = release ? path.join(workspace, "runtime", process.platform === "win32" ? "node.exe" : "node") : process.execPath;
const root = path.resolve("data", "admin-security-" + randomUUID());
assert(root.startsWith(path.resolve("data") + path.sep));
await mkdir(root, { recursive: true });
const databasePath = path.join(root, "test.db");
const port = Number(process.env.TEST_ADMIN_PORT || 3103), base = "http://127.0.0.1:" + port;
const secret = randomBytes(48).toString("hex"), originalPassword = randomBytes(18).toString("hex"), changedPassword = randomBytes(18).toString("hex");
const env = { ...process.env, NODE_ENV: "production", DATABASE_URL: "file:" + databasePath.replaceAll("\\", "/"), STORAGE_DRIVER: "local", STORAGE_LOCAL_DIR: path.join(root, "uploads"), JWT_SECRET: secret, COOKIE_SECURE: "false", APP_ORIGIN: base,
  USER_QUOTA_MB: "0", ALLOW_REGISTRATION: "true", HOSTNAME: "127.0.0.1", PORT: String(port), SMTP_HOST: "", SMTP_USER: "", SMTP_PASSWORD: "", SMTP_FROM: "", PASSWORD_EMAIL_VERIFICATION: "false",
  ADMIN_USERNAME: "admin", ADMIN_EMAIL: "primary@example.test", ADMIN_BACKUP_EMAIL: "backup@example.test", ADMIN_PASSWORD: originalPassword, ADMIN_PASSWORD_HASH: "" };
const initialize = () => spawnSync(runtime, ["scripts/init-db.mjs"], { cwd: workspace, env, encoding: "utf8" });
const bootstrap = extras => spawnSync(runtime, ["scripts/bootstrap-admin.mjs"], { cwd: workspace, env: { ...env, ...extras }, encoding: "utf8" });
assert.equal(initialize().status, 0);
assert.equal(initialize().status, 0);
const created = bootstrap(); assert.equal(created.status, 0, created.stderr); assert(!created.stdout.includes(originalPassword));
const db = new DatabaseSync(databasePath);
db.exec("PRAGMA busy_timeout=5000");
const admin = db.prepare("SELECT * FROM User WHERE username='admin'").get();
assert.equal(admin.role, "admin"); assert.equal(admin.emailVerifiedAt, null); assert.equal(admin.backupEmailVerifiedAt, null); assert(await bcrypt.compare(originalPassword, admin.passwordHash));
assert.equal(bootstrap({ ADMIN_PASSWORD: changedPassword }).status, 0);
assert.equal(db.prepare("SELECT passwordHash FROM User WHERE id=?").get(admin.id).passwordHash, admin.passwordHash, "Bootstrap must never reset an existing admin password");
const ordinaryHash = await bcrypt.hash(originalPassword, 12), now = Date.now();
db.prepare("INSERT INTO User (id,username,email,passwordHash,displayName,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)").run("ordinary", "ordinary", "ordinary@accounts.local", ordinaryHash, "Ordinary", now, now);
assert.notEqual(bootstrap({ ADMIN_USERNAME: "ordinary" }).status, 0, "A regular user must never be promoted implicitly");
assert.notEqual(bootstrap({ ADMIN_USERNAME: "new_admin", ADMIN_EMAIL: admin.email }).status, 0, "Recovery addresses must not take over another account");
db.prepare("INSERT INTO Entry (id,userId,content,visibility,happenedAt,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)").run("private-entry", "ordinary", "Private body must never be returned by the admin summary", "private", now, now, now);
db.prepare("INSERT INTO Entry (id,userId,content,visibility,happenedAt,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)").run("public-entry", "ordinary", "Public record", "public", now, now, now);
let server, serverOutput = "", checks = 0;
async function start(extras = {}) {
  serverOutput = "";
  server = spawn(runtime, release ? ["server.js"] : ["node_modules/next/dist/bin/next", "start", "-p", String(port)], { cwd: workspace, env: { ...env, ...extras }, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout.on("data", value => { serverOutput += value; }); server.stderr.on("data", value => { serverOutput += value; });
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try { if ((await fetch(base + "/api/auth/me")).ok) return; } catch {}
    if (server.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error("Test server failed to start: " + serverOutput);
}
async function stop() { if (server && server.exitCode === null && server.signalCode === null) { const exited = once(server, "exit"); server.kill(); await exited; } }
async function call(url, { method = "GET", cookie, body, status = 200, origin = base } = {}) {
  const response = await fetch(base + url, { method, headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let data; try { data = await response.json(); } catch { data = null; }
  assert.equal(response.status, status, `${method} ${url} => ${JSON.stringify(data)}`); checks++;
  return { data, cookie: response.headers.get("set-cookie")?.split(";")[0], response };
}
async function login(username, password = originalPassword) { return call("/api/auth/login", { method: "POST", body: { emailOrUsername: username, password } }); }
const inbox = await smtpInbox();
try {
  await start();
  await call("/api/admin/overview", { status: 401 }); await call("/api/admin/users", { status: 401 });
  const activityDate = new Date(now + 8 * 3_600_000).toISOString().slice(0, 10);
  const activityPath = "/api/admin/activity?date=" + activityDate;
  await call(activityPath, { status: 401 });
  let adminSession = await login("admin"), userSession = await login("ordinary");
  await call("/api/admin/overview", { cookie: userSession.cookie, status: 403 });
  await call("/api/admin/users", { cookie: userSession.cookie, status: 403 });
  await call(activityPath, { cookie: userSession.cookie, status: 403 });
  const forgedRole = "memory_session=" + jwt.sign({ userId: "ordinary", email: "ordinary@accounts.local", sessionVersion: 0, role: "admin" }, secret, { algorithm: "HS256", expiresIn: "5m" });
  await call("/api/admin/overview", { cookie: forgedRole, status: 403 });
  await call(activityPath, { cookie: forgedRole, status: 403 });
  const overview = await call("/api/admin/overview", { cookie: adminSession.cookie });
  assert.equal(overview.data.summary.users, 2); assert.equal(overview.data.summary.entries, 2); assert.equal(overview.data.summary.privateEntries, 1); assert.equal(overview.data.summary.publicEntries, 1); assert.equal(overview.data.daily.length, 30);
  assert.equal(overview.data.mail.configured, false); assert.equal(overview.response.headers.get("cache-control"), "private, no-store");
  const list = await call("/api/admin/users?page=1&pageSize=1&q=ordinary", { cookie: adminSession.cookie });
  assert.equal(list.data.total, 1); assert.equal(list.data.items[0].entries, 2); assert.equal(list.data.items[0].loginCount, 1); assert(list.data.items[0].lastLoginAt); assert(list.data.items[0].lastSeenAt);
  assert(!JSON.stringify(list.data).includes("passwordHash")); assert(!JSON.stringify(list.data).includes("Private body")); assert(!JSON.stringify(list.data).includes("backupEmail"));
  assert.equal((await call("/api/admin/users?page=999&pageSize=1", { cookie: adminSession.cookie })).data.page, 2);
  const recentUsers = await call("/api/admin/users?activity=recent", { cookie: adminSession.cookie });
  assert(recentUsers.data.items.every(person => Date.parse(person.lastSeenAt) > Date.now() - 15 * 60_000 - 3000 && Date.parse(person.lastSeenAt) <= Date.now()));
  await call("/api/admin/users?activity=invalid", { cookie: adminSession.cookie, status: 400 });
  await call("/api/admin/users?pageSize=101", { cookie: adminSession.cookie, status: 400 });
  assert.equal((await call("/api/admin/users?q=" + encodeURIComponent("' OR 1=1--"), { cookie: adminSession.cookie })).data.total, 0);
  const exactUser = await call("/api/admin/users?userId=ordinary&q=nomatch", { cookie: adminSession.cookie });
  assert.deepEqual(exactUser.data.items.map(item => item.id), ["ordinary"]);
  assert.equal((await call("/api/admin/users?userId=ord", { cookie: adminSession.cookie })).data.total, 0);

  const activity = await call(activityPath, { cookie: adminSession.cookie });
  assert.equal(activity.response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual({ date: activity.data.date, users: activity.data.users, entries: activity.data.entries },
    overview.data.daily.find(day => day.date === activityDate));
  assert.deepEqual(activity.data.registrations.items.find(account => account.id === "ordinary"),
    { id: "ordinary", username: "ordinary", displayName: "Ordinary", createdAt: new Date(now).toISOString() });
  assert.deepEqual(activity.data.contributors, {
    items: [{ id: "ordinary", username: "ordinary", displayName: "Ordinary", entries: 2 }], page: 1, total: 1, totalPages: 1,
  });
  assert(!JSON.stringify(activity.data).includes("Private body") && !JSON.stringify(activity.data).includes("example.test"));
  await call("/api/admin/activity?date=2026-02-31", { cookie: adminSession.cookie, status: 400 });
  await call("/api/admin/activity?date=2020-01-01", { cookie: adminSession.cookie, status: 400 });
  await call(activityPath + "&contributorPage=0", { cookie: adminSession.cookie, status: 400 });

  // Exercise both persisted timestamp formats at the Beijing day boundary, including a trash entry.
  const boundaryDay = new Date(now + 8 * 3_600_000 - 2 * 86_400_000).toISOString().slice(0, 10);
  const midnight = Date.parse(boundaryDay + "T00:00:00+08:00");
  const addUser = db.prepare("INSERT INTO User (id,username,email,passwordHash,displayName,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)");
  const addEntry = db.prepare("INSERT INTO Entry (id,userId,content,happenedAt,createdAt,updatedAt,deletedAt) VALUES (?,?,?,?,?,?,?)");
  addEntry.run("before-boundary", "ordinary", "Previous day", now, midnight - 1, now, null);
  for (let number = 0; number < 9; number++) {
    const id = "activity-" + number;
    const createdAt = number === 0 ? new Date(midnight).toISOString().replace("T", " ").slice(0, 23) : midnight + number;
    addUser.run(id, id, id + "@example.test", ordinaryHash, id, createdAt, now);
    addEntry.run("entry-" + id, id, "Hidden journal contents", now, createdAt, now, number === 0 ? now : null);
  }
  const boundaryPath = "/api/admin/activity?date=" + boundaryDay;
  const boundary = (await call(boundaryPath + "&registrationPage=2&contributorPage=2", { cookie: adminSession.cookie })).data;
  assert.equal(boundary.registrations.total, 9);
  assert.equal(boundary.contributors.total, 9);
  assert.equal(boundary.entries, 9);
  assert.deepEqual(boundary.registrations.items, [{ id: "activity-0", username: "activity-0", displayName: "activity-0", createdAt: new Date(midnight).toISOString() }]);
  assert.equal(boundary.registrations.page, 2);
  assert.equal(boundary.contributors.items[0].id, "activity-8");
  assert.equal(boundary.contributors.totalPages, 2);
  const updatedOverview = (await call("/api/admin/overview", { cookie: adminSession.cookie })).data;
  assert.deepEqual(updatedOverview.daily.find(day => day.date === boundaryDay), { date: boundaryDay, users: 9, entries: 9 });
  const emptyActivity = (await call("/api/admin/activity?date=" + updatedOverview.daily[0].date, { cookie: adminSession.cookie })).data;
  assert.deepEqual(emptyActivity.contributors, { items: [], page: 1, total: 0, totalPages: 1 });
  db.prepare("UPDATE User SET role='user' WHERE id=?").run(admin.id);
  await call("/api/admin/overview", { cookie: adminSession.cookie, status: 403 });
  await call(activityPath, { cookie: adminSession.cookie, status: 403 });
  db.prepare("UPDATE User SET role='admin' WHERE id=?").run(admin.id);
  const account = (await call("/api/account", { cookie: adminSession.cookie })).data;
  assert.equal(account.user.role, "admin"); assert.equal(account.security.requiresEmailVerification, false); assert.deepEqual(account.security.recoveryEmails, [admin.email, admin.backupEmail]); assert.deepEqual(account.security.verifiedEmails, []);
  await call("/api/account", { cookie: userSession.cookie, method: "PATCH", body: { action: "profile", displayName: "Ordinary", role: "admin" } });
  assert.equal((await call("/api/auth/me", { cookie: userSession.cookie })).data.user.role, "user");
  await call("/api/account", { cookie: adminSession.cookie, method: "PATCH", body: { action: "password", currentPassword: originalPassword, newPassword: changedPassword }, origin: "https://evil.example", status: 403 });
  await call("/api/account", { cookie: adminSession.cookie, method: "PATCH", body: { action: "password", currentPassword: "incorrect", newPassword: changedPassword }, status: 400 });
  await call("/api/account/password-challenge", { cookie: adminSession.cookie, method: "POST", body: {}, status: 403 });
  const rotated = await call("/api/account", { cookie: adminSession.cookie, method: "PATCH", body: { action: "password", currentPassword: originalPassword, newPassword: changedPassword } });
  await call("/api/admin/overview", { cookie: adminSession.cookie, status: 401 });
  await call("/api/admin/overview", { cookie: rotated.cookie });
  await call("/api/auth/login", { method: "POST", body: { emailOrUsername: "admin", password: originalPassword }, status: 401 });
  adminSession = await login("admin", changedPassword);
  await stop();

  // An enabled mail gate must fail closed when SMTP is unavailable.
  await start({ PASSWORD_EMAIL_VERIFICATION: "true" });
  await call("/api/account/password-challenge", { cookie: adminSession.cookie, method: "POST", body: { currentPassword: changedPassword, newPassword: originalPassword, email: admin.email }, status: 503 });
  await call("/api/account", { cookie: adminSession.cookie, method: "PATCH", body: { action: "password", currentPassword: changedPassword, newPassword: originalPassword }, status: 400 });
  await stop();

  const mailEnv = { PASSWORD_EMAIL_VERIFICATION: "true", SMTP_HOST: "127.0.0.1", SMTP_PORT: String(inbox.port), SMTP_SECURE: "false", SMTP_FROM: "test@example.test" };
  await start(mailEnv);
  const fields = { currentPassword: changedPassword, newPassword: originalPassword, email: admin.backupEmail };
  await call("/api/account/password-challenge", { cookie: adminSession.cookie, method: "POST", body: fields, origin: "https://evil.example", status: 403 });
  await call("/api/account/password-challenge", { cookie: adminSession.cookie, method: "POST", body: { ...fields, email: "unrelated@example.test" }, status: 400 });
  const issued = await call("/api/account/password-challenge", { cookie: adminSession.cookie, method: "POST", body: fields });
  assert.equal(inbox.messages.at(-1).to, admin.backupEmail); assert.equal(issued.data.code, undefined); assert.equal(issued.data.codeHash, undefined);
  assert(new Date(issued.data.expiresAt).getTime() - Date.now() > 9 * 60_000);
  const code = inbox.code(); assert.notEqual(db.prepare("SELECT codeHash FROM PasswordChallenge WHERE userId=?").get(admin.id).codeHash, code);
  await call("/api/account/password-challenge", { cookie: adminSession.cookie, method: "POST", body: fields, status: 429 });
  await call("/api/account", { cookie: adminSession.cookie, method: "PATCH", body: { action: "password", ...fields, newPassword: originalPassword + "a", challengeId: issued.data.challengeId, code }, status: 400 });
  await call("/api/account", { cookie: adminSession.cookie, method: "PATCH", body: { action: "password", ...fields, challengeId: issued.data.challengeId, code: code === "000000" ? "111111" : "000000" }, status: 400 });
  const concurrent = await Promise.all([0, 1].map(() => fetch(base + "/api/account", { method: "PATCH", headers: { Origin: base, Cookie: adminSession.cookie, "Content-Type": "application/json" }, body: JSON.stringify({ action: "password", ...fields, challengeId: issued.data.challengeId, code }) })));
  checks += 2;
  assert.equal(concurrent.filter(response => response.status === 200).length, 1, "A proof must succeed exactly once under concurrent use");
  assert(concurrent.every(response => [200, 401, 410].includes(response.status)));
  const changed = { cookie: concurrent.find(response => response.status === 200).headers.get("set-cookie")?.split(";")[0] };
  for (const response of concurrent) await response.arrayBuffer();
  await call("/api/account", { cookie: adminSession.cookie, status: 401 });
  assert.equal(db.prepare("SELECT sessionVersion FROM User WHERE id=?").get(admin.id).sessionVersion, 2);
  assert.deepEqual((await call("/api/account", { cookie: changed.cookie })).data.security.verifiedEmails, [admin.backupEmail]);
  await call("/api/account", { cookie: changed.cookie, method: "PATCH", body: { action: "password", currentPassword: originalPassword, newPassword: changedPassword, email: admin.backupEmail, challengeId: issued.data.challengeId, code }, status: 410 });

  // Ordinary accounts can verify their first contact email while changing the password.
  const userFields = { currentPassword: originalPassword, newPassword: changedPassword, email: "ordinary@example.test" };
  const initial = await call("/api/account/password-challenge", { cookie: userSession.cookie, method: "POST", body: userFields });
  const userCode = inbox.code();
  const wrongCode = userCode === "000000" ? "111111" : "000000";
  for (let i = 0; i < 5; i++) await call("/api/account", { cookie: userSession.cookie, method: "PATCH", body: { action: "password", ...userFields, challengeId: initial.data.challengeId, code: wrongCode }, status: 400 });
  await call("/api/account", { cookie: userSession.cookie, method: "PATCH", body: { action: "password", ...userFields, challengeId: initial.data.challengeId, code: userCode }, status: 410 });
  assert.equal(db.prepare("SELECT email FROM User WHERE id='ordinary'").get().email, "ordinary@accounts.local");
  db.prepare("UPDATE PasswordChallenge SET createdAt=? WHERE userId='ordinary'").run(Date.now() - 61_000);
  const resent = await call("/api/account/password-challenge", { cookie: userSession.cookie, method: "POST", body: userFields });
  const renewedCode = inbox.code();
  db.prepare("UPDATE PasswordChallenge SET expiresAt=? WHERE userId='ordinary'").run(Date.now() - 1000);
  await call("/api/account", { cookie: userSession.cookie, method: "PATCH", body: { action: "password", ...userFields, challengeId: resent.data.challengeId, code: renewedCode }, status: 410 });
  db.prepare("UPDATE PasswordChallenge SET createdAt=? WHERE userId='ordinary'").run(Date.now() - 61_000);
  const latest = await call("/api/account/password-challenge", { cookie: userSession.cookie, method: "POST", body: userFields });
  const confirmed = await call("/api/account", { cookie: userSession.cookie, method: "PATCH", body: { action: "password", ...userFields, challengeId: latest.data.challengeId, code: inbox.code() } });
  const bound = (await call("/api/account", { cookie: confirmed.cookie })).data;
  assert.equal(bound.user.email, userFields.email); assert.deepEqual(bound.security.verifiedEmails, [userFields.email]);
  await call("/api/admin/overview", { cookie: confirmed.cookie, status: 403 });

  // A delivery failure never leaves an accepted proof behind.
  db.prepare("UPDATE PasswordChallenge SET createdAt=? WHERE userId='ordinary'").run(Date.now() - 61_000);
  inbox.reject(true);
  await call("/api/account/password-challenge", { cookie: confirmed.cookie, method: "POST", body: { currentPassword: changedPassword, newPassword: originalPassword, email: userFields.email }, status: 502 });
  assert.equal(db.prepare("SELECT count(*) AS count FROM PasswordChallenge WHERE userId='ordinary'").get().count, 0);
  console.log(`PASS: ${checks} admin and password-security API checks, plus bootstrap idempotency, metadata privacy, mail capture, expiry, attempts, contact binding and session revocation.`);
} catch (error) {
  console.error(serverOutput);
  throw error;
} finally {
  await stop(); await inbox.close(); db.close(); await rm(root, { recursive: true, force: true });
}
