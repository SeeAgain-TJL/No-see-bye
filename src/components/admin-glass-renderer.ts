type Point = { x: number; y: number; z: number };
type Color = [number, number, number];
type Point2D = Pick<Point, "x" | "y">;
type Particle = { x: number; y: number; depth: number; phase: number };

export type GlassLight = {
  signal: Color;
  warm: Color;
};

const TAU = 2 * Math.PI;
const WHITE: Color = [231, 249, 246];
const SHADE: Color = [8, 16, 22];

const contour: Point2D[] = [
  { x: -.94, y: -.44 }, { x: -.48, y: -.97 }, { x: .43, y: -.95 },
  { x: .87, y: -.53 }, { x: .95, y: .32 }, { x: .5, y: .93 },
  { x: -.45, y: .91 }, { x: -.94, y: .48 },
];

const plates = [
  { x: .37, y: -.14, z: -.5, yaw: -.3, roll: .34, scale: .78, thickness: .09, exposure: .62 },
  { x: -.41, y: .11, z: -.27, yaw: .19, roll: -.3, scale: .77, thickness: .08, exposure: .72 },
  { x: .10, y: .02, z: .38, yaw: -.07, roll: .03, scale: .87, thickness: .13, exposure: 1 },
];

// Stable sampling keeps the same particles in both the scene and the glass reflections.
const particles: Particle[] = Array.from({ length: 106 }, (_, i) => ({
  x: ((i * 347 + 127) % 997) / 997,
  y: ((i * 467 + 293) % 953) / 953,
  depth: ((i * 83 + 17) % 127) / 127,
  phase: i * 1.847,
}));

export function readGlassLight(style: CSSStyleDeclaration): GlassLight {
  function read(name: string, fallback: Color): Color {
    const hex = style.getPropertyValue(name).trim().match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
    return hex ? [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)] : fallback;
  }
  return {
    signal: read("--admin-signal", [154, 227, 211]),
    warm: read("--admin-gold", [241, 187, 124]),
  };
}

function color([red, green, blue]: Color, alpha: number) {
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function path(ctx: CanvasRenderingContext2D, points: Point2D[]) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, angle: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, angle, 0, TAU);
}

function rotate(point: Point, yaw: number, pitch: number, roll: number): Point {
  const rollCos = Math.cos(roll);
  const rollSin = Math.sin(roll);
  const yawCos = Math.cos(yaw);
  const yawSin = Math.sin(yaw);
  const pitchCos = Math.cos(pitch);
  const pitchSin = Math.sin(pitch);
  const x = point.x * rollCos - point.y * rollSin;
  const y = point.x * rollSin + point.y * rollCos;
  const depth = point.z * yawCos + x * yawSin;
  return {
    x: x * yawCos - point.z * yawSin,
    y: y * pitchCos - depth * pitchSin,
    z: y * pitchSin + depth * pitchCos,
  };
}

function wrap(value: number) {
  return value - Math.floor(value);
}

type Scene = {
  width: number;
  height: number;
  time: number;
  pointer: Point2D;
  focus: number;
  pulse: number;
  light: GlassLight;
};

export function drawGlassScene(ctx: CanvasRenderingContext2D, scene: Scene) {
  const { width, height, time, pointer, focus, pulse, light: { signal, warm } } = scene;
  const narrow = width < 530;
  const size = Math.min(width * (narrow ? .27 : .29), height * (narrow ? .36 : .39)) * (1 + focus * .1);
  const centerX = width * (narrow ? .61 : .55) + pointer.x * size * .12;
  const centerY = height * (narrow ? .67 : .52) + pointer.y * size * .08;
  const tilt = -.46 + pointer.x * .32 + Math.sin(time * .23) * .105 + focus * .25;
  const pitch = .37 - pointer.y * .27 + Math.sin(time * .29 + 1.2) * .08 - focus * .18;
  const roll = -.22 + Math.sin(time * .19) * .045;
  const shimmer = Math.sin(time * .52) * .055 + pointer.x * .07 + focus * .065 + pulse * .025;
  ctx.clearRect(0, 0, width, height);

  function project(point: Point): Point {
    const rotated = rotate(point, tilt, pitch, roll);
    const perspective = size / (1 - rotated.z * .18);
    return {
      x: centerX + rotated.x * perspective,
      y: centerY + rotated.y * perspective,
      z: rotated.z,
    };
  }

  const lightPool = ctx.createRadialGradient(centerX + size * .28, centerY - size * .27, 2, centerX, centerY, size * 2.25);
  lightPool.addColorStop(0, color(signal, .18 + focus * .08));
  lightPool.addColorStop(.4, color(signal, .07));
  lightPool.addColorStop(1, color(signal, 0));
  ctx.fillStyle = lightPool;
  ctx.fillRect(0, 0, width, height);

  const secondaryPool = ctx.createRadialGradient(centerX + size * .8, centerY + size * .4, 0, centerX + size * .8, centerY + size * .4, size * 1.5);
  secondaryPool.addColorStop(0, color(warm, .115 + focus * .1 + pulse * .09));
  secondaryPool.addColorStop(1, color(warm, 0));
  ctx.fillStyle = secondaryPool;
  ctx.fillRect(0, 0, width, height);

  const dust = particles.slice(0, narrow ? 72 : particles.length).map(particle => ({
    ...particle,
    x: wrap(particle.x - time * (.006 + particle.depth * .012)) * width - pointer.x * size * particle.depth * .14,
    y: wrap(particle.y + time * (.004 + particle.depth * .003)) * height - pointer.y * size * particle.depth * .11,
    brightness: .42 + Math.sin(particle.phase + time) * .19,
  }));
  for (const mote of dust) {
    const radius = .38 + mote.depth * 1.3;
    ctx.fillStyle = color(mote.depth > .88 ? warm : signal, mote.brightness * (.24 + mote.depth * .42));
    ellipse(ctx, mote.x, mote.y, radius, radius, 0);
    ctx.fill();
  }

  // A narrow soft source runs through the glass, giving the edges a common light.
  ctx.save();
  ctx.translate(centerX, centerY - size * .14);
  ctx.rotate(-.27 + pointer.y * .055);
  const beam = ctx.createLinearGradient(0, -size * .19, 0, size * .29);
  beam.addColorStop(0, color(signal, 0));
  beam.addColorStop(.28, color(signal, .04));
  beam.addColorStop(.53, color(warm, .145 + focus * .07 + pulse * .09));
  beam.addColorStop(.77, color(warm, .05));
  beam.addColorStop(1, color(warm, 0));
  ctx.fillStyle = beam;
  path(ctx, [{ x: -size * 2.3, y: .06 * size }, { x: size * 2.8, y: -size * .2 }, { x: size * 2.8, y: size * .29 }, { x: -size * 2.3, y: .06 * size }]);
  ctx.fill();
  ctx.restore();

  function drawFacet(plate: typeof plates[number]) {
    const spread = 1 - focus * .32;
    const bob = Math.sin(time * .66 + plate.z * 4) * .035;
    function facetPoint(point: Point2D, z: number, bevel = 1) {
      const local = rotate({ x: point.x * plate.scale * bevel, y: point.y * plate.scale * bevel, z }, plate.yaw, -.09, plate.roll);
      return project({ x: local.x + plate.x * spread, y: local.y + plate.y + bob, z: local.z + plate.z + focus * .12 });
    }
    const back = contour.map(point => facetPoint(point, -plate.thickness, .94));
    const rim = contour.map(point => facetPoint(point, 0));
    const face = contour.map(point => facetPoint(point, plate.thickness * .52, .94));
    const start = face[0];
    const end = face[4];

    ctx.save();
    ctx.globalAlpha = plate.exposure;
    path(ctx, back);
    ctx.fillStyle = color(SHADE, .43);
    ctx.fill();

    for (let i = 0; i < contour.length; i++) {
      const next = (i + 1) % contour.length;
      path(ctx, [back[i], back[next], rim[next], rim[i]]);
      ctx.fillStyle = color(i < 3 ? signal : SHADE, i < 3 ? .23 : .72);
      ctx.fill();
      path(ctx, [rim[i], rim[next], face[next], face[i]]);
      const specular = Math.max(0, Math.cos(i * .83 + tilt * 1.7 + 1.05));
      const edgeLight = i > 2 ? warm : signal;
      const bevel = ctx.createLinearGradient(rim[i].x, rim[i].y, face[i].x, face[i].y);
      bevel.addColorStop(0, color(edgeLight, .09 + specular * .23));
      bevel.addColorStop(.56, color(edgeLight, .15 + specular * (.48 + pulse * .2)));
      bevel.addColorStop(1, color(WHITE, .08 + specular * .27));
      ctx.fillStyle = bevel;
      ctx.fill();
    }

    path(ctx, face);
    const pane = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
    pane.addColorStop(0, color(WHITE, .17));
    pane.addColorStop(.22 + shimmer, color(signal, .29));
    pane.addColorStop(.49 + shimmer, color(SHADE, .66));
    pane.addColorStop(.74 + shimmer, color(signal, .20));
    pane.addColorStop(1, color(warm, .43 + focus * .17 + pulse * .16));
    ctx.fillStyle = pane;
    ctx.fill();
    ctx.save();
    ctx.clip();

    // The light seen through the plates drifts against the outside field as they tilt.
    for (const mote of dust) {
      if (mote.depth < .56) continue;
      const split = size * (.045 + plate.z * .025);
      const x = mote.x + split + pointer.x * split;
      const y = mote.y - split - pointer.y * split;
      ctx.fillStyle = color(signal, mote.brightness * .68);
      ctx.fillRect(x, y, 2.2, 1);
      ctx.fillStyle = color(warm, mote.brightness * .46);
      ctx.fillRect(x + split * .28, y - 1, 1.6, 1);
    }

    const sheen = ctx.createLinearGradient(start.x, face[1].y, end.x, face[5].y);
    sheen.addColorStop(0, color(signal, 0));
    sheen.addColorStop(.36 + shimmer, color(WHITE, 0));
    sheen.addColorStop(.43 + shimmer, color(WHITE, .38 + pulse * .18));
    sheen.addColorStop(.47 + shimmer, color(signal, .16));
    sheen.addColorStop(.64 + shimmer, color(signal, 0));
    sheen.addColorStop(1, color(signal, 0));
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, width, height);

    // Oblique bands make the glass turn in a way a flat tint cannot.
    for (let i = 0; i < 3; i++) {
      const y = -.5 + i * .3 + shimmer;
      const left = facetPoint({ x: -1.08, y }, .06);
      const right = facetPoint({ x: 1.08, y: y + .19 }, .06);
      const mark = ctx.createLinearGradient(left.x, left.y, right.x, right.y);
      mark.addColorStop(0, color(signal, 0));
      mark.addColorStop(.62, color(i === 1 ? warm : WHITE, .16 + focus * .11));
      mark.addColorStop(1, color(WHITE, 0));
      ctx.strokeStyle = mark;
      ctx.lineWidth = i === 1 ? 1.1 : .6;
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.bezierCurveTo(centerX - size * .44, left.y + size * .12, centerX + size * .24, right.y - size * .1, right.x, right.y);
      ctx.stroke();
    }
    ctx.restore();

    const edge = ctx.createLinearGradient(face[1].x, face[1].y, face[5].x, face[5].y);
    edge.addColorStop(0, color(WHITE, .92));
    edge.addColorStop(.29, color(signal, .53));
    edge.addColorStop(.55, color(signal, .15));
    edge.addColorStop(.77, color(warm, .36));
    edge.addColorStop(1, color(warm, .94));
    path(ctx, face);
    ctx.lineWidth = Math.max(.9, size * .01);
    ctx.strokeStyle = edge;
    ctx.stroke();

    path(ctx, rim);
    ctx.strokeStyle = color(WHITE, .30);
    ctx.lineWidth = .75;
    ctx.stroke();
    ctx.restore();
  }

  for (const plate of plates) drawFacet(plate);

  // A handful of out-of-focus foreground particles cross in front of the object.
  for (let i = 0; i < dust.length; i += 13) {
    const mote = dust[i];
    const radius = 2 + mote.depth * 5;
    const scatter = ctx.createRadialGradient(mote.x, mote.y, 0, mote.x, mote.y, radius);
    scatter.addColorStop(0, color(i % 2 ? warm : signal, (mote.brightness + pulse * .3) * .66));
    scatter.addColorStop(1, color(signal, 0));
    ctx.fillStyle = scatter;
    ctx.fillRect(mote.x - radius, mote.y - radius, radius * 2, radius * 2);
  }
}
