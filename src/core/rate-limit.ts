import { HttpError } from "@/core/http";
const globalState = globalThis as unknown as {
  authAttempts?: Map<string, { count: number; until: number }>;
};
const attempts = (globalState.authAttempts ??= new Map());
// Single-process ECS limiter. Move to Redis before enabling multiple app replicas.
export function rateLimit(key: string, max = 12, windowMs = 15 * 60_000) {
  const now = Date.now();
  if (attempts.size >= 5000) {
    for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
    if (attempts.size >= 5000) throw new HttpError(429, "访问繁忙，请稍后重试");
  }
  const item = attempts.get(key);
  if (!item || item.until < now) {
    attempts.set(key, { count: 1, until: now + windowMs });
    return;
  }
  if (++item.count > max)
    throw new HttpError(429, "尝试次数较多，请 15 分钟后再试");
}
