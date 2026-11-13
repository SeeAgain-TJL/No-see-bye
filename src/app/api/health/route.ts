import { prisma } from "@/core/prisma";
export async function GET() {
  try {
    await prisma.user.count();
    return Response.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
