"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import type { Memory } from "./types";

type SkyData = { items: Memory[]; nextCursor: string | null };

export function MemorySky({ userId }: { userId: string }) {
  const [data, setData] = useState<SkyData | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    api<SkyData>("/api/memories?scope=mine&limit=200", { signal: abort.signal })
      .then(setData)
      .catch(() => setData({ items: [], nextCursor: null }));
    return () => abort.abort();
  }, [userId]);

  const stars = useMemo(() => {
    if (!data?.items.length) return [];
    const sorted = [...data.items].sort((a, b) => new Date(a.happenedAt).getTime() - new Date(b.happenedAt).getTime());
    return sorted.map((memory, i) => {
      const angle = (i / sorted.length) * Math.PI * 2 - Math.PI / 2;
      const radius = 35 + (i % 5) * 8;
      const x = 50 + Math.cos(angle) * radius;
      const y = 50 + Math.sin(angle) * radius * 0.6;
      const size = memory.assets.length > 0 ? 8 : 5;
      const moodColors: Record<string, string> = {
        "开心": "#f4a261", "平静": "#8b9dc3", "感动": "#e76f51", "疲惫": "#6d6875",
        "想念": "#a8dadc", "雀跃": "#ffb703", "治愈": "#95d5b2", "委屈": "#b5838d", "元气": "#ffd60a"
      };
      const color = moodColors[memory.mood] || "#c9ada7";
      return { id: memory.id, x, y, size, color, memory };
    });
  }, [data]);

  if (!data) return <div className="sky-loading" role="status" aria-label="正在绘制星图" />;
  if (!stars.length) return <div className="sky-empty">写下第一条记录，点亮你的星图</div>;

  return (
    <svg className="memory-sky" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet">
      {stars.map((star, i) => {
        const next = stars[i + 1];
        return next ? (
          <line key={"line" + star.id} x1={star.x} y1={star.y} x2={next.x} y2={next.y} stroke="currentColor" strokeWidth="0.1" opacity="0.2" />
        ) : null;
      })}
      {stars.map(star => (
        <g key={star.id}>
          <Link href={"/memories/" + star.id}>
            <circle
              cx={star.x}
              cy={star.y}
              r={star.size / 10}
              fill={star.color}
              className="star"
              onMouseEnter={() => setHover(star.id)}
              onMouseLeave={() => setHover(null)}
            >
              <title>{star.memory.title || star.memory.content?.slice(0, 30) || "日常记录"}</title>
            </circle>
          </Link>
          {hover === star.id && (
            <g className="star-tooltip">
              <rect x={star.x + 1} y={star.y - 2} width="15" height="3" fill="var(--surface)" stroke="var(--line)" strokeWidth="0.1" rx="0.3" />
              <text x={star.x + 1.5} y={star.y} fontSize="1.2" fill="var(--ink)">
                {new Date(star.memory.happenedAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
              </text>
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}
