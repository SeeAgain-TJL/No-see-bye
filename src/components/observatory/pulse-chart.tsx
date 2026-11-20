import { useId } from "react";
import type { ActivityDay } from "../admin-activity";

export function PulseChart({ days, scale, active }: { days: ActivityDay[]; scale: number; active: number }) {
  const id = useId();
  const x = (i: number) => ((i + 0.5) / days.length) * 1000,
    y = (value: number) => 200 - (200 * value) / scale;
  // Horizontal handles interpolate between measurements without overshooting either endpoint.
  const line = days.reduce((path, day, i) => {
    if (!i) return "M " + x(0) + " " + y(day.users);
    const p = (x(i - 1) + x(i)) / 2;
    return (
      path + " C " + p + " " + y(days[i - 1].users) + " " + p + " " + y(day.users) + " " + x(i) + " " + y(day.users)
    );
  }, "");
  if (!days.length) return null;
  return (
    <svg className="obs-pulse-chart" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x2="0%" y2="100%">
          <stop offset="0" stopColor="var(--admin-signal)" stopOpacity=".27" />
          <stop offset="1" stopColor="var(--admin-signal)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={line + " L " + x(days.length - 1) + " 200 H " + x(0) + " Z"} fill={"url(#" + id + ")"} />
      <path className="obs-pulse-glow" d={line} fill="none" vectorEffect="non-scaling-stroke" />
      <path className="obs-pulse-line" d={line} fill="none" vectorEffect="non-scaling-stroke" />
      <path className="obs-pulse-sweep" d={line} pathLength="100" fill="none" vectorEffect="non-scaling-stroke" />
      {days[active] && (
        <path
          className="obs-pulse-point"
          d={"M " + (x(active) - 0.12) + " " + y(days[active].users) + " h .24"}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}
