/**
 * 客户端上传工具，用于在浏览器中直传媒体文件到 TOS。
 */

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk

export async function uploadImage(file: File, token: string): Promise<string> {
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Image size must be under 15MB");
  }

  // 1. Get presigned URL
  const signRes = await fetch("/api/upload/sign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    }),
  });

  if (!signRes.ok) {
    const err = await signRes.json();
    throw new Error(err.error || "Failed to get upload signature");
  }

  const { uploadUrl, objectKey } = await signRes.json();

  // 2. PUT file to presigned URL
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("Failed to upload file");
  }

  return objectKey;
}

interface UploadProgress {
  percent: number;
  uploadedBytes: number;
  totalBytes: number;
}

export async function uploadVideo(
  file: File,
  token: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  const totalParts = Math.ceil(file.size / CHUNK_SIZE);

  // 1. Initialize multipart upload
  const initRes = await fetch("/api/upload/multipart/init", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    }),
  });

  if (!initRes.ok) {
    const err = await initRes.json();
    throw new Error(err.error || "Failed to initialize upload");
  }

  const { uploadId, objectKey } = await initRes.json();

  // 2. Upload parts
  const parts: Array<{ partNumber: number; eTag: string }> = [];
  let uploadedBytes = 0;

  for (let i = 0; i < totalParts; i++) {
    const partNumber = i + 1;
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    // Get part URL
    const partUrlRes = await fetch("/api/upload/multipart/part-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ objectKey, uploadId, partNumber }),
    });

    if (!partUrlRes.ok) {
      throw new Error(`Failed to get part URL for part ${partNumber}`);
    }

    const { partUrl } = await partUrlRes.json();

    // Upload chunk
    const uploadRes = await fetch(partUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: chunk,
    });

    if (!uploadRes.ok) {
      throw new Error(`Failed to upload part ${partNumber}`);
    }

    const eTag = uploadRes.headers.get("ETag")?.replace(/"/g, "");
    if (!eTag) {
      throw new Error(`No ETag returned for part ${partNumber}`);
    }

    parts.push({ partNumber, eTag });

    uploadedBytes += chunk.size;
    onProgress?.({
      percent: Math.round((uploadedBytes / file.size) * 100),
      uploadedBytes,
      totalBytes: file.size,
    });
  }

  // 3. Complete upload
  const completeRes = await fetch("/api/upload/multipart/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ objectKey, uploadId, parts }),
  });

  if (!completeRes.ok) {
    const err = await completeRes.json();
    throw new Error(err.error || "Failed to complete upload");
  }

  return objectKey;
}

export async function abortVideoUpload(
  objectKey: string,
  uploadId: string,
  token: string
): Promise<void> {
  await fetch("/api/upload/multipart/abort", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ objectKey, uploadId }),
  });
}