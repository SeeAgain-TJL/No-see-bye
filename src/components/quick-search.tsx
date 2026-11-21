"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "./providers";
import { Icon } from "./icons";
import { api, dateText } from "@/lib/client";
import type { MemoryList } from "@/modules/memories/types";

export function QuickSearch() {
  const [open, setOpen] = useState(false);
  const { user } = useApp();
  useEffect(() => {
    function shortcut(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setOpen(value => !value);
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  return <><button className="quick-search-trigger" aria-label="搜索日常" onClick={() => setOpen(true)} aria-haspopup="dialog"><Icon name="search" size={17} /><span>搜索</span><kbd>Ctrl / ⌘ K</kbd></button>{open && <SearchDialog key={user?.id || "public"} personal={!!user} close={() => setOpen(false)} />}</>;
}
function SearchDialog({ personal, close }: { personal: boolean; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState(personal ? "mine" : "public");
  const [result, setResult] = useState<{ key: string; data?: MemoryList; error?: string }>();
  const term = query.trim();
  const key = new URLSearchParams({ scope, q: term }).toString();
  const current = result?.key === key ? result : undefined;
  const allResults = `/memories?${key}`;
  useEffect(() => {
    const el = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    el?.showModal(); input.current?.focus(); document.body.style.overflow = "hidden";
    return () => { el?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  useEffect(() => {
    if (!term) return;
    const abort = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const data = await api<MemoryList>(`/api/memories?${key}`, { signal: abort.signal });
        if (!abort.signal.aborted) setResult({ key, data });
      } catch (error) {
        if (!abort.signal.aborted) setResult({ key, error: (error as Error).message });
      }
    }, 250);
    return () => { window.clearTimeout(timer); abort.abort(); };
  }, [key, term]);
  return <dialog ref={dialog} className="search-dialog" aria-labelledby="search-title"
    onCancel={e => { e.preventDefault(); close(); }}
    onClick={e => {
      if (e.target !== e.currentTarget) return;
      const r = e.currentTarget.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
    }}
    onKeyDown={e => {
      if (e.nativeEvent.isComposing) return;
      // A native search input otherwise consumes Escape to clear its value first.
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const links = Array.from(e.currentTarget.querySelectorAll<HTMLAnchorElement>(".search-dialog-results a"));
      if (!links.length) return;
      e.preventDefault();
      const i = links.indexOf(document.activeElement as HTMLAnchorElement);
      links[e.key === "ArrowDown" ? (i + 1) % links.length : (i <= 0 ? links.length - 1 : i - 1)].focus();
    }}>
    <div className="search-dialog-heading"><h2 id="search-title">搜索日常</h2>
      {personal ? <div className="search-scope" role="group" aria-label="搜索范围">{[["mine", "我的"], ["public", "公开"]].map(([value, label]) => <button key={value} type="button" aria-pressed={scope === value} onClick={() => { setScope(value); input.current?.focus(); }}>{label}</button>)}</div> : <span className="search-scope-stamp"><Icon name="globe" size={13} />公开</span>}
      <button type="button" className="search-dismiss" onClick={close} aria-label="关闭搜索"><Icon name="close" size={18} /></button>
    </div>
    <form className="search-dialog-input" role="search" onSubmit={e => { e.preventDefault(); if (term) { close(); router.push(allResults); } }}><Icon name="search" size={20} /><input ref={input} type="search" enterKeyHint="search" aria-label="搜索内容、地点或标签" placeholder="内容、地点或标签" maxLength={100} value={query} onChange={e => setQuery(e.target.value)} /></form>
    <div className="search-dialog-results" aria-live="polite">{term && (current?.error ? <p role="alert">{current.error}</p> : !current?.data ? <p>正在寻找…</p> : !current.data.items.length ? <p>没有匹配的日常，换个关键词试试。</p> : <>{current.data.items.slice(0, 7).map(item => <Link key={item.id} href={"/memories/" + item.id} onClick={close}><Icon name={item.assets.length ? "image" : "edit"} size={18} /><span><strong>{item.title || item.content?.slice(0, 40) || dateText(item.happenedAt)}</strong><small>{dateText(item.happenedAt)}{item.location ? " · " + item.location : ""}</small></span><Icon name="arrow" size={16} /></Link>)}<Link href={allResults} onClick={close}>全部结果<Icon name="arrow" size={16} /></Link></>)}</div>
  </dialog>;
}
