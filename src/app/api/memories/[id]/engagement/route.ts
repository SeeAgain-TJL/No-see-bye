import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/core/prisma";
import { assertCurrentSession, getUserFromRequest } from "@/core/auth";
import { apiError, checkOrigin, HttpError, jsonBody } from "@/core/http";
import { engagementDTO, engagementSelect, publicEntry, requirePublicEntry } from "@/modules/memories/public-engagement.server";

type Context = { params: Promise<{ id: string }> };
const commentSelect = {
  id: true, content: true, createdAt: true,
  user: { select: { username: true, displayName: true } },
} as const;
const presentComment = ({ user, ...comment }: {
  id: string; content: string; createdAt: Date; user: { username: string; displayName: string };
}) => ({ ...comment, author: user.displayName || user.username });
const reactionSchema = z.object({ kind: z.enum(["like", "save"]), active: z.boolean() });
const commentSchema = z.object({ content: z.string().trim().min(1, "请写下评论").max(500, "评论最多 500 字") });
const headers = { "Cache-Control": "private, no-store" };
const pageSize = 20;

export async function GET(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const cursor = req.nextUrl.searchParams.get("cursor");
    const comments = await prisma.$transaction(async tx => {
      await requirePublicEntry(tx, id);
      const after = cursor ? await tx.entryComment.findUnique({
        where: { id: cursor, entryId: id }, select: { id: true, createdAt: true },
      }) : null;
      if (cursor && !after) throw new HttpError(400, "评论分页已变化，请刷新后重试");
      return tx.entryComment.findMany({
        where: { entryId: id, ...(after && { OR: [{ createdAt: { lt: after.createdAt } }, { createdAt: after.createdAt, id: { lt: after.id } }] }) },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: pageSize + 1, select: commentSelect,
      });
    });
    const page = comments.slice(0, pageSize);
    return NextResponse.json({ items: page.map(presentComment), nextCursor: comments.length > pageSize ? page.at(-1)?.id : null }, { headers });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(req: NextRequest, { params }: Context) {
  try {
    checkOrigin(req);
    const session = await getUserFromRequest(req);
    const { id } = await params;
    const { kind, active } = reactionSchema.parse(await jsonBody(req));
    const reaction = { entryId: id, userId: session.userId, kind };
    const summary = await prisma.$transaction(async tx => {
      await assertCurrentSession(tx, session);
      await requirePublicEntry(tx, id);
      if (active) await tx.entryReaction.upsert({ where: { entryId_userId_kind: reaction }, create: reaction, update: {} });
      else await tx.entryReaction.deleteMany({ where: reaction });
      return tx.entry.findUniqueOrThrow({ where: { id, ...publicEntry }, select: engagementSelect(session.userId) });
    });
    return NextResponse.json(engagementDTO(summary), { headers });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest, { params }: Context) {
  try {
    checkOrigin(req);
    const session = await getUserFromRequest(req);
    const { id } = await params;
    const { content } = commentSchema.parse(await jsonBody(req));
    const result = await prisma.$transaction(async tx => {
      await assertCurrentSession(tx, session);
      await requirePublicEntry(tx, id);
      const recent = await tx.entryComment.count({ where: { userId: session.userId, createdAt: { gte: new Date(Date.now() - 60_000) } } });
      if (recent >= 5) throw new HttpError(429, "评论太频繁，请稍后再试");
      const comment = await tx.entryComment.create({ data: { entryId: id, userId: session.userId, content }, select: commentSelect });
      const summary = await tx.entry.findUniqueOrThrow({ where: { id }, select: engagementSelect(session.userId) });
      return { comment: presentComment(comment), engagement: engagementDTO(summary) };
    });
    return NextResponse.json(result, { status: 201, headers });
  } catch (error) {
    return apiError(error);
  }
}
