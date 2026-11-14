"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/providers";
import { Icon } from "@/components/icons";
import { MemoryReplay } from "@/modules/memories/replay";
import { MemoryScene } from "@/components/memory-scene";
import { CollectionCard } from "@/modules/memories/collection-card";
import { api } from "@/lib/client";
import type { MemoryList } from "@/modules/memories/types";

const categories = [["all", "全部", "grid"], ["photo", "照片", "image"], ["video", "视频", "video"], ["text", "碎碎念", "edit"]];

export default function Home() {
  const { user, loading } = useApp();
  const [kind, setKind] = useState("all");
  const ownerKey = (user?.id || "guest") + ":" + kind;
  const [response, setResponse] = useState<{ key: string; data?: MemoryList; error?: string } | null>(null);
  const [overview, setOverview] = useState<{ key: string; data?: MemoryList; error?: string } | null>(null);
  const overviewKey = user?.id || "guest";
  const featured = overview?.key === overviewKey ? overview.data?.items || [] : [];
  useEffect(() => {
    if (loading) return;
    const abort = new AbortController();
    api<MemoryList>("/api/memories?scope=" + (user ? "mine" : "public"), { signal: abort.signal })
      .then(data => setOverview({ key: overviewKey, data }))
      .catch(error => { if (!abort.signal.aborted) setOverview({ key: overviewKey, error: error.message }); });
    return () => abort.abort();
  }, [loading, user, overviewKey]);
  const current = kind === "all" ? (overview?.key === overviewKey ? overview : null) : (response?.key === ownerKey ? response : null);
  const data = current?.data;
  useEffect(() => {
    if (loading || kind === "all") return;
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
            <span className="journal-greeting"><span />{user ? "欢迎回来，" + (user.displayName || user.username) : "HEY, NICE TO SEE YOU"}<Icon name="spark" size={15} /></span>
            <h1 id="hero-title">把日子，<br /><em>过成珍藏。</em></h1>
            <p>{user ? "你的镜头，你的心情。这里一直替你留着。" : "照片、影像，还有那些不想忘记的小事。"}</p>
            <div className="journal-hero-actions">
              <Link href="/memories/new" className="button">记录一下<Icon name="plus" size={19} /></Link>
              <Link href={target} className="journal-open">{user ? "我的日常" : "随便逛逛"}<Icon name="arrow" size={18} /></Link>
            </div>
          </div>
          <MemoryScene memories={featured} personal={!!user} />
        </section>
        <div className="journal-summary">
          <div><span className="summary-label"><Icon name="spark" size={17} />{user ? "生活持续更新中" : "每种日常，都有意思"}</span>{overview?.key === overviewKey && overview.data?.stats && <span className="summary-count"><strong>{overview.data?.stats.total}</strong> 条记录<span className="summary-divider" /><strong>{overview.data?.stats.photos}</strong> 张照片<span className="summary-divider" /><strong>{overview.data?.stats.videos}</strong> 个视频</span>}</div>
          <Link href="/memories?scope=public">发现日常<Icon name="arrow" size={16} /></Link>
        </div>
        <div className="archive-shortcuts" aria-label="快捷浏览"><Link href={target + (target.includes("?") ? "&" : "?") + "view=gallery"}><Icon name="image" size={18} /><span>照片墙<small>See the bigger picture</small></span><Icon name="arrow" size={16} /></Link>{user && <Link href="/memories?pinned=1"><Icon name="pin" size={18} /><span>我的收藏<small>The ones you love</small></span><Icon name="arrow" size={16} /></Link>}</div>
        <section className="journal-collection" aria-labelledby="collection-title">
          <div className="collection-top">
            <div className="collection-heading"><h2 id="collection-title">{user ? "最近记录" : "最近分享"}<span>NEW</span></h2><Link href={target}>查看全部<Icon name="arrow" size={16} /></Link></div>
            <div className="collection-filters" role="group" aria-label="最近记录类型">{categories.map(([value, label, icon]) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)}><Icon name={icon} size={16} />{label}</button>)}</div>
          </div>
          <div className="collection-board">
            <div className="collection-main" aria-busy={loading || !current}>
              {current?.error ? <div className="notice error" role="alert">{current.error}</div> : loading || !data ? <div className="collection-skeleton" role="status" aria-label="正在加载记录"><span /><span /></div> : data.items.length ? (
                <div className={"collection-grid" + (data.items.length === 1 ? " collection-single" : "")}>{data.items.slice(0, 6).map((memory, index) => <CollectionCard key={memory.id} memory={memory} index={index} />)}</div>
              ) : <div className="collection-empty"><span><Icon name={kind === "all" ? "spark" : categories.find(c => c[0] === kind)![2]} size={32} /></span><h3>{kind === "all" ? "第一条，随心发。" : "这里还没上新"}</h3><p>{kind === "all" ? "一张照片，一句吐槽，都算。" : "换个分类看看，或记录点新鲜的。"}</p><Link href="/memories/new" className="button">记录一下<Icon name="plus" size={17} /></Link></div>}
            </div>
            <aside className="collection-side" aria-label="创作入口">
              <MemoryReplay memories={featured} personal={!!user} />
              <Link href="/memories/new" className="create-moment"><span className="create-moment-icon"><Icon name="plus" size={24} /></span><span><strong>给今天留一格</strong><small>一张照片，一句话，都值得。</small></span><Icon name="arrow" size={18} /></Link>
              <Link href="/memories?scope=public" className="discover-drop"><span><Icon name="globe" size={21} />去串个门<small>看看大家的新鲜事</small></span><Icon name="arrow" size={21} /></Link>
            </aside>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
