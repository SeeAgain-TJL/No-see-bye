import { Suspense } from "react";
import { MemoryFeed } from "@/modules/memories/feed";
export default function Page() {
  return (
    <Suspense fallback={<div className="loading-panel">正在打开回收站…</div>}>
      <MemoryFeed trash />
    </Suspense>
  );
}
