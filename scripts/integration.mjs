import assert from "node:assert/strict";
import sharp from "sharp";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { mkdir, rm, readdir, access, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { smtpInbox } from "./test-support/smtp.mjs";
const inbox = await smtpInbox();
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
  USER_QUOTA_MB: process.env.TEST_UNLIMITED ? "0" : "1",
  ALLOW_REGISTRATION: "true",
  HOSTNAME: "127.0.0.1",
  PORT: String(port),
  SMTP_HOST: "127.0.0.1", SMTP_PORT: String(inbox.port), SMTP_SECURE: "false", SMTP_USER: "", SMTP_PASSWORD: "", SMTP_FROM: "test@example.test",
  PASSWORD_EMAIL_VERIFICATION: "true",
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
legacy.exec(`CREATE TABLE OAuthAccount (id TEXT PRIMARY KEY NOT NULL,provider TEXT NOT NULL,providerAccountId TEXT NOT NULL,userId TEXT NOT NULL,createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
INSERT INTO User VALUES ('legacy-oauth','github_old@oauth.local','github_old','random-old-hash',NULL,1000000,1000000);
INSERT INTO OAuthAccount(id,provider,providerAccountId,userId) VALUES ('legacy-oauth-link','github','legacy-github','legacy-oauth');`);
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
assert.equal(upgraded.prepare("SELECT hasLocalPassword FROM User WHERE id='legacy-oauth'").get().hasLocalPassword,0);
assert.equal(upgraded.prepare("SELECT hasLocalPassword FROM User WHERE id='legacy-user'").get().hasLocalPassword,1);
assert.equal(upgraded.prepare("SELECT passwordHash FROM User WHERE id='legacy-oauth'").get().passwordHash,"random-old-hash");
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
// Exercise the public challenge flow, solving only the visible arithmetic in test images.
async function registrationFields(body, cookie) {
  const credentials = { username: body.username, password: body.password, confirmPassword: body.confirmPassword ?? body.password };
  const issued = await call("/api/auth/challenge", { method: "POST", body: credentials, cookie });
  assert.equal(issued.data.answer, undefined);
  assert.equal(issued.data.answerHash, undefined);
  assert.match(issued.res.headers.get("set-cookie"), /HttpOnly/i);
  assert.equal(issued.res.headers.get("cache-control"), "no-store");
  const svg = Buffer.from(issued.data.image.split(",")[1], "base64").toString();
  const numbers = [...svg.matchAll(/<text[^>]*>(\d+)<\/text>/g)].map(match => Number(match[1]));
  assert.equal(numbers.length, 2);
  return { fields: { ...credentials, challengeId: issued.data.id, answer: String(numbers[0] + numbers[1]) }, cookie: issued.cookie || cookie, challenge: issued.data };
}
async function call(
  url,
  { cookie, method = "GET", body, headers = {}, status = 200, automaticProof = true } = {},
) {
  if (url === "/api/auth/register" && body?.username && !("challengeId" in body) && automaticProof) {
    const proof = await registrationFields(body, cookie); body = proof.fields; cookie = proof.cookie;
  }
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
  // Phones often reopen an older IP/port bookmark. Normalize documents before
  // credentials are entered; never redirect a mutation with its password body.
  for (const pathname of ["/login?from=phone", "/register"]) {
    const redirected = await fetch("http://127.0.0.1:" + port + pathname, { redirect: "manual" });
    assert.equal(redirected.status, 307, pathname);
    assert.equal(redirected.headers.get("location"), base + pathname);
    assert.match(redirected.headers.get("cache-control"), /no-store/);
    passed++;
  }
  const canonical = await fetch(base + "/login", { redirect: "manual" });
  assert.equal(canonical.status, 200, "Canonical login must not loop");
  const hostileHost = await fetch("http://127.0.0.1:" + port + "/login?next=https%3A%2F%2Fevil.example", {
    headers: { "X-Forwarded-Host": "evil.example" }, redirect: "manual",
  });
  assert.equal(new URL(hostileHost.headers.get("location")).origin, base);
  passed += 2;
  const a = await call("/api/auth/register", {
    method: "POST",
    body: {
      username: "person_a",
      password: "IndependentPass123",
    },
    status: 201,
  });
  const b = await call("/api/auth/register", {
    method: "POST",
    body: {
      username: "person_b",
      password: "IndependentPass123",
    },
    status: 201,
  });
  assert(a.cookie && b.cookie);
  const locationBody = { latitude: 30.27, longitude: 120.15 };
  await call("/api/location/nearby", { method: "POST", body: locationBody, status: 401 });
  await call("/api/location/nearby", { method: "POST", cookie: a.cookie, body: locationBody, headers: { Origin: "https://evil.example" }, status: 403 });
  for (const body of [{ latitude: 91, longitude: 0 }, { latitude: 0, longitude: -181 }, { latitude: "30", longitude: 120 }, {}]) {
    await call("/api/location/nearby", { method: "POST", cookie: a.cookie, body, status: 400 });
  }
  const nearby = await call("/api/location/nearby", { method: "POST", cookie: a.cookie, body: locationBody });
  assert.match(nearby.data.location, /杭州/);
  assert.equal(nearby.data.approximate, true);
  assert.equal(nearby.res.headers.get("cache-control"), "no-store");
  const ocean = await call("/api/location/nearby", { method: "POST", cookie: a.cookie, body: { latitude: 0, longitude: -140 } });
  assert.equal(ocean.data.approximate, false);
  assert.equal(ocean.data.location, "0.00°N · 140.00°W");
  const policy = (await fetch(base + "/")).headers.get("permissions-policy");
  assert.match(policy, /geolocation=\(self\)/);
  const credit = await fetch(base + "/geodata-notice.txt");
  assert.equal(credit.status, 200);
  assert.match(await credit.text(), /Attribution 4.0/);
  passed += 2;

  assert.match(a.res.headers.get("set-cookie"), /HttpOnly/i);
  assert.equal(a.data.token, undefined);
  await call("/api/auth/login", {
    method: "POST",
    body: { emailOrUsername: "person_a", password: "wrong-password" },
    status: 401,
  });
  await call("/api/auth/login", {
    method: "POST",
    body: { emailOrUsername: "PERSON_A", password: "IndependentPass123" },
  });
  const mobileLogin = await call("/api/auth/login", {
    method: "POST", body: { emailOrUsername: "person_a", password: "IndependentPass123" },
    headers: { "Sec-Fetch-Site": "same-origin", "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1" },
  });
  assert(mobileLogin.cookie);
  for (const session of [a.cookie, mobileLogin.cookie]) {
    const current = await call("/api/auth/me", { cookie: session });
    assert.equal(current.data.user.id, a.data.user.id, "Both device sessions must remain valid");
  }
  for (const origin of ["https://evil.example", "null", "http://localhost:9999", base + "/login", "ftp://localhost:" + port]) {
    const rejected = await call("/api/auth/login", {
      method: "POST", body: { emailOrUsername: "person_a", password: "IndependentPass123" },
      headers: { Origin: origin }, status: 403,
    });
    assert.equal(rejected.data.siteOrigin, base, "Origin rejection must offer a trusted recovery entrance");
  }
  for (const origin of [base, ""]) await call("/api/auth/login", {
    method: "POST", body: { emailOrUsername: "person_a", password: "IndependentPass123" },
    headers: { Origin: origin, "Sec-Fetch-Site": "cross-site" }, status: 403,
  });
  await call("/api/auth/challenge", {
    method: "POST",
    body: { username: "person_a", password: "IndependentPass123", confirmPassword: "IndependentPass123" },
    status: 409,
  });
  await call("/api/memories", { status: 401 });
  await call("/api/memories", { cookie: a.cookie, method: "POST", body: memoryInput({ mood: "not-a-mood" }), status: 400 });
  const moodEntry = (await call("/api/memories", { cookie: a.cookie, method: "POST", body: memoryInput({ mood: "元气" }), status: 201 })).data;
  assert.equal(moodEntry.mood, "元气");
  for (const mood of ["开心", "平静", "感动", "疲惫", "想念", "雀跃", "治愈", "委屈", ""]) {
    const current = (await call("/api/memories/" + moodEntry.id, { cookie: a.cookie })).data;
    const updated = await call("/api/memories/" + moodEntry.id, { cookie: a.cookie, method: "PATCH", body: { ...memoryInput({ mood }), updatedAt: current.updatedAt } });
    assert.equal(updated.data.mood, mood);
  }
  await call("/api/memories/" + moodEntry.id, { cookie: a.cookie, method: "DELETE" });
  const moodTrash = (await call("/api/memories/trash", { cookie: a.cookie })).data;
  await call("/api/memories/trash", { cookie: a.cookie, method: "DELETE", body: { confirmation: "EMPTY_TRASH", before: moodTrash.before } });

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
  const thumbInfo = await sharp(thumbBuffer).metadata();assert.equal(thumbInfo.width,1024);assert.equal(thumbInfo.height,640);passed++;
  assert.deepEqual([asset.width, asset.height], [thumbInfo.width, thumbInfo.height]);passed++;
  const thumbnailEtag = thumb.headers.get("etag");
  assert(thumbnailEtag);
  const cachedThumbnail = await fetch(base + asset.thumbnailUrl, { headers: { Cookie: a.cookie, "If-None-Match": thumbnailEtag } });
  assert.equal(cachedThumbnail.status, 304);
  assert.equal((await cachedThumbnail.arrayBuffer()).byteLength, 0);
  assert.match(cachedThumbnail.headers.get("cache-control"), /private.*no-cache.*must-revalidate/);
  passed++;

  // More missing originals than the conversion concurrency limit must fail
  // promptly and release their slots, so a later real image can still load.
  const missingPreviewDb = new DatabaseSync(env.DATABASE_URL.slice(5));
  const missingPreviewIds = Array.from({ length: 3 }, (_, i) => "missing-preview-fixture-" + i);
  for (const id of missingPreviewIds) {
    missingPreviewDb.prepare("INSERT INTO Asset(id,ownerId,driver,key,mime,sizeBytes,status) VALUES (?,?,?,?,?,?,?)")
      .run(id, a.data.user.id, "local", id + ".png", "image/png", 0, "ready");
  }
  missingPreviewDb.close();
  const missingPreviews = await Promise.all(missingPreviewIds.map(id => fetch(base + "/api/assets/" + id + "?variant=display", {
    headers: { Cookie: a.cookie }, signal: AbortSignal.timeout(10_000),
  })));
  for (const response of missingPreviews) {
    assert.equal(response.status, 503);
    await response.arrayBuffer();
    passed++;
  }

  const displayUrl = asset.url + "?variant=display";
  const beforeDisplay = await readdir(env.STORAGE_LOCAL_DIR, { recursive: true });
  const firstDisplays = await Promise.all(Array.from({ length: 4 }, () =>
    fetch(base + displayUrl, { headers: { Cookie: a.cookie }, signal: AbortSignal.timeout(10_000) })));
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
  await call(asset.thumbnailUrl, { status: 404, headers: { "If-None-Match": thumbnailEtag } });
  await call(asset.thumbnailUrl, { cookie: b.cookie, status: 404, headers: { "If-None-Match": thumbnailEtag } });
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
    process.env.TEST_UNLIMITED ? 201 : 413,
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
  const engagementPath = `/api/memories/${memory.id}/engagement`;
  const savedPath = "/api/memories?scope=public&saved=1";
  const react = (kind, active, cookie, status = 200) => call(engagementPath, { method: "PUT", cookie, body: { kind, active }, status });
  const comment = (content, cookie, status = 201) => call(engagementPath, { method: "POST", cookie, body: { content }, status });
  await call(engagementPath, { status: 404 });
  await call(`/api/memories/${memory.id}?scope=public`, { cookie: a.cookie, status: 404 });
  await react("like", true, a.cookie, 404);
  await comment("private entry", a.cookie, 404);
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
  await react("like", true, undefined, 401);
  await comment("guest comment", undefined, 401);
  await call(savedPath, { status: 401 });
  await react("pin", true, b.cookie, 400);
  const liked = { likes: 1, comments: 0, liked: true, saved: false };
  assert.deepEqual((await react("like", true, b.cookie)).data, liked);
  assert.deepEqual((await react("like", true, b.cookie)).data, liked);
  assert.deepEqual((await react("save", true, b.cookie)).data, { ...liked, saved: true });
  assert.deepEqual((await call(savedPath, { cookie: b.cookie })).data.items.map(item => item.id), [memory.id]);
  assert.equal((await call(savedPath, { cookie: a.cookie })).data.items.length, 0);
  const visitorEntry = (await call("/api/memories?scope=public")).data.items[0];
  assert.deepEqual(visitorEntry.engagement, { ...liked, liked: false });
  assert.equal(visitorEntry.pinned, false);
  await comment("     ", b.cookie, 400);
  await comment("x".repeat(501), b.cookie, 400);
  const posted = (await comment("  喜欢这张照片  ", b.cookie)).data;
  assert.equal(posted.comment.content, "喜欢这张照片");
  assert(!("userId" in posted.comment));
  assert.deepEqual(posted.engagement, { ...liked, saved: true, comments: 1 });
  assert.deepEqual((await call(engagementPath)).data.items, [posted.comment]);
  assert.deepEqual((await call(`/api/memories/${memory.id}?scope=public`, { cookie: b.cookie })).data.engagement, posted.engagement);
  assert.deepEqual((await react("like", false, b.cookie)).data, { likes: 0, liked: false, saved: true, comments: 1 });
  await react("save", false, b.cookie);
  assert.equal((await call(savedPath, { cookie: b.cookie })).data.items.length, 0);
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
  await call(engagementPath, { status: 404 });
  await react("save", true, b.cookie, 404);
  await comment("deleted entry", a.cookie, 404);
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
  // The month navigator counts the full archive, independently of the current
  // 12-record page and filters, without disclosing other users' private months.
  await call("/api/memories/index", { status: 401 });
  await call("/api/memories/index?scope=trash", { cookie: a.cookie, status: 400 });
  const ownIndex = await call("/api/memories/index", { cookie: a.cookie });
  assert.equal(ownIndex.res.headers.get("cache-control"), "private, no-store");
  assert.equal(ownIndex.data.scope, "mine");
  assert.equal(ownIndex.data.timeZone, "Asia/Shanghai");
  assert.equal(ownIndex.data.total, 16);
  assert.equal(ownIndex.data.total > first.items.length, true);
  assert.deepEqual(ownIndex.data.months, [{ month: "2026-11", count: 16, photos: 1, videos: 0, texts: 15 }]);
  const filteredIndex = await call("/api/memories/index?scope=mine&type=photo&q=missing&month=invalid&day=invalid&pinned=1&cursor=invalid", { cookie: a.cookie });
  assert.deepEqual(filteredIndex.data, ownIndex.data);
  const emptyIndex = (await call("/api/memories/index?scope=mine&userId=" + memory.userId, { cookie: b.cookie })).data;
  assert.equal(emptyIndex.total, 0);
  assert.deepEqual(emptyIndex.months, []);
  assert.deepEqual(emptyIndex.availableYears, []);
  const publicIndex = await call("/api/memories/index?scope=public");
  assert.equal(publicIndex.res.headers.get("cache-control"), "private, no-store");
  assert.equal(publicIndex.data.total, 1);
  assert.deepEqual((await call("/api/memories/index?scope=public", { cookie: a.cookie })).data, publicIndex.data);
  const navigationDb = new DatabaseSync(env.DATABASE_URL.slice(5));
  navigationDb.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000");
  try {
    const otherOwner = navigationDb.prepare("SELECT id FROM User WHERE username='person_b'").get().id;
    const row = navigationDb.prepare("INSERT INTO Entry(id,userId,title,content,visibility,happenedAt,deletedAt,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)");
    const now = Date.now();
    row.run("journal-index-before", memory.userId, "Private old month", "Never disclose this body", "private", "2024-12-31 15:59:59", null, now, now);
    row.run("journal-index-edge", memory.userId, "Mixed media midnight", "", "private", Date.parse("2024-12-31T16:00:00Z"), null, now, now);
    row.run("journal-index-public", otherOwner, "Public text month", "", "public", "2024-12-31T16:00:00.000Z", null, now, now);
    row.run("journal-index-trash", memory.userId, "Deleted archive", "", "public", Date.parse("2023-06-01T12:00:00Z"), now, now, now);
    row.run("journal-index-foreign", otherOwner, "Other private archive", "Never disclose another user's month", "private", Date.parse("2022-01-01T12:00:00Z"), null, now, now);
    const media = navigationDb.prepare("INSERT INTO Asset(id,ownerId,driver,key,mime,sizeBytes,status) VALUES (?,?,?,?,?,1,'ready')");
    const attach = navigationDb.prepare("INSERT INTO EntryAsset(entryId,assetId,position) VALUES (?,?,?)");
    for (let i = 0; i < 3; i++) {
      const id = "journal-index-media-" + i;
      media.run(id, memory.userId, "local", id, i === 2 ? "video/webm" : "image/png");
      attach.run("journal-index-edge", id, i);
    }
    const completeIndex = (await call("/api/memories/index?scope=mine", { cookie: a.cookie })).data;
    assert.deepEqual(completeIndex.months, [
      { month: "2026-11", count: 16, photos: 1, videos: 0, texts: 15 },
      { month: "2025-01", count: 1, photos: 1, videos: 1, texts: 0 },
      { month: "2024-12", count: 1, photos: 0, videos: 0, texts: 1 },
    ]);
    assert.deepEqual(completeIndex.availableYears, [2026, 2025, 2024]);
    assert.equal(completeIndex.total, 18);
    assert.equal(completeIndex.photos, 2, "Photo counts describe records rather than attachments");
    assert.equal(completeIndex.videos, 1);
    assert.equal(completeIndex.texts, 16);
    const sharedIndex = (await call("/api/memories/index?scope=public&userId=" + memory.userId + "&type=photo&month=2026-11")).data;
    assert.equal(sharedIndex.total, 2);
    assert.deepEqual(sharedIndex.months, [
      { month: "2026-11", count: 1, photos: 1, videos: 0, texts: 0 },
      { month: "2025-01", count: 1, photos: 0, videos: 0, texts: 1 },
    ]);
    assert.equal(JSON.stringify(sharedIndex).includes("Private"), false);
    const otherIndex = (await call("/api/memories/index?scope=mine&userId=" + memory.userId, { cookie: b.cookie })).data;
    assert.equal(otherIndex.total, 2);
    assert.deepEqual(otherIndex.availableYears, [2025, 2022]);
    const migrated = spawnSync(runtime, ["scripts/init-db.mjs"], { cwd: workspace, env, encoding: "utf8" });
    assert.equal(migrated.status, 0, migrated.stderr);
    const legacyMonth = (await call("/api/memories?month=2024-12", { cookie: a.cookie })).data;
    assert.deepEqual(legacyMonth.items.map(item => item.id), ["journal-index-before"]);
    const publicMonth = (await call("/api/memories?scope=public&month=2025-01")).data;
    assert.deepEqual(publicMonth.items.map(item => item.id), ["journal-index-public"]);
  } finally {
    navigationDb.exec("DELETE FROM EntryAsset WHERE entryId LIKE 'journal-index-%'; DELETE FROM Entry WHERE id LIKE 'journal-index-%'; DELETE FROM Asset WHERE id LIKE 'journal-index-media-%'");
    navigationDb.close();
  }
  assert.deepEqual((await call("/api/memories/index", { cookie: a.cookie })).data, ownIndex.data);
  // Reservations must prevent two overlapping uploads from exceeding one user's quota.
  const c = await call("/api/auth/register", {
    method: "POST",
    body: {
      username: "quota_user",
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
  assert.deepEqual(concurrent.map((r) => r.status).sort(), process.env.TEST_UNLIMITED ? [201, 201] : [201, 413]);
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
  // Single-entry purge keeps other entries and honors ownership and the exact trash state.
  const singleAsset = await uploadFile(a.cookie, png);
  const singleEntry = (await call("/api/memories", {
    cookie: a.cookie, method: "POST", status: 201, body: memoryInput({ assetIds: [singleAsset.id] }),
  })).data;
  const singleRoute = "/api/memories/" + singleEntry.id;
  const singleRemove = (body, opts = {}) => call("/api/memories/trash", { cookie: a.cookie, method: "DELETE", body, ...opts });
  await singleRemove({ confirmation: "DELETE_ENTRY", id: singleEntry.id }, { status: 400 });
  await singleRemove({ confirmation: "DELETE_ENTRY", id: singleEntry.id, deletedAt: singleEntry.updatedAt }, { status: 404 });
  await call(singleRoute, { cookie: a.cookie, method: "DELETE" });
  const singleBody = { confirmation: "DELETE_ENTRY", id: singleEntry.id, deletedAt: (await call(singleRoute, { cookie: a.cookie })).data.deletedAt };
  await singleRemove(singleBody, { cookie: b.cookie, status: 404 });
  await singleRemove(singleBody, { headers: { Origin: "https://evil.example" }, status: 403 });
  await call(singleRoute, { cookie: a.cookie, method: "PATCH", body: { action: "restore" } });
  await singleRemove(singleBody, { status: 404 });
  await call(singleRoute, { cookie: a.cookie, method: "DELETE" });
  await singleRemove(singleBody, { status: 404 });
  singleBody.deletedAt = (await call(singleRoute, { cookie: a.cookie })).data.deletedAt;
  const singlePath = inspection.prepare("SELECT key FROM Asset WHERE id=?").get(singleAsset.id).key;
  assert.deepEqual((await singleRemove(singleBody)).data, { ok: true, deleted: 1, pending: 0 });
  await assert.rejects(access(path.join(env.STORAGE_LOCAL_DIR, singlePath)));
  await call(singleRoute, { cookie: a.cookie, status: 404 });
  await call("/api/assets/" + singleAsset.id, { cookie: a.cookie, status: 404 });
  assert.equal((await call("/api/memories/trash", { cookie: a.cookie })).data.count, 1);
  assert.equal((await call("/api/memories/trash", { cookie: b.cookie })).data.count, 1);
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
  // Registration needs no external service, but both credential checks and a one-use browser-bound proof.
  const missing = await call("/api/auth/login", { method:"POST", body:{emailOrUsername:"not_registered",password:"IndependentPass123"},status:404 });
  assert.match(missing.data.error,/未注册/);
  const wrong = await call("/api/auth/login", { method:"POST", body:{emailOrUsername:"person_b",password:"bad-password"},status:401 });
  assert.match(wrong.data.error,/密码不正确/);
  const providers = await call("/api/auth/providers");assert.equal(providers.data.smsEnabled,undefined);
  assert.equal((await fetch(base+"/api/auth/sms",{method:"POST"})).status,405);passed++;
  const credentials={username:"captcha_person",password:"IndependentPass123",confirmPassword:"IndependentPass123"};
  await call("/api/auth/challenge",{method:"POST",body:credentials,headers:{Origin:"https://evil.example"},status:403});
  const mismatch=await call("/api/auth/challenge",{method:"POST",body:{...credentials,confirmPassword:"DifferentPass123"},status:400});assert.match(mismatch.data.error,/不一致/);
  await call("/api/auth/challenge",{method:"POST",body:{...credentials,password:"short",confirmPassword:"short"},status:400});
  await call("/api/auth/challenge",{method:"POST",body:{...credentials,username:"bad name"},status:400});
  await call("/api/auth/challenge",{method:"POST",body:{...credentials,password:"密".repeat(25),confirmPassword:"密".repeat(25)},status:400});
  await call("/api/auth/register",{method:"POST",body:credentials,automaticProof:false,status:400});
  let proof=await registrationFields(credentials);
  const metadata=await sharp(Buffer.from(proof.challenge.image.split(",")[1],"base64")).metadata();assert.equal(metadata.width,320);assert.equal(metadata.height,112);
  await call("/api/auth/register",{method:"POST",body:proof.fields,status:410});
  await call("/api/auth/register",{method:"POST",cookie:proof.cookie,body:{...proof.fields,username:"captcha_other"},status:410});
  await call("/api/auth/register",{method:"POST",cookie:proof.cookie,body:{...proof.fields,confirmPassword:"DifferentPass123"},status:400});
  for(let i=0;i<5;i++)await call("/api/auth/register",{method:"POST",cookie:proof.cookie,body:{...proof.fields,answer:"999"},status:400});
  let proofDB=new DatabaseSync(path.join(testRoot,"test.db"));
  assert.equal(proofDB.prepare("SELECT attempts FROM RegistrationChallenge WHERE id=?").get(proof.fields.challengeId).attempts,5);proofDB.close();
  await call("/api/auth/register",{method:"POST",cookie:proof.cookie,body:proof.fields,status:410});
  proof=await registrationFields(credentials,proof.cookie);
  proofDB=new DatabaseSync(path.join(testRoot,"test.db"));proofDB.prepare("UPDATE RegistrationChallenge SET expiresAt=? WHERE id=?").run(Date.now()-1000,proof.fields.challengeId);proofDB.close();
  await call("/api/auth/register",{method:"POST",cookie:proof.cookie,body:proof.fields,status:410});
  const stale=await registrationFields(credentials,proof.cookie);
  proof=await registrationFields(credentials,stale.cookie);
  assert.notEqual(stale.fields.challengeId,proof.fields.challengeId);
  await call("/api/auth/register",{method:"POST",cookie:stale.cookie,body:stale.fields,status:410});
  const verified=await call("/api/auth/register",{method:"POST",cookie:proof.cookie,body:proof.fields,status:201});assert.equal(verified.data.user.email,null);
  assert.equal((await call("/api/account",{cookie:verified.cookie})).data.user.phoneMasked,null);
  await call("/api/auth/register",{method:"POST",cookie:proof.cookie,body:proof.fields,status:410});
  await call("/api/auth/login",{method:"POST",body:{emailOrUsername:credentials.username,password:credentials.password}});
  const concurrentProof=await registrationFields({...credentials,username:"proof_race"});
  const proofRace=await Promise.all([1,2].map(()=>fetch(base+"/api/auth/register",{method:"POST",headers:{Origin:base,Cookie:concurrentProof.cookie,"Content-Type":"application/json"},body:JSON.stringify(concurrentProof.fields)})));
  assert.deepEqual(proofRace.map(response=>response.status).sort(),[201,410]);passed+=2;
  proofDB=new DatabaseSync(path.join(testRoot,"test.db"));assert.equal(proofDB.prepare("SELECT count(*) as count FROM User WHERE username='proof_race'").get().count,1);proofDB.close();
  // An OAuth-only account rejects local password login and changes, even with a matching hash.
  const authDB=new DatabaseSync(path.join(testRoot,"test.db"));
  const reference=authDB.prepare("SELECT passwordHash FROM User WHERE username='person_b'").get();
  authDB.prepare("INSERT INTO User(id,email,username,passwordHash,displayName,hasLocalPassword) VALUES (?,?,?,?,?,?)").run("oauth-test","github_test@oauth.local","github_test",reference.passwordHash,"GitHub 测试",0);
  authDB.prepare("INSERT INTO OAuthAccount(id,provider,providerAccountId,userId) VALUES (?,?,?,?)").run("oauth-test-link","github","test-account","oauth-test");
  authDB.close();
  const oauthCookie="memory_session="+jwt.sign({userId:"oauth-test",email:"github_test@oauth.local",sessionVersion:0},env.JWT_SECRET,{algorithm:"HS256",expiresIn:"5m"});
  const oauthAccount=(await call("/api/account",{cookie:oauthCookie})).data;
  assert.equal(oauthAccount.user.hasLocalPassword,false);assert.equal(oauthAccount.user.email,null);assert.deepEqual(oauthAccount.user.loginMethods,["github"]);
  await call("/api/account",{cookie:oauthCookie,method:"PATCH",body:{action:"password",currentPassword:"IndependentPass123",newPassword:"UpdatedPassword123"},status:403});
  const oauthPassword=await call("/api/auth/login",{method:"POST",body:{emailOrUsername:"github_test",password:"IndependentPass123"},status:400});assert.match(oauthPassword.data.error,/GitHub/);
  // Archive tools query the full owner archive, with Shanghai day boundaries.
  await call("/api/memories/revisit", { status: 401 });
  await call("/api/memories/revisit?mode=random", { status: 401 });
  assert.equal((await call("/api/memories/revisit?mode=random", { cookie: oauthCookie })).data.item, null);
  const archiveToday = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  const archiveYear = Number(archiveToday.slice(0, 4));
  const anniversaryDay = (archiveYear - 1) + archiveToday.slice(4);
  const archiveEntry = (await call("/api/memories", { cookie: oauthCookie, method: "POST", status: 201, body: memoryInput({ title: "Archive-only anniversary", happenedAt: anniversaryDay + "T12:00:00+08:00" }) })).data;
  const archiveRandom = await call("/api/memories/revisit?mode=random", { cookie: oauthCookie });
  assert.equal(archiveRandom.data.item.id, archiveEntry.id);
  assert.equal(archiveRandom.res.headers.get("cache-control"), "private, no-store");
  assert.equal((await call("/api/memories/revisit?mode=random&exclude=" + archiveEntry.id, { cookie: oauthCookie })).data.item.id, archiveEntry.id);
  const dayEdge = (await call("/api/memories", { cookie: oauthCookie, method: "POST", status: 201, body: memoryInput({ title: "Shanghai midnight", happenedAt: "2024-12-31T16:00:00.000Z" }) })).data;
  const beforeEdge = (await call("/api/memories", { cookie: oauthCookie, method: "POST", status: 201, body: memoryInput({ title: "Before midnight", happenedAt: "2024-12-31T15:59:59.999Z" }) })).data;
  const calendar = (await call("/api/memories/revisit?month=2025-01", { cookie: oauthCookie })).data;
  assert.equal(calendar.days["2025-01-01"], 1);
  assert.equal(calendar.days["2024-12-31"], undefined);
  assert.equal(calendar.today, archiveToday);
  assert(calendar.anniversaries.some(item => item.id === archiveEntry.id));
  assert(calendar.anniversaries.every(item => item.userId === archiveEntry.userId));
  const exactDay = (await call("/api/memories?day=2025-01-01", { cookie: oauthCookie })).data;
  assert.deepEqual(exactDay.items.map(item => item.id), [dayEdge.id]);
  assert(!(await call("/api/memories?scope=public&day=2025-01-01")).data.items.some(item => item.id === dayEdge.id));
  const otherCalendar = (await call("/api/memories/revisit?month=2025-01&userId=" + archiveEntry.userId, { cookie: b.cookie })).data;
  assert.equal(otherCalendar.days["2025-01-01"], undefined);
  for (const month of ["invalid", "2025-13", "0000-01", "2101-01"]) await call("/api/memories/revisit?month=" + month, { cookie: oauthCookie, status: 400 });
  for (const day of ["2025-02-30", "2025-2-01", "invalid", "1899-01-01"]) await call("/api/memories?day=" + day, { cookie: oauthCookie, status: 400 });
  // Story scopes and the mood year must use the full archive, not the 12-item list.
  await call("/api/memories/revisit?year=" + archiveYear, { status: 401 });
  await call("/api/memories/revisit?mode=story", { status: 401 });
  const yearEmpty = (await call("/api/memories/revisit?year=" + archiveYear, { cookie: oauthCookie })).data;
  assert.equal(yearEmpty.currentStreak, 0);
  const storyFixtures = [];
  const yesterday = new Date(Date.now() + 8 * 3600000 - 86400000).toISOString().slice(0, 10);
  const storyCreate = async (day, mood, title) => {
    const item = (await call("/api/memories", { cookie: oauthCookie, method: "POST", status: 201, body: memoryInput({ title, mood, happenedAt: day + "T12:00:00+08:00" }) })).data;
    storyFixtures.push(item); return item;
  };
  const storyToday = await storyCreate(archiveToday, "开心", "Story today");
  await storyCreate(yesterday, "平静", "Story yesterday one");
  await storyCreate(yesterday, "平静", "Story yesterday two");
  await storyCreate("2024-02-29", "治愈", "Leap day mood");
  const oldDay = (archiveYear - 3) + "-06-01";
  for (let i = 0; i < 31; i++) await storyCreate(oldDay, i < 20 ? "感动" : "疲惫", "Full archive story " + i);
  const yearMood = (await call("/api/memories/revisit?year=" + archiveYear, { cookie: oauthCookie })).data;
  assert.equal(yearMood.days[archiveToday].mood, "开心");
  assert.equal(yearMood.days[yesterday].count, 2);
  assert.equal(yearMood.currentStreak, 2);
  assert.equal(yearMood.streakThrough, archiveToday);
  assert.equal(yearMood.monthMood, archiveToday.slice(0, 7) === yesterday.slice(0, 7) ? "平静" : "开心");
  const oldYear = (await call("/api/memories/revisit?year=" + (archiveYear - 3), { cookie: oauthCookie })).data;
  assert.equal(oldYear.days[oldDay].count, 31);
  assert.equal(oldYear.days[oldDay].mood, "感动");
  assert.equal(oldYear.total, 31);
  assert.equal(oldYear.recordedDays, 1);
  const leapYear = (await call("/api/memories/revisit?year=2024", { cookie: oauthCookie })).data;
  assert.equal(leapYear.days["2024-02-29"].mood, "治愈");
  assert.equal(leapYear.days["2025-01-01"], undefined);
  assert.equal((await call("/api/memories/revisit?year=2025", { cookie: oauthCookie })).data.days["2025-01-01"].count, 1);
  const knownIds = new Set([archiveEntry, dayEdge, beforeEdge, ...storyFixtures].map(item => item.id));
  for (const scope of ["recent", "month", "anniversary", "random"]) {
    const response = await call("/api/memories/revisit?mode=story&scope=" + scope, { cookie: oauthCookie });
    const stories = response.data.items;
    assert.equal(response.res.headers.get("cache-control"), "private, no-store");
    assert(stories.length > 0 && stories.length <= 30);
    assert.equal(new Set(stories.map(item => item.id)).size, stories.length);
    assert(stories.every(item => item.userId === archiveEntry.userId && knownIds.has(item.id)));
    if (scope === "recent") { assert.equal(stories.length, 30); assert.equal(stories[0].id, storyToday.id); }
    if (scope === "month") assert(stories.every(item => new Date(new Date(item.happenedAt).getTime() + 8 * 3600000).toISOString().slice(0, 7) === archiveToday.slice(0, 7)));
    if (scope === "anniversary") assert(stories.every(item => new Date(new Date(item.happenedAt).getTime() + 8 * 3600000).toISOString().slice(5, 10) === archiveToday.slice(5)));
    if (scope === "random") { assert.equal(stories.length, 30); assert(stories.some(item => item.title.startsWith("Full archive story"))); }
    const other = (await call("/api/memories/revisit?mode=story&scope=" + scope + "&userId=" + archiveEntry.userId, { cookie: b.cookie })).data.items;
    assert(other.every(item => !knownIds.has(item.id)));
  }
  assert(!(await call("/api/memories/revisit?year=" + archiveYear + "&userId=" + archiveEntry.userId, { cookie: b.cookie })).data.days[archiveToday]);
  for (const year of ["invalid", "2026-01", "0000", "2101", "2024.0", ""]) await call("/api/memories/revisit?year=" + year, { cookie: oauthCookie, status: 400 });
  await call("/api/memories/revisit?mode=story&scope=invalid", { cookie: oauthCookie, status: 400 });
  for (const item of storyFixtures) await call("/api/memories/" + item.id, { cookie: oauthCookie, method: "DELETE" });
  assert.equal((await call("/api/memories/revisit?year=" + archiveYear, { cookie: oauthCookie })).data.currentStreak, 0);
  assert.equal((await call("/api/memories/revisit?year=" + (archiveYear - 3), { cookie: oauthCookie })).data.total, 0);
  assert((await call("/api/memories/revisit?mode=story&scope=random", { cookie: oauthCookie })).data.items.every(item => !storyFixtures.some(fixture => fixture.id === item.id)));
  await call("/api/memories/" + archiveEntry.id, { cookie: oauthCookie, method: "DELETE" });
  assert(!(await call("/api/memories/revisit", { cookie: oauthCookie })).data.anniversaries.some(item => item.id === archiveEntry.id));
  await call("/api/memories/" + beforeEdge.id, { cookie: oauthCookie, method: "DELETE" });
  assert.equal((await call("/api/memories/revisit?mode=random", { cookie: oauthCookie })).data.item.id, dayEdge.id);
  // Avatar bytes are decoded, resized, stored separately and linked only to the current user.
  const usageBefore=(await call("/api/account",{cookie:b.cookie})).data.usedBytes;
  const avatarRequest=async(cookie,body,mime="image/png",status=200)=>{
    const r=await fetch(base+"/api/account/avatar",{method:"POST",headers:{Origin:base,...(cookie?{Cookie:cookie}:{}),"Content-Type":mime},body});
    const payload=await r.json();assert.equal(r.status,status,JSON.stringify(payload));passed++;return payload;
  };
  await avatarRequest(null,png,"image/png",401);
  await avatarRequest(b.cookie,Buffer.from("<svg/>"),"image/svg+xml",415);
  await avatarRequest(b.cookie,Buffer.from("not an image"),"image/png",415);
  await avatarRequest(b.cookie,Buffer.alloc(5*1024**2+1),"image/png",413);
  const avatar=await avatarRequest(b.cookie,png);
  const avatarResponse=await fetch(base+avatar.avatarUrl);assert.equal(avatarResponse.status,200);assert.equal(avatarResponse.headers.get("content-type"),"image/webp");
  const avatarMeta=await sharp(Buffer.from(await avatarResponse.arrayBuffer())).metadata();assert.equal(avatarMeta.width,256);assert.equal(avatarMeta.height,256);
  const cachedAvatar=await fetch(base+avatar.avatarUrl,{headers:{"If-None-Match":avatarResponse.headers.get("etag")}});assert.equal(cachedAvatar.status,304);
  assert.equal((await call("/api/auth/me",{cookie:b.cookie})).data.user.avatarUrl,avatar.avatarUrl);
  assert.equal((await call("/api/account",{cookie:b.cookie})).data.usedBytes,usageBefore);
  await call("/api/account/avatar",{cookie:a.cookie,method:"DELETE"});
  assert.equal((await call("/api/auth/me",{cookie:b.cookie})).data.user.avatarUrl,avatar.avatarUrl);
  const avatarDB=new DatabaseSync(path.join(testRoot,"test.db"));const oldAvatarKey=avatarDB.prepare("SELECT avatarKey FROM User WHERE username='person_b'").get().avatarKey;avatarDB.close();
  const newAvatar=await avatarRequest(b.cookie,png);assert.notEqual(newAvatar.avatarUrl,avatar.avatarUrl);
  await assert.rejects(access(path.join(testRoot,"uploads",oldAvatarKey)));
  await call("/api/account/avatar",{cookie:b.cookie,method:"DELETE"});
  assert.equal((await call("/api/auth/me",{cookie:b.cookie})).data.user.avatarUrl,null);
  assert.equal((await fetch(base+newAvatar.avatarUrl)).status,404);
  if(process.env.TEST_UNLIMITED){
    const quotaDB=new DatabaseSync(path.join(testRoot,"test.db"));const owner=quotaDB.prepare("SELECT id FROM User WHERE username='quota_user'").get().id;
    for(let i=0;i<2;i++)quotaDB.prepare("INSERT INTO Asset(id,ownerId,driver,key,mime,sizeBytes,status) VALUES (?,?,?,?,?,?,?)").run("large-fixture-"+i,owner,"local","quota-fixture-"+i,"image/png",1500000000,"ready");quotaDB.close();
    await uploadFile(c.cookie,png);
    const unlimited=(await call("/api/account",{cookie:c.cookie})).data;assert.equal(unlimited.quotaBytes,null);assert(unlimited.usedBytes>3_000_000_000);
  }
  await call("/api/account",{status:401});
  await call("/api/account",{cookie:a.cookie,method:"PATCH",body:{action:"profile",displayName:"新的昵称"},headers:{Origin:"https://evil.example"},status:403});
  await call("/api/account",{cookie:a.cookie,method:"PATCH",body:{action:"profile",displayName:"新的昵称"}});
  assert.equal((await call("/api/auth/me",{cookie:a.cookie})).data.user.displayName,"新的昵称");
  const account=(await call("/api/account",{cookie:a.cookie})).data;assert.equal(account.user.email,null);assert.equal(account.user.hasLocalPassword,true);assert.deepEqual(account.user.loginMethods,["password"]);assert(account.usedBytes>0);assert.equal(account.quotaBytes,process.env.TEST_UNLIMITED ? null : 1024**2);
  await call("/api/account",{cookie:a.cookie,method:"PATCH",body:{action:"password",currentPassword:"incorrect",newPassword:"UpdatedPassword123"},status:400});
  await call("/api/account",{cookie:a.cookie,method:"PATCH",body:{action:"password",currentPassword:"IndependentPass123",newPassword:"UpdatedPassword123"},status:400});
  const passwordFields={currentPassword:"IndependentPass123",newPassword:"UpdatedPassword123",email:"person_a@example.test"};
  const passwordChallenge=await call("/api/account/password-challenge",{cookie:a.cookie,method:"POST",body:passwordFields});
  assert.equal(passwordChallenge.data.code,undefined);assert.equal(passwordChallenge.data.codeHash,undefined);
  const rotated=await call("/api/account",{cookie:a.cookie,method:"PATCH",body:{action:"password",...passwordFields,challengeId:passwordChallenge.data.challengeId,code:inbox.code()}});
  assert(rotated.cookie);await call("/api/account",{cookie:a.cookie,status:401});await call("/api/memories",{cookie:a.cookie,status:401});
  assert.equal((await call("/api/auth/me",{cookie:a.cookie})).data.user,null);
  await call("/api/account",{cookie:rotated.cookie});
  await call("/api/auth/login",{method:"POST",body:{emailOrUsername:"person_a",password:"IndependentPass123"},status:401});
  const freshLogin=await call("/api/auth/login",{method:"POST",body:{emailOrUsername:"person_a",password:"UpdatedPassword123"}});assert(freshLogin.cookie);
  // Portraits get the same long-edge budget. Small originals must not be enlarged.
  for (const [width, height, expected] of [[1500, 2400, [640, 1024]], [80, 60, [80, 60]]]) {
    const image = await sharp({ create: { width, height, channels: 3, background: "#59745a" } }).png().toBuffer();
    const uploaded = await uploadFile(rotated.cookie, image);
    const response = await fetch(base + uploaded.thumbnailUrl, { headers: { Cookie: rotated.cookie } });
    assert.equal(response.status, 200);
    const preview = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    assert.deepEqual([preview.width, preview.height], expected);
    assert.deepEqual([uploaded.width, uploaded.height], expected);
    passed++;
  }
  await call("/api/auth/logout", { cookie: rotated.cookie, method: "POST" });
  await call("/api/upload/sign", { method: "POST", status: 410 });
  let challengeLimited=false;
  for(let i=0;i<45;i++){
    const response=await fetch(base+"/api/auth/challenge",{method:"POST",headers:{Origin:base,"Content-Type":"application/json"},body:JSON.stringify({...credentials,username:"limit_fixture"})});
    await response.arrayBuffer();
    if(response.status===429){challengeLimited=true;break;}
    assert.equal(response.status,200);
  }
  assert(challengeLimited,"Challenge endpoint must reject excessive requests");passed++;
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
  await inbox.close();
}
