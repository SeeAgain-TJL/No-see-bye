import { NextRequest, NextResponse } from "next/server";
import { optionalUser } from "@/core/auth";
import { prisma } from "@/core/prisma";
export async function GET(req: NextRequest) {
  const session = await optionalUser(req);
  const user = session
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, username: true, email: true, displayName: true },
      })
    : null;
  return NextResponse.json(
    { user },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
