import type { TokenPayload } from "@/core/auth";
import { HttpError } from "@/core/http";
import { prisma } from "@/core/prisma";
import { getStorage } from "@/core/storage-factory";

export type AdminUserOperation = "clear-data" | "delete-user";

async function removeQueuedMedia(ownerId: string) {
  const storage = getStorage();
  const media = await prisma.mediaDeletion.findMany({
    where: { ownerId, driver: storage.driver },
    orderBy: [{ createdAt: "asc" }, { key: "asc" }],
    take: 500,
    select: { key: true },
  });
  for (const { key } of media) {
    try {
      await storage.delete(key);
      await prisma.mediaDeletion.deleteMany({ where: { key, ownerId } });
    } catch {
      // The maintenance job retries queue rows that remain after this attempt.
      console.warn("Admin media cleanup deferred", ownerId);
    }
  }
  return Boolean(await prisma.mediaDeletion.count({ where: { ownerId } }));
}

export async function applyAdminUserOperation(
  operator: TokenPayload,
  targetId: string,
  action: AdminUserOperation,
  confirmUsername: string,
) {
  const counts = await prisma.$transaction(async (tx) => {
    const actor = await tx.user.findUnique({
      where: { id: operator.userId },
      select: { role: true, sessionVersion: true },
    });
    if (actor?.role !== "admin" || actor.sessionVersion !== operator.sessionVersion) {
      throw new HttpError(403, "仅管理员可执行此操作");
    }
    const target = await tx.user.findUnique({
      where: { id: targetId },
      select: { username: true, role: true, avatarKey: true },
    });
    if (!target) throw new HttpError(404, "找不到此账号");
    if (target.role !== "user") throw new HttpError(403, "管理员账号受保护");
    if (target.username !== confirmUsername) {
      throw new HttpError(400, "输入的用户名与目标账号不一致");
    }

    // File cleanup survives both a crash after commit and deletion of the owner.
    // Queue only media keys registered for this owner, never paths sent by a client.
    const now = Date.now();
    await tx.$executeRaw`
      INSERT OR IGNORE INTO MediaDeletion (key, driver, ownerId, createdAt)
      SELECT key, driver, ownerId, ${now} FROM Asset WHERE ownerId = ${targetId}
      UNION ALL
      SELECT thumbnailKey, driver, ownerId, ${now}
        FROM Asset WHERE ownerId = ${targetId} AND thumbnailKey IS NOT NULL
      UNION ALL
      SELECT coverKey, driver, ownerId, ${now}
        FROM Asset WHERE ownerId = ${targetId} AND coverKey IS NOT NULL
    `;
    if (target.avatarKey?.startsWith(`avatars/${targetId}/`)) {
      await tx.mediaDeletion.upsert({
        where: { key: target.avatarKey },
        create: { key: target.avatarKey, driver: "local", ownerId: targetId },
        update: {},
      });
    }

    // Deleting records first releases the restricted Asset → EntryAsset links.
    const { count: removedEntries } = await tx.entry.deleteMany({ where: { userId: targetId } });
    const { count: removedAssets } = await tx.asset.deleteMany({ where: { ownerId: targetId } });
    if (action === "delete-user") {
      await tx.user.delete({ where: { id: targetId } });
    } else {
      await tx.user.update({
        where: { id: targetId },
        data: { avatarKey: null, sessionVersion: { increment: 1 } },
      });
      await tx.passwordChallenge.deleteMany({ where: { userId: targetId } });
    }
    await tx.adminUserAction.create({
      data: { action, operatorId: operator.userId, targetId, removedEntries, removedAssets },
    });
    return { removedEntries, removedAssets };
  });

  let cleanupPending = true;
  try {
    cleanupPending = await removeQueuedMedia(targetId);
  } catch {
    console.warn("Admin media cleanup deferred", targetId);
  }
  return { ok: true, ...counts, cleanupPending };
}
