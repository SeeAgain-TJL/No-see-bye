"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useApp } from "./providers";
import { Icon } from "./icons";
import { api, dateText } from "@/lib/client";
import type { MemoryList } from "@/modules/memories/types";

export function QuickSearch() {
  const [open, setOpen] = useState(false);
  const { user } = useApp();
  useEffect(() => { const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(v => !v); } }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, []);
  return <><button className="quick-search-trigger" aria-label="找一段回忆" onClick={() => setOpen(true)} aria-haspopup="dialog"><Icon name="search" size={17} /><span>找一段回忆</span><kbd>⌘ / Ctrl K</kbd></button>{open && <SearchDialog key={user?.id || "public"} personal={!!user} close={() => setOpen(false)} />}</>;
}
function SearchDialog({ personal, close }: { personal: boolean; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ key: string; data?: MemoryList; error?: string }>();
  const term = query.trim();
  const current = result?.key === term ? result : undefined;
  useEffect(() => { const el = dialog.current; const focus = document.activeElement as HTMLElement | null; el?.showModal(); input.current?.focus(); const overflow = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { el?.close(); document.body.style.overflow = overflow; focus?.focus(); }; }, []);
  useEffect(() => {
    if (!term) return;
    const abort = new AbortController();
    const timer = window.setTimeout(() => { api<MemoryList>("/api/memories?scope=" + (personal ? "mine" : "public") + "&q=" + encodeURIComponent(term), { signal: abort.signal }).then(data => setResult({ key: term, data })).catch(error => { if (!abort.signal.aborted) setResult({ key: term, error: error.message }); }); }, 250);
    return () => { window.clearTimeout(timer); abort.abort(); };
  }, [term, personal]);
  const base = personal ? "/memories" : "/memories?scope=public";
  return <dialog ref={dialog} className="search-dialog" aria-labelledby="search-title" onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(); } }} onKeyDown={e => { if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return; const links = Array.from(e.currentTarget.querySelectorAll<HTMLAnchorElement>(".search-dialog-results a")); if (!links.length) return; e.preventDefault(); const index = links.indexOf(document.activeElement as HTMLAnchorElement); const next = e.key === "ArrowDown" ? (index + 1) % links.length : (index <= 0 ? links.length - 1 : index - 1); links[next].focus(); }}>
    <div className="search-dialog-heading"><h2 id="search-title">{personal ? "找回你的某个瞬间" : "寻找公开的日常"}</h2><button onClick={close} aria-label="关闭搜索"><Icon name="close" size={20} /></button></div>
    <div className="search-dialog-input"><Icon name="search" size={20} /><input ref={input} aria-label="搜索文字、地点或标签" placeholder="文字、地点，或一个标签…" maxLength={100} value={query} onChange={e => setQuery(e.target.value)} /></div>
    <div className="search-dialog-results" aria-live="polite">{!term ? <><p>快捷前往</p>{[["/memories/new", "edit", "记下新的一刻"], [base + (personal ? "?" : "&") + "view=gallery", "image", "打开照片墙"], [personal ? "/memories?pinned=1" : "/memories?scope=public", "pin", personal ? "看看我的收藏" : "发现日常"]].map(([href, icon, label]) => <Link key={href} href={href} onClick={close}><Icon name={icon} size={18} /><strong>{label}</strong><Icon name="arrow" size={16} /></Link>)}</> : current?.error ? <p role="alert">{current.error}</p> : !current?.data ? <p role="status">正在寻找…</p> : !current.data.items.length ? <p>没有找到这段回忆，试试地点或更短的关键词。</p> : <>{current.data.items.slice(0, 7).map(item => <Link key={item.id} href={"/memories/" + item.id} onClick={close}><Icon name={item.assets.length ? "image" : "edit"} size={18} /><span><strong>{item.title || item.content?.slice(0, 40) || "日常随记"}</strong><small>{dateText(item.happenedAt)}{item.location ? " · " + item.location : ""}</small></span><Icon name="arrow" size={16} /></Link>)}<Link href={base + (personal ? "?" : "&") + "q=" + encodeURIComponent(term)} onClick={close}>查看全部匹配记录<Icon name="arrow" size={16} /></Link></>}</div>
    <div className="search-dialog-footer"><span>↑ ↓ 选择 · Enter 打开 · Esc 关闭</span><span>{personal ? "仅搜索我的记录" : "仅搜索公开记录"}</span></div>
  </dialog>;
}
