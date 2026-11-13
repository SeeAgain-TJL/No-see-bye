export function MemoryOrbit({ compact = false }: { compact?: boolean }) {
  return <div className={"memory-orbit" + (compact ? " orbit-compact" : "")} aria-hidden="true">
    <div className="orbit-noise" /><div className="orbit-glow" />
    <div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" />
    <div className="orbit-sphere"><div /></div>
    <span className="orbit-point point-one" /><span className="orbit-point point-two" />
    <div className="orbit-frame frame-one"><div className="frame-landscape" /><span>日落之后</span></div>
    <div className="orbit-frame frame-two"><div className="frame-water" /><span>某个晴天</span></div>
    <span className="orbit-coordinate">35° / 120°</span>
  </div>;
}
