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
  const cue = Math.min(reveal * 24, 1, (1 - reveal) * 5);
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
    if (cue > 0) {
      ctx.save();
      ctx.translate(artX(.312 + reveal * .06), artY(.305 + reveal * .033));
      ctx.scale(plate.width * .24, plate.height * .135);
      const windowLight = ctx.createRadialGradient(0, 0, .04, .14, .05, 1);
      windowLight.addColorStop(0, "#efbe75a6");
      windowLight.addColorStop(.36, "#c9925160");
      windowLight.addColorStop(1, "transparent");
      ctx.globalAlpha = cue * (.86 + Math.sin(time * 6) * .065);
      ctx.fillStyle = windowLight;
      ctx.fillRect(-1, -1, 2.2, 2);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(artX(.72 - reveal * .08) + drift - panX, artY(.56) - panY);
    ctx.scale(width * .48, height * .11);
    const mist = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    mist.addColorStop(0, "#bfc1a5");
    mist.addColorStop(1, "transparent");
    ctx.globalAlpha = .049 + cue * .20;
    ctx.fillStyle = mist;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();

    ctx.fillStyle = "#d8cc8c";
    for (const mote of cue > 0 ? suspended : fireflies) {
      const x = artX(mote.x * .72 + .11 + Math.sin(time * .8 + mote.phase) * .048 + cue * reveal * .12) - panX * mote.depth;
      const y = artY(.42 + mote.y * .19 + Math.cos(time * .62 + mote.phase) * .028 - cue * reveal * .15) - panY * mote.depth;
      const glint = Math.max(0, Math.sin(time * 2.4 + mote.phase)) ** 2.4;
      ctx.globalAlpha = glint * (.42 + cue * .50);
      ctx.beginPath();
      ctx.arc(x, y, (.7 + mote.depth * (1 + cue * 1.7)) * scale, 0, tau);
      ctx.fill();
    }
  } else if (theme === "iceberg") {
    // The reflected light slips along the seam before it falls onto the steps.
    if (cue > 0) {
      const x = artX(.31 + reveal * .19);
      const y = artY(.12 + reveal * .21);
      const refraction = ctx.createLinearGradient(x - plate.width * .09, y, x + plate.width * .10, y);
      refraction.addColorStop(0, "#d6f5f300");
      refraction.addColorStop(.42, "#c2edf5a0");
      refraction.addColorStop(.53, "#e6fbfcec");
      refraction.addColorStop(1, "#a3d7ec00");
      ctx.globalAlpha = cue * .47;
      ctx.fillStyle = refraction;
      ctx.beginPath();
      ctx.moveTo(x, y - plate.height * .11);
      ctx.lineTo(x + plate.width * .095, y - plate.height * .14);
      ctx.lineTo(x - plate.width * .025, y + plate.height * .16);
      ctx.lineTo(x - plate.width * .08, y + plate.height * .11);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = "#d0e1e2";
    for (const mote of grains) {
      const y = wrap(mote.y + time * (.018 + mote.depth * .016));
      const cross = wrap(mote.x - time * .028 * mote.depth) - .5;
      const x = artX(.56 - y * .31 + cross * .42) - panX * mote.depth;
      const heightInBeam = artY(.03 + y * .57) - panY * mote.depth;
      const beam = Math.max(0, 1 - Math.abs(cross) * 1.9);
      const length = (1 + mote.depth * (3 + cue * 3)) * scale;
      ctx.globalAlpha = beam * Math.sin(y * Math.PI) * (.44 + cue * .48);
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
      const length = (1.5 + depth * (4 + cue * 7)) * scale;
      ctx.globalAlpha = depth * (.38 + gust * .38);
      ctx.lineWidth = scale * (.57 + depth * .52);
      ctx.beginPath();
      ctx.moveTo(x - length * .5, y + depth);
      ctx.quadraticCurveTo(x, y - depth * 2, x + length * .5, y - depth * 2.8);
      ctx.stroke();
    }

    if (cue > 0) {
      // One folded letter joins the gust when the short is played.
      const flight = 1 - (1 - reveal) ** 1.55;
      const length = (29 + Math.sin(flight * Math.PI) * 9) * scale;
      ctx.save();
      ctx.translate(artX(.424 + flight * .66), artY(.45 - flight * .16 - Math.sin(flight * Math.PI * 1.6) * .055));
      ctx.rotate(-.23 + Math.sin(flight * tau * 1.4) * .38);
      ctx.scale(1, .42 + Math.abs(Math.cos(flight * tau * 1.8)) * .58);
      ctx.globalAlpha = cue * .95;
      ctx.fillStyle = "#e1cda5";
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
      const lift = Math.max(0, (reveal - index * .115) / (1 - index * .115));
      const path = cue > 0 ? lift : wrap(time * (.082 + index * .013) + index * .23);
      const x = artX(.30 + index * .147 + path * .11 + Math.sin(path * tau + index) * .02) - panX;
      const y = artY(.273 - index * .015 - path * .25) - panY;
      const taper = 1 - path * .57;
      const paper = (3.6 + (index % 2) * 2.6 + cue * (8 - index * .65)) * scale * taper;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(path * tau + index) * .17);
      ctx.globalAlpha = cue > 0 ? Math.min(cue, path * 19) * .98 : Math.sin(path * Math.PI) * .60;
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
      ctx.fillStyle = "#fce3a7";
      ctx.fillRect(-paper * .12, paper * .05, paper * .23, paper * .5);
      ctx.restore();
    }
  } else {
    // Reflected surface light travels through the dome as the current strengthens.
    ctx.globalCompositeOperation = "screen";
    for (let line = 0; line < 4; line++) {
      const wave = time * (.71 + cue * .4) + line * .65;
      const y = artY(.22 + line * .056 + Math.sin(wave) * .025 - reveal * .079);
      const x = artX(.125 + line * .024 + Math.sin(wave * .6) * .07 + reveal * .26) + panX * .4;
      const reflectedLight = ctx.createLinearGradient(x, y, x + width * .67, y);
      reflectedLight.addColorStop(0, "#91c5bc00");
      reflectedLight.addColorStop(.29, "#8db8b189");
      reflectedLight.addColorStop(.49, "#c7e6ce");
      reflectedLight.addColorStop(.73, "#8bb9b888");
      reflectedLight.addColorStop(1, "#91c5bc00");
      ctx.strokeStyle = reflectedLight;
      ctx.globalAlpha = (.20 + cue * .39) * (1 - line * .15);
      ctx.lineWidth = scale * (1.8 + line * .28 + cue * 4);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + width * .25, y - height * .045, x + width * .25, y + height * .064, x + width * .67, y - height * .014);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#afbfb0";
    for (const mote of suspended) {
      const x = wrap(mote.x + time * .025) * width - panX * mote.depth;
      const phase = wrap(mote.y - (time * .038 + reveal * .56) * mote.depth);
      const y = (.18 + phase * .59 + Math.sin(time * .6 + mote.phase) * .021) * height - panY * mote.depth;
      ctx.globalAlpha = Math.sin(phase * Math.PI) * mote.depth * (.28 + cue * .35);
      ctx.beginPath();
      ctx.arc(x, y, (.65 + mote.depth * (.77 + cue * 2.6)) * scale, 0, tau);
      ctx.fill();
    }
  }

  ctx.restore();
}
