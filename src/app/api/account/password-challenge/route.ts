import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/core/auth";
import { apiError, checkOrigin, jsonBody } from "@/core/http";
import { issuePasswordChallenge } from "@/core/password-verification";

export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const session = await getUserFromRequest(req);
    return NextResponse.json(await issuePasswordChallenge(session, await jsonBody(req)), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
