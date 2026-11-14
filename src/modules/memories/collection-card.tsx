"use client";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { dateText } from "@/lib/client";
import type { Memory } from "./types";
import { MediaGrid } from "./media";

export function CollectionCard({ memory, index = 0 }: { memory: Memory; index?: number }) {
  const hasMedia = memory.assets.length > 0;
  const hasVideo = memory.assets.some((a) => a.mime.startsWith("video/"));
  const href = "/memories/" + memory.id;
  return (
    <article onPointerMove={event => { if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; const rect = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty("--mouse-x", (event.clientX - rect.left) + "px"); event.currentTarget.style.setProperty("--mouse-y", (event.clientY - rect.top) + "px"); }} className={"collection-card tone-" + (index % 3) + " " + (hasMedia ? "collection-visual" : "collection-note")}>
      <div className="collection-cover"><span className="collection-sticker" aria-hidden="true">{hasMedia ? hasVideo ? "PLAY" : "SNAP" : "MOOD"}<Icon name={hasVideo ? "video" : "spark"} size={13} /></span>
      {hasMedia ? <MediaGrid assets={memory.assets} compact /> : (
        <Link href={href} className="collection-note-body" aria-label={"阅读：" + (memory.title || "日常随记")}>
          <span className="note-category"><Icon name="edit" size={15} />随便说说</span>
          <p>{memory.content || memory.title || "日常随记"}</p>
          <span className="note-rule" aria-hidden="true">Aa<span>✳</span></span>
        </Link>
      )}</div>
      <div className="collection-info">
        <div className="collection-dateline">
          <time dateTime={memory.happenedAt}>{dateText(memory.happenedAt, { month: "long", day: "numeric" })}</time>
          <span><Icon name={memory.visibility === "public" ? "globe" : "lock"} size={12} />{memory.visibility === "public" ? "公开" : "私密"}</span>
        </div>
        <Link href={href} className="collection-title"><h3>{memory.title || "日常随记"}</h3><Icon name="arrow" size={18} /></Link>
        {hasMedia && memory.content && <p className="collection-excerpt">{memory.content}</p>}
        <div className="collection-caption"><span>{memory.location || memory.mood || (hasMedia ? (hasVideo ? "按下播放，快乐回放" : "随手一拍") : "今日碎碎念")}</span><span>{hasMedia ? memory.assets.length + " 个附件" : (memory.content?.length || 0) + " 字"}</span></div>
      </div>
    </article>
  );
}
