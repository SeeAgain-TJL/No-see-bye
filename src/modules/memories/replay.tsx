"use client";
/* eslint-disable @next/next/no-img-element -- Protected, same-origin media thumbnails. */
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { dateText } from "@/lib/client";
import type { Memory } from "./types";

export function MemoryReplay({ memories, personal }: { memories: Memory[]; personal: boolean }) {
  const [day, setDay] = useState("");
  useEffect(() => {
    function updateDay() {
      const now = new Date();
      setDay(now.getFullYear() + "-" + now.getMonth() + "-" + now.getDate());
    }
    updateDay();
    const timer = window.setInterval(updateDay, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  // Use stable ordering so identical archives get the same selection all day.
  const ordered = [...memories].sort((a, b) => a.id.localeCompare(b.id));
  const seed = day.split("").reduce((sum, char) => sum * 31 + char.charCodeAt(0) >>> 0, 0);
  const memory = ordered.length && day ? ordered[seed % ordered.length] : undefined;
  const photo = memory?.assets.find(asset => asset.mime.startsWith("image/"));
  return (
    <Link className={"replay-card" + (photo ? " replay-photo" : "")} href={memory ? "/memories/" + memory.id : "/memories/new"}>
      {photo && <img className="replay-image" src={photo.thumbnailUrl || photo.url + "?variant=preview"} alt="" loading="lazy" onError={event => { if (!event.currentTarget.dataset.fallback) { event.currentTarget.dataset.fallback = "1"; event.currentTarget.src = photo.url; } }} />}
      <span className="replay-kicker"><Icon name="restore" size={15} />{personal ? "今日回放" : "偶遇一刻"}<span>REPLAY</span></span>
      <div className="replay-content"><span className="replay-symbol" aria-hidden="true">↺</span><p>{memory ? dateText(memory.happenedAt, { year: "numeric", month: "long", day: "numeric" }) : "生活里，总有值得回看的瞬间"}</p><h3>{memory ? memory.title || "日常随记" : "下一次回看，\n从今天开始。"}</h3>{memory?.content && !photo && <p className="replay-excerpt">{memory.content}</p>}<span className="replay-action">{memory ? "重温这一刻" : "留下第一条记录"}<Icon name="arrow" size={17} /></span></div>
      <span className="replay-footnote">{memory ? "从最近的日常里，挑一个片段。" : "你的日常，就是最好的素材。"}</span>
    </Link>
  );
}
