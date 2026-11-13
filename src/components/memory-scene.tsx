/* eslint-disable @next/next/no-img-element -- Small, bundled decorative WebP assets. */
export function MemoryScene() {
  return (
    <div className="memory-scene" aria-hidden="true">
      <div className="scene-halo" />
      <div className="scene-orbit" />
      <div className="scene-paper paper-back" />
      <div className="scene-photo photo-back">
        <img src="/visuals/lake-light.webp" alt="" width={640} height={800} />
        <div className="photo-caption"><span>山间来信</span><span>02</span></div>
      </div>
      <div className="scene-photo photo-front">
        <img src="/visuals/forest-light.webp" alt="" width={640} height={800} fetchPriority="high" />
        <div className="photo-caption"><span>光，刚好落下</span><span>01</span></div>
      </div>
      <div className="scene-note"><span className="note-dot" /><span>一些平凡，一些难忘。</span><i /></div>
      <div className="scene-index"><span>片刻 · 珍藏</span><span>PHOTO / FILM / WORDS</span></div>
    </div>
  );
}
