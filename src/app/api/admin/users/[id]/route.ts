import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminNoStore, requireAdmin } from "@/core/admin";
import { applyAdminUserOperation } from "@/core/admin-user-lifecycle";
import { apiError, checkOrigin, HttpError, jsonBody } from "@/core/http";

export const runtime = "nodejs";

const requestBody = z.object({
  action: z.enum(["clear-data", "delete-user"]),
  confirmUsername: z.string().min(1, "请输入目标用户名").max(100),
}).strict();

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(req);
    const operator = await requireAdmin(req);
    const contentType = req.headers.get("content-type")?.split(";")[0].trim();
    if (contentType !== "application/json") {
      throw new HttpError(415, "请在管理台重新提交操作");
    }
    const { id } = await context.params;
    const { action, confirmUsername } = requestBody.parse(await jsonBody(req));
    const result = await applyAdminUserOperation(operator, id, action, confirmUsername);
    return NextResponse.json(result, { headers: adminNoStore });
  } catch (error) {
    const response = apiError(error);
    response.headers.set("Cache-Control", adminNoStore["Cache-Control"]);
    return response;
  }
}
