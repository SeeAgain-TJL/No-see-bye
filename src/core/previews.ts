import sharp from "sharp";
import { Readable } from "node:stream";
import { getStorage } from "@/core/storage-factory";

// Reserve a slot before reading originals as well as decoding them. Otherwise a
// busy gallery retains one entire (up to 20 MiB) input for every queued request.
let active = 0;
const queue: Array<() => void> = [];
async function withPreviewSlot<T>(work: () => Promise<T>): Promise<T> {
  if (active >= 2) await new Promise<void>(resolve => queue.push(resolve));
  else active++;
  try {
    return await work();
  } finally {
    const next = queue.shift();
    if (next) next();
    else active--;
  }
}

async function encodePreview(key: string, input: Buffer, display: boolean) {
  const { data, info } = await sharp(input, { limitInputPixels: 40_000_000, sequentialRead: true, animated: false })
    .rotate().resize({ width: display ? 1920 : 960, height: display ? 1920 : 960, fit: "inside", withoutEnlargement: true })
    // HD is created on first open: use the faster encoder search, preserving
    // its quality and dimensions. Frequently transferred thumbnails stay small.
    .webp({ quality: display ? 82 : 72, effort: display ? 2 : 4 }).toBuffer({ resolveWithObject: true });
  const thumbnailKey = key + ".preview-" + crypto.randomUUID() + ".webp";
  await getStorage().put(thumbnailKey, Readable.from(data));
  return { thumbnailKey, width: info.width, height: info.height };
}

export function makePreview(key: string, input: Buffer, display = false) {
  return withPreviewSlot(() => encodePreview(key, input, display));
}

export function imagePreview(key: string, display = false) {
  return withPreviewSlot(async () => {
    const original = await getStorage().read(key);
    if (!original) return null;
    const parts: Buffer[] = [];
    let length = 0;
    for await (const chunk of original.stream) {
      length += chunk.length;
      if (length > 20 * 1024 ** 2) {
        original.stream.destroy();
        return null;
      }
      parts.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return encodePreview(key, Buffer.concat(parts, length), display);
  });
}
