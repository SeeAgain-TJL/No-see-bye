"use client";
import { useState } from "react";
export function Avatar({ name, src, className = "" }: { name: string; src?: string | null; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  return <span className={`avatar ${className}`} aria-hidden="true">
    {src && src !== failed ? (
      // User avatars are already resized and served as WebP by our API.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" width={256} height={256} onError={() => setFailed(src)} />
    ) : (name[0] || "U").toUpperCase()}
  </span>;
}
