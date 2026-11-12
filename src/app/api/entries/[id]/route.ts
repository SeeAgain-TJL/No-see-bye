import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPresignedReadUrls, deleteObject } from "@/lib/tos";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    const { id } = params;

    const entry = await prisma.entry.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    if (entry.userId !== user.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allKeys = entry.media.map((m) => m.objectKey);
    const presignedUrls = getPresignedReadUrls(allKeys, 3600);
    
    return NextResponse.json({
      id: entry.id,
      content: entry.content,
      visibility: entry.visibility,
      createdAt: entry.createdAt.toISOString(),
      media: entry.media.map((m) => ({
        id: m.id,
        type: m.type,
        objectKey: m.objectKey,
        url: presignedUrls[m.objectKey] || "",
        width: m.width,
        height: m.height,
      })),
    });
  } catch (err) {
    console.error("Get entry error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message.includes("Authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    const { id } = params;

    const entry = await prisma.entry.findUnique({
      where: { id },
      include: { media: true },
    });
    
    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    if (entry.userId !== user.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.entry.delete({ where: { id } });
    await Promise.allSettled(
      entry.media.map((m) => deleteObject(m.objectKey))
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete entry error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message.includes("Authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}