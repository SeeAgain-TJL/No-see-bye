import type { MediaAsset } from "@/modules/memories/types";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      data?.error || "网络有点忙，请稍后再试",
      response.status,
    );
  return data as T;
}
export function upload(
  file: File,
  onProgress: (value: number) => void,
  signal: AbortSignal,
): Promise<MediaAsset> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/assets");
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
    const abort = () => xhr.abort();
    signal.addEventListener("abort", abort, { once: true });
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onloadend = () => signal.removeEventListener("abort", abort);
    xhr.onload = () => {
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("上传失败，请检查文件大小或网络"));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.error || "上传失败，请重试"));
    };
    xhr.onerror = () => reject(new Error("网络中断，文件仍在，可以重试"));
    xhr.onabort = () => reject(new DOMException("上传已取消", "AbortError"));
    if (signal.aborted) {
      reject(new DOMException("上传已取消", "AbortError"));
      return;
    }
    xhr.send(file);
  });
}
export function bytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 ** 3) return `${(size / 1024 ** 2).toFixed(1)} MB`;
  return `${(size / 1024 ** 3).toFixed(1)} GB`;
}
export const dateText = (value: string, options?: Intl.DateTimeFormatOptions) =>
  new Date(value).toLocaleDateString("zh-CN", {
    timeZone: "Asia/Shanghai",
    ...options,
  });
