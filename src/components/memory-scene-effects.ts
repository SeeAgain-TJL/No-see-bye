import type { ThemeName } from "@/lib/themes";

const tau = Math.PI * 2;
const motes = Array.from({ length: 54 }, (_, index) => {
  const seed = (shift: number) => {
    const value = Math.sin((index + 1) * 81.37 + shift * 19.54) * 43758.5453;
    return value - Math.floor(value);
  };
  return { x: seed(1), y: seed(2), depth: .15 + seed(3) * .85, phase: seed(4) * tau };
});

const wrap = (value: number) => value - Math.floor(value);
const shards = motes.slice(0, 28);
const postcards = motes.slice(0, 35);
const lanterns = motes.slice(0, 23);

function light(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number, color: string) {
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha * .13;
  ctx.beginPath();
  ctx.arc(x, y, size * 3.4, 0, tau);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, tau);
  ctx.fill();
}

/** The plate is still art. Optical depth and particles are generated live, at CSS pixel scale. */
export function paintMemoryAtmosphere(
  ctx: CanvasRenderingContext2D, theme: ThemeName, width: number, height: number,
  time: number, reveal: number, lookX: number, lookY: number, still: boolean,
) {
  ctx.clearRect(0, 0, width, height);
  const cut = Math.sin(reveal * Math.PI);
  const size = Math.min(1.5, Math.max(.82, width / 480));
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  if (theme === "forest") {
    for (const mote of motes) {
      const x = (mote.x + Math.sin(time * .42 + mote.phase) * .034) * width - lookX * 21 * mote.depth;
      const y = (mote.y * .9 + Math.cos(time * .34 + mote.phase) * .025) * height - lookY * 16 * mote.depth;
      const pulse = .45 + .55 * (0.5 + 0.5 * Math.sin(time * 2.1 + mote.phase));
      light(ctx, x, y, (1 + mote.depth * 1.6) * size, pulse * (.34 + cut * .45), "#d9f485");
    }
  } else if (theme === "iceberg") {
    for (const mote of shards) {
      const x = wrap(mote.x - time * .012 * mote.depth - reveal * .1) * width + lookX * 18 * mote.depth;
      const y = wrap(mote.y + time * .008) * height + lookY * 14;
      const shard = (3 + mote.depth * 11 + cut * 4) * size;
      ctx.fillStyle = mote.depth > .6 ? "#d9faff" : "#72cdff";
      ctx.globalAlpha = Math.max(0, Math.sin(time * 2.2 + mote.phase)) * (.24 + cut * .53);
      ctx.beginPath();
      ctx.moveTo(x, y - shard);
      ctx.lineTo(x + shard * .4, y);
      ctx.lineTo(x - shard * .23, y + shard);
      ctx.lineTo(x - shard * .31, y + 1);
      ctx.closePath();
      ctx.fill();
    }
  } else if (theme === "grassland") {
    for (const mote of postcards) {
      const x = wrap(mote.x + time * (.035 + mote.depth * .015) + reveal * .26) * (width + 40) - 20;
      const depth = mote.depth;
      const y = (mote.y * .51 + .23 + Math.sin(time * 1.3 + mote.phase) * .065) * height - lookY * 18 * depth;
      if (depth < .68) {
        light(ctx, x + lookX * 13 * depth, y, size * 1.7, .35 + cut * .37, "#ffedba");
        continue;
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(time + mote.phase) * .5);
      ctx.fillStyle = "#ffdf9e";
      ctx.strokeStyle = "#fff0ca";
      ctx.globalAlpha = .31 + cut * .38;
      const card = (8 + depth * 11) * size;
      ctx.fillRect(-card / 2, -card * .28, card, card * .56);
      ctx.strokeRect(-card / 2, -card * .28, card, card * .56);
      ctx.restore();
    }
  } else if (theme === "rift") {
    for (const mote of lanterns) {
      const depth = mote.depth;
      const x = (mote.x + Math.sin(time * .55 + mote.phase) * .033) * width - lookX * 16 * depth;
      const y = wrap(mote.y - time * .017 * depth - reveal * .43 * depth) * (height + 45) - 21;
      const lantern = (3 + depth * 9) * size;
      const glow = (.54 + cut * .44) * (.7 + Math.sin(time * 2.6 + mote.phase) * .3);
      light(ctx, x, y, lantern, glow * .24, "#ff8d39");
      ctx.globalAlpha = glow;
      ctx.fillStyle = "#ffba70";
      ctx.beginPath();
      ctx.roundRect(x - lantern * .5, y - lantern * .64, lantern, lantern * 1.28, lantern * .33);
      ctx.fill();
      ctx.globalAlpha = glow * .64;
      ctx.fillStyle = "#fff1aa";
      ctx.fillRect(x - lantern * .27, y - lantern * .36, lantern * .54, lantern * .72);
    }
  } else {
    for (const mote of motes) {
      const x = (mote.x + Math.sin(time * .7 + mote.phase) * .031) * width - lookX * 18 * mote.depth;
      const y = wrap(mote.y - time * .024 * mote.depth - reveal * .22) * (height + 25) - 12;
      const bubble = (1.2 + mote.depth * 6 + cut * 2) * size;
      ctx.globalAlpha = (.18 + cut * .43) * mote.depth;
      ctx.strokeStyle = "#8feff1";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, bubble, 0, tau);
      ctx.stroke();
      light(ctx, x - bubble * .38, y - bubble * .45, Math.max(1, bubble * .16), .42 * mote.depth, "#e6feff");
    }
  }

  if (reveal > 0 && !still) {
    ctx.globalAlpha = cut * .29;
    const sweep = ctx.createLinearGradient(0, 0, width, height);
    sweep.addColorStop(0, "transparent");
    sweep.addColorStop(Math.max(0, reveal - .19), "transparent");
    sweep.addColorStop(Math.min(.99, Math.max(.01, reveal)), "#fffad5");
    sweep.addColorStop(Math.min(1, reveal + .19), "transparent");
    sweep.addColorStop(1, "transparent");
    ctx.fillStyle = sweep;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}
