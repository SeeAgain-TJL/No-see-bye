"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { api } from "@/lib/client";
import { useApp } from "@/components/providers";
import { moods } from "./moods";

export function QuickNote({ userId, onSaved }: { userId: string; onSaved: () => void }) {
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState(false);
  const [prompt, setPrompt] = useState(0);
  const field = useRef<HTMLTextAreaElement>(null);
  const pending = useRef(false);
  const { notify } = useApp();
  const prompts = ["今天，有什么小事让你开心？", "此刻想留住的画面是什么？", "给今天的自己留一句话。", "最近被什么温柔地打动了？"];
  const key = "nsb:quick-note:" + userId;
  useEffect(() => {
    const timer = window.setTimeout(() => { try { const saved = JSON.parse(localStorage.getItem(key) || "null"); if (saved && typeof saved.content === "string") { setContent(saved.content.slice(0, 2000)); setMood(moods.some(m => m.value === saved.mood) ? saved.mood : ""); setDraft(true); } } catch {} setReady(true); }, 0);
    return () => window.clearTimeout(timer);
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => { try { if (content || mood) localStorage.setItem(key, JSON.stringify({ content, mood })); else localStorage.removeItem(key); setDraft(Boolean(content || mood)); } catch { setDraft(false); } }, 400);
    return () => window.clearTimeout(timer);
  }, [content, mood, ready, key]);
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (pending.current || !content.trim()) return;
    pending.current = true; setBusy(true); setError("");
    try { await api("/api/memories", { method: "POST", body: JSON.stringify({ content: content.trim(), mood, happenedAt: new Date().toISOString(), visibility: "private", assetIds: [], tags: [] }) }); setContent(""); setMood(""); setDraft(false); try { localStorage.removeItem(key); } catch {} notify("这一刻，已经好好收下。仅自己可见。"); onSaved(); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); pending.current = false; }
  }
  return <form className="quick-note" onSubmit={save} aria-labelledby="quick-note-title">
    <div className="quick-note-heading"><div><span className="section-eyebrow">A MOMENT, SAVED.</span><h2 id="quick-note-title">给今天留一句</h2></div><button type="button" className="prompt-shuffle" aria-label="换一个记录灵感" onClick={() => { setPrompt(v => (v + 1) % prompts.length); field.current?.focus(); }}><Icon name="spark" size={16} />换个灵感</button></div>
    <label className="sr-only" htmlFor="quick-content">此刻想记录的事</label><textarea ref={field} id="quick-content" placeholder={prompts[prompt]} maxLength={2000} value={content} onChange={e => setContent(e.target.value)} disabled={busy || !ready} />
    <div className="quick-note-bottom"><div className="quick-moods" role="group" aria-label="此刻心情">{moods.filter(m => ["开心", "平静", "感动", "疲惫", "元气"].includes(m.value)).map(item => <button type="button" key={item.value} title={item.value} aria-label={item.value} aria-pressed={mood === item.value} disabled={busy} onClick={() => setMood(v => v === item.value ? "" : item.value)}>{item.emoji}</button>)}</div><button className="studio-button compact-button" disabled={busy || !content.trim() || !ready}>{busy ? "保存中…" : "收下这一刻"}<Icon name="arrow" size={16} /></button></div>
    <div className="quick-note-footer"><span><Icon name="lock" size={12} />仅自己可见{draft ? " · 草稿已存本机" : ""}</span><Link href="/memories/new">加照片 / 完整记录<Icon name="arrow" size={13} /></Link></div>
    {error && <p className="home-error" role="alert">{error}</p>}
  </form>;
}
