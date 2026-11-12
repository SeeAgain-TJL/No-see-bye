import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";
import { buildObjectKey, initMultipartUpload } from "@/lib/tos";

const initSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().positive(),
});

/**
 * Initialize a multipart upload for large video files.
 * Returns uploadId and the objectKey for subsequent part upload requests.
 */
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);

    const body = await request.json();
    const parsed = initSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { filename, contentType } = parsed.data;

    if (!contentType.startsWith("video/")) {
      return NextResponse.json(
        { error: "Multipart upload is for video files only" },
        { status: 400 }
      );
    }

    const objectKey = buildObjectKey(user.userId, filename);
    const uploadId = await initMultipartUpload(objectKey, contentType);

    return NextResponse.json({ uploadId, objectKey });
  } catch (err) {
    console.error("Multipart init error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message.includes("Authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
