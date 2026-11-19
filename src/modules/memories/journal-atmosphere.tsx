"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import type { JournalSelection } from "@/lib/journal-navigation";
import { JournalCoverScene } from "./journal-cover-scene";
import { JournalNavigator } from "./journal-navigator";
import type { Memory } from "./types";

export function JournalPrivateGate() {
  return <section className="journal-living-cover journal-living-threshold" data-camera-frame="" data-scope="mine" aria-labelledby="private-journal-title">
    <div className="jl-cover-copy"><span className="jl-cover-edition">我的日常</span><h1 id="private-journal-title">此心，私藏。</h1><div className="jl-cover-actions"><Link className="jl-primary-action" href="/login">登录<Icon name="arrow" size={16} /></Link><Link className="jl-secondary-action" href="/memories?scope=public">发现日常<Icon name="globe" size={16} /></Link></div></div>
    <div className="jl-cover-art"><JournalCoverScene /></div>
  </section>;
}

export function JournalAtmosphere({ title, items, publicScope, ownerId, month, type, activeFilters, revision, onBrowse }: {
  title: string; items: Memory[]; publicScope: boolean; ownerId?: string;
  month: string; type: string; activeFilters: boolean; revision: number;
  onBrowse: (selection: JournalSelection) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const navigatorId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const cover = items
    .filter(item => publicScope ? item.visibility === "public" : item.userId === ownerId)
    .flatMap(item => item.assets)
    .find(asset => asset.mime.startsWith("image/") && asset.width && asset.height && asset.width / asset.height >= 1.38);
  function close() { setExpanded(false); trigger.current?.focus({ preventScroll: true }); }
  return <>
    <header className="journal-living-cover" data-camera-frame="" data-scope={publicScope ? "public" : "mine"} aria-label={title}>
      <div className="jl-cover-copy">
        <span className="jl-cover-edition">{title}</span>
        <h1>{publicScope ? "借光远行。" : "岁月有迹。"}</h1>
        <div className="jl-cover-actions">
          {publicScope ? <button className="jl-primary-action" type="button" disabled={!items.length} aria-label="从当前列表随机打开一条公开日常" onClick={() => { const memory = items[Math.floor(Math.random() * items.length)]; if (memory) router.push('/memories/' + memory.id); }}><Icon name="spark" size={16} />偶遇一页<Icon name="arrow" size={16} /></button>
            : <Link className="jl-primary-action" href="/memories/new"><Icon name="plus" size={16} />留一页</Link>}
          <button ref={trigger} type="button" className="jl-secondary-action jl-browse-trigger" aria-expanded={expanded} aria-controls={navigatorId} onClick={() => setExpanded(value => !value)}><Icon name="calendar" size={16} />按月寻迹<Icon name={expanded ? "close" : "arrow"} size={15} /></button>
        </div>
      </div>
      <div className="jl-cover-art"><JournalCoverScene publicScope={publicScope} cover={cover} /></div>
      <Link className="jl-scope-link" href={publicScope ? "/memories" : "/memories?scope=public"} aria-label={publicScope ? "前往我的日常" : "前往发现日常"}><Icon name={publicScope ? "book" : "globe"} size={15} /><Icon name="arrow" size={13} /></Link>
    </header>
    <JournalNavigator id={navigatorId} expanded={expanded} onClose={close} publicScope={publicScope} ownerId={ownerId} revision={revision} items={items} month={month} type={type} activeFilters={activeFilters} onBrowse={onBrowse} />
  </>;
}
