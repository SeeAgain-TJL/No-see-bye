import type { NextRequest } from "next/server";
import { handleOAuthRequest } from "../../oauth-handler";

export async function GET(req: NextRequest) {
  return handleOAuthRequest(req, "qq", true);
}
