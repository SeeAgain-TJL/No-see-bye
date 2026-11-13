"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers";
import { Icon } from "@/components/icons";
import { api, dateText } from "@/lib/client";
import type { Memory } from "./types";
import { MediaGrid } from "./media";
import { MemoryEditor } from "./editor";
import { DeleteDialog } from "./feed";
export function MemoryDetail({
  id,
  edit = false,
}: {
  id: string;
  edit?: boolean;
}) {
  const { user, loading, notify } = useApp();
  const router = useRouter();
  const requestKey = `${id}:${user?.id || "guest"}`;
  const [result, setResult] = useState<{
    key: string;
    memory?: Memory;
    error?: string;
  } | null>(null);
  const [version, setVersion] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (loading) return;
    const abort = new AbortController();
    api<Memory>(`/api/memories/${id}`, { signal: abort.signal })
      .then((memory) => setResult({ key: requestKey, memory }))
      .catch((e) => {
        if (!abort.signal.aborted)
          setResult({ key: requestKey, error: e.message });
      });
    return () => abort.abort();
  }, [id, loading, user, version, requestKey]);
  const memory = result?.memory;
  const owner = memory?.userId === user?.id;
  async function action(name: "restore" | "delete") {
    setBusy(true);
    try {
      await api(`/api/memories/${id}`, {
        method: name === "delete" ? "DELETE" : "PATCH",
        ...(name === "restore"
          ? { body: JSON.stringify({ action: "restore" }) }
          : {}),
      });
      notify(name === "delete" ? "已放入回收站" : "记忆已恢复");
      if (name === "delete") router.push("/memories");
      else setVersion((v) => v + 1);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading || !result || result.key !== requestKey)
    return <div className="loading-panel">正在翻开这一页…</div>;
  if (result.error || !memory)
    return (
      <div className="empty-state">
        <Icon name="lock" size={30} />
        <h1>这一页暂时无法打开</h1>
        <p>{result.error}</p>
        <Link href="/memories" className="button secondary">
          回到时间线
        </Link>
      </div>
    );
  if (edit) {
    if (!owner)
      return (
        <div className="empty-state">
          <h1>只有作者可以编辑这段记忆</h1>
          <Link className="button" href="/memories">
            回到时间线
          </Link>
        </div>
      );
    if (memory.deletedAt)
      return (
        <div className="empty-state">
          <h1>请先恢复这段记忆</h1>
          <button
            className="button"
            disabled={busy}
            onClick={() => action("restore")}
          >
            从回收站恢复
          </button>
        </div>
      );
    return <MemoryEditor memory={memory} />;
  }
  return (
    <div className="detail-page">
      <Link
        className="text-link back-link"
        href={
          memory.deletedAt
            ? "/memories/trash"
            : owner
              ? "/memories"
              : "/memories?scope=public"
        }
      >
        <Icon name="back" size={16} />
        回到时间线
      </Link>
      {memory.deletedAt && (
        <div className="notice">
          这段记忆正在回收站。
          <button
            type="button"
            className="text-link"
            disabled={busy}
            onClick={() => action("restore")}
          >
            恢复它
          </button>
        </div>
      )}
      <article className="detail-article">
        <div className="detail-meta">
          <span>
            {dateText(memory.happenedAt, {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </span>
          <span>
            <Icon
              name={memory.visibility === "public" ? "globe" : "lock"}
              size={13}
            />
            {memory.visibility === "public" ? "公开" : "仅自己"}
          </span>
        </div>
        <h1>{memory.title || "生活的一帧"}</h1>
        <div className="detail-byline">
          <span className="avatar">
            {(memory.user.displayName || memory.user.username)[0].toUpperCase()}
          </span>
          <span>{memory.user.displayName || memory.user.username}</span>
          {memory.location && (
            <span>
              <Icon name="map" size={14} />
              {memory.location}
            </span>
          )}
          {memory.mood && <span>{memory.mood}</span>}
        </div>
        {memory.content && <p className="detail-content">{memory.content}</p>}
        <MediaGrid assets={memory.assets} />
        {memory.hasLegacyMedia && (
          <div className="notice">
            这条早期记录含有旧存储附件，当前仅保留原始引用，尚未迁移到本地磁盘。
          </div>
        )}
        {memory.tags.length > 0 && (
          <div className="tags detail-tags">
            {memory.tags.map((t) => (
              <Link
                key={t}
                href={`/memories?scope=${owner ? "mine" : "public"}&q=${encodeURIComponent(t)}`}
              >
                # {t}
              </Link>
            ))}
          </div>
        )}
        <div className="detail-bottom">
          <span className="tiny muted">
            写于{" "}
            {dateText(memory.createdAt, {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </span>
          {owner && !memory.deletedAt && (
            <div className="detail-actions">
              <Link
                className="button secondary small-button"
                href={`/memories/${id}/edit`}
              >
                <Icon name="edit" size={15} />
                编辑记录
              </Link>
              <button
                className="icon-button"
                aria-label="移到回收站"
                onClick={() => setDeleting(true)}
              >
                <Icon name="trash" size={17} />
              </button>
            </div>
          )}
          {!owner && (
            <button
              className="text-link"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  notify("链接已复制");
                } catch {
                  notify("可以从地址栏复制当前链接");
                }
              }}
            >
              复制分享链接
              <Icon name="arrow" size={16} />
            </button>
          )}
        </div>
      </article>
      {deleting && (
        <DeleteDialog
          memory={memory}
          busy={busy}
          cancel={() => setDeleting(false)}
          confirm={() => action("delete")}
        />
      )}
    </div>
  );
}
