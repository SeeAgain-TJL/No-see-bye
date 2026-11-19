import type { ThemeName } from "@/lib/themes";

type Frame = { ctx: CanvasRenderingContext2D; w: number; h: number; t: number };
const { sin, exp, pow, PI } = Math;
const noise = (seed: number) => { const n = sin(seed * 78.233 + 1) * 43758.5453; return n - Math.floor(n); };
// Keep the highest forms near the margins, so the centre of the page stays readable.
const shore = (u: number) => .07 + .49 * pow(1 - u, 4) + .74 * pow(u, 3.4);

function band({ ctx, w, h }: Frame, height: (x: number) => number, top: string, bottom: string, rim?: string) {
  const color = ctx.createLinearGradient(0, 0, 0, h);
  color.addColorStop(0, top);
  color.addColorStop(1, bottom);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, height(0));
  for (let x = 5; x < w; x += 5) ctx.lineTo(x, height(x));
  ctx.lineTo(w, height(w));
  if (rim) { ctx.strokeStyle = rim; ctx.lineWidth = 1.4; ctx.stroke(); }
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
}

function ocean(f: Frame) {
  const { ctx, w, h, t } = f;
  for (let layer = 0; layer < 4; layer++) {
    const phase = t * (.98 + layer * .1) + layer * 1.27;
    const edge = (x: number) => {
      const swell = sin(x / 115 + phase) + .4 * sin(x / 39 + phase * 1.6);
      return h * (1 - shore(x / w) * (.68 - layer * .1 + .22 * swell)) - 3 * sin(x / 14 + phase);
    };
    band(f, edge, '#80eed9bb', ['#329f9c6a','#187a8699','#155c75a8','#13495bb3'][layer], '#d4fff0c9');
    ctx.strokeStyle = '#d5fff1aa'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -10; x < w; x += 7) {
      const foam = sin(x * .042 + phase) * sin(x * .018 - phase);
      if (foam < -.15) continue;
      const y = edge(x) + 3 + 4 * foam;
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 4, y + foam * 5, x + 9, edge(x + 9) + 4);
    }
    ctx.stroke();
  }
}

function rift(f: Frame) {
  const { ctx, w, h, t } = f;
  const ridge = (x: number) => {
    const u = x / w;
    return h * (1 - shore(u) * (.85 + .11 * sin(x / 73) + .05 * sin(x / 17)));
  };
  band(f, ridge, '#ab7966be', '#562d2999', '#ffcba7c4');
  // Sunlight traces sediment beds at different depths in the valley.
  for (let i = 1; i <= 13; i++) {
    const bed = (x: number) => ridge(x) + i * (h / 29) + i * .48 * sin(x / 53 + i * .3);
    const glint = (t * .15 - i / 20) % 1;
    const light = ctx.createLinearGradient(0, 0, w, 0);
    for (let j = 0; j <= 12; j++) {
      const beam = exp(-pow((j / 12 - glint) * 6, 2));
      light.addColorStop(j / 12, `rgba(255,${145 + 65 * beam},${98 + 66 * beam},${.22 + .72 * beam})`);
    }
    ctx.strokeStyle = light; ctx.lineWidth = i % 4 === 0 ? 2.6 : 1.1;
    ctx.beginPath(); ctx.moveTo(0, bed(0));
    for (let x = 4; x <= w; x += 4) ctx.lineTo(x, bed(x));
    ctx.stroke();
  }
  // Thin veils accelerate as they drop from the right-hand rock shelf.
  const lip = w * .93;
  for (let i = 0; i < 24; i++) {
    const x = lip + (i - 12) * Math.min(.8, w / 1200);
    const drop = (t * .72 + noise(i)) % 1;
    const y = ridge(x) + (h - ridge(x)) * drop * drop;
    ctx.strokeStyle = `rgba(211,242,222,${.27 + .42 * sin(drop * PI)})`;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2 * drop, y + 4 + 17 * drop); ctx.stroke();
  }
}

function forest(f: Frame) {
  const { ctx, w, h, t } = f;
  for (let layer = 0; layer < 3; layer++) {
    const base = (x: number) => h * (1 - shore(x / w) * (.54 - layer * .17)) + sin(x / 54 + layer) * 3;
    band(f, base, '#73968090', ['#87aa9699','#446e59b3','#234838cc'][layer]);
    const step = 11 + layer * 4;
    for (let x = -step; x <= w + step; x += step) {
      const u = Math.max(0, Math.min(1, x / w));
      const height = h * shore(u) * (.11 + .32 * noise(x + layer));
      const y = base(x); const sway = sin(t * .82 + x * .024) * height * .035;
      ctx.fillStyle = ['#829f90bd','#477867c7','#214e43db'][layer]; ctx.beginPath();
      ctx.moveTo(x + sway, y - height);
      for (let j = 1; j <= 4; j++) {
        ctx.lineTo(x + height * j * .042, y - height + height * j / 4);
        ctx.lineTo(x + height * j * .02, y - height + height * j / 4 - 1);
      }
      ctx.lineTo(x - height * .18, y + 1);
      for (let j = 3; j >= 1; j--) {
        ctx.lineTo(x - height * j * .023, y - height + height * j / 4);
        ctx.lineTo(x - height * j * .045, y - height + height * j / 4);
      }
      ctx.closePath(); ctx.fill();
    }
    const mist = (x: number) => base(x) - 5 - (1 + sin(x / 92 + t * .6 + layer)) * h * shore(x / w) * .095;
    band(f, mist, '#deefe591', '#a4c0ae29');
  }
}

function grassland(f: Frame) {
  const { ctx, w, h, t } = f;
  for (let row = 0; row < 3; row++) {
    const ground = (x: number) => h * (1 - shore(x / w) * (.28 - row * .1));
    band(f, ground, '#9aab6d77', '#586d3677');
    for (let x = -8; x < w + 8; x += 5 + row * 2) {
      const seed = noise(x * 7 + row);
      const len = h * shore(Math.max(0, Math.min(1, x / w))) * (.12 + seed * .62);
      const base = ground(x) + 3;
      const gust = .18 + .24 * sin(x / 91 - t * 1.8) + .11 * sin(x / 32 - t * 2.3);
      const tip = x + len * gust;
      ctx.strokeStyle = ['#aeb880ac','#8b9559c9','#536c43cb'][row]; ctx.lineWidth = 1 + seed * .8;
      ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + len * gust * .18, base - len * .7, tip, base - len); ctx.stroke();
      if (seed > .53) {
        ctx.fillStyle = row === 2 ? '#bd955bd9' : '#dbc690c9';
        ctx.beginPath(); ctx.ellipse(tip, base - len, 1.15, 2 + len * .05, gust, 0, PI * 2); ctx.fill();
      }
    }
  }
}

function iceberg(f: Frame) {
  const { ctx, w, h, t } = f;
  for (let i = 0; i < 3; i++) {
    const y = (x: number) => h * (1 - shore(x / w) * (.55 + .23 * sin(x / 133 - t * .46 + i * .6)));
    band(f, y, ['#81ead7a8','#92a6ffd9','#86e2f5a8'][i], '#6cb5c616', '#dcfffd92');
  }
  for (let i = -1; i < 12; i++) {
    const size = w / 11, x = i * size + sin(t * .31 + i) * size * .06;
    const u = Math.max(0, Math.min(1, x / w));
    const peak = h - shore(u) * h * (.35 + noise(i) * .35);
    const tip = x + size * (.38 + noise(i + 8) * .28);
    ctx.fillStyle = '#9dd0e3c9'; ctx.beginPath(); ctx.moveTo(x - size * .15, h);
    ctx.lineTo(tip, peak); ctx.lineTo(x + size, h); ctx.fill();
    ctx.fillStyle = '#4c86a6ae'; ctx.beginPath(); ctx.moveTo(tip, peak);
    ctx.lineTo(tip - size * .09, h); ctx.lineTo(x + size, h); ctx.fill();
  }
}

export const paintAtmosphere: Record<ThemeName, (frame: Frame) => void> = { forest, grassland, ocean, rift, iceberg };
