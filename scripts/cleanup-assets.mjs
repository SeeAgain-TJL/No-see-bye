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
try {
  const items = await prisma.asset.findMany({
    where: { driver: "local", attachment: null, createdAt: { lt: cutoff } },
    take: 500,
  });
  for (const asset of items) {
    const target = path.resolve(root, asset.key);
    const relative = path.relative(root, target);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
      throw new Error("Unsafe asset path");
    // Lock the status first so an editor cannot attach a file during cleanup.
    const lock = await prisma.asset.updateMany({
      where: { id: asset.id, attachment: null },
      data: { status: "deleting" },
    });
    if (!lock.count) continue;
    for (const mediaKey of [asset.key, asset.thumbnailKey, asset.coverKey].filter(Boolean)) {
      const mediaPath=path.resolve(root,mediaKey);
      const safe=path.relative(root,mediaPath);
      if(!safe || safe.startsWith("..") || path.isAbsolute(safe))throw new Error("Unsafe derivative path");
      await rm(mediaPath,{force:true});
    }
    await prisma.asset.delete({ where: { id: asset.id } });
    removed++;
  }
  console.log(
    `Removed ${removed} unattached assets older than 24 hours; each run processes up to 500.`,
  );
} finally {
  await prisma.$disconnect();
}
