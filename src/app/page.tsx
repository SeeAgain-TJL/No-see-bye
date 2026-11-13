"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/providers";
import { Icon } from "@/components/icons";
import { MemoryScene } from "@/components/memory-scene";
import { CollectionCard } from "@/modules/memories/collection-card";
import { api } from "@/lib/client";
import type { MemoryList } from "@/modules/memories/types";

const categories = [["all", "全部", "grid"], ["photo", "照片", "image"], ["video", "影像", "video"], ["text", "文字", "edit"]];

export default function Home() {
  const { user, loading } = useApp();
  const [kind, setKind] = useState("all");
  const ownerKey = (user?.id || "guest") + ":" + kind;
  const [response, setResponse] = useState<{ key: string; data?: MemoryList; error?: string } | null>(null);
  const current = response?.key === ownerKey ? response : null;
  const data = current?.data;
  useEffect(() => {
    if (loading) return;
    const abort = new AbortController();
    api<MemoryList>("/api/memories?scope=" + (user ? "mine" : "public") + (kind === "all" ? "" : "&type=" + kind), { signal: abort.signal })
      .then((value) => setResponse({ key: ownerKey, data: value }))
      .catch((error) => { if (!abort.signal.aborted) setResponse({ key: ownerKey, error: error.message }); });
    return () => abort.abort();
  }, [user, loading, ownerKey, kind]);
  const target = user ? "/memories" : "/memories?scope=public";
  return (
    <AppShell>
      <div className="journal-home">
        <section className="journal-hero" aria-labelledby="hero-title">
          <div className="journal-hero-copy">
            <span className="journal-greeting"><span />{user ? (user.displayName || user.username) + " 的日常收藏" : "不说再见 · 日常收藏"}</span>
            <h1 id="hero-title">日子很轻。<br /><em>回忆有分量。</em></h1>
            <p>把照片、影像和心情，留在这里。</p>
            <div className="journal-hero-actions">
              <Link href="/memories/new" className="button">记录此刻<Icon name="plus" size={18} /></Link>
              <Link href={target} className="journal-open">翻开手札<Icon name="arrow" size={18} /></Link>
            </div>
          </div>
          <MemoryScene />
        </section>
        <div className="journal-summary">
          <div><Icon name="book" size={18} /><span>{user ? "我的记忆手札" : "日常，从这里开始"}</span>{data?.stats && <span className="summary-count"><strong>{data.stats.total}</strong> 条记录<span className="summary-divider" /><strong>{data.stats.photos}</strong> 张照片<span className="summary-divider" /><strong>{data.stats.videos}</strong> 段影像</span>}</div>
          <Link href="/memories?scope=public">公开的片刻<Icon name="arrow" size={16} /></Link>
        </div>
        <section className="journal-collection" aria-labelledby="collection-title">
          <div className="collection-top"><div className="collection-heading"><h2 id="collection-title">{user ? "最近记录" : "最近分享"}<span> / </span></h2><Link href={target}>查看全部<Icon name="arrow" size={16} /></Link></div>
          <div className="collection-filters" role="group" aria-label="最近记录类型">{categories.map(([value, label, icon]) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)}><Icon name={icon} size={15} />{label}</button>)}</div></div>
          {current?.error ? <div className="notice error" role="alert">{current.error}</div> : loading || !data ? <div className="collection-skeleton" role="status" aria-label="正在加载记录"><span /><span /><span /></div> : data.items.length ? (
            <div className="collection-grid">{data.items.slice(0, 6).map(memory => <CollectionCard key={memory.id} memory={memory} />)}</div>
          ) : <div className="collection-empty"><span><Icon name={kind === "all" ? "book" : categories.find(c => c[0] === kind)![2]} size={26} /></span><h3>{kind === "all" ? "第一份回忆，从此刻开始。" : "还没有这类记录"}</h3><Link href="/memories/new" className="text-link">记一笔<Icon name="plus" size={16} /></Link></div>}
        </section>
      </div>
    </AppShell>
  );
}
