"use client";

import { useEffect, useId, useRef, useState } from "react";
import { api } from "@/lib/client";
import { Icon } from "./icons";
import { useApp } from "./providers";

type Operation = "clear-data" | "delete-user";
type OperationResult = { removedEntries: number; removedAssets: number; cleanupPending: boolean };

export function AdminUserActions({ userId, username, onChanged }: {
  userId: string; username: string; onChanged: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const submitLock = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const [operation, setOperation] = useState<Operation>("clear-data");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { notify } = useApp();
  const removeAccount = operation === "delete-user";

  useEffect(() => {
    const element = dialog.current;
    return () => { element?.close(); };
  }, []);

  function open(next: Operation) {
    setOperation(next);
    setConfirmation("");
    setError("");
    dialog.current?.showModal();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current || confirmation !== username) return;
    submitLock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api<OperationResult>(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "POST",
        body: JSON.stringify({ action: operation, confirmUsername: confirmation }),
      });
      dialog.current?.close();
      const detail = `已移除 ${result.removedEntries} 条日常和 ${result.removedAssets} 个附件`;
      notify(`${removeAccount ? "账号已删除" : "数据已清空"}，${detail}${result.cleanupPending ? "。剩余文件已进入清理队列" : ""}。`);
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "操作未完成，请重试。");
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }

  return <div className="admin-user-actions">
    <button type="button" onClick={() => open("clear-data")} aria-label={`清空 ${username} 的数据`}><Icon name="restore" size={14} />清空数据</button>
    <button type="button" onClick={() => open("delete-user")} aria-label={`删除用户 ${username}`}><Icon name="trash" size={14} />删除用户</button>
    <dialog ref={dialog} className="admin-user-dialog" aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event => { if (submitLock.current) event.preventDefault(); }}>
      <form onSubmit={submit} aria-busy={busy}>
        <Icon name="trash" size={24} />
        <h2 id={titleId}>{removeAccount ? "永久删除此用户？" : "永久清空用户数据？"}</h2>
        <p id={descriptionId}>{removeAccount ? "账号、登录关联、日常、回收站和媒体将被永久删除。" : "日常、回收站、媒体和头像将被永久清除。账号会保留，用户需重新登录。"}</p>
        <label><span>输入用户名 <strong>{username}</strong> 确认</span>
          <input autoFocus value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" spellCheck={false} maxLength={80} disabled={busy} required />
        </label>
        {error && <p className="admin-user-dialog-error" role="alert">{error}</p>}
        <div className="admin-user-dialog-buttons">
          <button className="button secondary" type="button" disabled={busy} onClick={() => dialog.current?.close()}>取消</button>
          <button className="button danger" type="submit" disabled={busy || confirmation !== username}>{busy ? "处理中…" : removeAccount ? "永久删除账号" : "永久清空数据"}</button>
        </div>
      </form>
    </dialog>
  </div>;
}
