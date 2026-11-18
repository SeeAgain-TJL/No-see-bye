import type { ThemeName } from "@/lib/themes";

const tau = Math.PI * 2;
const wrap = (value: number) => value - Math.floor(value);
const grains = Array.from({ length: 22 }, (_, index) => {
  const seed = (shift: number) => wrap(Math.sin((index + 1) * 81.37 + shift * 19.54) * 43758.5453);
  return { x: seed(1), y: seed(2), depth: .2 + seed(3) * .8, phase: seed(4) * tau };
});
const fireflies = grains.slice(0, 9);
const windSeeds = grains.slice(0, 13);
const suspended = grains.slice(0, 17);

export type ScenePlateBounds = { left: number; top: number; width: number; height: number };

/** Paint only in-scene material, in CSS pixels. The still plate supplies the light sources. */
export function paintMemoryAtmosphere(
  ctx: CanvasRenderingContext2D, theme: ThemeName, width: number, height: number,
  time: number, reveal: number, lookX: number, lookY: number, still: boolean, plate: ScenePlateBounds,
) {
  ctx.clearRect(0, 0, width, height);
  if (still) return;

  const swell = Math.sin(reveal * Math.PI);
  const scale = Math.min(1.35, Math.max(.81, width / 455));
  const panX = lookX * 11;
  const panY = lookY * 9;
  const artX = (x: number) => plate.left + x * plate.width;
  const artY = (y: number) => plate.top + y * plate.height;
  ctx.save();
  ctx.lineCap = "round";

  if (theme === "forest") {
    // Low fog follows the rail bed. Near lights blink independently above it.
    const drift = Math.sin(time * .32) * width * .06;
    ctx.save();
    ctx.translate(artX(.72) + drift - panX, artY(.56) - panY);
    ctx.scale(width * .48, height * .11);
    const mist = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    mist.addColorStop(0, "#bfc1a5");
    mist.addColorStop(1, "transparent");
    ctx.globalAlpha = .049 + swell * .063;
    ctx.fillStyle = mist;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();

    ctx.fillStyle = "#d8cc8c";
    for (const mote of fireflies) {
      const x = artX(mote.x * .79 + .10 + Math.sin(time * .8 + mote.phase) * .048) - panX * mote.depth;
      const y = artY(.40 + mote.y * .27 + Math.cos(time * .62 + mote.phase) * .028) - panY * mote.depth;
      const glint = Math.max(0, Math.sin(time * 2.4 + mote.phase)) ** 2.4;
      ctx.globalAlpha = glint * (.47 + swell * .31);
      ctx.beginPath();
      ctx.arc(x, y, (.7 + mote.depth * .9) * scale, 0, tau);
      ctx.fill();
    }
  } else if (theme === "iceberg") {
    // Fine ice dust crosses the upper daylight instead of orbiting as large shards.
    ctx.strokeStyle = "#d0e1e2";
    for (const mote of grains) {
      const y = wrap(mote.y + time * (.018 + mote.depth * .016));
      const cross = wrap(mote.x - time * .028 * mote.depth) - .5;
      const x = artX(.56 - y * .31 + cross * .42) - panX * mote.depth;
      const heightInBeam = artY(.03 + y * .57) - panY * mote.depth;
      const beam = Math.max(0, 1 - Math.abs(cross) * 1.9);
      const length = (1 + mote.depth * 3) * scale;
      ctx.globalAlpha = beam * Math.sin(y * Math.PI) * (.44 + swell * .33);
      ctx.lineWidth = (.65 + mote.depth * .45) * scale;
      ctx.beginPath();
      ctx.moveTo(x, heightInBeam);
      ctx.lineTo(x - length * .42, heightInBeam + length);
      ctx.stroke();
    }
  } else if (theme === "grassland") {
    const gust = Math.sin(time * .91) * .35 + swell * .65;
    ctx.strokeStyle = "#dcc59f";
    for (const seed of windSeeds) {
      const depth = seed.depth;
      const x = wrap(seed.x + time * (.033 + depth * .115) + reveal * depth * .27) * (width + 24) - 12;
      const y = artY(.53 + seed.y * .20 + Math.sin(time * 2.1 + seed.phase) * .039) - panY * depth;
      const length = (1.5 + depth * 4) * scale;
      ctx.globalAlpha = depth * (.38 + gust * .28);
      ctx.lineWidth = scale * (.57 + depth * .52);
      ctx.beginPath();
      ctx.moveTo(x - length * .5, y + depth);
      ctx.quadraticCurveTo(x, y - depth * 2, x + length * .5, y - depth * 2.8);
      ctx.stroke();
    }

    if (swell > .05) {
      // One folded letter joins the gust when the short is played.
      const length = 16 * scale;
      ctx.save();
      ctx.translate(artX(.424 + reveal * .64), artY(.45 - reveal * .12 + Math.sin(reveal * tau * 1.4) * .025));
      ctx.rotate(-.27 + Math.sin(reveal * tau * 2) * .37);
      ctx.scale(1, .31 + Math.abs(Math.cos(reveal * tau * 2)) * .65);
      ctx.globalAlpha = Math.min(.86, swell * 1.5);
      ctx.fillStyle = "#d8c5a3";
      ctx.beginPath();
      ctx.moveTo(-length * .55, -length * .18);
      ctx.lineTo(length * .49, -length * .30);
      ctx.lineTo(length * .63, length * .20);
      ctx.lineTo(-length * .43, length * .27);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#827159";
      ctx.lineWidth = .65;
      ctx.beginPath();
      ctx.moveTo(-length * .55, -length * .18);
      ctx.lineTo(length * .06, length * .11);
      ctx.lineTo(length * .49, -length * .30);
      ctx.stroke();
      ctx.restore();
    }
  } else if (theme === "rift") {
    // Paper lanterns rise above the parapet and cool as they recede into the sky.
    for (let index = 0; index < 4; index++) {
      const path = wrap(time * (.082 + index * .013) + index * .23 + reveal * .16);
      const x = artX(.27 + index * .15 + path * .06 + Math.sin(path * tau + index) * .018) - panX;
      const y = artY(.275 - index * .012 - path * .19) - panY;
      const taper = 1 - path * .55;
      const paper = (3.3 + (index % 2) * 2.4) * scale * taper;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(path * tau + index) * .17);
      ctx.globalAlpha = Math.sin(path * Math.PI) * (.71 + swell * .25);
      ctx.fillStyle = "#cf9263";
      ctx.beginPath();
      ctx.moveTo(-paper * .6, -paper * .77);
      ctx.lineTo(paper * .59, -paper * .69);
      ctx.lineTo(paper * .47, paper * .67);
      ctx.lineTo(-paper * .42, paper * .56);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f4c891";
      ctx.fillRect(-paper * .25, -paper * .34, paper * .62, paper * .67);
      ctx.restore();
    }
  } else {
    // Moving bands are visible only through the shallow upper water.
    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = "#83bcb2";
    for (let line = 0; line < 3; line++) {
      const y = artY(.235 + line * .058 + Math.sin(time * .45 + line * .7) * .026);
      const x = artX(.20 + line * .038 + Math.sin(time * .31 + line) * .058);
      ctx.globalAlpha = (.08 + swell * .07) * (1 - line * .18);
      ctx.lineWidth = scale * (1.8 + line * .35);
      ctx.beginPath();
      ctx.moveTo(x + panX * .4, y);
      ctx.bezierCurveTo(x + width * .13, y - height * .038, x + width * .23, y + height * .049, x + width * .42, y - height * .021);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#afbfb0";
    for (const mote of suspended) {
      const x = wrap(mote.x + time * .025) * width - panX * mote.depth;
      const phase = wrap(mote.y - time * .031 * mote.depth);
      const y = (.18 + phase * .59 + Math.sin(time * .6 + mote.phase) * .021) * height - panY * mote.depth;
      ctx.globalAlpha = Math.sin(phase * Math.PI) * mote.depth * (.28 + swell * .19);
      ctx.beginPath();
      ctx.arc(x, y, (.65 + mote.depth * .77) * scale, 0, tau);
      ctx.fill();
    }
  }

  ctx.restore();
}
