import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";
import { buildObjectKey, getPresignedUploadUrl } from "@/lib/tos";

// Allowed types and a sane size ceiling for single-shot (non-multipart) uploads.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB for images

const signSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().positive(),
});

/**
 * Issues a presigned PUT URL so the browser can upload a file directly
 * to the TOS bucket without the bytes ever passing through our server.
 */
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);

    const body = await request.json();
    const parsed = signSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { filename, contentType, sizeBytes } = parsed.data;

    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use the /multipart endpoint for video." },
        { status: 400 }
      );
    }

    if (sizeBytes > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Max ${MAX_SIZE_BYTES / 1024 / 1024}MB for single upload.` },
        { status: 400 }
      );
    }

    const objectKey = buildObjectKey(user.userId, filename);
    const uploadUrl = await getPresignedUploadUrl(objectKey, contentType);

    return NextResponse.json({ uploadUrl, objectKey });
  } catch (err) {
    console.error("Upload sign error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message.includes("Authorization") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
