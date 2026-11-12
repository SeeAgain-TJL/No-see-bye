import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";
import { getPresignedPartUrl } from "@/lib/tos";

const partUrlSchema = z.object({
  objectKey: z.string().min(1),
  uploadId: z.string().min(1),
  partNumber: z.number().int().positive(),
});

/**
 * Generate a presigned URL for uploading a single part of a multipart upload.
 * The browser will PUT the part bytes directly to TOS using this URL.
 */
export async function POST(request: NextRequest) {
  try {
    getUserFromRequest(request); // Verify auth

    const body = await request.json();
    const parsed = partUrlSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { objectKey, uploadId, partNumber } = parsed.data;
    const partUrl = getPresignedPartUrl(objectKey, uploadId, partNumber);

    return NextResponse.json({ partUrl });
  } catch (err) {
    console.error("Part URL error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message.includes("Authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
