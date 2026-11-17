import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminNoStore, adminUsers, requireAdmin } from "@/core/admin";
import { apiError } from "@/core/http";

const query = z.object({ page: z.coerce.number().int().min(1).max(1_000_000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20), q: z.string().trim().max(100).default("") });
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { q, page, pageSize } = query.parse(Object.fromEntries(req.nextUrl.searchParams));
    return NextResponse.json(await adminUsers(q, page, pageSize), { headers: adminNoStore });
  } catch (error) { return apiError(error); }
}
