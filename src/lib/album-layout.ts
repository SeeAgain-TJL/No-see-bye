export const wrap = (n: number, count: number) => ((n % count) + count) % count;
export function albumOffset(index: number, position: number, count: number) {
  return count > 2 ? wrap(index - position + count / 2, count) - count / 2 : index - position;
}

/** Place mixed-width prints against one another, not against a fixed ruler. */
export function albumPositions(widths: number[], position: number, mobile = false) {
  const count = widths.length;
  if (!count) return [];
  const base = Math.floor(position), fraction = position - base;
  const widthAt = (index: number) => widths[wrap(index, count)];
  const stepAt = (index: number) => {
    const a = widthAt(index), b = widthAt(index + 1);
    return (a + b) / 2 - Math.min(28, Math.min(a, b) * .2);
  };
  const shift = fraction * stepAt(base);
  return widths.map((_, index) => {
    const offset = albumOffset(index, position, count), distance = Math.abs(offset);
    let x = 0;
    if (mobile) {
      const currentWidth = widthAt(Math.round(position));
      x = Math.sign(offset) * (Math.sin(Math.min(distance, 1) * Math.PI) * currentWidth * .5 + Math.min(distance, 1) * 13);
    } else {
      const steps = Math.round(position + offset) - base;
      if (steps >= 0) for (let i = 0; i < steps; i++) x += stepAt(base + i);
      else for (let i = -1; i >= steps; i--) x -= stepAt(base + i);
      x -= shift;
    }
    return {
      x, y: Math.min(distance, 2) * (mobile ? -10 : 7),
      angle: Math.max(-2, Math.min(2, offset)) * 3,
      scale: 1 - Math.min(distance, 2) * (mobile ? .085 : .08),
      opacity: Math.max(0, Math.min(1, (1.8 - distance) * 1.5)),
      z: 30 - Math.round(distance * 10), interactive: distance < 1.6,
    };
  });
}
