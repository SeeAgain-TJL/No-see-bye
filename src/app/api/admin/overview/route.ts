import { NextRequest, NextResponse } from "next/server";
import { adminNoStore, adminOverview, requireAdmin } from "@/core/admin";
import { apiError } from "@/core/http";
import { mailConfigured } from "@/core/mail";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    return NextResponse.json({ ...await adminOverview(), mail: { configured: mailConfigured() } }, { headers: adminNoStore });
  } catch (error) { return apiError(error); }
}
