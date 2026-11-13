import Link from "next/link";
import { Icon } from "@/components/icons";
import { dateText } from "@/lib/client";
import type { Memory } from "./types";
import { MediaGrid } from "./media";

export function CollectionCard({ memory }: { memory: Memory }) {
  const hasMedia = memory.assets.length > 0;
  const hasVideo = memory.assets.some((a) => a.mime.startsWith("video/"));
  const href = "/memories/" + memory.id;
  return (
    <article className={"collection-card " + (hasMedia ? "collection-visual" : "collection-note")}>
      {hasMedia ? <MediaGrid assets={memory.assets} compact /> : (
        <Link href={href} className="collection-note-body" aria-label={"阅读：" + (memory.title || "日常随记")}>
          <span className="note-category"><Icon name="edit" size={15} />文字手札</span>
          <p>{memory.content || memory.title || "日常随记"}</p>
          <span className="note-rule" />
        </Link>
      )}
      <div className="collection-info">
        <div className="collection-dateline">
          <time dateTime={memory.happenedAt}>{dateText(memory.happenedAt, { month: "long", day: "numeric" })}</time>
          <span><Icon name={memory.visibility === "public" ? "globe" : "lock"} size={12} />{memory.visibility === "public" ? "公开" : "私密"}</span>
        </div>
        <Link href={href} className="collection-title"><h3>{memory.title || "日常随记"}</h3><Icon name="arrow" size={18} /></Link>
        <div className="collection-caption"><span>{memory.location || memory.mood || (hasMedia ? (hasVideo ? "动态影像" : "照片记忆") : "文字手札")}</span><span>{hasMedia ? memory.assets.length + " 个附件" : (memory.content?.length || 0) + " 字"}</span></div>
      </div>
    </article>
  );
}
