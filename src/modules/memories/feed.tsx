"use client";
import { moodLabel } from "./moods";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/providers";
import { Icon } from "@/components/icons";
import { api, bytes, dateText } from "@/lib/client";
import type { Memory, MemoryList } from "./types";
import { PhotoWall } from "./photo-wall";
import { MediaGrid } from "./media";
import { EmptyTrash } from "./empty-trash";
export function MemoryFeed({ trash = false }: { trash?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const { user, loading, notify } = useApp();
  const scope = trash
    ? "trash"
    : params.get("scope") === "public" || (!loading && !user)
      ? "public"
      : "mine";
  const type = params.get("type") || "all";
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
    if (loading || (trash && !user)) return;
    const abort = new AbortController();
    api<MemoryList>(url, { signal: abort.signal })
      .then((data) => setResult({ key, data }))
      .catch((e) => {
        if (!abort.signal.aborted) setResult({ key, error: e.message });
      });
    return () => abort.abort();
  }, [key, url, loading, user, trash]);
  const current = result?.key === key ? result : null;
  const data = current?.data;
  function filter(name: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
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
  return (
    <>
      <section className="page-heading">
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
            记录一下
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
              <div>
                <strong>{data?.stats?.total ?? "—"}</strong>
                <span>条记录</span>
              </div>
              <div>
                <strong>{data?.stats?.photos ?? "—"}</strong>
                <span>张照片</span>
              </div>
              <div>
                <strong>{data?.stats?.videos ?? "—"}</strong>
                <span>个视频</span>
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
                ["all", "全部"],
                ["photo", "照片"],
                ["video", "影像"],
                ["text", "文字"],
              ].map(([value, title]) => (
                <button
                  key={value}
                  type="button"
                  className={type === value ? "selected" : ""}
                  aria-pressed={type === value}
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
                aria-label="只看收藏"
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
                placeholder="搜索文字、地点或标签…"
              />
              <button type="submit">搜索</button>
            </form>
            <label className="month-filter">
              <Icon name="calendar" size={17} />
              <input
                type="month"
                value={params.get("month") || ""}
                aria-label="按月份筛选（北京时间）"
                onChange={(e) => filter("month", e.target.value)}
              />
            </label>
            {(params.get("q") ||
              params.get("month") ||
              params.get("pinned")) && (
              <Link
                className="text-link small"
                href={trash ? "/memories/trash" : `/memories?scope=${scope}${view === "grid" ? "" : "&view=" + view}`}
              >
                清除筛选
              </Link>
            )}
          </div>
          {current?.error ? (
            <div className="empty-state">
              <h2>暂时没能打开相册</h2>
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
              加载中…
            </div>
          ) : !data.items.length ? (
            <div className="empty-state">
              <span className="empty-illustration">
                <Icon name={trash ? "restore" : "book"} size={40} />
              </span>
              <h2>
                {trash
                  ? "回收站为空"
                  : params.get("q") ||
                      params.get("month") ||
                      params.get("pinned") ||
                      type !== "all"
                    ? "还没找到这样的记忆"
                    : "还没有记录"}
              </h2>

              {!trash && (
                <Link className="button" href="/memories/new">
                  <Icon name="plus" size={17} />
                  创建记录
                </Link>
              )}
            </div>
          ) : view === "gallery" ? <PhotoWall memories={data.items} /> : (
            <div className={`memory-feed ${view}`}>
              {data.items.map((m, i) => {
                const month = dateText(m.happenedAt, {
                  year: "numeric",
                  month: "long",
                });
                const previous = data.items[i - 1];
                return (
                  <div key={m.id} className="memory-wrapper">
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
                      className={`memory-card ${m.assets.length ? "has-media" : "text-memory"}`}
                    >
                      <div className="memory-card-top">
                        <Link
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
                        </Link>
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
                      <MediaGrid assets={m.assets} compact />
                      <div className="memory-card-copy">
                        <Link
                          className="memory-title"
                          href={`/memories/${m.id}`}
                        >
                          <h2>
                            {m.title ||
                              (m.assets.length ? "生活的一帧" : "日常随记")}
                          </h2>
                        </Link>
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
                        ) : (
                          <Link
                            href={`/memories/${m.id}`}
                            className="text-link small"
                          >
                            读一读 <Icon name="arrow" size={14} />
                          </Link>
                        )}
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
                {moreBusy ? "加载中…" : "再看一点"}
                <Icon name="arrow" size={16} />
              </button>
            </div>
          )}
          {data && data.items.length > 0 && !data.nextCursor && (
            <div className="feed-end">已经到底啦，等你更新下一条 ✦</div>
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
    </>
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
