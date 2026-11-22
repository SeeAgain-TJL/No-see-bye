import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/core/auth";
import { apiError, checkOrigin, HttpError, jsonBody } from "@/core/http";
import { prisma } from "@/core/prisma";
import { getStorage } from "@/core/storage-factory";

export const runtime = "nodejs";

// A server-issued cutoff protects records moved to trash after confirmation opens.
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const before = new Date();
    const count = await prisma.entry.count({
      where: { userId: user.userId, deletedAt: { lte: before } },
    });
    const pending = await prisma.asset.count({
      where: { ownerId: user.userId, status: "deleting", attachment: null },
    });
    return NextResponse.json({ count, before: before.toISOString(), pending }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}

const deleteSchema = z.discriminatedUnion("confirmation", [
  z.object({ confirmation: z.literal("EMPTY_TRASH"), before: z.string().datetime({ offset: true }) }),
  z.object({ confirmation: z.literal("DELETE_ENTRY"), id: z.string().min(1).max(128), deletedAt: z.string().datetime({ offset: true }) }),
]);

export async function DELETE(req: NextRequest) {
  try {
    checkOrigin(req);
    const { userId } = await getUserFromRequest(req);
    const selection = deleteSchema.parse(await jsonBody(req));
    const single = selection.confirmation === "DELETE_ENTRY";
    const cutoff = new Date(single ? selection.deletedAt : selection.before);
    if (cutoff.getTime() > Date.now()) throw new HttpError(400, "请重新打开删除确认窗口");
    const where = single
      ? { userId, id: selection.id, deletedAt: cutoff }
      : { userId, deletedAt: { lte: cutoff } };
    const storage = getStorage();
    const { deleted, targetIds } = await prisma.$transaction(async (tx) => {
      const attached = { ownerId: userId, attachment: { entry: where } };
      // The exact trash timestamp protects a restored or re-trashed record from a stale confirmation.
      const targetIds = single ? (await tx.asset.findMany({ where: attached, select: { id: true } })).map(asset => asset.id) : [];
      // Tombstones survive filesystem failures and prevent reuse / public access.
      await tx.asset.updateMany({ where: attached, data: { status: "deleting" } });
      const { count: deleted } = await tx.entry.deleteMany({ where });
      if (single && !deleted) throw new HttpError(404, "这条日常已不在当前回收站，请刷新后重试");
      return { deleted, targetIds };
    });

    // Single-entry removal touches only that entry's files. Bulk emptying also retries older tombstones.
    const cleanup = { ownerId: userId, status: "deleting", attachment: null, ...(single ? { id: { in: targetIds } } : {}) };
    const assets = await prisma.asset.findMany({ where: cleanup, take: 500 });
    for (const asset of assets) {
      try {
        if (asset.driver !== storage.driver) continue;
        for (const key of new Set([asset.key, asset.thumbnailKey, asset.coverKey])) {
          if (key) await storage.delete(key);
        }
        await prisma.asset.deleteMany({
          where: { id: asset.id, ownerId: userId, status: "deleting", attachment: null },
        });
      } catch (error) {
        console.error("Trash attachment cleanup will be retried", asset.id, error);
      }
    }
    const pending = await prisma.asset.count({ where: cleanup });
    return NextResponse.json({ ok: true, deleted, pending });
  } catch (error) {
    return apiError(error);
  }
}
