import path from "node:path";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import type { StorageProvider, ByteRange, ReadResult } from "@/core/storage";
export class LocalStorage implements StorageProvider {
  readonly driver = "local" as const;
  private root: string;
  constructor(root: string) {
    this.root = path.resolve(root);
  }
  private resolve(key: string) {
    if (!key || key.includes("\0") || key.includes("\\"))
      throw new Error("Invalid storage key");
    const target = path.resolve(this.root, key);
    const relative = path.relative(this.root, target);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
      throw new Error("Invalid storage key");
    return target;
  }
  async put(key: string, body: Readable) {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    const tmp = `${target}.upload-${randomUUID()}`;
    try {
      await pipeline(
        body,
        createWriteStream(tmp, { flags: "wx", mode: 0o600 }),
      );
      await rename(tmp, target);
      return (await stat(target)).size;
    } catch (error) {
      await rm(tmp, { force: true });
      throw error;
    }
  }
  async size(key: string) {
    try {
      const s = await stat(this.resolve(key));
      return s.isFile() ? s.size : null;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  async read(key: string, range?: ByteRange): Promise<ReadResult | null> {
    const size = await this.size(key);
    if (size === null) return null;
    const start = range?.start ?? 0;
    const end = Math.min(range?.end ?? size - 1, size - 1);
    if (size === 0 || start < 0 || end < start || start >= size)
      throw new RangeError("Invalid byte range");
    return {
      stream: createReadStream(this.resolve(key), { start, end }),
      size,
      start,
      end,
    };
  }
  async delete(key: string) {
    await rm(this.resolve(key), { force: true });
  }
}
