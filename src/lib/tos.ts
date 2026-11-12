import TOS from "@volcengine/tos-sdk";
import { randomUUID } from "crypto";

/**
 * Volcengine TOS storage adapter.
 * All object-storage interaction goes through this file, so the rest of
 * the app never touches the TOS SDK directly. Swap providers by rewriting
 * this module only.
 */

let client: TOS | null = null;

function getClient(): TOS {
  if (client) return client;

  const accessKeyId = process.env.TOS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.TOS_ACCESS_KEY_SECRET;
  const region = process.env.TOS_REGION;
  const endpoint = process.env.TOS_ENDPOINT;

  if (!accessKeyId || !accessKeySecret || !region || !endpoint) {
    throw new Error(
      "TOS credentials are not configured. Set TOS_ACCESS_KEY_ID, TOS_ACCESS_KEY_SECRET, TOS_REGION, TOS_ENDPOINT in .env"
    );
  }

  client = new TOS({
    accessKeyId,
    accessKeySecret,
    region,
    endpoint,
  });

  return client;
}

function getBucket(): string {
  const bucket = process.env.TOS_BUCKET;
  if (!bucket) {
    throw new Error("TOS_BUCKET is not configured in .env");
  }
  return bucket;
}

/**
 * Per-user, per-month object key so each user's files stay isolated.
 * users/{userId}/{yyyy}/{mm}/{uuid}.{ext}
 */
export function buildObjectKey(userId: string, originalFilename: string): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const ext = originalFilename.includes(".")
    ? originalFilename.split(".").pop()?.toLowerCase()
    : "bin";
  return `users/${userId}/${yyyy}/${mm}/${randomUUID()}.${ext}`;
}

/**
 * Presigned PUT URL for a direct browser upload. The file bytes never
 * pass through our server.
 */
export function getPresignedUploadUrl(
  objectKey: string,
  expiresInSeconds = 300
): string {
  return getClient().getPreSignedUrl({
    method: "PUT",
    bucket: getBucket(),
    key: objectKey,
    expires: expiresInSeconds,
  });
}

/**
 * Presigned GET URL for reading a private object. Returned to the client
 * with a short lifetime so the bucket can stay private.
 */
export function getPresignedReadUrl(
  objectKey: string,
  expiresInSeconds = 3600
): string {
  return getClient().getPreSignedUrl({
    method: "GET",
    bucket: getBucket(),
    key: objectKey,
    expires: expiresInSeconds,
  });
}

export function getPresignedReadUrls(
  objectKeys: string[],
  expiresInSeconds = 3600
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of objectKeys) {
    result[key] = getPresignedReadUrl(key, expiresInSeconds);
  }
  return result;
}

/**
 * Start a multipart upload for large video files. Returns the uploadId
 * that subsequent part uploads must reference.
 */
export async function initMultipartUpload(
  objectKey: string,
  contentType: string
): Promise<string> {
  const result = await getClient().createMultipartUpload({
    bucket: getBucket(),
    key: objectKey,
    contentType,
  });
  return result.data.UploadId;
}

/**
 * Presigned PUT URL for a single part of a multipart upload.
 * partNumber is 1-based.
 */
export function getPresignedPartUrl(
  objectKey: string,
  uploadId: string,
  partNumber: number,
  expiresInSeconds = 600
): string {
  return getClient().getPreSignedUrl({
    method: "PUT",
    bucket: getBucket(),
    key: objectKey,
    expires: expiresInSeconds,
    query: {
      uploadId,
      partNumber: String(partNumber),
    },
  });
}

export async function completeMultipartUpload(
  objectKey: string,
  uploadId: string,
  parts: { partNumber: number; eTag: string }[]
): Promise<void> {
  await getClient().completeMultipartUpload({
    bucket: getBucket(),
    key: objectKey,
    uploadId,
    parts: parts.map((p) => ({ partNumber: p.partNumber, eTag: p.eTag })),
  });
}

export async function abortMultipartUpload(
  objectKey: string,
  uploadId: string
): Promise<void> {
  await getClient().abortMultipartUpload({
    bucket: getBucket(),
    key: objectKey,
    uploadId,
  });
}

export async function deleteObject(objectKey: string): Promise<void> {
  await getClient().deleteObject({ bucket: getBucket(), key: objectKey });
}

/**
 * Append TOS image-processing parameters to a signed URL so the same
 * original object can be served resized without pre-generating variants.
 * Note: image processing must be enabled on the bucket for this to work.
 */
export function appendImageProcess(
  url: string,
  options: { width?: number; height?: number; quality?: number }
): string {
  const ops: string[] = [];
  if (options.width || options.height) {
    const dims = [
      options.width ? `w_${options.width}` : "",
      options.height ? `h_${options.height}` : "",
    ].filter(Boolean);
    ops.push(`resize,${dims.join(",")}`);
  }
  if (options.quality) {
    ops.push(`quality,q_${options.quality}`);
  }
  if (ops.length === 0) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}x-tos-process=image/${ops.join("/")}`;
}
