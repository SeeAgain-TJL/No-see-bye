"use client";
import Link from "next/link";
import { useApp } from "@/components/providers";
import { Icon } from "@/components/icons";
import { MemoryEditor } from "@/modules/memories/editor";
export default function Page() {
  const { user, loading } = useApp();
  if (loading) return <div className="loading-panel">正在准备纸笔…</div>;
  if (!user)
    return (
      <div className="empty-state">
        <Icon name="lock" size={32} />
        <h1>先登录，记忆才有归处。</h1>
        <p>每个人都有独立的空间，记录默认只有自己可见。</p>
        <Link href="/login" className="button">
          登录后开始记录
        </Link>
      </div>
    );
  return <MemoryEditor key={user.id} />;
}
