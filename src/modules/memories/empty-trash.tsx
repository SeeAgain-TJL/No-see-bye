"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useApp } from "@/components/providers";
import { api } from "@/lib/client";

type TrashSummary = { count: number; before: string; pending: number };

export function EmptyTrash({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="button danger-outline" onClick={() => setOpen(true)}>
      <Icon name="trash" size={17} />清空回收站
    </button>
    {open && <EmptyTrashDialog cancel={() => setOpen(false)} onDone={onDone} />}
  </>;
}

function EmptyTrashDialog({ cancel, onDone }: { cancel: () => void; onDone: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { notify } = useApp();
  const [summary, setSummary] = useState<TrashSummary | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
    const abort = new AbortController();
    api<TrashSummary>("/api/memories/trash", { signal: abort.signal })
      .then(setSummary)
      .catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, []);
  async function confirm() {
    if (!summary || !acknowledged || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ deleted: number; pending: number }>("/api/memories/trash", {
        method: "DELETE",
        body: JSON.stringify({ confirmation: "EMPTY_TRASH", before: summary.before }),
      });
      onDone();
      if (result.pending) {
        setSummary({ ...summary, count: 0, pending: result.pending });
        setError(`记录已删除，还有 ${result.pending} 个附件待清理。可以重试释放空间。`);
        notify("记录已删除，部分附件需要重试清理");
      } else {
        notify(result.deleted ? `已永久删除 ${result.deleted} 条记录及其附件` : "回收站已清空");
        cancel();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const hasWork = !!summary && (summary.count > 0 || summary.pending > 0);
  return <dialog ref={dialog} className="confirm-dialog empty-trash-dialog" aria-labelledby="empty-trash-title" aria-describedby="empty-trash-description" onCancel={e => { e.preventDefault(); if (!busy) cancel(); }}>
    <span className="danger-emblem"><Icon name="trash" size={25} /></span>
    <h2 id="empty-trash-title">{summary && !hasWork ? "回收站已经空啦" : "确认清空回收站？"}</h2>
    <p id="empty-trash-description">{summary ? hasWork ? <>将永久删除你回收站中的 <strong>{summary.count}</strong> 条记录及其附件，包含当前筛选未显示的记录。<strong>删除后无法恢复。</strong>{summary.pending > 0 && `另有 ${summary.pending} 个附件需要清理。`}</> : "没有需要删除的记录。" : "正在统计全部回收站记录…"}</p>
    {hasWork && <label className="danger-acknowledge"><input type="checkbox" checked={acknowledged} disabled={busy} onChange={e => setAcknowledged(e.target.checked)} />我知道这是永久删除，无法恢复</label>}
    {error && <p className="notice error" role="alert">{error}</p>}
    <div>
      <button autoFocus type="button" disabled={busy} className="button secondary" onClick={cancel}>{hasWork ? "取消" : "关闭"}</button>
      {hasWork && <button type="button" className="button danger" disabled={busy || !acknowledged} onClick={confirm}>{busy ? "正在清空…" : summary?.count === 0 ? "重试清理附件" : "永久清空"}</button>}
    </div>
  </dialog>;
}
