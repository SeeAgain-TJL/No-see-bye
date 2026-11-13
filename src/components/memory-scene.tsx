/* eslint-disable @next/next/no-img-element -- Small, bundled decorative WebP assets. */
export function MemoryScene() {
  return (
    <div className="memory-scene" aria-hidden="true">
      <div className="scene-halo" />
      <div className="scene-orbit" />
      <span className="scene-star star-one">✳</span><span className="scene-star star-two">✦</span>
      <div className="scene-photo photo-back">
        <img src="/visuals/lake-light.webp" alt="" width={640} height={800} />
        <div className="photo-caption"><span>LET’S GO!</span><span>↗</span></div>
      </div>
      <div className="scene-photo photo-front">
        <img src="/visuals/summer-beach.webp" alt="" width={640} height={800} fetchPriority="high" />
        <div className="photo-caption"><span>今天，快乐超标</span><span>☺</span></div>
      </div>
      <div className="scene-note"><span>GOOD<br />TIMES!</span><span>↗</span></div>
      <div className="scene-index"><span className="rec-dot" />REC · LIVE YOUR LIFE</div>
    </div>
  );
}
