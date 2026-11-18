"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/client";

export const ADMIN_POLL_SECONDS = 15;

type Snapshot<T> = {
  url: string;
  data: T | null;
  updated: number;
  refreshing: boolean;
  error: string;
  denied: boolean;
};

function emptySnapshot<T>(url: string): Snapshot<T> {
  return { url, data: null, updated: 0, refreshing: false, error: "", denied: false };
}

/** Poll only while the document is visible, with at most one request in flight. */
export function useAdminLiveData<T>(url: string | null, revision: number, autoRefresh: boolean) {
  const [snapshot, setSnapshot] = useState<Snapshot<T> | null>(null);

  useEffect(() => {
    if (!url) return;
    const endpoint = url;
    let timer = 0;
    let request: AbortController | null = null;
    let disposed = false;
    let denied = false;

    async function poll() {
      if (document.hidden || request || denied || disposed) return;
      request = new AbortController();
      const controller = request;
      const timeout = window.setTimeout(() => controller.abort(), 10_000);
      setSnapshot(previous => ({ ...(previous?.url === endpoint ? previous : emptySnapshot<T>(endpoint)), refreshing: true }));
      try {
        const data = await api<T>(endpoint, { signal: controller.signal });
        if (!disposed && !controller.signal.aborted) {
          setSnapshot({ url: endpoint, data, updated: Date.now(), refreshing: false, error: "", denied: false });
        }
      } catch (error) {
        if (!disposed && !document.hidden) {
          denied = error instanceof ApiError && [401, 403].includes(error.status);
          const message = controller.signal.aborted ? "连接超时" : error instanceof Error ? error.message : "数据暂时无法获取";
          setSnapshot(previous => ({
            ...(previous?.url === endpoint && !denied ? previous : emptySnapshot<T>(endpoint)),
            refreshing: false,
            error: message,
            denied,
          }));
        }
      } finally {
        window.clearTimeout(timeout);
        request = null;
        if (autoRefresh && !denied && !disposed && !document.hidden) {
          timer = window.setTimeout(poll, ADMIN_POLL_SECONDS * 1000);
        }
      }
    }

    function visibilityChanged() {
      window.clearTimeout(timer);
      if (document.hidden) request?.abort();
      else if (autoRefresh) void poll();
      else setSnapshot(previous => previous?.url === endpoint ? { ...previous, refreshing: false } : previous);
    }

    timer = window.setTimeout(poll, 0);
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      disposed = true;
      request?.abort();
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [url, revision, autoRefresh]);

  return snapshot?.url === url ? snapshot : null;
}
