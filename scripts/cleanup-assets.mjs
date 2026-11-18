import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";
import { rm } from "node:fs/promises";
import path from "node:path";
nextEnv.loadEnvConfig(process.cwd());
if ((process.env.STORAGE_DRIVER || "local") !== "local")
  throw new Error("Only local storage cleanup is supported");
const root = path.resolve(process.env.STORAGE_LOCAL_DIR || "data/uploads");
const prisma = new PrismaClient();
const cutoff = new Date(Date.now() - 24 * 3600_000);
let removed = 0;
let queuedRemoved = 0;
function mediaPath(key) {
  if (!key || key.includes("\0") || key.includes("\\")) throw new Error("Invalid storage key");
  const target = path.resolve(root, key);
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error("Invalid storage key");
  return target;
}
try {
  // A deleted account has no Asset rows. This independent queue retains the keys.
  const queued = await prisma.mediaDeletion.findMany({
    where: { driver: "local" },
    orderBy: [{ createdAt: "asc" }, { key: "asc" }],
    take: 500,
    select: { key: true, ownerId: true },
  });
  for (const { key, ownerId } of queued) {
    try {
      await rm(mediaPath(key), { force: true });
      await prisma.mediaDeletion.deleteMany({ where: { key, ownerId } });
      queuedRemoved++;
    } catch {
      console.warn("Admin media cleanup deferred", ownerId);
    }
  }
  const items = await prisma.asset.findMany({
    where: { driver: "local", attachment: null, createdAt: { lt: cutoff } },
    take: 500,
  });
  for (const asset of items) {
    // Lock the status first so an editor cannot attach a file during cleanup.
    const lock = await prisma.asset.updateMany({
      where: { id: asset.id, attachment: null },
      data: { status: "deleting" },
    });
    if (!lock.count) continue;
    for (const key of new Set([asset.key, asset.thumbnailKey, asset.coverKey].filter(Boolean))) {
      await rm(mediaPath(key), { force: true });
    }
    await prisma.asset.delete({ where: { id: asset.id } });
    removed++;
  }
  console.log(
    `Removed ${removed} unattached assets older than 24 hours and ${queuedRemoved} queued media files.`,
  );
} finally {
  await prisma.$disconnect();
}
