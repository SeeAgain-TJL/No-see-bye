import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDayActivity, adminNoStore, requireAdmin } from "@/core/admin";
import { apiError } from "@/core/http";

const page = z.coerce.number().int().min(1).max(1_000_000).default(1);
const query = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD"),
  registrationPage: page,
  contributorPage: page,
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { date, registrationPage, contributorPage } = query.parse(Object.fromEntries(req.nextUrl.searchParams));
    return NextResponse.json(await adminDayActivity(date, registrationPage, contributorPage), { headers: adminNoStore });
  } catch (error) {
    return apiError(error);
  }
}
