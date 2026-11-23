"use client";

import Link from "next/link";
import { useId, useRef, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import type { Memory } from "./types";

export function EntryMenu({ memory, busy, onPin, onRemove, tags }: {
  memory: Memory;
  busy: boolean;
  onPin: () => void;
  onRemove: () => void;
  tags?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const label = useId();
  const close = () => dialog.current?.close();
  return <div className="entry-options">
    <button className="entry-options-trigger" type="button" aria-label="更多日常操作" title="更多日常操作" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
      <Icon name="more" size={20} />
    </button>
    <dialog ref={dialog} className="entry-options-dialog" aria-labelledby={label} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="entry-options-body">
        <header><h2 id={label}>日常操作</h2><button type="button" onClick={close} aria-label="收起日常操作"><Icon name="close" size={18} /></button></header>
        <button type="button" disabled={busy} onClick={() => { close(); onPin(); }}><Icon name="pin" size={17} />{memory.pinned ? "取消收藏" : "收藏"}</button>
        <Link href={`/memories/${memory.id}/edit`} onClick={close}><Icon name="edit" size={17} />编辑</Link>
        <button type="button" className="entry-remove" disabled={busy} onClick={() => { close(); onRemove(); }}><Icon name="trash" size={17} />移到回收站</button>
        {tags && <div className="entry-options-tags" onClick={close}>{tags}</div>}
      </div>
    </dialog>
  </div>;
}
