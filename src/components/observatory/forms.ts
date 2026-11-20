import { Builder, Rigid, Tube, clamp, ellipsoid, mix, setBasis, type Creature, type Vec3 } from "./kit";

type Paint = (t: number, out: Float32Array, gain: Float32Array) => void;
type Spine = (s: number, t: number, p: Vec3) => void;
const mid = () => 0.67;

export class Form extends Builder implements Creature {
  private parts: Paint[] = [];
  pose(t: number, out: Float32Array, gain: Float32Array) {
    for (const part of this.parts) part(t, out, gain);
  }
  oval(
    share: number | "rest",
    radii: Vec3,
    center: (t: number) => Vec3,
    tone: (p: Vec3, r: number) => number = mid,
    tilt: (t: number) => Vec3 = () => [0, 0, 0],
  ) {
    const points = new Rigid(this, share === "rest" ? share : this.share(share), (r, p, m) => {
      ellipsoid(r, p, ...radii);
      m.tone = clamp(tone(p, r()));
    });
    const basis = new Float64Array(9);
    this.parts.push((t, p) => points.place(p, ...center(t), setBasis(basis, ...tilt(t))));
  }
  tube(
    share: number | "rest",
    spine: Spine,
    profile: (s: number, t: number, r: [number, number]) => void,
    tone: (s: number, a: number) => number = mid,
    up?: Vec3,
  ) {
    const part = new Tube(this, {
      count: share === "rest" ? share : this.share(share),
      spine,
      profile,
      tone,
      up,
      shell: 0.86,
    });
    this.parts.push((t, p, g) => part.update(t, p, g));
  }
  strands(
    share: number | "rest",
    strands: number,
    draw: (k: number, u: number, t: number, p: Vec3) => void,
    tone: (k: number, u: number, r: number) => number = mid,
    fuzz = 0.04,
    glow?: (k: number, u: number, t: number) => number,
  ) {
    const { start, count } = this.take(share === "rest" ? share : this.share(share));
    const along = new Float32Array(count),
      jitter = new Float32Array(count * 3),
      p: Vec3 = [0, 0, 0];
    for (let i = 0; i < count; i++) {
      const k = i % strands,
        u = (along[i] = (Math.floor(i / strands) + this.rand()) / Math.ceil(count / strands));
      this.tone[start + i] = clamp(tone(k, u, this.rand()));
      this.size[start + i] = this.jitter(0.86);
      for (let j = 0; j < 3; j++) jitter[i * 3 + j] = (this.rand() - 0.5) * fuzz;
    }
    this.parts.push((t, out, gain) => {
      for (let i = 0; i < count; i++) {
        const k = i % strands,
          u = along[i],
          j = (start + i) * 3;
        draw(k, u, t, p);
        out[j] = p[0] + jitter[i * 3];
        out[j + 1] = p[1] + jitter[i * 3 + 1];
        out[j + 2] = p[2] + jitter[i * 3 + 2];
        if (glow) gain[start + i] = glow(k, u, t);
      }
    });
  }
}

export function walker(n: number, type: "tiger" | "horse" | "deer" | "bear" | "giraffe") {
  const f = new Form(n, 49 + type.length),
    tiger = type === "tiger",
    bear = type === "bear",
    horse = type === "horse",
    deer = type === "deer",
    tall = type === "giraffe";
  const y = bear || tiger ? -0.36 : tall ? 0.38 : 0.02;
  const height = bear ? 0.53 : tiger ? 0.39 : 0.37,
    width = bear ? 0.46 : tiger ? 0.35 : 0.28;
  const neck = tall ? 1.25 : horse ? 0.69 : deer ? 0.57 : 0.18,
    head = tiger ? 0.31 : bear ? 0.29 : 0.22;
  const gait = (t: number) => t * (horse ? 6.8 : bear ? 3.8 : 5.1),
    bounce = (t: number) => 0.095 * Math.cos(gait(t) * 2);
  const hx = (t: number) => 1.15 + 0.065 * Math.sin(gait(t) + 0.8);
  const hy = (t: number) => y + neck + bounce(t) + 0.06 * Math.sin(gait(t));
  const coat = (s: number, a: number) => {
    if (tiger) return Math.cos(s * 63 + 1.75 * Math.sin(a * 3)) > 0.55 ? 0.11 : Math.cos(a) < -0.61 ? 0.93 : 0.66;
    if (deer) return Math.sin(s * 43 + Math.cos(a * 12)) * Math.cos(a * 14) > 0.77 ? 0.98 : 0.48 + 0.15 * Math.cos(a);
    if (tall)
      return Math.abs(Math.sin(s * 42 + 1.1 * Math.cos(a * 4))) < 0.29 || Math.abs(Math.cos(a * 6 + s * 4)) < 0.2
        ? 0.85
        : 0.31;
    return 0.57 + 0.19 * Math.cos(a);
  };
  f.tube(
    0.36,
    (s, t, p) => {
      p[0] = mix(-1.28, 1.04, s);
      p[1] = y + bounce(t) + 0.08 * Math.sin(Math.PI * s);
      p[2] = 0.044 * Math.sin(s * 4 + gait(t));
    },
    (s, _, r) => {
      const k = Math.max(0.001, Math.sin(Math.PI * s)) ** 0.4;
      r[0] = height * k;
      r[1] = width * k;
    },
    coat,
  );
  f.tube(
    0.128,
    (s, t, p) => {
      p[0] = mix(0.62, hx(t), s);
      p[1] = mix(y + bounce(t), hy(t), s);
      p[2] = 0;
    },
    (s, _, r) => {
      r[0] = mix(width * 0.93, head * 0.65, s);
      r[1] = mix(height * 0.8, head * 0.66, s);
    },
    coat,
    [0, 0, 1],
  );
  f.oval(
    0.117,
    [head * (horse ? 1.42 : 1.14), head, head * 0.88],
    (t) => [hx(t), hy(t), 0],
    (p) => (tiger && Math.sin(p[0] * 41 + p[1] * 7) > 0.5 ? 0.22 : 0.7),
  );
  f.oval(
    0.053,
    [head * (horse ? 1.18 : 0.98), head * 0.52, head * 0.66],
    (t) => [hx(t) + head * (horse ? 1.12 : 0.74), hy(t) - head * (horse ? 0.45 : 0.24), 0],
    (p) => (p[0] > head * 0.64 ? 0.15 : 0.92),
  );
  for (const side of [-1, 1]) {
    f.oval(
      0.018,
      [head * 0.33, head * (tiger || bear ? 0.39 : 0.68), head * 0.25],
      (t) => [hx(t) - head * 0.47, hy(t) + head * 0.83, side * head * 0.65],
      (p) => (p[0] > 0.03 ? 0.88 : 0.32),
      () => [0, 0, side * 0.25],
    );
    f.oval(
      0.004,
      [0.045, 0.042, 0.023],
      (t) => [hx(t) + head * 0.39, hy(t) + head * 0.19, side * head * 0.86],
      () => 0.98,
    );
    for (const front of [-1, 1])
      f.tube(
        0.058,
        (s, t, p) => {
          const a = gait(t) + side * 1.57 + (front < 0 ? (tall ? 0.58 : Math.PI) : 0),
            lift = Math.max(0, Math.cos(a));
          const x = front * 0.79 + side * 0.09,
            foot = x + Math.sin(a) * (horse ? 0.49 : 0.32),
            knee = mix(x, foot, 0.49) + (front < 0 ? -0.21 : 0.15) * lift;
          p[0] = s < 0.54 ? mix(x, knee, s / 0.54) : mix(knee, foot, (s - 0.54) / 0.46);
          p[1] = mix(y + bounce(t) - height * 0.36, -1.31 + lift * (horse ? 0.39 : 0.23), s);
          p[2] = side * (width * 0.73 + 0.046 * s);
        },
        (s, _, r) => {
          r[0] = mix(bear ? 0.22 : 0.165, bear ? 0.085 : 0.049, clamp(s * 1.48)) + 0.036 * s ** 9;
          r[1] = r[0] * 0.84;
        },
        (s, a) => (s > 0.92 ? 0.19 : coat(s * 0.55, a)),
        [0, 0, 1],
      );
  }
  if (deer || tall)
    f.strands(
      0.052,
      deer ? 32 : 12,
      (k, u, t, p) => {
        const side = k % 2 ? 1 : -1,
          v = Math.floor(k / 2) / (deer ? 15 : 5),
          joint = v > 0.25 ? v * 0.53 : 0,
          s = mix(joint, 1, u);
        p[0] = hx(t) - 0.085 - s * (deer ? 0.48 : 0.12) + (v > 0.25 ? u * (0.76 - v * 0.37) : 0);
        p[1] = hy(t) + head * 0.72 + s * (deer ? 0.53 : 0.19) + (deer && v > 0.25 ? u * 0.18 : 0);
        p[2] = side * (0.119 + s * (deer ? 0.49 : 0.048) + u * v * 0.11);
      },
      () => 0.87,
      0.065,
    );
  if (horse)
    f.strands(
      0.05,
      47,
      (k, u, t, p) => {
        const v = k / 46;
        p[0] = mix(0.44, hx(t) - 0.13, v) - u * (0.23 + 0.18 * Math.sin(v * 3));
        p[1] = mix(y + bounce(t) + 0.23, hy(t) + 0.16, v) - u * 0.41;
        p[2] = 0.13 + u * (0.14 + 0.13 * Math.sin(t * 6 - v * 4 + u * 3));
      },
      (_, u) => mix(0.3, 0.81, u),
      0.065,
    );
  f.tube(
    "rest",
    (s, t, p) => {
      p[0] = -1.06 - s * (bear ? 0.27 : deer || tall ? 0.38 : 1.03);
      p[1] = y + bounce(t) + s * (tiger ? 0.65 * s - 0.42 : horse ? -0.67 * s : -0.23);
      p[2] = s * 0.35 * Math.sin(gait(t) * 0.68 - s * 4);
    },
    (s, _, r) => {
      r[0] = (horse ? 0.125 : 0.074) * (1 - s * 0.78);
      r[1] = r[0] * 0.82;
    },
    horse ? (s) => 0.3 + 0.46 * s : coat,
  );
  return f;
}
