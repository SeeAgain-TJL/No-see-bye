import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPresignedReadUrls } from "@/lib/tos";

const listSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * GET /api/entries?cursor=...&limit=20
 * List diary entries for the current user, newest first, with pagination.
 * Media URLs are presigned GET URLs with 1 hour expiration.
 */
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);

    const { searchParams } = new URL(request.url);
    const parsed = listSchema.safeParse({
      cursor: searchParams.get("cursor"),
      limit: searchParams.get("limit"),
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
    }

    const { cursor, limit } = parsed.data;

    const entries = await prisma.diaryEntry.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // fetch one extra to determine if there's a next page
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = entries.length > limit;
    const items = hasMore ? entries.slice(0, limit) : entries;
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    // Collect all media objectKeys so we can batch-presign them
    const allKeys = items.flatMap((e) => e.mediaUrls);
    const presignedUrls = getPresignedReadUrls(allKeys, 3600);

    const result = items.map((entry) => ({
      id: entry.id,
      textContent: entry.textContent,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      media: entry.mediaUrls.map((key) => ({
        objectKey: key,
        url: presignedUrls[key] || "",
      })),
    }));

    return NextResponse.json({ entries: result, nextCursor });
  } catch (err) {
    console.error("List entries error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message.includes("Authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

const createSchema = z.object({
  textContent: z.string().optional(),
  mediaUrls: z.array(z.string()).default([]),
});

/**
 * POST /api/entries
 * Create a new diary entry. mediaUrls are object keys (not presigned URLs)
 * obtained after successfully uploading media to TOS.
 */
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { textContent, mediaUrls } = parsed.data;

    if (!textContent && mediaUrls.length === 0) {
      return NextResponse.json(
        { error: "Entry must have text or media" },
        { status: 400 }
      );
    }

    const entry = await prisma.diaryEntry.create({
      data: {
        userId: user.userId,
        textContent: textContent || "",
        mediaUrls,
      },
    });

    return NextResponse.json({ id: entry.id });
  } catch (err) {
    console.error("Create entry error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message.includes("Authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
