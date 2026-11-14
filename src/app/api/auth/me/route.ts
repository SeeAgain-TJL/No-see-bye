import { NextRequest, NextResponse } from "next/server";
import { optionalUser } from "@/core/auth";
import { prisma } from "@/core/prisma";
import { publicUser } from "@/core/user";
export async function GET(req: NextRequest) {
  const session = await optionalUser(req);
  const user = session
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, username: true, email: true, displayName: true, avatarKey: true },
      })
    : null;
  return NextResponse.json(
    { user: user ? publicUser(user) : null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
