"use client";
import Link from "next/link";
import { useState } from "react";
import { Daydream } from "@/components/daydream";
import { Icon } from "@/components/icons";
import { MemorySky } from "./memory-sky";
import { MemoryStories } from "./stories";
import type { MemoryList, UserInfo } from "./types";

export function HomeHero({ user, data, error, onRetry }: { user: UserInfo | null; data?: MemoryList; error?: string; onRetry: () => void }) {
  const [view, setView] = useState("sky");
  const [playing, setPlaying] = useState(false);
  return <section className={"studio-hero" + (user ? " memory-hero" : "")} aria-labelledby="hero-title">
    <div className="studio-hero-copy">
      <span className="studio-greeting"><span className="greeting-sun">☀</span>{user ? "好久不见，" + (user.displayName || user.username) : "HELLO, LITTLE WORLD"}</span>
      {user ? <h1 id="hero-title">每一天，<br /><span>都是一颗星。</span></h1> : <h1 id="hero-title" lang="en">Life feels<br /><span>better kept.</span><svg viewBox="0 0 260 13" aria-hidden="true"><path d="M3 10Q120-4 257 5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg></h1>}
      <p>{user ? <>把散落的片段，连成自己的星光。<br />留一点今天，也重温昨天。</> : <>收藏生活的碎片，<br className="mobile-line" />也收藏当时的自己。</>}</p>
      <div className="studio-hero-actions">{user ? <><button type="button" className="studio-button" onClick={() => setPlaying(true)}><Icon name="play" size={18} />播放回忆</button><Link href="/memories/new" className="studio-text-link">记录此刻<Icon name="plus" size={17} /></Link></> : <><Link href="/register" className="studio-button">开启我的空间<Icon name="plus" size={18} /></Link><Link href="/memories?scope=public" className="studio-text-link">先逛一逛<Icon name="arrow" size={17} /></Link></>}</div>
      <span className="hero-footnote"><Icon name="lock" size={13} />你的故事，由你决定分享给谁。</span>
    </div>
    {user ? <div className="hero-visual"><div className="hero-view-switch" role="group" aria-label="首页主视觉"><button type="button" aria-pressed={view === "sky"} onClick={() => setView("sky")}>记忆星图</button><button type="button" aria-pressed={view === "postcard"} onClick={() => setView("postcard")}>心情明信片</button></div>{view === "sky" ? <MemorySky data={data} error={error} onRetry={onRetry} /> : <Daydream />}</div> : <Daydream />}
    {user && playing && <MemoryStories onClose={() => setPlaying(false)} />}
  </section>;
}
