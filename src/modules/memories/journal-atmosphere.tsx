"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import type { JournalSelection } from "@/lib/journal-navigation";
import { JournalCoverScene } from "./journal-cover-scene";
import { JournalNavigator } from "./journal-navigator";
import type { Memory } from "./types";

/** Keep photography, section navigation and actions in separate hit areas. */
function JournalMasthead({ publicScope = false, children, guest = false }: {
  publicScope?: boolean; children: ReactNode; guest?: boolean;
}) {
  const titleId = useId();
  return <header className="journal-masthead" aria-labelledby={titleId}>
    <div className="journal-masthead-print"><JournalCoverScene /></div>
    <div className="journal-masthead-heading">
      <h1 id={titleId}>{publicScope ? "发现日常" : "我的日常"}</h1>
      {guest && <p>登录后查看自己的照片和记录。</p>}
      <Link className="journal-scope-switch" href={publicScope ? "/memories" : "/memories?scope=public"}>
        <Icon name={publicScope ? "book" : "globe"} size={15} />{publicScope ? "我的日常" : "发现日常"}<Icon name="arrow" size={14} />
      </Link>
    </div>
    <div className="journal-masthead-actions">{children}</div>
  </header>;
}

export function JournalPrivateGate() {
  return <JournalMasthead guest>
    <Link className="journal-main-action" href="/login">登录<Icon name="arrow" size={16} /></Link>
  </JournalMasthead>;
}

export function JournalAtmosphere({ items, publicScope, ownerId, month, type, activeFilters, revision, onBrowse }: {
  items: Memory[]; publicScope: boolean; ownerId?: string;
  month: string; type: string; activeFilters: boolean; revision: number;
  onBrowse: (selection: JournalSelection) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const navigatorId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  function close() { setExpanded(false); trigger.current?.focus({ preventScroll: true }); }
  return <>
    <JournalMasthead publicScope={publicScope}>
      {publicScope ? <button className="journal-main-action" type="button" disabled={!items.length} aria-label="从当前列表随机打开一条公开日常" onClick={() => { const memory = items[Math.floor(Math.random() * items.length)]; if (memory) router.push('/memories/' + memory.id); }}><Icon name="spark" size={16} />随机浏览</button>
        : <Link className="journal-main-action" href="/memories/new"><Icon name="plus" size={16} />记录日常</Link>}
      <button ref={trigger} type="button" className="journal-month-action" aria-expanded={expanded} aria-controls={navigatorId} onClick={() => setExpanded(value => !value)}><Icon name="calendar" size={16} />按月浏览</button>
    </JournalMasthead>
    <JournalNavigator id={navigatorId} expanded={expanded} onClose={close} publicScope={publicScope} ownerId={ownerId} revision={revision} items={items} month={month} type={type} activeFilters={activeFilters} onBrowse={onBrowse} />
  </>;
}
