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

const categories = [["all", "全部", "grid"], ["photo", "照片", "image"], ["video", "视频", "video"], ["text", "碎碎念", "edit"]];

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
            <span className="journal-greeting"><span />{user ? "HEY, " + (user.displayName || user.username) : "HEY, NICE TO SEE YOU"}<Icon name="spark" size={15} /></span>
            <h1 id="hero-title">这一刻，<br /><em>很值得<span>！</span></em></h1>
            <p>好玩的、热爱的、随手拍的。统统存下来。</p>
            <div className="journal-hero-actions">
              <Link href="/memories/new" className="button">记录一下<Icon name="plus" size={19} /></Link>
              <Link href={target} className="journal-open">我的日常<Icon name="arrow" size={18} /></Link>
            </div>
          </div>
          <MemoryScene />
        </section>
        <div className="journal-summary">
          <div><span className="summary-label"><Icon name="spark" size={17} />{user ? "生活持续更新中" : "每种日常，都有意思"}</span>{data?.stats && <span className="summary-count"><strong>{data.stats.total}</strong> 条记录<span className="summary-divider" /><strong>{data.stats.photos}</strong> 张照片<span className="summary-divider" /><strong>{data.stats.videos}</strong> 个视频</span>}</div>
          <Link href="/memories?scope=public">发现日常<Icon name="arrow" size={16} /></Link>
        </div>
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
              <Link href="/memories/new" className="create-drop">
                <span className="drop-kicker">MAKE SOME MEMORIES<Icon name="arrow" size={20} /></span>
                <div className="drop-art" aria-hidden="true"><span className="drop-orbit" /><span className="drop-smile"><i /><i /><b /></span><Icon name="spark" size={42} /><span className="drop-plus">+</span></div>
                <h3>下一条，<br />由你来！</h3><span className="drop-caption">照片、视频、碎碎念</span><span className="drop-action"><Icon name="plus" size={18} />开启新记录</span>
              </Link>
              <Link href="/memories?scope=public" className="discover-drop"><span><Icon name="globe" size={21} />去串个门<small>看看大家的新鲜事</small></span><Icon name="arrow" size={21} /></Link>
            </aside>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
