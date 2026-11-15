"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/providers";
import { Icon } from "@/components/icons";
import { HomeHero } from "@/modules/memories/home-hero";
import { CollectionCard } from "@/modules/memories/collection-card";
import { QuickNote } from "@/modules/memories/quick-note";
import { RevisitPanel } from "@/modules/memories/revisit-panel";
import { api } from "@/lib/client";
import type { MemoryList } from "@/modules/memories/types";

const categories = [["all", "全部", "grid"], ["photo", "照片", "image"], ["video", "视频", "video"], ["text", "文字", "edit"]];
export default function Home() {
  const { user, loading } = useApp();
  const [kind, setKind] = useState("all");
  const [revision, setRevision] = useState(0);
  const ownerKey = (user?.id || "guest") + ":" + revision;
  const [response, setResponse] = useState<{ key: string; data?: MemoryList; error?: string } | null>(null);
  const [filtered, setFiltered] = useState<{ key: string; data?: MemoryList; error?: string } | null>(null);
  const filterKey = ownerKey + ":" + kind;
  useEffect(() => {
    if (loading) return;
    const abort = new AbortController();
    api<MemoryList>("/api/memories?scope=" + (user ? "mine" : "public"), { signal: abort.signal })
      .then(data => setResponse({ key: ownerKey, data }))
      .catch(error => { if (!abort.signal.aborted) setResponse({ key: ownerKey, error: error.message }); });
    return () => abort.abort();
  }, [loading, user, ownerKey]);
  useEffect(() => {
    if (loading || kind === "all") return;
    const abort = new AbortController();
    api<MemoryList>("/api/memories?scope=" + (user ? "mine" : "public") + "&type=" + kind, { signal: abort.signal })
      .then(data => setFiltered({ key: filterKey, data }))
      .catch(error => { if (!abort.signal.aborted) setFiltered({ key: filterKey, error: error.message }); });
    return () => abort.abort();
  }, [loading, user, kind, filterKey]);
  const recent = response?.key === ownerKey ? response : null;
  const current = kind === "all" ? recent : filtered?.key === filterKey ? filtered : null;
  const data = current?.data;
  const target = user ? "/memories" : "/memories?scope=public";
  const items = data?.items.slice(0, 6) || [];
  const featuredFirst = items.length % 2 === 1;
  return <AppShell><div className="studio-home">
    <HomeHero key={user?.id || "guest"} user={user} data={recent?.data} error={recent?.error} onRetry={() => setRevision(v => v + 1)} />
    <div className="home-interlude"><span><Icon name="spark" size={18} />平凡的日子，也有自己的光。</span>{user && recent?.data?.stats ? <span className="home-keepsakes"><strong>{recent.data.stats.total}</strong> 条日常<span aria-hidden="true"> / </span><strong>{recent.data.stats.photos}</strong> 张照片<span aria-hidden="true"> / </span><strong>{recent.data.stats.videos}</strong> 段视频</span> : <span lang="en">A little more life, a little less hurry.</span>}</div>
    {user && <RevisitPanel key={user.id + ":" + revision} />}
    <div className="studio-content studio-guest">
      <div className="studio-main">
        {user && <QuickNote key={user.id} userId={user.id} onSaved={() => setRevision(v => v + 1)} />}
        <section className="studio-collection" aria-labelledby="collection-title">
          <div className="studio-section-heading">
            <div><span className="section-eyebrow">RECENT DAYS</span><h2 id="collection-title">{user ? "最近的日常" : "大家的日常"}</h2></div>
            <Link href={target} className="studio-text-link">查看全部<Icon name="arrow" size={16} /></Link>
          </div>
          <div className="studio-filters" role="group" aria-label="最近记录类型">{categories.map(([value, label, icon]) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)}><Icon name={icon} size={15} />{label}</button>)}</div>
          <div aria-busy={loading || !current}>
            {current?.error ? <div className="home-error" role="alert">{current.error}<button onClick={() => setRevision(v => v + 1)}>重新加载</button></div>
              : loading || !data ? <div className="studio-skeleton" role="status" aria-label="正在加载记录"><span /><span /></div>
              : items.length ? <div className="studio-records" data-count={items.length}>{items.map((memory, index) => <CollectionCard key={memory.id} memory={memory} featured={featuredFirst && index === 0} />)}</div>
              : kind !== "all" ? <div className="studio-empty studio-filter-empty" role="status">
                <Icon name={categories.find(([value]) => value === kind)?.[2] || "book"} size={28} />
                <h3>还没有{categories.find(([value]) => value === kind)?.[1]}记录</h3>
                <p>换个分类，看看其他日常。</p>
                <button type="button" className="studio-button" onClick={() => setKind("all")}>查看全部日常<Icon name="arrow" size={16} /></button>
              </div>
              : <div className="studio-empty">
                <div className="empty-envelope" aria-hidden="true"><Icon name="book" size={36} /><span>✳</span></div>
                <h3>{user ? "你的第一页，留给今天。" : "这里在等待第一份分享。"}</h3>
                <p>{user ? "一张随手拍，一句突然想到的话，都很好。" : "先给自己留下一刻，想分享时再公开。"}</p>
                <Link href={user ? "/memories/new" : "/register"} className="studio-button">{user ? "写下第一条" : "建立我的小天地"}<Icon name="plus" size={16} /></Link>
              </div>}
          </div>
        </section>
      </div>

    </div>
    <footer className="studio-footer"><span>NO SEE BYE © 2026</span><span lang="en">Made of ordinary, lovely days.</span><Icon name="spark" size={15} /></footer>
  </div></AppShell>;
}
