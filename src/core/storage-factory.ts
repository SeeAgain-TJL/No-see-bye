import path from "node:path";
import type { StorageProvider } from "@/core/storage";
import { LocalStorage } from "@/core/storage-local";

let instance: StorageProvider | null = null;

/** 按 STORAGE_DRIVER 返回存储实现，默认 local */
export function getStorage(): StorageProvider {
  if (instance) return instance;
  const driver = process.env.STORAGE_DRIVER || "local";
  if (driver === "local") {
    const dir =
      process.env.STORAGE_LOCAL_DIR ||
      path.join(process.cwd(), "data", "uploads");
    instance = new LocalStorage(dir);
    return instance;
  }
  throw new Error(`Unsupported STORAGE_DRIVER: ${driver}`);
}

/** 生成对象 key：users/{userId}/{yyyy}/{mm}/{随机ID}.{扩展名} */
export function buildStorageKey(
  userId: string,
  filename: string,
  now = new Date(),
): string {
  const ext = (filename.split(".").pop() || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const id = crypto.randomUUID();
  return `users/${userId}/${yyyy}/${mm}/${id}${ext ? "." + ext : ""}`;
}
