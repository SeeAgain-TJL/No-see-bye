import assert from "node:assert/strict";
import sharp from "sharp";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdir, rm, readdir, access, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
const releaseMode = Boolean(process.env.TEST_RELEASE_DIR);
const workspace = path.resolve(process.env.TEST_RELEASE_DIR || process.cwd());
const runtime = releaseMode
  ? path.join(workspace, "runtime", process.platform === "win32" ? "node.exe" : "node")
  : process.execPath;
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
  HOSTNAME: "127.0.0.1",
  PORT: String(port),
};
if (releaseMode) {
  const preflight = spawnSync(runtime, ["scripts/check-runtime.mjs"], { cwd: workspace, env, encoding: "utf8" });
  assert.equal(preflight.status, 0, preflight.stderr);
  for (const invalid of [
    { JWT_SECRET: "replace-with-a-secret" },
    { DATABASE_URL: "file:../data/relative.db" },
    { STORAGE_LOCAL_DIR: "relative/uploads" },
    { APP_ORIGIN: base + "/" },
    { COOKIE_SECURE: "true" },
  ]) {
    const rejected = spawnSync(runtime, ["scripts/check-runtime.mjs"], { cwd: workspace, env: { ...env, ...invalid }, encoding: "utf8" });
    assert.notEqual(rejected.status, 0, "Unsafe production config was accepted");
  }
}
const initialized = spawnSync(runtime, ["scripts/init-db.mjs"], {
  cwd: workspace,
  env,
  encoding: "utf8",
});
assert.equal(initialized.status, 0, initialized.stderr);
// Running setup twice must preserve records and remain safe.
assert.equal(
  spawnSync(runtime, ["scripts/init-db.mjs"], { cwd: workspace, env })
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
  spawnSync(runtime, ["scripts/init-db.mjs"], {
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
  runtime,
  releaseMode ? ["server.js"] : ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
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
  if (releaseMode) {
    const health = await fetch(base + "/api/health");
    assert.equal(health.status, 200);
    assert.equal((await health.json()).status, "ok");
    const home = await fetch(base);
    assert.equal(home.status, 200);
    const html = await home.text();
    const staticPaths = [...new Set([...html.matchAll(/(?:src|href)="([^"?#]*\/_next\/static\/[^"?#]+)/g)].map((m) => m[1]))];
    assert(staticPaths.some((asset) => asset.endsWith(".css")), "Missing CSS reference");
    assert(staticPaths.some((asset) => asset.endsWith(".js")), "Missing JS reference");
    for (const asset of staticPaths) {
      const response = await fetch(new URL(asset, base));
      assert.equal(response.status, 200, "Missing bundled static asset: " + asset);
      await response.arrayBuffer();
    }
    assert.equal((await fetch(base + "/window.svg")).status, 200);
    passed += 3;
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
  const png = await sharp({create:{width:2400,height:1500,channels:3,background:"#59745a"}}).png().toBuffer();
  const asset = await uploadFile(a.cookie, png);
  assert(asset.thumbnailUrl, "Image upload must generate a preview");
  const thumb = await fetch(base + asset.thumbnailUrl,{headers:{Cookie:a.cookie}});
  assert.equal(thumb.status,200);assert.equal(thumb.headers.get("content-type"),"image/webp");
  const thumbBuffer = Buffer.from(await thumb.arrayBuffer());
  assert(thumbBuffer.length < png.length);
  const thumbInfo = await sharp(thumbBuffer).metadata();assert.equal(thumbInfo.width,960);assert.equal(thumbInfo.height,600);passed++;

  const displayUrl = asset.url + "?variant=display";
  const beforeDisplay = await readdir(env.STORAGE_LOCAL_DIR, { recursive: true });
  const firstDisplays = await Promise.all(Array.from({ length: 4 }, () =>
    fetch(base + displayUrl, { headers: { Cookie: a.cookie } })));
  for (const response of firstDisplays) assert.equal(response.status, 200);
  const displayBuffers = await Promise.all(firstDisplays.map(async response => Buffer.from(await response.arrayBuffer())));
  for (const buffer of displayBuffers) assert.deepEqual(buffer, displayBuffers[0]);
  const displayInfo = await sharp(displayBuffers[0]).metadata();
  assert.equal(displayInfo.width, 1920);
  assert.equal(displayInfo.height, 1200);
  const afterDisplay = await readdir(env.STORAGE_LOCAL_DIR, { recursive: true });
  assert.equal(afterDisplay.filter(file => !beforeDisplay.includes(file)).length, 1, "Concurrent viewers must share one derivative");
  const displayEtag = firstDisplays[0].headers.get("etag");
  assert(displayEtag);
  assert.match(firstDisplays[0].headers.get("cache-control"), /private.*no-cache.*must-revalidate/);
  assert(firstDisplays[0].headers.get("vary").split(",").some(value => value.trim() === "Cookie"));
  const cached = await fetch(base + displayUrl, { headers: { Cookie: a.cookie, "If-None-Match": displayEtag } });
  assert.equal(cached.status, 304);
  assert.equal((await cached.arrayBuffer()).byteLength, 0);
  const cachedWeak = await fetch(base + displayUrl, { headers: { Cookie: a.cookie, "If-None-Match": 'W/' + displayEtag } });
  assert.equal(cachedWeak.status, 304);
  const displayHead = await fetch(base + displayUrl, { method: "HEAD", headers: { Cookie: a.cookie } });
  assert.equal(displayHead.status, 200);
  assert.equal(Number(displayHead.headers.get("x-file-size")), displayBuffers[0].length);
  if (displayHead.headers.has("content-length")) assert.equal(Number(displayHead.headers.get("content-length")), displayBuffers[0].length);
  assert.equal((await displayHead.arrayBuffer()).byteLength, 0);
  const displayRange = await fetch(base + displayUrl, { headers: { Cookie: a.cookie, Range: "bytes=2-9" } });
  assert.equal(displayRange.status, 206);
  assert.deepEqual(Buffer.from(await displayRange.arrayBuffer()), displayBuffers[0].subarray(2, 10));
  passed += 7;
  await call(displayUrl, { status: 404, headers: { "If-None-Match": displayEtag } });
  await call(displayUrl, { cookie: b.cookie, status: 404, headers: { "If-None-Match": displayEtag } });
  await call(asset.url + "?variant=unknown", { cookie: a.cookie, status: 400 });
  // Missing derivatives self-heal without changing or serving the original.
  const previewDb = new DatabaseSync(env.DATABASE_URL.slice(5));
  const savedDisplay = previewDb.prepare("SELECT key, coverKey FROM Asset WHERE id=?").get(asset.id);
  await rm(path.join(env.STORAGE_LOCAL_DIR, savedDisplay.coverKey));
  const repaired = await fetch(base + displayUrl, { headers: { Cookie: a.cookie, "If-None-Match": displayEtag } });
  assert.equal(repaired.status, 200);
  assert.notEqual(repaired.headers.get("etag"), displayEtag);
  assert.deepEqual(Buffer.from(await repaired.arrayBuffer()), displayBuffers[0]);
  const repairedRow = previewDb.prepare("SELECT key, coverKey FROM Asset WHERE id=?").get(asset.id);
  assert.equal(repairedRow.key, savedDisplay.key);
  assert.notEqual(repairedRow.coverKey, savedDisplay.coverKey);
  await access(path.join(env.STORAGE_LOCAL_DIR, savedDisplay.key));
  previewDb.close();
  passed++;

  await call(asset.thumbnailUrl,{status:404});
  await call(asset.thumbnailUrl,{cookie:b.cookie,status:404});
  const video = await uploadFile(a.cookie,Buffer.from("1a45dfa300000000000000000000000000000000000000000000000000000000","hex"),"video/webm");
  await call(video.url+"?variant=display", {cookie:a.cookie,status:400});
  const posterResponse = await fetch(base+video.url+"/preview",{method:"POST",headers:{Cookie:a.cookie,Origin:base,"Content-Type":"image/png"},body:png});
  assert.equal(posterResponse.status,200);const poster=await posterResponse.json();assert(poster.thumbnailUrl);passed++;
  await call(video.url+"/preview",{method:"POST",cookie:b.cookie,body:{},status:404});
  const privatePoster = await fetch(base+poster.thumbnailUrl,{headers:{Cookie:a.cookie}});assert.equal(privatePoster.status,200);await privatePoster.arrayBuffer();passed++;
  await call(poster.thumbnailUrl,{cookie:b.cookie,status:404});
  const badPoster = await fetch(base+video.url+"/preview",{method:"POST",headers:{Cookie:a.cookie,Origin:base,"Content-Type":"image/png"},body:Buffer.from("bad")});assert.equal(badPoster.status,415);passed++;
  const sourcePoster = await fetch(base+poster.thumbnailUrl,{headers:{Cookie:a.cookie}});assert.equal(sourcePoster.status,200);await sourcePoster.arrayBuffer();passed++;

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

  const publicDisplay = await fetch(base + displayUrl);
  assert.equal(publicDisplay.status, 200);
  const publicEtag = publicDisplay.headers.get("etag");
  await publicDisplay.arrayBuffer();
  const publicCached = await fetch(base + displayUrl, { headers: { "If-None-Match": publicEtag } });
  assert.equal(publicCached.status, 304);
  passed += 2;
  const nowPrivate = (await call("/api/memories/" + memory.id, {
    cookie: a.cookie, method: "PATCH",
    body: memoryInput({ visibility: "private", assetIds: [asset.id], updatedAt: updated.updatedAt }),
  })).data;
  await call(displayUrl, { status: 404, headers: { "If-None-Match": publicEtag } });
  await call(displayUrl, { cookie: b.cookie, status: 404, headers: { "If-None-Match": publicEtag } });
  await call("/api/memories/" + memory.id, {
    cookie: a.cookie, method: "PATCH",
    body: memoryInput({ title: updated.title, visibility: "public", assetIds: [asset.id], tags: ["散步"], location: "公园", updatedAt: nowPrivate.updatedAt }),
  });

  const publicThumb = await fetch(base+asset.thumbnailUrl);assert.equal(publicThumb.status,200);await publicThumb.arrayBuffer();passed++;

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
    "bytes=" + (png.length + 10) + "-",
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
  const cleanup = spawnSync(runtime, ["scripts/cleanup-assets.mjs"], {
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
  // Bulk purge covers every page, remains owner-scoped, and never deletes restored
  // records or records trashed after the confirmation snapshot.
  await call("/api/memories/trash", { status: 401 });
  await call("/api/memories/trash", { method: "DELETE", body: { confirmation: "EMPTY_TRASH", before: new Date().toISOString() }, status: 401 });
  await call("/api/memories/trash", { cookie: a.cookie, method: "DELETE", body: {}, status: 400 });
  await call("/api/memories/trash", { cookie: a.cookie, method: "DELETE", body: { confirmation: "EMPTY_TRASH", before: new Date(Date.now() + 60000).toISOString() }, status: 400 });
  await call("/api/memories/trash", { cookie: a.cookie, method: "DELETE", headers: { Origin: "https://evil.example" }, body: {}, status: 403 });
  const purgeAsset = await uploadFile(a.cookie, png);
  const purgeDisplay = await fetch(base + purgeAsset.url + "?variant=display", {headers:{Cookie:a.cookie}});
  assert.equal(purgeDisplay.status,200);await purgeDisplay.arrayBuffer();passed++;
  const purgeIds = [];
  for (let i = 0; i < 14; i++) {
    const entry = (await call("/api/memories", { cookie: a.cookie, method: "POST", status: 201, body: memoryInput({ title: "清空测试 " + i, assetIds: i === 0 ? [purgeAsset.id] : [] }) })).data;
    purgeIds.push(entry.id);
    await call("/api/memories/" + entry.id, { cookie: a.cookie, method: "DELETE" });
  }
  const otherTrash = (await call("/api/memories", { cookie: b.cookie, method: "POST", status: 201, body: memoryInput({ title: "另一个用户的回收站" }) })).data;
  await call("/api/memories/" + otherTrash.id, { cookie: b.cookie, method: "DELETE" });
  const snapshot = (await call("/api/memories/trash", { cookie: a.cookie })).data;
  assert.equal(snapshot.count, 14);
  await call("/api/memories/" + purgeIds[13], { cookie: a.cookie, method: "PATCH", body: { action: "restore" } });
  const laterTrash = (await call("/api/memories", { cookie: a.cookie, method: "POST", status: 201, body: memoryInput({ title: "确认窗口打开后才删除" }) })).data;
  await call("/api/memories/" + laterTrash.id, { cookie: a.cookie, method: "DELETE" });
  const inspection = new DatabaseSync(env.DATABASE_URL.slice(5));
  const purgeRow = inspection.prepare("SELECT key, thumbnailKey, coverKey FROM Asset WHERE id=?").get(purgeAsset.id);
  const purged = (await call("/api/memories/trash?type=text&q=ignored", { cookie: a.cookie, method: "DELETE", body: { confirmation: "EMPTY_TRASH", before: snapshot.before } })).data;
  assert.equal(purged.deleted, 13);
  assert.equal(purged.pending, 0);
  assert.equal(inspection.prepare("SELECT count(*) AS n FROM Asset WHERE id=?").get(purgeAsset.id).n, 0);
  for (const key of [purgeRow.key, purgeRow.thumbnailKey, purgeRow.coverKey].filter(Boolean)) await assert.rejects(access(path.join(env.STORAGE_LOCAL_DIR, key)));
  await call("/api/assets/" + purgeAsset.id, { cookie: a.cookie, status: 404 });
  await call("/api/memories/" + purgeIds[0], { cookie: a.cookie, status: 404 });
  await call("/api/memories/" + purgeIds[0], { cookie: a.cookie, method: "PATCH", body: { action: "restore" }, status: 404 });
  await call("/api/memories/" + purgeIds[13], { cookie: a.cookie });
  await call("/api/memories/" + memory.id, { cookie: a.cookie });
  await call("/api/memories/" + otherTrash.id, { cookie: b.cookie });
  assert.equal((await call("/api/memories/trash", { cookie: a.cookie })).data.count, 1);
  assert.equal((await call("/api/memories/trash", { cookie: b.cookie })).data.count, 1);
  assert.equal((await call("/api/memories/trash", { cookie: a.cookie, method: "DELETE", body: { confirmation: "EMPTY_TRASH", before: snapshot.before } })).data.deleted, 0);
  // Force a filesystem failure: retained tombstones allow safe cleanup retries.
  const retryAsset = await uploadFile(a.cookie, png);
  const retryEntry = (await call("/api/memories", { cookie: a.cookie, method: "POST", status: 201, body: memoryInput({ assetIds: [retryAsset.id] }) })).data;
  await call("/api/memories/" + retryEntry.id, { cookie: a.cookie, method: "DELETE" });
  const retryRow = inspection.prepare("SELECT key FROM Asset WHERE id=?").get(retryAsset.id);
  const retryPath = path.join(env.STORAGE_LOCAL_DIR, retryRow.key);
  await rename(retryPath, retryPath + ".saved");
  await mkdir(retryPath);
  await writeFile(path.join(retryPath, "blocker"), "isolated test");
  const retrySnapshot = (await call("/api/memories/trash", { cookie: a.cookie })).data;
  const retryBody = { confirmation: "EMPTY_TRASH", before: retrySnapshot.before };
  const partial = (await call("/api/memories/trash", { cookie: a.cookie, method: "DELETE", body: retryBody })).data;
  assert.equal(partial.pending, 1);
  assert.equal(inspection.prepare("SELECT status FROM Asset WHERE id=?").get(retryAsset.id).status, "deleting");
  await call("/api/assets/" + retryAsset.id, { cookie: a.cookie, status: 404 });
  await rm(retryPath, { recursive: true });
  await rename(retryPath + ".saved", retryPath);
  assert.equal((await call("/api/memories/trash", { cookie: a.cookie, method: "DELETE", body: retryBody })).data.pending, 0);
  await assert.rejects(access(retryPath));
  inspection.close();
  await call("/api/account",{status:401});
  await call("/api/account",{cookie:a.cookie,method:"PATCH",body:{action:"profile",displayName:"新的昵称"},headers:{Origin:"https://evil.example"},status:403});
  await call("/api/account",{cookie:a.cookie,method:"PATCH",body:{action:"profile",displayName:"新的昵称"}});
  assert.equal((await call("/api/auth/me",{cookie:a.cookie})).data.user.displayName,"新的昵称");
  const account=(await call("/api/account",{cookie:a.cookie})).data;assert.equal(account.user.email,"a@example.test");assert(account.usedBytes>0);assert.equal(account.quotaBytes,1024**2);
  await call("/api/account",{cookie:a.cookie,method:"PATCH",body:{action:"password",currentPassword:"incorrect",newPassword:"UpdatedPassword123"},status:400});
  const rotated=await call("/api/account",{cookie:a.cookie,method:"PATCH",body:{action:"password",currentPassword:"IndependentPass123",newPassword:"UpdatedPassword123"}});
  assert(rotated.cookie);await call("/api/account",{cookie:a.cookie,status:401});await call("/api/memories",{cookie:a.cookie,status:401});
  assert.equal((await call("/api/auth/me",{cookie:a.cookie})).data.user,null);
  await call("/api/account",{cookie:rotated.cookie});
  await call("/api/auth/login",{method:"POST",body:{emailOrUsername:"person_a",password:"IndependentPass123"},status:401});
  const freshLogin=await call("/api/auth/login",{method:"POST",body:{emailOrUsername:"person_a",password:"UpdatedPassword123"}});assert(freshLogin.cookie);
  await call("/api/auth/logout", { cookie: rotated.cookie, method: "POST" });
  await call("/api/upload/sign", { method: "POST", status: 410 });
  console.log(
    "PASS: " +
      passed +
      " API checks (auth, ownership, privacy, uploads, quota races, HD previews, cache privacy, Range, edits, trash, filters and pagination).",
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
