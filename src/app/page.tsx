"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/providers";
import { Icon } from "@/components/icons";
import { Daydream } from "@/components/daydream";
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
  const ownerKey = (user?.id || "guest") + ":" + kind + ":" + revision;
  const [response, setResponse] = useState<{ key: string; data?: MemoryList; error?: string } | null>(null);
  useEffect(() => {
    if (loading) return;
    const abort = new AbortController();
    api<MemoryList>("/api/memories?scope=" + (user ? "mine" : "public") + (kind === "all" ? "" : "&type=" + kind), { signal: abort.signal })
      .then(data => setResponse({ key: ownerKey, data }))
      .catch(error => { if (!abort.signal.aborted) setResponse({ key: ownerKey, error: error.message }); });
    return () => abort.abort();
  }, [loading, user, kind, ownerKey]);
  const current = response?.key === ownerKey ? response : null;
  const data = current?.data;
  const target = user ? "/memories" : "/memories?scope=public";
  return <AppShell><div className="studio-home">
    <section className="studio-hero" aria-labelledby="hero-title">
      <div className="studio-hero-copy">
        <span className="studio-greeting"><span className="greeting-sun">☀</span>{user ? "好久不见，" + (user.displayName || user.username) : "HELLO, LITTLE WORLD"}</span>
        <h1 id="hero-title" lang="en">Life feels<br /><span>better kept.</span><svg viewBox="0 0 260 13" aria-hidden="true"><path d="M3 10Q120-4 257 5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg></h1>
        <p>收藏生活的碎片，<br className="mobile-line" />也收藏当时的自己。</p>
        <div className="studio-hero-actions"><Link href={user ? "/memories/new" : "/register"} className="studio-button">{user ? "记录此刻" : "开启我的空间"}<Icon name="plus" size={18} /></Link><Link href={target} className="studio-text-link">{user ? "翻开我的日常" : "先逛一逛"}<Icon name="arrow" size={17} /></Link></div>
        <span className="hero-footnote"><Icon name="lock" size={13} />你的故事，由你决定分享给谁。</span>
      </div>
      <Daydream />
    </section>
    <div className="studio-shortcuts" aria-label="记录快捷入口">
      <Link href={target + (user ? "?" : "&") + "view=gallery"}><span className="shortcut-symbol peach"><Icon name="image" size={21} /></span><span><strong>镜头里的日常</strong><small>{user && data?.stats ? data.stats.photos + " 张照片 · 照片墙" : "照片墙 · 换个角度看生活"}</small></span><Icon name="arrow" size={17} /></Link>
      <Link href={user ? "/memories?pinned=1" : "/memories?scope=public&view=timeline"}><span className="shortcut-symbol lilac"><Icon name={user ? "pin" : "calendar"} size={21} /></span><span><strong>{user ? "偏爱的那些瞬间" : "日常慢慢看"}</strong><small>{user ? "收藏夹 · 一直喜欢" : "时间线 · 每天都有新故事"}</small></span><Icon name="arrow" size={17} /></Link>
      <Link href="/memories?scope=public"><span className="shortcut-symbol blue"><Icon name="globe" size={21} /></span><span><strong>去别人的日常串门</strong><small>发现 · 生活不止一种样子</small></span><Icon name="arrow" size={17} /></Link>
    </div>
    <div className={"studio-content" + (!user ? " studio-guest" : "")}>
      <div className="studio-main">
        {user && <QuickNote key={user.id} userId={user.id} onSaved={() => setRevision(v => v + 1)} />}
        <section className="studio-collection" aria-labelledby="collection-title">
          <div className="studio-section-heading"><div><span className="section-eyebrow">THE LITTLE THINGS</span><h2 id="collection-title">{user ? "日常正在发生" : "收集一点生活的可爱"}<span className="tiny-flower" aria-hidden="true">✳</span></h2></div><Link href={target} className="studio-text-link">查看全部<Icon name="arrow" size={16} /></Link></div>
          <div className="studio-filters" role="group" aria-label="最近记录类型">{categories.map(([value, label, icon]) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)}><Icon name={icon} size={15} />{label}</button>)}</div>
          <div aria-busy={loading || !current}>
            {current?.error ? <div className="home-error" role="alert">{current.error}<button onClick={() => setRevision(v => v + 1)}>重新加载</button></div> : loading || !data ? <div className="studio-skeleton" role="status" aria-label="正在加载记录"><span /><span /></div> : data.items.length ? <div className="studio-records">{data.items.slice(0, 6).map((memory, index) => <CollectionCard key={memory.id} memory={memory} index={index} />)}</div> : <div className="studio-empty"><div className="empty-envelope" aria-hidden="true"><Icon name="book" size={36} /><span>✳</span></div><h3>{kind === "all" ? user ? "你的第一页，留给今天。" : "这里在等待第一份分享。" : "这一格，等待新的故事。"}</h3><p>{user ? "一张随手拍，一句突然想到的话，都很好。" : "先给自己留下一刻，想分享时再公开。"}</p><Link href={user ? "/memories/new" : "/register"} className="studio-button">{user ? "写下第一条" : "建立我的小天地"}<Icon name="plus" size={16} /></Link></div>}
          </div>
        </section>
      </div>
      {user && <aside className="studio-aside"><RevisitPanel key={user.id + revision} /><div className="studio-small-note"><span aria-hidden="true">✿</span><p>不用每天都精彩。<br /><strong>普通的一天，也值得留下。</strong></p></div></aside>}
    </div>
    <footer className="studio-footer"><span>NO SEE BYE © 2026</span><span lang="en">Made of ordinary, lovely days.</span><Icon name="spark" size={15} /></footer>
  </div></AppShell>;
}
