"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "./icons";

export function MemoryPortal({ children }: { children: ReactNode }) {
  const [focused, setFocused] = useState(false);

  return <div className="auth-projection" data-focused={focused}>
    <div className="auth-projection-planes" aria-hidden="true">
      <div className="auth-projection-image" />
      <div className="auth-projection-reflection" />
      <div className="auth-projection-optics" />
    </div>
    <div className="auth-projection-frame" aria-hidden="true"><span /><span /><span /><span /></div>
    <div className="auth-projection-content">
      {children}
      <div className="auth-projection-actions">
        <button type="button" aria-pressed={focused} aria-label="拉近主题镜头" onClick={() => setFocused(value => !value)}>
          <Icon name={focused ? "restore" : "expand"} size={17} />
          {focused ? "还原镜头" : "拉近镜头"}
        </button>
        <Link href="/memories?scope=public" aria-label="浏览公开日常">借阅人间<Icon name="arrow" size={17} /></Link>
      </div>
    </div>
  </div>;
}
