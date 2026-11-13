"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="empty-state">
      <h1>刚刚打了个小盹。</h1>
      <p>页面暂时遇到了问题，再试一次吧。</p>
      <button className="button" onClick={reset}>
        重新打开
      </button>
    </main>
  );
}
