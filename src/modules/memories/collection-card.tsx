"use client";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { dateText } from "@/lib/client";
import { moodLabel } from "./moods";
import { MediaGrid } from "./media";
import type { Memory } from "./types";

export function CollectionCard({ memory, featured = false }: { memory: Memory; featured?: boolean }) {
  const hasMedia = memory.assets.length > 0;
  const href = "/memories/" + memory.id;
  const context = [memory.location, moodLabel(memory.mood)].filter(Boolean).join(" · ");
  return <article className={"recent-entry" + (featured ? " recent-entry-featured" : "") + (!hasMedia ? " recent-entry-note" : "")}>
    {hasMedia && <div className="recent-entry-cover"><MediaGrid assets={memory.assets} compact /></div>}
    <div className="recent-entry-info">
      <div className="recent-entry-meta">
        <time dateTime={memory.happenedAt}>{dateText(memory.happenedAt, { year: "numeric", month: "long", day: "numeric" })}</time>
        <span><Icon name={memory.visibility === "public" ? "globe" : "lock"} size={12} />{memory.visibility === "public" ? "公开" : "仅自己"}</span>
      </div>
      <Link href={href} className="recent-entry-title"><h3>{memory.title || "日常随记"}</h3></Link>
      {memory.content && <p className="recent-entry-excerpt">{memory.content}</p>}
      <div className="recent-entry-footer">
        <span className="recent-entry-context">{context || (hasMedia ? "影像日记" : "文字日记")}</span>
        <Link href={href} className="studio-text-link" aria-label={"翻开这一天：" + (memory.title || "日常随记")}>翻开这一天<Icon name="arrow" size={15} /></Link>
      </div>
    </div>
  </article>;
}
