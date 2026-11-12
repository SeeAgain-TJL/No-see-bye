import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";
import { completeMultipartUpload } from "@/lib/tos";

const completeSchema = z.object({
  objectKey: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z.array(
    z.object({
      partNumber: z.number().int().positive(),
      eTag: z.string().min(1),
    })
  ),
});

/**
 * Complete a multipart upload after all parts have been uploaded.
 * The browser provides the list of part numbers + eTags it received,
 * and TOS reassembles the final object.
 */
export async function POST(request: NextRequest) {
  try {
    getUserFromRequest(request);

    const body = await request.json();
    const parsed = completeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { objectKey, uploadId, parts } = parsed.data;
    await completeMultipartUpload(objectKey, uploadId, parts);

    return NextResponse.json({ success: true, objectKey });
  } catch (err) {
    console.error("Complete multipart error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message.includes("Authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
