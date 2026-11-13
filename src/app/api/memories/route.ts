import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/core/prisma";
import { getUserFromRequest, optionalUser } from "@/core/auth";
import { apiError, checkOrigin, HttpError, jsonBody } from "@/core/http";
import {
  includeMemory,
  memoryDTO,
  memorySchema,
  validateAssets,
  quotaBytes,
} from "@/modules/memories/server";
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const scope = q.get("scope") || "mine";
    if (!["mine", "public", "trash"].includes(scope))
      throw new HttpError(400, "无效的浏览范围");
    const user =
      scope === "public" ? await optionalUser(req) : await getUserFromRequest(req);
    const filters: Prisma.EntryWhereInput[] = [
      scope === "public"
        ? { visibility: "public", deletedAt: null }
        : {
            userId: user!.userId,
            deletedAt: scope === "trash" ? { not: null } : null,
          },
    ];
    const search = (q.get("q") || "").trim().slice(0, 100);
    if (search)
      filters.push({
        OR: [
          { title: { contains: search } },
          { content: { contains: search } },
          { location: { contains: search } },
          { tags: { contains: search } },
        ],
      });
    const type = q.get("type");
    if (type === "photo" || type === "video")
      filters.push({
        attachments: {
          some: {
            asset: {
              mime: { startsWith: type === "photo" ? "image/" : "video/" },
            },
          },
        },
      });
    if (type === "text") filters.push({ attachments: { none: {} } });
    if (q.get("pinned") === "1") filters.push({ pinned: true });
    const month = q.get("month");
    if (month) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
        throw new HttpError(400, "月份格式不正确");
      const [y, m] = month.split("-").map(Number);
      filters.push({
        happenedAt: {
          gte: new Date(Date.UTC(y, m - 1, 1) - 8 * 3600000),
          lt: new Date(Date.UTC(y, m, 1) - 8 * 3600000),
        },
      });
    }
    const cursor = q.get("cursor");
    if (cursor) {
      try {
        const c = JSON.parse(Buffer.from(cursor, "base64url").toString());
        const time = new Date(c.time);
        if (typeof c.id !== "string" || isNaN(time.getTime()))
          throw new Error();
        filters.push({
          OR: [
            { happenedAt: { lt: time } },
            { happenedAt: time, id: { lt: c.id } },
          ],
        });
      } catch {
        throw new HttpError(400, "分页信息无效，请刷新页面");
      }
    }
    const items = await prisma.entry.findMany({
      where: { AND: filters },
      include: includeMemory,
      orderBy: [{ happenedAt: "desc" }, { id: "desc" }],
      take: 13,
    });
    const more = items.length > 12;
    const visible = items.slice(0, 12);
    const last = visible.at(-1);
    let stats = null;
    if (user && !cursor) {
      const base = { userId: user.userId, deletedAt: null };
      const [total, photos, videos, storage] = await Promise.all([
        prisma.entry.count({ where: base }),
        prisma.entryAsset.count({
          where: { entry: base, asset: { mime: { startsWith: "image/" } } },
        }),
        prisma.entryAsset.count({
          where: { entry: base, asset: { mime: { startsWith: "video/" } } },
        }),
        prisma.asset.aggregate({
          where: { ownerId: user.userId },
          _sum: { sizeBytes: true },
        }),
      ]);
      stats = {
        total,
        photos,
        videos,
        usedBytes: storage._sum.sizeBytes || 0,
        quotaBytes: quotaBytes(),
      };
    }
    return NextResponse.json(
      {
        items: visible.map(memoryDTO),
        nextCursor:
          more && last
            ? Buffer.from(
                JSON.stringify({
                  id: last.id,
                  time: last.happenedAt.toISOString(),
                }),
              ).toString("base64url")
            : null,
        stats,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const user = await getUserFromRequest(req);
    const { assetIds, tags, happenedAt, ...body } = memorySchema.parse(
      await jsonBody(req),
    );
    const entry = await prisma.$transaction(async (tx) => {
      await validateAssets(tx, assetIds, user.userId);
      return tx.entry.create({
        data: {
          ...body,
          tags: JSON.stringify([...new Set(tags)]),
          happenedAt: new Date(happenedAt),
          userId: user.userId,
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
    return NextResponse.json(memoryDTO(entry), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
