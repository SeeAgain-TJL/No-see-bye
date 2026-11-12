import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";
import { abortMultipartUpload } from "@/lib/tos";

const abortSchema = z.object({
  objectKey: z.string().min(1),
  uploadId: z.string().min(1),
});

/**
 * Abort a multipart upload if the user cancels or an error occurs.
 * Cleans up partially uploaded parts from TOS.
 */
export async function POST(request: NextRequest) {
  try {
    getUserFromRequest(request);

    const body = await request.json();
    const parsed = abortSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { objectKey, uploadId } = parsed.data;
    await abortMultipartUpload(objectKey, uploadId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Abort multipart error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message.includes("Authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
