"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/providers";
import { Icon } from "@/components/icons";
import { api, dateText } from "@/lib/client";
import { memoryHref } from "./public-entry";
import type { PublicComment, PublicComments, PublicEngagement, PublicReaction } from "./types";

const emptyEngagement: PublicEngagement = { likes: 0, comments: 0, liked: false, saved: false };

export function PublicEntryActions({ id, value = emptyEngagement, onChange, inDetail }: {
  id: string; value?: PublicEngagement; onChange: (value: PublicEngagement) => void; inDetail?: boolean;
}) {
  const { user, notify } = useApp();
  const [pending, setPending] = useState<PublicReaction | null>(null);
  async function react(kind: PublicReaction, active: boolean) {
    if (pending) return;
    setPending(kind);
    try {
      onChange(await api<PublicEngagement>(`/api/memories/${id}/engagement`, {
        method: "PUT", body: JSON.stringify({ kind, active }),
      }));
    } catch (error) { notify((error as Error).message); }
    finally { setPending(null); }
  }
  const like = <><Icon name="heart" size={17} /><span>{value.likes || "点赞"}</span></>;
  const save = <><Icon name="bookmark" size={17} /><span>{value.saved ? "已收藏" : "收藏"}</span></>;
  return <div className="public-entry-actions" role="group" aria-label="公开日常互动">
    <Link href={inDetail ? "#comments" : `${memoryHref(id, true)}#comments`} aria-label={value.comments ? `评论，${value.comments} 条` : "评论"}><Icon name="comment" size={17} /><span>{value.comments || "评论"}</span></Link>
    {user ? <>
      <button type="button" aria-pressed={value.liked} aria-label={value.liked ? `取消点赞，${value.likes} 个赞` : `点赞，${value.likes} 个赞`} aria-disabled={!!pending} onClick={() => react("like", !value.liked)}>{like}</button>
      <button type="button" aria-pressed={value.saved} aria-label={value.saved ? "取消收藏" : "收藏"} aria-disabled={!!pending} onClick={() => react("save", !value.saved)}>{save}</button>
    </> : <>
      <Link href="/login" aria-label="登录后点赞">{like}</Link>
      <Link href="/login" aria-label="登录后收藏">{save}</Link>
    </>}
  </div>;
}

export function PublicCommentsPanel({ id, onChange }: { id: string; onChange: (value: PublicEngagement) => void }) {
  const { user } = useApp();
  const [page, setPage] = useState<PublicComments | null>(null);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const endpoint = `/api/memories/${id}/engagement`;
  useEffect(() => {
    const abort = new AbortController();
    api<PublicComments>(endpoint, { signal: abort.signal }).then(setPage)
      .catch(error => { if (!abort.signal.aborted) setError(error.message); });
    return () => abort.abort();
  }, [endpoint, retry]);
  useEffect(() => {
    if (location.hash === "#comments") document.getElementById("comments")?.scrollIntoView();
  }, []);
  async function loadMore(cursor: string) {
    setLoadingMore(true);
    setError("");
    try {
      const next = await api<PublicComments>(`${endpoint}?cursor=${encodeURIComponent(cursor)}`);
      setPage(old => ({ ...next, items: [...(old?.items || []), ...next.items] }));
    } catch (error) { setError((error as Error).message); }
    finally { setLoadingMore(false); }
  }
  return <section className="public-comments" id="comments" aria-labelledby="comment-heading">
    <h2 id="comment-heading">评论</h2>
    {user ? <form onSubmit={async event => {
      event.preventDefault();
      if (!content.trim() || !page || busy) return;
      setBusy(true);
      setError("");
      try {
        const result = await api<{ comment: PublicComment; engagement: PublicEngagement }>(endpoint, { method: "POST", body: JSON.stringify({ content }) });
        onChange(result.engagement);
        setPage(old => ({ items: [result.comment, ...old!.items], nextCursor: old!.nextCursor }));
        setContent("");
      } catch (error) { setError((error as Error).message); }
      finally { setBusy(false); }
    }}>
      <textarea aria-label="写评论" placeholder="写下你的想法" rows={3} maxLength={500} value={content} onChange={event => setContent(event.target.value)} disabled={busy} />
      <button type="submit" className="button" disabled={busy || !page || !content.trim()}>{busy ? "发送中…" : "发表评论"}</button>
    </form> : <Link className="text-link" href="/login">登录后评论</Link>}
    {error && <p role="alert">{error}</p>}
    {!page && (error ? <button className="button secondary" onClick={() => { setError(""); setRetry(n => n + 1); }}>重试</button> : <p role="status">正在加载评论…</p>)}
    {page?.items.length === 0 && <p className="muted">还没有评论</p>}
    {!!page?.items.length && <ul>{page.items.map(comment => <li key={comment.id}>
      <div><strong>{comment.author}</strong><time dateTime={comment.createdAt}>{dateText(comment.createdAt)}</time></div>
      <p>{comment.content}</p>
    </li>)}</ul>}
    {page?.nextCursor && <button className="button secondary" disabled={loadingMore} onClick={() => loadMore(page.nextCursor!)}>{loadingMore ? "正在加载…" : "查看更多评论"}</button>}
  </section>;
}
