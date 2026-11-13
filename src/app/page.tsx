"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/providers";
import { Icon } from "@/components/icons";
import { MemoryOrbit } from "@/components/memory-orbit";
import { MediaGrid } from "@/modules/memories/media";
import { api, dateText } from "@/lib/client";
import type { MemoryList } from "@/modules/memories/types";
export default function Home() {
  const { user, loading } = useApp();
  const ownerKey = user?.id || "guest";
  const [response, setResponse] = useState<{
    key: string;
    data: MemoryList;
  } | null>(null);
  const data = response?.key === ownerKey ? response.data : null;
  const [error, setError] = useState("");
  useEffect(() => {
    if (loading) return;
    let live = true;
    api<MemoryList>(`/api/memories?scope=${user ? "mine" : "public"}`)
      .then((v) => {
        if (live) {
          setResponse({ key: ownerKey, data: v });
          setError("");
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => { live = false; };
  }, [user, loading, ownerKey]);
  const target = user ? "/memories" : "/memories?scope=public";
  return (
    <AppShell>
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="home-greeting">{user ? (user.displayName || user.username) + " 的空间" : "不说再见"}<span className="status-dot" /></span>
          <h1>让生活，<br /><em>有迹可循。</em></h1>
          <p>照片、影像，还有当时的心情。</p>
          <div className="hero-actions"><Link href="/memories/new" className="button">记录此刻<Icon name="plus" size={18} /></Link><Link href={target} className="text-link">打开手札<Icon name="arrow" size={17} /></Link></div>
        </div>
        <div className="home-hero-art"><MemoryOrbit compact /></div>
      </section>
      <section className="home-shortcuts">
        <Link href={target}><span className="shortcut-icon"><Icon name="book" size={23} /></span><div><h2>记忆手札</h2><span>{data?.stats ? data.stats.total + " 条记录" : "收藏生活的片刻"}</span></div><Icon name="arrow" size={19} /></Link>
        <Link href="/memories?scope=public"><span className="shortcut-icon peach"><Icon name="globe" size={23} /></span><div><h2>公开的片刻</h2><span>看看被分享的日常</span></div><Icon name="arrow" size={19} /></Link>
      </section>
      <div className="section-heading home-recent-heading"><h2>{user ? "最近记录" : "最近分享"}</h2><Link className="text-link" href={target}>全部<Icon name="arrow" size={16} /></Link></div>
      {error ? <div className="notice error" role="alert">{error}</div> : loading || !data ? <div className="home-skeleton" aria-label="正在加载"><span /><span /><span /></div> : data.items.length ? <div className="home-recents">{data.items.slice(0, 3).map(m => <article className="home-recent" key={m.id}>
        {m.assets.length ? <MediaGrid assets={m.assets} compact /> : <Link href={"/memories/"+m.id} className="text-memory-cover"><Icon name="book" size={28} /><p>{m.content?.slice(0,100) || m.title}</p></Link>}
        <Link href={"/memories/"+m.id} className="home-recent-label"><h3>{m.title || "日常随记"}</h3><span>{dateText(m.happenedAt,{month:"long",day:"numeric"})}</span></Link>
      </article>)}</div> : <div className="home-empty"><div className="empty-paper"><Icon name="plus" size={25} /></div><h3>从第一条记录开始</h3><Link href="/memories/new" className="text-link">记一笔<Icon name="arrow" size={16} /></Link></div>}
    </AppShell>
  );
}
