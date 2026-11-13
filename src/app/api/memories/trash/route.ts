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

const emptySchema = z.object({
  confirmation: z.literal("EMPTY_TRASH"),
  before: z.string().datetime({ offset: true }),
});

export async function DELETE(req: NextRequest) {
  try {
    checkOrigin(req);
    const user = await getUserFromRequest(req);
    const body = emptySchema.parse(await jsonBody(req));
    const before = new Date(body.before);
    if (before.getTime() > Date.now()) throw new HttpError(400, "请重新打开清空确认窗口");
    const storage = getStorage();
    const deleted = await prisma.$transaction(async (tx) => {
      const where = { userId: user.userId, deletedAt: { lte: before } };
      // Tombstones survive filesystem failures and prevent reuse / public access.
      await tx.asset.updateMany({
        where: { ownerId: user.userId, attachment: { entry: where } },
        data: { status: "deleting" },
      });
      return (await tx.entry.deleteMany({ where })).count;
    });

    // Keep unsuccessful files in the DB so a retry or maintenance can remove them.
    const assets = await prisma.asset.findMany({
      where: { ownerId: user.userId, status: "deleting", attachment: null },
      take: 500,
    });
    for (const asset of assets) {
      try {
        if (asset.driver !== storage.driver) continue;
        for (const key of new Set([asset.key, asset.thumbnailKey, asset.coverKey])) {
          if (key) await storage.delete(key);
        }
        await prisma.asset.deleteMany({
          where: { id: asset.id, ownerId: user.userId, status: "deleting", attachment: null },
        });
      } catch (error) {
        console.error("Trash attachment cleanup will be retried", asset.id, error);
      }
    }
    const pending = await prisma.asset.count({
      where: { ownerId: user.userId, status: "deleting", attachment: null },
    });
    return NextResponse.json({ ok: true, deleted, pending });
  } catch (error) {
    return apiError(error);
  }
}
