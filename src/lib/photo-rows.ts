export type PhotoRow = { start: number; count: number; height: number; widths: number[] };

/** Justify complete photographs at a common row height, with bounded final rows. */
export function photoRows(input: number[], width: number, target = 220, gap = 16): PhotoRow[] {
  if (!input.length || width <= 0) return [];
  const ratios = input.map(value => Number.isFinite(value) && value > 0 ? value : 1.5);
  const costs = Array(ratios.length + 1).fill(Infinity) as number[];
  const choices = Array(ratios.length).fill(1) as number[];
  costs[ratios.length] = 0;
  for (let start = ratios.length - 1; start >= 0; start--) {
    let sum = 0;
    for (let count = 1; count <= ratios.length - start; count++) {
      sum += ratios[start + count - 1];
      const available = width - gap * (count - 1);
      if (available <= 0) break;
      const natural = available / sum;
      const height = Math.min(target * 1.4, natural);
      const missing = Math.max(0, available - sum * height) / width;
      const cost = Math.pow((height - target) / target, 2) + missing * 3 + costs[start + count] + (count === 1 && ratios.length > 1 ? .35 : 0);
      if (cost < costs[start]) { costs[start] = cost; choices[start] = count; }
    }
  }
  const rows: PhotoRow[] = [];
  for (let start = 0; start < ratios.length;) {
    const count = choices[start], row = ratios.slice(start, start + count);
    const height = Math.min(target * 1.4, (width - gap * (count - 1)) / row.reduce((a, b) => a + b, 0));
    rows.push({ start, count, height, widths: row.map(ratio => ratio * height) });
    start += count;
  }
  return rows;
}
