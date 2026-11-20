// Shared toolkit for the observatory creatures. Every creature owns a fixed number of
// particles and re-poses them each frame from pure maths, so nothing is loaded or baked.
export type Vec3 = [number, number, number];
export type Rand = () => number;
export const TAU = Math.PI * 2;
export const GROUND = -1.3;

export function rng(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};
export const fract = (v: number) => v - Math.floor(v);

export interface Creature {
  /** Index into the species palette (0..1) for every particle. */
  tone: Float32Array;
  /** Relative particle size, about 0.5-1.6. */
  size: Float32Array;
  /**
   * Writes the pose for time `t` seconds. `glow` is a per-particle gain: 0 is neutral, positive
   * values brighten up to about 1, negative values fade towards -1 (invisible).
   */
  pose(t: number, pos: Float32Array, glow: Float32Array): void;
}
export interface Species {
  id: string;
  name: string;
  latin: string;
  note: string;
  /** Five or fewer evenly spaced colour stops; `tone` 0 is the first stop and 1 the last. */
  palette: number[];
  /** Framing of the whole animal inside the stage. */
  view?: { scale?: number; x?: number; y?: number; yaw?: number; pitch?: number };
  /** Ground treatment: a scrolling grid for walkers, a calm ring for rooted forms, nothing in open water or sky. */
  floor: "walk" | "ring" | "none";
  /** World units per second the scenery slides past (feeds the grid and the drifting particles). */
  speed: number;
  build(n: number): Creature;
}

export class Builder {
  readonly tone: Float32Array;
  readonly size: Float32Array;
  readonly rand: Rand;
  used = 0;
  constructor(
    readonly n: number,
    seed = 7,
  ) {
    this.tone = new Float32Array(n).fill(0.5);
    this.size = new Float32Array(n).fill(1);
    this.rand = rng(seed);
  }
  take(count: number | "rest") {
    const left = this.n - this.used;
    const c = count === "rest" ? left : Math.max(0, Math.min(Math.round(count), left));
    const start = this.used;
    this.used += c;
    return { start, count: c };
  }
  share(f: number) {
    return Math.round(this.n * f);
  }
  /** Per-particle size jitter keeps the glow from looking printed. */
  jitter(scale = 1) {
    return scale * (0.72 + this.rand() * 0.56);
  }
}

// ---------- rotation helpers (column-major 3x3 in a Float64Array(9)) ----------
export function setBasis(m: Float64Array, yaw: number, pitch: number, roll: number) {
  const cy = Math.cos(yaw),
    sy = Math.sin(yaw),
    cp = Math.cos(pitch),
    sp = Math.sin(pitch),
    cr = Math.cos(roll),
    sr = Math.sin(roll);
  // R = Ry(yaw) * Rz(pitch) * Rx(roll); columns are the images of the unit axes.
  m[0] = cy * cp;
  m[1] = sp;
  m[2] = -sy * cp;
  m[3] = cy * -sp * cr + sy * sr;
  m[4] = cp * cr;
  m[5] = sy * sp * cr + cy * sr;
  m[6] = cy * sp * sr + sy * cr;
  m[7] = -cp * sr;
  m[8] = -sy * sp * sr + cy * cr;
  return m;
}
// ---------- tube: a particle skin swept along an animated spine ----------
export interface TubeOpts {
  count: number | "rest";
  spine: (s: number, t: number, out: Vec3) => void;
  /** Cross-section radii along the normal and binormal axes. */
  profile: (s: number, t: number, out: [number, number]) => void;
  up?: Vec3 | ((t: number) => Vec3);
  /** Share of particles sitting on the surface rather than inside. */
  shell?: number;
  samples?: number;
  along?: (u: number) => number;
  tone: (s: number, a: number, r: number, rand: Rand) => number;
  size?: (s: number, a: number) => number;
  glow?: (s: number, a: number, t: number, i: number) => number;
}

export class Tube {
  readonly start: number;
  readonly count: number;
  private readonly K: number;
  private readonly sv: Float32Array;
  private readonly av: Float32Array;
  private readonly cx: Float32Array;
  private readonly cy: Float32Array;
  private readonly P: Float64Array;
  private readonly T: Float64Array;
  private readonly N: Float64Array;
  private readonly B: Float64Array;
  private readonly R: Float64Array;
  private readonly tmp: Vec3 = [0, 0, 0];
  private readonly rad: [number, number] = [0, 0];
  constructor(
    b: Builder,
    private readonly o: TubeOpts,
  ) {
    const { start, count } = b.take(o.count);
    this.start = start;
    this.count = count;
    const K = (this.K = o.samples ?? 24);
    this.P = new Float64Array((K + 1) * 3);
    this.T = new Float64Array((K + 1) * 3);
    this.N = new Float64Array((K + 1) * 3);
    this.B = new Float64Array((K + 1) * 3);
    this.R = new Float64Array((K + 1) * 2);
    this.sv = new Float32Array(count);
    this.av = new Float32Array(count);
    this.cx = new Float32Array(count);
    this.cy = new Float32Array(count);
    const shell = o.shell ?? 0.8;
    for (let i = 0; i < count; i++) {
      const u = b.rand();
      const s = o.along ? o.along(u) : u;
      const a = b.rand() * TAU;
      const r = b.rand() < shell ? 0.9 + b.rand() * 0.1 : Math.sqrt(b.rand());
      this.sv[i] = s;
      this.av[i] = a;
      this.cx[i] = Math.cos(a) * r;
      this.cy[i] = Math.sin(a) * r;
      b.tone[start + i] = o.tone(s, a, r, b.rand);
      b.size[start + i] = (o.size ? o.size(s, a) : 1) * b.jitter();
    }
  }
  update(t: number, pos: Float32Array, glow: Float32Array) {
    const { K, P, T, N, B, R, tmp, rad, o } = this;
    for (let k = 0; k <= K; k++) {
      o.spine(k / K, t, tmp);
      P[k * 3] = tmp[0];
      P[k * 3 + 1] = tmp[1];
      P[k * 3 + 2] = tmp[2];
      o.profile(k / K, t, rad);
      R[k * 2] = rad[0];
      R[k * 2 + 1] = rad[1];
    }
    for (let k = 0; k <= K; k++) {
      const a = Math.max(0, k - 1) * 3,
        c = Math.min(K, k + 1) * 3;
      const x = P[c] - P[a],
        y = P[c + 1] - P[a + 1],
        z = P[c + 2] - P[a + 2];
      const l = Math.hypot(x, y, z) || 1;
      T[k * 3] = x / l;
      T[k * 3 + 1] = y / l;
      T[k * 3 + 2] = z / l;
    }
    const up = typeof o.up === "function" ? o.up(t) : (o.up ?? [0, 1, 0]);
    let nx = up[0],
      ny = up[1],
      nz = up[2];
    for (let k = 0; k <= K; k++) {
      const i = k * 3;
      const tx = T[i],
        ty = T[i + 1],
        tz = T[i + 2];
      const d = nx * tx + ny * ty + nz * tz;
      nx -= tx * d;
      ny -= ty * d;
      nz -= tz * d;
      let l = Math.hypot(nx, ny, nz);
      if (l < 1e-5) {
        nx = ty;
        ny = -tx;
        nz = 0;
        l = Math.hypot(nx, ny, nz) || 1;
      }
      nx /= l;
      ny /= l;
      nz /= l;
      N[i] = nx;
      N[i + 1] = ny;
      N[i + 2] = nz;
      B[i] = ty * nz - tz * ny;
      B[i + 1] = tz * nx - tx * nz;
      B[i + 2] = tx * ny - ty * nx;
    }
    const { sv, av, cx, cy, start, count } = this;
    for (let i = 0; i < count; i++) {
      const f = sv[i] * K;
      const k = Math.min(K - 1, f | 0);
      const w = f - k,
        v = 1 - w;
      const a = k * 3,
        c = a + 3;
      const r0 = (R[k * 2] * v + R[k * 2 + 2] * w) * cx[i];
      const r1 = (R[k * 2 + 1] * v + R[k * 2 + 3] * w) * cy[i];
      const j = (start + i) * 3;
      pos[j] = P[a] * v + P[c] * w + (N[a] * v + N[c] * w) * r0 + (B[a] * v + B[c] * w) * r1;
      pos[j + 1] =
        P[a + 1] * v + P[c + 1] * w + (N[a + 1] * v + N[c + 1] * w) * r0 + (B[a + 1] * v + B[c + 1] * w) * r1;
      pos[j + 2] =
        P[a + 2] * v + P[c + 2] * w + (N[a + 2] * v + N[c + 2] * w) * r0 + (B[a + 2] * v + B[c + 2] * w) * r1;
      if (o.glow) glow[start + i] = o.glow(sv[i], av[i], t, i);
    }
  }
}

// ---------- rigid cloud: points in a local frame, placed by origin + basis ----------
export interface Mark {
  tone: number;
  size: number;
}
export class Rigid {
  readonly start: number;
  readonly count: number;
  private readonly local: Float32Array;
  constructor(b: Builder, count: number | "rest", sample: (rand: Rand, out: Vec3, mark: Mark, i: number) => void) {
    const taken = b.take(count);
    this.start = taken.start;
    this.count = taken.count;
    this.local = new Float32Array(this.count * 3);
    const v: Vec3 = [0, 0, 0],
      mark: Mark = { tone: 0.5, size: 1 };
    for (let i = 0; i < this.count; i++) {
      mark.tone = 0.5;
      mark.size = 1;
      sample(b.rand, v, mark, i);
      this.local[i * 3] = v[0];
      this.local[i * 3 + 1] = v[1];
      this.local[i * 3 + 2] = v[2];
      b.tone[this.start + i] = mark.tone;
      b.size[this.start + i] = mark.size * b.jitter();
    }
  }
  place(pos: Float32Array, ox: number, oy: number, oz: number, m: Float64Array, scale = 1) {
    const { local, start, count } = this;
    for (let i = 0; i < count; i++) {
      const x = local[i * 3] * scale,
        y = local[i * 3 + 1] * scale,
        z = local[i * 3 + 2] * scale;
      const j = (start + i) * 3;
      pos[j] = ox + m[0] * x + m[3] * y + m[6] * z;
      pos[j + 1] = oy + m[1] * x + m[4] * y + m[7] * z;
      pos[j + 2] = oz + m[2] * x + m[5] * y + m[8] * z;
    }
  }
}

// ---------- samplers for rigid parts ----------
export function ellipsoid(rand: Rand, out: Vec3, rx: number, ry: number, rz: number, shell = 0.85) {
  const z = rand() * 2 - 1,
    a = rand() * TAU,
    q = Math.sqrt(1 - z * z);
  const r = rand() < shell ? 1 : Math.cbrt(rand());
  out[0] = q * Math.cos(a) * rx * r;
  out[1] = z * ry * r;
  out[2] = q * Math.sin(a) * rz * r;
}
