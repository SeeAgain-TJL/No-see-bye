import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/prisma";
import { getUserFromRequest, optionalUser } from "@/core/auth";
import { apiError, checkOrigin, HttpError, jsonBody } from "@/core/http";
import {
  includeMemory,
  memoryDTO,
  memorySchema,
  validateAssets,
} from "@/modules/memories/server";
type Context = { params: Promise<{ id: string }> };
export async function GET(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const session = optionalUser(req);
    const entry = await prisma.entry.findUnique({
      where: { id },
      include: includeMemory,
    });
    if (
      !entry ||
      ((entry.deletedAt || entry.visibility !== "public") &&
        entry.userId !== session?.userId)
    )
      throw new HttpError(404, "这段记忆不存在，或尚未公开");
    return NextResponse.json(memoryDTO(entry), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(req: NextRequest, context: Context) {
  try {
    checkOrigin(req);
    const user = getUserFromRequest(req);
    const { id } = await context.params;
    const body = await jsonBody(req);
    const entry = await prisma.$transaction(async (tx) => {
      const old = await tx.entry.findFirst({
        where: { id, userId: user.userId },
      });
      if (!old) throw new HttpError(404, "找不到这段记忆");
      if (body.action === "restore")
        return tx.entry.update({
          where: { id },
          data: { deletedAt: null },
          include: includeMemory,
        });
      if (old.deletedAt) throw new HttpError(409, "请先从回收站恢复这段记忆");
      if (body.action === "pin")
        return tx.entry.update({
          where: { id },
          data: { pinned: !old.pinned },
          include: includeMemory,
        });
      if (body.updatedAt !== old.updatedAt.toISOString())
        throw new HttpError(409, "这段记忆已在别处修改，请刷新后重新编辑");
      const { assetIds, tags, happenedAt, ...data } = memorySchema.parse(body);
      await validateAssets(tx, assetIds, user.userId, id);
      await tx.entryAsset.deleteMany({ where: { entryId: id } });
      return tx.entry.update({
        where: { id },
        data: {
          ...data,
          tags: JSON.stringify([...new Set(tags)]),
          happenedAt: new Date(happenedAt),
          attachments: {
            create: assetIds.map((assetId, position) => ({
              assetId,
              position,
            })),
          },
        },
        include: includeMemory,
      });
    });
    return NextResponse.json(memoryDTO(entry));
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(req: NextRequest, context: Context) {
  try {
    checkOrigin(req);
    const user = getUserFromRequest(req);
    const { id } = await context.params;
    const result = await prisma.entry.updateMany({
      where: { id, userId: user.userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (!result.count) throw new HttpError(404, "找不到这段记忆");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
