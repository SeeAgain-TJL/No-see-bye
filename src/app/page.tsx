"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/providers";
import { Icon } from "@/components/icons";
import { MemorySprite } from "@/components/memory-sprite";
import { HomeHero } from "@/modules/memories/home-hero";
import { CollectionCard } from "@/modules/memories/collection-card";
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
  const [albumResponse, setAlbumResponse] = useState<{ key: string; data?: MemoryList; error?: string } | null>(null);
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
    if (loading || !user) return;
    const abort = new AbortController();
    api<MemoryList>("/api/memories?scope=mine&type=photo", { signal: abort.signal })
      .then(data => setAlbumResponse({ key: ownerKey, data }))
      .catch(error => { if (!abort.signal.aborted) setAlbumResponse({ key: ownerKey, error: error.message }); });
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
  const album = albumResponse?.key === ownerKey ? albumResponse : null;
  const current = kind === "all" ? recent : filtered?.key === filterKey ? filtered : null;
  const data = current?.data;
  const target = user ? "/memories" : "/memories?scope=public";
  const items = data?.items.slice(0, 6) || [];
  return <AppShell><div className="studio-home">
    <HomeHero key={user?.id || "guest"} user={user} data={album?.data} error={album?.error} onRetry={() => setRevision(v => v + 1)} />
    <div className="studio-content studio-guest">
      <div className="studio-main">
        <section className="studio-collection" aria-labelledby="collection-title">
          <div className="studio-section-heading">
            <div className="keepsake-heading"><span className="keepsake-eyebrow">LIFE, FRAME BY FRAME</span><h2 id="collection-title">{user ? "近来拾光" : "人间片笺"}<Icon name="spark" size={18} /></h2></div>
            <Link href={target} className="studio-text-link" aria-label="查看全部日常">翻阅全卷<Icon name="arrow" size={16} /></Link>
          </div>
          <div className="studio-filters" role="group" aria-label="最近记录类型">{categories.map(([value, label, icon]) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)}><Icon name={icon} size={15} />{label}</button>)}</div>
          <div aria-busy={loading || !current}>
            {current?.error ? <div className="home-error" role="alert">{current.error}<button onClick={() => setRevision(v => v + 1)}>重新加载</button></div>
              : loading || !data ? <div className="studio-skeleton" role="status" aria-label="正在加载记录"><span /><span /></div>
              : items.length ? <div className="studio-records" data-count={items.length}>{items.map((memory, index) => <CollectionCard key={memory.id} memory={memory} index={index} />)}</div>
              : kind !== "all" ? <div className="studio-empty studio-filter-empty" role="status">
                <Icon name={categories.find(([value]) => value === kind)?.[2] || "book"} size={28} />
                <h3>这一页，尚有留白。</h3>
                <p>暂未收录{categories.find(([value]) => value === kind)?.[1]}，可翻看其他篇章。</p>
                <button type="button" className="studio-button" onClick={() => setKind("all")}>查看全部日常<Icon name="arrow" size={16} /></button>
              </div>
              : <div className="studio-empty">
                <div className="empty-envelope" aria-hidden="true"><MemorySprite pose="peek" /></div>
                <h3>此间留白，候一日风来。</h3>
                <p>{user ? "片刻尚未落笔，今日正好启卷。" : "收一程山水，留一页自己的光阴。"}</p>
                <Link href={user ? "/memories/new" : "/register"} className="studio-button" aria-label={user ? "创建第一条日常" : "注册账户，开启自己的空间"}>{user ? "落笔成笺" : "为光阴落款"}<Icon name="plus" size={16} /></Link>
              </div>}
          </div>
        </section>
      </div>

    </div>
    <footer className="studio-footer"><span>NO SEE BYE © 2026</span><span className="keepsake-footer-note">每一帧，都有回声。<Icon name="spark" size={15} /></span></footer>
  </div></AppShell>;
}
