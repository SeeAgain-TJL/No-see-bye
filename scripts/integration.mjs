import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdir, rm, readdir } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
const workspace = process.cwd();
const testRoot = path.resolve("data", "integration-" + randomUUID());
assert(testRoot.startsWith(path.resolve("data") + path.sep));
await mkdir(testRoot, { recursive: true });
const port = Number(process.env.TEST_PORT || 3101);
const base = "http://localhost:" + port;
const env = {
  ...process.env,
  NODE_ENV: "production",
  DATABASE_URL: "file:" + path.join(testRoot, "test.db").replaceAll("\\", "/"),
  STORAGE_DRIVER: "local",
  STORAGE_LOCAL_DIR: path.join(testRoot, "uploads"),
  JWT_SECRET: randomBytes(48).toString("hex"),
  COOKIE_SECURE: "false",
  APP_ORIGIN: base,
  USER_QUOTA_MB: "1",
  ALLOW_REGISTRATION: "true",
};
const initialized = spawnSync(process.execPath, ["scripts/init-db.mjs"], {
  cwd: workspace,
  env,
  encoding: "utf8",
});
assert.equal(initialized.status, 0, initialized.stderr);
// Running setup twice must preserve records and remain safe.
assert.equal(
  spawnSync(process.execPath, ["scripts/init-db.mjs"], { cwd: workspace, env })
    .status,
  0,
);
// Upgrade a separate legacy database and verify that existing records survive.
const legacyPath = path.join(testRoot, "legacy.db");
const legacy = new DatabaseSync(legacyPath);
legacy.exec(`CREATE TABLE User (id TEXT PRIMARY KEY, email TEXT, username TEXT, passwordHash TEXT, avatarKey TEXT, createdAt DATETIME, updatedAt DATETIME);
CREATE TABLE Entry (id TEXT PRIMARY KEY, userId TEXT, content TEXT, media TEXT, visibility TEXT, createdAt DATETIME, updatedAt DATETIME);
INSERT INTO User VALUES ('legacy-user','legacy@example.test','legacy_user','test-hash',NULL,1000000,1000000);
INSERT INTO Entry VALUES ('legacy-entry','legacy-user','preserve this record','[]','private',1000000,1000000);`);
legacy.close();
assert.equal(
  spawnSync(process.execPath, ["scripts/init-db.mjs"], {
    cwd: workspace,
    env: { ...env, DATABASE_URL: "file:" + legacyPath.replaceAll("\\", "/") },
  }).status,
  0,
);
const upgraded = new DatabaseSync(legacyPath);
assert.equal(
  upgraded.prepare("SELECT content FROM Entry WHERE id=?").get("legacy-entry")
    .content,
  "preserve this record",
);
assert.equal(
  upgraded
    .prepare("SELECT happenedAt FROM Entry WHERE id=?")
    .get("legacy-entry").happenedAt,
  1000000,
);
upgraded.close();
let output = "";
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
  { cwd: workspace, env, stdio: ["ignore", "pipe", "pipe"] },
);
server.stdout.on("data", (b) => {
  output += b;
});
server.stderr.on("data", (b) => {
  output += b;
});
let passed = 0;
async function call(
  url,
  { cookie, method = "GET", body, headers = {}, status = 200 } = {},
) {
  const res = await fetch(base + url, {
    method,
    headers: {
      Origin: base,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  assert.equal(
    res.status,
    status,
    method + " " + url + ": " + JSON.stringify(data),
  );
  passed++;
  return { data, cookie: res.headers.get("set-cookie")?.split(";")[0], res };
}
const memoryInput = (extras = {}) => ({
  title: "普通的一天",
  content: "散步时，看见一束光。",
  happenedAt: "2026-11-13T08:00:00+08:00",
  ...extras,
});
async function uploadFile(cookie, body, mime = "image/png", status = 201) {
  const res = await fetch(base + "/api/assets", {
    method: "POST",
    headers: {
      Cookie: cookie,
      "Content-Type": mime,
      "X-File-Name": encodeURIComponent("测试照片.png"),
    },
    body,
  });
  const data = await res.json();
  assert.equal(res.status, status, JSON.stringify(data));
  passed++;
  return data;
}
try {
  const deadline = Date.now() + 30000;
  while (true) {
    try {
      if ((await fetch(base + "/api/auth/me")).ok) break;
    } catch {}
    if (Date.now() > deadline)
      throw new Error("Server did not start: " + output);
    await new Promise((r) => setTimeout(r, 300));
  }
  const a = await call("/api/auth/register", {
    method: "POST",
    body: {
      username: "person_a",
      email: "a@example.test",
      password: "IndependentPass123",
    },
    status: 201,
  });
  const b = await call("/api/auth/register", {
    method: "POST",
    body: {
      username: "person_b",
      email: "b@example.test",
      password: "IndependentPass123",
    },
    status: 201,
  });
  assert(a.cookie && b.cookie);
  assert.match(a.res.headers.get("set-cookie"), /HttpOnly/i);
  assert.equal(a.data.token, undefined);
  await call("/api/auth/login", {
    method: "POST",
    body: { emailOrUsername: "a@example.test", password: "wrong-password" },
    status: 401,
  });
  await call("/api/auth/login", {
    method: "POST",
    body: { emailOrUsername: "PERSON_A", password: "IndependentPass123" },
  });
  await call("/api/auth/register", {
    method: "POST",
    body: {
      username: "person_a",
      email: "other@example.test",
      password: "IndependentPass123",
    },
    status: 409,
  });
  await call("/api/memories", { status: 401 });
  await call("/api/memories", {
    cookie: a.cookie,
    method: "POST",
    body: memoryInput(),
    headers: { Origin: "https://evil.example" },
    status: 403,
  });
  await call("/api/memories", {
    cookie: a.cookie,
    method: "POST",
    body: { happenedAt: "2026-11-13T00:00:00Z" },
    status: 400,
  });
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5WbooAAAAASUVORK5CYII=",
    "base64",
  );
  const asset = await uploadFile(a.cookie, png);
  await uploadFile(
    a.cookie,
    Buffer.from("<script>alert(1)</script>"),
    "image/png",
    415,
  );
  await uploadFile(a.cookie, png, "image/svg+xml", 415);
  await uploadFile(
    a.cookie,
    Buffer.concat([png, Buffer.alloc(1024 ** 2)]),
    "image/png",
    413,
  );
  const memory = (
    await call("/api/memories", {
      cookie: a.cookie,
      method: "POST",
      body: memoryInput({
        assetIds: [asset.id],
        tags: ["散步", "生活"],
        location: "公园",
      }),
      status: 201,
    })
  ).data;
  assert.equal(memory.visibility, "private");
  assert.equal(memory.assets.length, 1);
  assert.equal(
    (await call("/api/memories", { cookie: b.cookie })).data.items.length,
    0,
  );
  await call("/api/memories/" + memory.id, { cookie: b.cookie, status: 404 });
  await call("/api/memories/" + memory.id, { status: 404 });
  await call("/api/assets/" + asset.id, { cookie: b.cookie, status: 404 });
  await call("/api/assets/" + asset.id, { status: 404 });
  await call("/api/memories", {
    cookie: b.cookie,
    method: "POST",
    body: memoryInput({ assetIds: [asset.id] }),
    status: 400,
  });
  await call("/api/memories/" + memory.id, {
    cookie: b.cookie,
    method: "PATCH",
    body: { action: "pin" },
    status: 404,
  });
  await call("/api/memories/" + memory.id, {
    cookie: b.cookie,
    method: "DELETE",
    status: 404,
  });
  await call("/api/memories/" + memory.id, {
    cookie: a.cookie,
    method: "PATCH",
    body: memoryInput({ updatedAt: "2000-01-01T00:00:00.000Z" }),
    status: 409,
  });
  const updated = (
    await call("/api/memories/" + memory.id, {
      cookie: a.cookie,
      method: "PATCH",
      body: memoryInput({
        title: "愿意分享的一天",
        visibility: "public",
        assetIds: [asset.id],
        tags: ["散步"],
        location: "公园",
        updatedAt: memory.updatedAt,
      }),
    })
  ).data;
  assert.equal(updated.title, "愿意分享的一天");
  assert.equal(
    (await call("/api/memories?scope=public")).data.items[0].id,
    memory.id,
  );
  await call("/api/memories/" + memory.id);
  const full = await fetch(base + asset.url);
  assert.equal(full.status, 200);
  assert.deepEqual(Buffer.from(await full.arrayBuffer()), png);
  passed++;
  const range = await fetch(base + asset.url, {
    headers: { Range: "bytes=2-9" },
  });
  assert.equal(range.status, 206);
  assert.equal(range.headers.get("content-range"), "bytes 2-9/" + png.length);
  assert.deepEqual(Buffer.from(await range.arrayBuffer()), png.subarray(2, 10));
  passed++;
  const suffix = await fetch(base + asset.url, {
    headers: { Range: "bytes=-5" },
  });
  assert.equal(suffix.status, 206);
  assert.deepEqual(Buffer.from(await suffix.arrayBuffer()), png.subarray(-5));
  passed++;
  for (const value of [
    "bytes=9999-",
    "bytes=-0",
    "bytes=3-1",
    "bytes=1-2,4-5",
  ]) {
    const r = await fetch(base + asset.url, { headers: { Range: value } });
    assert.equal(r.status, 416);
    passed++;
  }
  const head = await fetch(base + asset.url, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(Number(head.headers.get("x-file-size")), png.length);
  passed++;
  assert.equal(
    (
      await call("/api/memories?type=photo&q=" + encodeURIComponent("散步"), {
        cookie: a.cookie,
      })
    ).data.items.length,
    1,
  );
  await call("/api/memories/" + memory.id, {
    cookie: a.cookie,
    method: "PATCH",
    body: { action: "pin" },
  });
  assert.equal(
    (await call("/api/memories?pinned=1", { cookie: a.cookie })).data.items
      .length,
    1,
  );
  await call("/api/memories/" + memory.id, {
    cookie: a.cookie,
    method: "DELETE",
  });
  assert.equal((await call("/api/memories?scope=public")).data.items.length, 0);
  await call("/api/assets/" + asset.id, { status: 404 });
  await call("/api/memories/" + memory.id, { cookie: b.cookie, status: 404 });
  assert.equal(
    (await call("/api/memories?scope=trash", { cookie: a.cookie })).data.items
      .length,
    1,
  );
  await call("/api/memories/" + memory.id, {
    cookie: a.cookie,
    method: "PATCH",
    body: { action: "restore" },
  });
  const restored = await fetch(base + asset.url);
  assert.equal(restored.status, 200);
  await restored.arrayBuffer();
  passed++;
  // Same-time records exercise the ID tie-breaker in cursor pagination.
  for (let i = 0; i < 14; i++)
    await call("/api/memories", {
      cookie: a.cookie,
      method: "POST",
      body: memoryInput({ title: "分页 " + i }),
      status: 201,
    });
  const first = (await call("/api/memories", { cookie: a.cookie })).data;
  assert.equal(first.items.length, 12);
  assert(first.nextCursor);
  const second = (
    await call("/api/memories?cursor=" + first.nextCursor, { cookie: a.cookie })
  ).data;
  assert.equal(
    new Set([...first.items, ...second.items].map((m) => m.id)).size,
    15,
  );
  assert.equal(second.nextCursor, null);
  const boundary = (
    await call("/api/memories", {
      cookie: a.cookie,
      method: "POST",
      body: memoryInput({
        happenedAt: "2026-10-31T17:00:00Z",
        title: "北京时间十一月一日",
      }),
      status: 201,
    })
  ).data;
  const october = (
    await call("/api/memories?month=2026-10", { cookie: a.cookie })
  ).data;
  assert(!october.items.some((m) => m.id === boundary.id));
  assert.equal(
    (
      await call(
        "/api/memories?month=2026-11&q=" +
          encodeURIComponent("北京时间十一月一日"),
        { cookie: a.cookie },
      )
    ).data.items[0].id,
    boundary.id,
  );
  await call("/api/memories?month=invalid", { cookie: a.cookie, status: 400 });
  await call("/api/memories?cursor=invalid", { cookie: a.cookie, status: 400 });
  // Reservations must prevent two overlapping uploads from exceeding one user's quota.
  const c = await call("/api/auth/register", {
    method: "POST",
    body: {
      username: "quota_user",
      email: "quota@example.test",
      password: "IndependentPass123",
    },
    status: 201,
  });
  const largePng = Buffer.concat([png, Buffer.alloc(650 * 1024)]);
  const concurrent = await Promise.all(
    [1, 2].map(() =>
      fetch(base + "/api/assets", {
        method: "POST",
        headers: { Cookie: c.cookie, "Content-Type": "image/png" },
        body: largePng,
      }),
    ),
  );
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [201, 413]);
  await Promise.all(concurrent.map((r) => r.arrayBuffer()));
  passed++;
  const files = await readdir(path.join(testRoot, "uploads"), {
    recursive: true,
  });
  assert(!files.some((f) => f.includes(".upload-")));
  const orphan = await uploadFile(b.cookie, png);
  const admin = new DatabaseSync(path.join(testRoot, "test.db"));
  admin
    .prepare("UPDATE Asset SET createdAt = ?")
    .run(Date.now() - 48 * 3600_000);
  admin.close();
  const cleanup = spawnSync(process.execPath, ["scripts/cleanup-assets.mjs"], {
    cwd: workspace,
    env,
    encoding: "utf8",
  });
  assert.equal(cleanup.status, 0, cleanup.stderr);
  await call("/api/assets/" + orphan.id, { cookie: b.cookie, status: 404 });
  const kept = await fetch(base + asset.url);
  assert.equal(kept.status, 200);
  await kept.arrayBuffer();
  passed++;
  await call("/api/auth/logout", { cookie: a.cookie, method: "POST" });
  await call("/api/upload/sign", { method: "POST", status: 410 });
  console.log(
    "PASS: " +
      passed +
      " API checks (auth, ownership, privacy, uploads, quota races, Range, edits, trash, filters and pagination).",
  );
} catch (error) {
  console.error(output);
  throw error;
} finally {
  if (server.exitCode === null && server.signalCode === null) {
    const exited = new Promise((resolve) => server.once("exit", resolve));
    server.kill();
    await exited;
  }
  await rm(testRoot, { recursive: true, force: true });
}
