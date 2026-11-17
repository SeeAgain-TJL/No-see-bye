"use client";
import { moodLabel } from "./moods";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useApp } from "@/components/providers";
import { Icon } from "@/components/icons";
import { api, bytes, dateText } from "@/lib/client";
import type { Memory, MemoryList } from "./types";
import { PhotoWall } from "./photo-wall";
import { MediaGrid, previewUrl } from "./media";
import { DecodedImage } from "@/components/decoded-image";
import { DateFilter } from './date-filter';
import { EmptyTrash } from "./empty-trash";
import { ThemeMotif } from "@/components/theme-motif";
import { JournalAtmosphere } from "./journal-atmosphere";
export function MemoryFeed({ trash = false }: { trash?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const { user, loading, notify } = useApp();
  const scope = trash
    ? "trash"
    : params.get("scope") === "public"
      ? "public"
      : "mine";
  const type = params.get("type") || "all";
  const resetPublicFilter = scope === 'public' && !!(params.get('day') || params.get('q') || params.get('month') || params.get('pinned') || type !== 'all');
  const view = ["gallery", "timeline"].includes(params.get("view") || "") ? params.get("view")! : "grid";
  const [result, setResult] = useState<{
    key: string;
    data?: MemoryList;
    error?: string;
  } | null>(null);
  const [moreBusy, setMoreBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Memory | null>(null);
  const query = new URLSearchParams(params.toString());
  query.set("scope", scope);
  query.delete("cursor");
  query.delete("view");
  const url = `/api/memories?${query.toString()}`;
  const key = `${url}:${user?.id || "guest"}:${refreshKey}`;
  useEffect(() => {
    if (loading || (scope !== 'public' && !user)) return;
    const abort = new AbortController();
    api<MemoryList>(url, { signal: abort.signal })
      .then((data) => setResult({ key, data }))
      .catch((e) => {
        if (!abort.signal.aborted) setResult({ key, error: e.message });
      });
    return () => abort.abort();
  }, [key, url, loading, user, scope]);
  const current = result?.key === key ? result : null;
  const data = current?.data;
  function filter(name: string, value: string) {
    const next = new URLSearchParams(params.toString());
    next.delete('cursor');
    if (value) next.set(name, value);
    else next.delete(name);
    if (name === "month") next.delete("day");
    router.push(
      `${trash ? "/memories/trash" : "/memories"}?${next.toString()}`,
      { scroll: false },
    );
  }
  async function loadMore() {
    if (!data?.nextCursor || moreBusy) return;
    setMoreBusy(true);
    try {
      const page = await api<MemoryList>(
        `${url}&cursor=${encodeURIComponent(data.nextCursor)}`,
      );
      setResult((prev) =>
        prev?.key === key && prev.data
          ? {
              key,
              data: {
                ...prev.data,
                items: [
                  ...prev.data.items,
                  ...page.items.filter(
                    (m) => !prev.data!.items.some((old) => old.id === m.id),
                  ),
                ],
                nextCursor: page.nextCursor,
              },
            }
          : prev,
      );
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setMoreBusy(false);
    }
  }
  async function action(memory: Memory, action: "pin" | "restore" | "delete") {
    if (pending) return;
    setPending(memory.id);
    try {
      await api(`/api/memories/${memory.id}`, {
        method: action === "delete" ? "DELETE" : "PATCH",
        ...(action === "delete" ? {} : { body: JSON.stringify({ action }) }),
      });
      setRefreshKey((v) => v + 1);
      setRemoving(null);
      notify(
        action === "delete"
          ? "已放入回收站，随时可以恢复"
          : action === "restore"
            ? "记忆已恢复"
            : memory.pinned
              ? "已取消收藏"
              : "已标记为收藏",
      );
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setPending(null);
    }
  }
  if (!loading && !user && scope === 'mine') return <section className='journal-private-gate journal-experience' aria-labelledby='private-journal-title'>
    <div className='private-gate-copy'><span className='private-gate-edition'>PRIVATE JOURNAL · 我的日常</span><h1 id='private-journal-title'>每个人，<br />都有未公开的章节。</h1><p>有些风景，留给自己。<br />有些回声，待你归来。</p><div className='private-gate-actions'><Link href='/login' className='studio-button' aria-label='登录后查看我的日常'>执钥归来<Icon name='arrow' size={17} /></Link><Link href='/memories?scope=public' className='studio-text-link' aria-label='浏览发现日常'>先阅人间<Icon name='globe' size={16} /></Link></div><span className='private-gate-footnote'>A LIFE IS MORE THAN WHAT IS SEEN.</span></div>
    <div className='private-gate-book' aria-hidden='true'><div className='private-book-spine' /><div className='private-book-cover'><span>NO SEE BYE<br />THE UNWRITTEN SELF</span><ThemeMotif /><strong>此心<br />独白</strong><span className='private-book-lock'><Icon name='lock' size={19} />ONLY YOU HOLD THE KEY.</span></div><span className='private-book-bookmark' /></div>
  </section>;
  return (
    <div className={'journal-experience' + (trash ? ' journal-trash' : scope === 'public' ? ' journal-discovery' : ' journal-personal')} data-journal-view={view}>
      {!trash && <JournalAtmosphere key={scope} title={scope === 'public' ? '发现日常' : '我的日常'} items={data?.items || []} publicScope={scope === 'public'} view={view} ownerName={user?.displayName || user?.username} month={params.get('month') || ''} search={params.get('q') || ''} pinned={!!params.get('pinned')} onFilter={filter} onView={value => filter('view', value === 'grid' ? '' : value)} />}
      <section className="page-heading journal-page-heading">
        <div>
          <h1>
            {trash
              ? "回收站"
              : scope === "public"
                ? "发现日常"
                : "我的日常"}

          </h1>

        </div>
        {trash && user && <EmptyTrash onDone={() => setRefreshKey(v => v + 1)} />}
        {!trash && (
          <Link className="button" href="/memories/new">
            <Icon name="plus" size={18} />
            续写此刻
          </Link>
        )}
      </section>
      {trash && !loading && !user ? (
        <div className="empty-state">
          <Icon name="lock" size={32} />
          <h2>回收站只属于你</h2>
          <Link className="button" href="/login">
            登录后查看
          </Link>
        </div>
      ) : (
        <>
          {!trash && scope === "mine" && (
            <div className="stats-strip">
              <div aria-label="日常总数">
                <strong>{data?.stats?.total ?? "—"}</strong>
                <span>篇拾遗</span>
              </div>
              <div aria-label="照片总数">
                <strong>{data?.stats?.photos ?? "—"}</strong>
                <span>帧留影</span>
              </div>
              <div aria-label="视频总数">
                <strong>{data?.stats?.videos ?? "—"}</strong>
                <span>段流光</span>
              </div>
              <div className="storage-stat">
                <Icon name="lock" size={16} />
                <span>
                  存储空间
                  <small>
                    {data?.stats
                      ? data.stats.quotaBytes === null ? `已使用 ${bytes(data.stats.usedBytes)}` : `${bytes(data.stats.usedBytes)} / ${bytes(data.stats.quotaBytes)} 已使用`
                      : "—"}
                  </small>
                </span>
              </div>
            </div>
          )}
          {trash && (
            <div className="notice">
              还没想好？可以恢复。确定不要了？清空后会永久删除记录和附件。
            </div>
          )}
          <div className="feed-toolbar">
            <div className="filter-tabs" role="group" aria-label="记录类型">
              {[
                ["all", "全卷", "全部记录"],
                ["photo", "留影", "照片"],
                ["video", "流光", "视频"],
                ["text", "尺素", "文字"],
              ].map(([value, title, description]) => (
                <button
                  key={value}
                  type="button"
                  className={type === value ? "selected" : ""}
                  aria-pressed={type === value}
                  aria-label={'筛选' + description}
                  onClick={() => filter("type", value === "all" ? "" : value)}
                >
                  {title}
                </button>
              ))}
            </div>
            <div className="toolbar-right">
              <button
                type="button"
                className={`icon-button ${params.get("pinned") ? "selected" : ""}`}
                aria-label={scope === 'public' ? '只看作者标记的珍藏' : '只看收藏'}
                title={scope === 'public' ? '作者标记的珍藏' : '只看收藏'}
                aria-pressed={!!params.get("pinned")}
                onClick={() =>
                  filter("pinned", params.get("pinned") ? "" : "1")
                }
              >
                <Icon name="pin" size={18} />
              </button>
              <div className="view-switch" role="group" aria-label="浏览方式">
                <button type="button" aria-label="照片墙" title="照片墙" aria-pressed={view === "gallery"} className={view === "gallery" ? "selected" : ""} onClick={() => filter("view", "gallery")}><Icon name="image" size={17} /></button>
                <button
                  type="button"
                  aria-label="卡片视图"
                  aria-pressed={view === "grid"}
                  className={view === "grid" ? "selected" : ""}
                  onClick={() => filter("view", "")}
                >
                  <Icon name="grid" size={16} />
                </button>
                <button
                  type="button"
                  aria-label="时间线视图"
                  aria-pressed={view === "timeline"}
                  className={view === "timeline" ? "selected" : ""}
                  onClick={() => filter("view", "timeline")}
                >
                  <Icon name="list" size={17} />
                </button>
              </div>
            </div>
          </div>
          <div className="search-row">
            <form
              className="search-box"
              onSubmit={(e) => {
                e.preventDefault();
                filter(
                  "q",
                  String(new FormData(e.currentTarget).get("search") || ""),
                );
              }}
            >
              <Icon name="search" size={18} />
              <input
                key={params.get("q") || ""}
                name="search"
                type="search"
                maxLength={100}
                defaultValue={params.get("q") || ""}
                aria-label="搜索记忆"
                placeholder="循一字、一处地名，寻回某页…"
              />
              <button type="submit" aria-label="搜索日常">寻页</button>
            </form>
            <DateFilter month={params.get('month') || ''} day={params.get('day') || ''} onChange={(month, day) => {
              const next = new URLSearchParams(params.toString()); next.delete('cursor'); next.delete('month'); next.delete('day');
              if (month) next.set('month', month); if (day) next.set('day', day);
              router.push((trash ? '/memories/trash' : '/memories') + '?' + next.toString(), { scroll: false });
            }} />
            {(params.get("day") || params.get("q") ||
              params.get("month") ||
              params.get("pinned")) && (
              <Link
                className="text-link small"
                aria-label="清除筛选"
                href={trash ? "/memories/trash" : `/memories?scope=${scope}${view === "grid" ? "" : "&view=" + view}`}
              >
                重启全卷
              </Link>
            )}
          </div>
          {current?.error ? (
            <div className="empty-state">
              <h2>风声稍歇，书页未启。</h2>
              <p role="alert">{current.error}</p>
              <button
                className="button secondary"
                onClick={() => setRefreshKey((v) => v + 1)}
              >
                再试一次
              </button>
              {!user && (
                <Link className="text-link" href="/login">
                  登录
                </Link>
              )}
            </div>
          ) : !data ? (
            <div className="loading-panel" role="status">
              <span className="loading-ring" />
              正在拾起散落的时光…
            </div>
          ) : !data.items.length ? (
            <div className="empty-state">
              <span className="empty-illustration">
                <Icon name={trash ? "restore" : "book"} size={40} />
              </span>
              <h2>
                {trash
                  ? "回收站为空"
                  : params.get("day") || params.get("q") ||
                      params.get("month") ||
                      params.get("pinned") ||
                      type !== "all"
                    ? "这一页，尚未寻得回声。"
                    : "岁月待写，此间留白。"}
              </h2>

              {!trash && (
                <Link className="button" href={resetPublicFilter ? '/memories?scope=public' : user ? '/memories/new' : '/register'} aria-label={resetPublicFilter ? '清除筛选，查看全部公开日常' : user ? '创建日常' : '注册账户并记录日常'}>
                  <Icon name={resetPublicFilter ? 'globe' : 'plus'} size={17} />
                  {resetPublicFilter ? '重阅人间' : '落笔成笺'}
                </Link>
              )}
            </div>
          ) : view === "gallery" ? <PhotoWall memories={data.items} /> : (
            <div key={key + ':' + view} className={`memory-feed ${view}`}>
              {data.items.map((m, i) => {
                const month = dateText(m.happenedAt, {
                  year: "numeric",
                  month: "long",
                });
                const previous = data.items[i - 1];
                return (
                  <div key={m.id} id={'journal-entry-' + m.id} className="memory-wrapper motion-reveal" tabIndex={-1} style={{ '--journal-order': Math.min(i, 8) } as CSSProperties}>
                    {(!previous ||
                      dateText(previous.happenedAt, {
                        year: "numeric",
                        month: "long",
                      }) !== month) && (
                      <div className="month-divider">
                        {month}
                        <span />
                      </div>
                    )}
                    <article
                      className={`memory-card motion-surface ${m.assets.length ? "has-media" : "text-memory"}${m.title || m.content || m.tags.length ? ' has-copy' : ''}${m.title || m.content ? ' has-authored-copy' : ''}`}
                      data-motion-surface=""
                    >
                      {view === 'grid' && <Link
                        className="memory-card-detail"
                        href={`/memories/${m.id}`}
                        aria-label={`展开${dateText(m.happenedAt, { year: 'numeric', month: 'long', day: 'numeric' })}的日常${m.title ? `：${m.title}` : ''}`}
                      ><span className="memory-card-open" aria-hidden="true"><Icon name="arrow" size={17} /></span></Link>}
                      <span className="journal-card-mark" aria-hidden="true"><ThemeMotif /></span>
                      <span className="motion-spotlight" aria-hidden="true" />
                      <div className="memory-card-top">
                        {scope === 'public' ? <Link className='discovery-card-byline' href={'/memories/' + m.id}><span className='discovery-author-initial' aria-hidden='true'>{Array.from(m.user.displayName || m.user.username)[0]}</span><span><strong>{m.user.displayName || m.user.username}</strong><time dateTime={m.happenedAt}>{dateText(m.happenedAt, { month: 'short', day: 'numeric' })} · 人间来笺</time></span></Link> : <Link
                          className="memory-date"
                          href={`/memories/${m.id}`}
                        >
                          <span>
                            {dateText(m.happenedAt, { day: "2-digit" })}
                          </span>
                          <span>
                            {dateText(m.happenedAt, { month: "short" })}
                            <small>
                              {dateText(m.happenedAt, { weekday: "short" })}
                            </small>
                          </span>
                        </Link>}
                        <div className="badges">
                          {m.pinned && (
                            <span title="已收藏">
                              <Icon name="pin" size={14} />
                            </span>
                          )}
                          <span className="privacy-badge">
                            <Icon
                              name={
                                m.visibility === "public" ? "globe" : "lock"
                              }
                              size={12}
                            />
                            {m.visibility === "public" ? "公开" : "私密"}
                          </span>
                        </div>
                      </div>
                      <div className="memory-card-preview">
                        {view === 'grid' && m.assets[0]?.mime.startsWith('image/') && <span className="memory-card-echo" aria-hidden="true"><DecodedImage src={previewUrl(m.assets[0])} alt="" loading="lazy" /></span>}
                        {view === 'grid' && m.assets.length > 0 && <span className="memory-card-imprint" aria-hidden="true"><ThemeMotif /></span>}
                        <MediaGrid assets={m.assets} compact />
                        <div className="memory-card-copy">
                          {m.title && <Link className='memory-title' href={'/memories/' + m.id}><h2>{m.title}</h2></Link>}
                          {m.content && (
                            <p className="memory-excerpt">{m.content}</p>
                          )}
                          {m.tags.length > 0 && (
                            <div className="tags">
                              {m.tags.map((t) => (
                                <button
                                  type="button"
                                  key={t}
                                  onClick={() => filter("q", t)}
                                >
                                  # {t}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="memory-card-bottom">
                        <span className="memory-meta">
                          {scope === "public" ? (
                            (m.user.displayName || `@${m.user.username}`)
                          ) : m.location ? (
                            <>
                              <Icon name="map" size={13} />
                              {m.location}
                            </>
                          ) : (
                            moodLabel(m.mood) || ""
                          )}
                        </span>
                        {user?.id === m.userId ? (
                          <div className="card-actions">
                            {trash ? (
                              <button
                                className="text-link"
                                disabled={pending === m.id}
                                onClick={() => action(m, "restore")}
                              >
                                <Icon name="restore" size={15} />
                                恢复
                              </button>
                            ) : (
                              <>
                                <button
                                  title={m.pinned ? "取消收藏" : "收藏"}
                                  aria-label={m.pinned ? "取消收藏" : "收藏"}
                                  className="icon-button"
                                  disabled={pending === m.id}
                                  onClick={() => action(m, "pin")}
                                >
                                  <Icon name="pin" size={15} />
                                </button>
                                <Link
                                  title="编辑"
                                  aria-label="编辑"
                                  className="icon-button"
                                  href={`/memories/${m.id}/edit`}
                                >
                                  <Icon name="edit" size={15} />
                                </Link>
                                <button
                                  title="移到回收站"
                                  aria-label="移到回收站"
                                  className="icon-button"
                                  onClick={() => setRemoving(m)}
                                >
                                  <Icon name="trash" size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        ) : view !== 'grid' ? (
                          <Link
                            href={`/memories/${m.id}`}
                            className="text-link small"
                          >
                            入卷 <Icon name="arrow" size={14} />
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          )}
          {data?.nextCursor && (
            <div className="load-more">
              <button
                className="button secondary"
                disabled={moreBusy}
                onClick={loadMore}
              >
                {moreBusy ? "拾页中…" : "续阅未尽"}
                <Icon name="arrow" size={16} />
              </button>
            </div>
          )}
          {data && data.items.length > 0 && !data.nextCursor && (
            <div className="feed-end"><span aria-hidden='true'>✦</span>{scope === 'public' ? '目光所及，皆为人间。' : trash ? '旧页已收，余白犹在。' : '此卷暂歇，来日续章。'}<span lang='en'>TO BE CONTINUED</span></div>
          )}
        </>
      )}
      {removing && (
        <DeleteDialog
          memory={removing}
          busy={pending === removing.id}
          cancel={() => setRemoving(null)}
          confirm={() => action(removing, "delete")}
        />
      )}
    </div>
  );
}
export function DeleteDialog({
  memory,
  busy,
  cancel,
  confirm,
}: {
  memory: Memory;
  busy: boolean;
  cancel: () => void;
  confirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby="delete-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) cancel();
      }}
    >
      <Icon name="trash" size={27} />
      <h2 id="delete-title">移到回收站？</h2>
      <p>
        「{memory.title || "这段日常"}
        」会移到回收站。你可以随时恢复，公开访问也会同时关闭。
      </p>
      <div>
        <button
          autoFocus
          disabled={busy}
          className="button secondary"
          onClick={cancel}
        >
          再想想
        </button>
        <button disabled={busy} className="button danger" onClick={confirm}>
                {busy ? "处理中…" : "移到回收站"}
        </button>
      </div>
    </dialog>
  );
}
