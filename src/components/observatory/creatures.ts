import type { ThemeName } from "@/lib/themes";
import { Form, walker } from "./forms";
import { TAU, fract, mix, rng, type Species, type Vec3 } from "./kit";

const sin = Math.sin,
  cos = Math.cos;
function whale(n: number) {
  const f = new Form(n, 51),
    wave = (x: number, t: number) => 0.24 * sin(t * 2.5 - x * 1.49) * (0.24 + 0.36 * Math.abs(x));
  f.tube(
    0.58,
    (s, t, p) => {
      p[0] = mix(-2.17, 1.66, s);
      p[1] = 0.12 + wave(p[0], t);
      p[2] = 0.06 * sin(t * 1.4 + s * 4);
    },
    (s, _, r) => {
      const k = sin(Math.PI * s ** 1.42) ** 0.61;
      r[0] = 0.54 * k + 0.047;
      r[1] = 0.56 * k + 0.031;
    },
    (s, a) => (cos(a) < -0.32 ? (cos(a * 27) > 0.28 && s > 0.57 ? 0.61 : 0.93) : 0.43 + 0.25 * cos(a)),
  );
  for (const side of [-1, 1]) {
    f.strands(
      0.085,
      100,
      (k, u, t, p) => {
        const v = k / 99;
        p[0] = -2.12 + 0.22 * u - 0.47 * u * u + (v - 0.5) * (0.5 * (1 - u * u) + 0.014);
        p[1] = 0.15 + wave(-2.15, t) + u * 0.31 * sin(t * 2.5 + 2.9) + 0.18 * u * u;
        p[2] = side * u * 1.0;
      },
      (_, u, r) => 0.58 + 0.26 * u + 0.12 * r,
      0.05,
    );
    f.strands(
      0.1,
      102,
      (k, u, t, p) => {
        p[0] = 0.58 - 0.82 * u + (k / 101 - 0.5) * (0.47 * (1 - u * u) + 0.019);
        p[1] = 0.07 + wave(0.58, t) - (0.48 + 0.31 * sin(t * 2.5 - u * 2)) * u;
        p[2] = side * (0.33 + 1.22 * u - 0.18 * u ** 3);
      },
      (k, u) => (k % 16 < 3 ? 0.96 : 0.55 + 0.27 * u),
      0.05,
    );
    f.oval(
      0.004,
      [0.046, 0.041, 0.028],
      (t) => [1.29, 0.15 + wave(1.29, t), side * 0.465],
      () => 0.99,
    );
  }
  f.strands(
    "rest",
    27,
    (k, u, t, p) => {
      p[0] = -0.48 - 0.32 * u + k * 0.013 * (1 - u);
      p[1] = 0.47 + wave(-0.48, t) + u * 0.28;
      p[2] = (k / 27 - 0.5) * 0.16 * (1 - u);
    },
    () => 0.68,
    0.07,
  );
  return f;
}
function jelly(n: number) {
  const f = new Form(n, 21),
    drift = (t: number) => 0.28 * sin(t * 1.65),
    squeeze = (t: number) => 1 + 0.2 * cos(t * 3.45);
  f.strands(
    0.54,
    179,
    (k, u, t, p) => {
      const a = (k / 179) * TAU,
        r = 1.11 * sin(u * 1.74) * squeeze(t) * (1 + 0.033 * sin(a * 19 + t * 3) * u ** 4);
      p[0] = r * cos(a);
      p[1] = 0.47 + drift(t) + (0.96 * cos(u * 1.74)) / squeeze(t);
      p[2] = r * sin(a);
    },
    (k, u, r) => (k % 13 < 2 || u > 0.91 ? 0.84 + 0.13 * r : 0.41 + 0.34 * r),
    0.046,
  );
  f.strands(
    0.27,
    47,
    (k, u, t, p) => {
      const a = (k / 47) * TAU,
        r = 1.08 * (1 + 0.2 * cos((t - u * 0.19) * 3.45)) - 0.19 * u;
      p[0] = r * cos(a) + 0.35 * u * sin(t * 2.4 - u * 7 + a);
      p[1] = 0.34 + drift(t) - (1.24 + 0.76 * fract(k * 0.37)) * u;
      p[2] = r * sin(a) + 0.26 * u * cos(t * 1.9 - u * 6 + a);
    },
    (k, u) => (k % 6 === 0 ? 0.91 - 0.31 * u : 0.66 - 0.38 * u),
    0.045,
  );
  f.strands(
    "rest",
    63,
    (k, u, t, p) => {
      const a = ((k % 5) / 5) * TAU + 0.6 * u,
        r = 0.28 + 0.16 * sin(u * 12 + k * 0.54 - t * 2);
      p[0] = cos(a) * r;
      p[1] = 0.47 + drift(t) - 1.54 * u;
      p[2] = sin(a) * r;
    },
    (_, u, r) => 0.64 + 0.14 * (1 - u) + r * 0.2,
    0.19,
  );
  return f;
}
function octopus(n: number) {
  const f = new Form(n, 56),
    bob = (t: number) => 0.17 * sin(t * 2.42);
  f.oval(
    0.31,
    [0.61, 0.78, 0.55],
    (t) => [-0.15, 0.65 + bob(t), 0],
    (p, r) => 0.54 + 0.23 * r + 0.16 * p[1],
    (t) => [0, 0.14 * sin(t * 2), 0],
  );
  for (const side of [-1, 1])
    f.oval(
      0.008,
      [0.17, 0.11, 0.09],
      (t) => [0.23, 0.48 + bob(t), side * 0.418],
      (p) => (Math.abs(p[1]) < 0.024 ? 0.13 : 0.91),
    );
  const arm = (k: number, s: number, t: number, p: Vec3) => {
    const a = (k / 8) * TAU + s * (0.54 * cos(k * 4) + 1.26 * sin(s * 3.5 - t * 1.91 + k * 0.57)),
      r = 0.26 + 1.85 * s - 0.36 * s ** 6;
    p[0] = r * cos(a) - 0.14;
    p[1] = 0.41 + bob(t) - 1.43 * s + 0.78 * s ** 4 + 0.62 * s * sin(t * 2.3 - s * 6 + k * 0.71);
    p[2] = 0.81 * r * sin(a);
  };
  for (let k = 0; k < 8; k++)
    f.tube(
      0.067,
      (s, t, p) => arm(k, s, t, p),
      (s, _, r) => {
        r[0] = 0.177 * (1 - s) + 0.012;
        r[1] = r[0] * 0.81;
      },
      (s, a) => (cos(a) < -0.49 ? 0.91 : 0.56 - 0.16 * s),
    );
  f.strands(
    "rest",
    160,
    (k, u, t, p) => {
      const s = 0.12 + (0.82 * Math.floor(k / 8)) / 19;
      arm(k % 8, s, t, p);
      const r = 0.066 * (1 - 0.74 * s);
      p[0] += r * cos(u * TAU);
      p[1] -= 0.16 * (1 - s) + 0.027;
      p[2] += r * sin(u * TAU);
    },
    () => 0.96,
    0.027,
  );
  return f;
}
function wings(n: number, eagle: boolean) {
  const f = new Form(n, eagle ? 94 : 29),
    hz = eagle ? 4.6 : 7.8;
  const beat = (t: number) => sin(t * hz) * (eagle ? 0.58 + 0.21 * sin(t * 1.14) : 0.85),
    lift = (t: number) => 0.14 * sin(t * hz + 1.2);
  f.oval(
    0.121,
    eagle ? [0.72, 0.27, 0.25] : [0.68, 0.108, 0.105],
    (t) => [0, lift(t), 0],
    (_, r) => 0.4 + 0.42 * r,
  );
  f.oval(
    0.075,
    eagle ? [0.28, 0.22, 0.2] : [0.17, 0.109, 0.11],
    (t) => [0.64, lift(t) + 0.11, 0],
    () => 0.89,
  );
  for (const side of [-1, 1]) {
    f.strands(
      0.306,
      154,
      (k, u, t, p) => {
        const v = k / 153,
          d = beat(t - u * 0.08) - u * (eagle ? 0.04 : 0.19),
          s = u * (eagle ? 2.43 : 1.92),
          edge = eagle
            ? 0.52 - 0.92 * u ** 1.34 - 0.24 * u ** 7
            : 0.49 + 0.77 * sin(Math.PI * u * 0.81) - 0.57 * u ** 6;
        const width =
          (eagle ? 1.05 + 0.23 * sin(Math.PI * u) : 0.76 + 1.27 * sin(Math.PI * u ** 0.72)) * (1 - u) ** 0.42;
        const tip = eagle ? Math.max(0, cos(v * TAU * 6)) ** 6 * Math.max(0, u - 0.58) * 0.7 : 0;
        p[0] = edge - v * width - tip;
        p[1] = lift(t) + s * sin(d) - v * 0.13;
        p[2] = side * (0.12 + s * cos(d) + tip);
      },
      (k, u, r) => {
        const v = k / 153;
        if (eagle) return u > 0.68 ? 0.61 + 0.26 * Math.abs(cos(v * 23)) : 0.31 + 0.36 * r + (v < 0.18 ? 0.15 : 0);
        const eye = Math.hypot((u - 0.75) * 3.2, v - 0.64);
        return eye < 0.13 || (eye > 0.26 && eye < 0.36)
          ? 0.96
          : Math.abs(sin(v * 25 + u * 2.8)) < 0.22
            ? 0.39
            : 0.57 + 0.29 * r;
      },
      0.051,
    );
    f.strands(
      0.068,
      67,
      (k, u, t, p) => {
        const v = k / 66,
          s = u * (1.18 - 0.29 * v);
        p[0] = eagle ? -0.4 - u * (0.74 - 0.11 * v) : -0.16 - 0.91 * v * sin(Math.PI * u ** 0.61) - 0.59 * u;
        p[1] = lift(t) + (eagle ? 0.11 * sin(t * hz - 0.6) * u : s * sin(beat(t - 0.061))) - 0.14 * u;
        p[2] = side * (0.11 + (eagle ? 0.38 * v * u : s * cos(beat(t - 0.061))));
      },
      (k, u) => (k % 16 < 3 ? 0.92 : 0.59 + 0.22 * u),
      0.052,
    );
  }
  f.strands(
    "rest",
    18,
    (k, u, t, p) => {
      p[0] = 0.79 + u * (eagle ? 0.26 : 0.59);
      p[1] = lift(t) + 0.12 + u * (eagle ? -0.16 : 0.23);
      p[2] = (k % 2 ? 1 : -1) * (0.04 + (eagle ? 0.031 : 0.27) * u);
    },
    () => 0.95,
    0.052,
  );
  return f;
}
function penguin(n: number) {
  const f = new Form(n, 77),
    sway = (t: number) => 0.17 * sin(t * 4.5);
  f.oval(
    0.48,
    [0.43, 0.88, 0.46],
    (t) => [0, -0.19, sway(t) * 0.58],
    (p) => (p[0] > 0.12 ? 0.94 : 0.27 + 0.14 * (p[1] + 0.88)),
    (t) => [0, 0, sway(t)],
  );
  f.oval(
    0.21,
    [0.37, 0.34, 0.34],
    (t) => [0.065, 0.78 + 0.044 * sin(t * 4.5), sway(t)],
    (p) => (p[0] > 0.06 && p[1] < -0.06 ? 0.72 : 0.32),
  );
  f.oval(
    0.05,
    [0.22, 0.054, 0.092],
    (t) => [0.42, 0.73 + 0.044 * sin(t * 4.5), sway(t)],
    () => 0.72,
  );
  for (const side of [-1, 1]) {
    f.tube(
      0.075,
      (s, t, p) => {
        p[0] = -0.09 - 0.15 * s;
        p[1] = 0.38 - (0.84 + 0.21 * sin(t * 4.5 + side)) * s;
        p[2] = side * (0.38 + s * (0.25 + 0.22 * sin(t * 4.5 + side))) + sway(t) * 0.61;
      },
      (s, _, r) => {
        r[0] = 0.133 * (1 - s) + 0.03;
        r[1] = 0.085 * (1 - s) + 0.012;
      },
      () => 0.42,
      [1, 0, 0],
    );
    f.oval(
      side === 1 ? "rest" : 0.05,
      [0.21, 0.085, 0.112],
      (t) => [
        0.15 + 0.17 * sin(t * 4.5 + side * 1.57),
        -1.19 + 0.15 * Math.max(0, sin(t * 4.5 + side * 1.57)),
        side * 0.23,
      ],
      () => 0.71,
    );
  }
  return f;
}

function tree(n: number) {
  const f = new Form(n, 84),
    rand = rng(723),
    branches: { a: Vec3; b: Vec3; r: number }[] = [],
    crowns: Vec3[] = [];
  function branch(a: Vec3, b: Vec3, r: number, depth: number, angle: number) {
    branches.push({ a, b, r });
    if (!depth) {
      crowns.push(b);
      return;
    }
    for (let i = 0; i < (depth === 4 ? 5 : 3); i++) {
      const z = angle + i * 2.39 + 0.28 * rand(),
        k = 0.49 + 0.108 * i,
        span = (0.39 + 0.28 * rand()) * (0.45 + 0.23 * depth);
      const a2 = a.map((v, j) => mix(v, b[j], k)) as Vec3;
      branch(
        a2,
        [
          a2[0] + span * cos(z) + (b[0] - a[0]) * 0.31,
          a2[1] + span * (0.62 + 0.49 * rand()),
          a2[2] + span * sin(z) + (b[2] - a[2]) * 0.22,
        ],
        r * 0.51,
        depth - 1,
        z,
      );
    }
  }
  branch([0, -1.31, 0], [0.1, 0.89, 0], 0.21, 4, 0.7);
  const pose = (x: number, y: number, z: number, t: number, p: Vec3) => {
    p[0] = x + 0.064 * (y + 1.31) ** 2 * sin(t * 2.5 - y * 1.34 + z);
    p[1] = y;
    p[2] = z + 0.045 * (y + 1.31) ** 2 * cos(t * 2 - y);
  };
  f.strands(
    0.47,
    1296,
    (k, u, t, p) => {
      const { a, b, r } = branches[k % 7 < 2 ? 0 : 1 + Math.floor(fract(k * 0.618) * (branches.length - 1))],
        theta = k * 2.39996;
      pose(
        mix(a[0], b[0], u) + r * cos(theta) * (1 - u * 0.65),
        mix(a[1], b[1], u),
        mix(a[2], b[2], u) + r * sin(theta) * (1 - u * 0.65),
        t,
        p,
      );
    },
    (k, u, r) => (k % 7 < 2 ? 0.16 + 0.19 * r : 0.37 + 0.22 * r),
    0.048,
  );
  f.strands(
    "rest",
    1037,
    (k, u, t, p) => {
      const [x, y, z] = crowns[k % crowns.length],
        a = k * 2.39996,
        d = k % 13 === 0 ? fract(t * 0.26 + u + k * 0.64) : 0;
      pose(x + 0.21 * cos(a) * u + 0.65 * d, y + 0.36 * (u - 0.5) - d * 2.15, z + 0.23 * sin(a) * u, t, p);
    },
    (_, u, r) => 0.57 + 0.4 * r,
    0.15,
    (k, u, t) => (k % 13 === 0 ? -0.82 * fract(t * 0.26 + u + k * 0.64) : 0),
  );
  return f;
}
function dandelion(n: number) {
  const f = new Form(n, 36),
    lean = (t: number) => 0.23 * sin(t * 2.55);
  f.tube(
    0.13,
    (u, t, p) => {
      p[0] = lean(t) * u * u;
      p[1] = mix(-1.3, 0.27, u);
      p[2] = 0.11 * u * u * sin(t * 1.8);
    },
    (u, _, r) => {
      r[0] = r[1] = mix(0.054, 0.024, u);
    },
    () => 0.43,
    [1, 0, 0],
  );
  f.strands(
    "rest",
    1160,
    (k, u, t, p) => {
      const id = k % 80,
        spoke = Math.floor(k / 80),
        y = 0.015 + (0.985 * id) / 79,
        s = Math.sqrt(1 - y * y),
        a = id * 2.39996;
      const age = id % 4 === 0 ? Math.max(0, fract(t * 0.19 + id * 0.618) - 0.56) * 2.27 : 0;
      const v = spoke === 0 ? u * 0.96 : 0.87 + 0.17 * u,
        r = spoke === 0 ? 0 : 0.21 * u,
        spin = (spoke / 14) * TAU + age * 5;
      p[0] = lean(t) + v * s * cos(a) + r * cos(spin) + age * (1.57 + 0.29 * cos(id));
      p[1] = 0.26 + v * y + r * s * sin(spin) * 0.63 + age * (0.62 + 0.28 * sin(t * 1.9 + id));
      p[2] = 0.11 * sin(t * 1.8) + v * s * sin(a) + r * sin(spin) + age * 0.61 * cos(id);
    },
    (k, u, r) => (k < 80 ? 0.48 : 0.71) + 0.23 * r + 0.048 * u,
    0.031,
  );
  return f;
}
function snow(n: number) {
  const f = new Form(n, 23);
  f.strands(
    "rest",
    6 * 53,
    (k, u, t, p) => {
      const g = Math.floor(k / 6),
        a = ((k % 6) * TAU) / 6 + 0.27 * sin(t * 1.27),
        joint = g >= 8 ? 0.32 + Math.floor((g - 8) / 9) * 0.25 : 0;
      const theta = a + (g >= 8 ? ((g % 2 ? 1 : -1) * Math.PI) / 3 : 0),
        length = g >= 8 ? 0.61 - joint * 0.19 : 1.67,
        b = g * 2.39996,
        r = 0.021 + 0.037 * (1 - u);
      p[0] = cos(a) * joint * 1.5 + cos(theta) * length * u + r * cos(b);
      p[1] = sin(a) * joint * 1.5 + sin(theta) * length * u + r * sin(b);
      p[2] = 0.068 * cos(b) + 0.044 * sin(t * 2.7 - u * 8 + a);
    },
    (_, u, r) => 0.52 + 0.19 * u + 0.26 * r,
    0.043,
    (k, u, t) => 0.81 * Math.max(0, sin(t * 4.3 - u * 9 + (k % 6) * 0.32)) ** 6,
  );
  return f;
}
function falls(n: number) {
  const f = new Form(n, 34);
  f.strands(
    0.27,
    340,
    (k, u, _, p) => {
      const a = k % 3,
        side = k % 2 ? 1 : -1;
      p[0] = -0.47 + a * 0.44 + side * (0.28 + u * 0.66);
      p[1] = 0.91 - a * 0.74 - 0.41 * u + 0.37 * fract(k * 0.618);
      p[2] = a * 0.32 - 0.56 + (fract(k * 0.414) - 0.5) * (0.7 + 0.41 * u);
    },
    (_, u, r) => 0.06 + 0.22 * r + 0.05 * u,
    0.14,
  );
  f.strands(
    0.58,
    192,
    (k, u, t, p) => {
      const level = k % 3,
        v = fract(t * (0.53 + (k % 13) * 0.018) + u),
        w = (Math.floor(k / 3) / 63 - 0.5) * (0.63 + 0.17 * level);
      p[0] = -0.71 + level * 0.45 + w + 0.46 * v;
      p[1] = 1.24 - level * 0.74 - 0.77 * v ** 1.65 + 0.035 * sin(k + v * 15);
      p[2] = -0.49 + level * 0.34 + 0.31 * v + 0.15 * w + 0.035 * sin(k * 0.79 + v * 6);
    },
    (_, u, r) => 0.55 + 0.16 * u + 0.26 * r,
    0.063,
  );
  f.strands(
    "rest",
    129,
    (k, u, t, p) => {
      const a = k * 2.39996,
        v = fract(t * 0.68 + u + k * 0.17),
        l = k % 3;
      p[0] = -0.24 + l * 0.45 + cos(a) * v * 0.76;
      p[1] = 0.46 - l * 0.74 + sin(Math.PI * v) * (0.11 + fract(k * 0.37) * 0.37);
      p[2] = l * 0.34 - 0.17 + sin(a) * v * 0.45;
    },
    () => 0.94,
    0.1,
    (k, u, t) => -0.78 * fract(t * 0.68 + u + k * 0.17),
  );
  return f;
}

const amber = [0x482524, 0xb76a3f, 0xffb95e, 0xfff4dc];
const leaf = [0x174938, 0x479959, 0xaad873, 0xfaffd9];
const ice = [0x163655, 0x598cb8, 0xa2d8ff, 0xf6ffff];
const sea = [0x143857, 0x248eb7, 0x61e0f1, 0xedffff];
function species(
  id: string,
  name: string,
  latin: string,
  note: string,
  palette: number[],
  floor: Species["floor"],
  speed: number,
  build: Species["build"],
  view?: Species["view"],
): Species {
  return { id, name, latin, note, palette, floor, speed, build, view };
}
export const habitats: Record<ThemeName, readonly Species[]> = {
  forest: [
    species(
      "tiger",
      "东北虎",
      "Panthera tigris altaica",
      "琥珀皮毛 · 深色横纹",
      amber,
      "walk",
      0.95,
      (n) => walker(n, "tiger"),
      { yaw: 0.13, y: 0.27 },
    ),
    species("deer", "梅花鹿", "Cervus nippon", "白斑与分枝鹿角", amber, "walk", 1.1, (n) => walker(n, "deer"), {
      yaw: 0.28,
    }),
    species("tree", "古树", "Forest canopy", "林冠随风低伏，落叶穿过枝桠", leaf, "ring", 0, tree, {
      scale: 0.77,
      y: -0.18,
    }),
  ],
  grassland: [
    species(
      "horse",
      "草原骏马",
      "Equus ferus caballus",
      "四蹄交替，鬃尾随步态舒展",
      amber,
      "walk",
      1.42,
      (n) => walker(n, "horse"),
      { yaw: 0.22 },
    ),
    species(
      "butterfly",
      "凤蝶",
      "Papilionidae",
      "鳞翅扇动，翅脉浮现",
      [0x3f2146, 0x9259aa, 0xee90bb, 0xffe09c],
      "none",
      0,
      (n) => wings(n, false),
      { yaw: -0.8, pitch: 0.86 },
    ),
    species("dandelion", "蒲公英", "Taraxacum", "冠毛脱离花托，随风远行", leaf, "ring", 0, dandelion, { x: -0.14 }),
  ],
  iceberg: [
    species("bear", "北极熊", "Ursus maritimus", "宽掌缓步踏过冰面", ice, "walk", 0.66, (n) => walker(n, "bear"), {
      yaw: 0.2,
      y: 0.3,
    }),
    species(
      "penguin",
      "帝企鹅",
      "Aptenodytes forsteri",
      "左右摇摆，脚蹼交替前移",
      [0x163a60, 0x5589b5, 0xffc983, 0xf7ffff],
      "walk",
      0.45,
      penguin,
      { yaw: -0.37 },
    ),
    species("snow", "雪晶", "Hexagonal ice crystal", "六重对称，晶枝流光", ice, "none", 0, snow, { scale: 0.86 }),
  ],
  rift: [
    species(
      "eagle",
      "白头海雕",
      "Haliaeetus leucocephalus",
      "主翼压下，翼尖随后回弹",
      [0x62352d, 0xbe754b, 0xeec190, 0xfff5e6],
      "none",
      0,
      (n) => wings(n, true),
      { scale: 0.91, yaw: -0.85, pitch: 0.49 },
    ),
    species("giraffe", "长颈鹿", "Giraffa", "网纹与同侧摆步", amber, "walk", 0.75, (n) => walker(n, "giraffe"), {
      scale: 0.83,
      y: -0.18,
      yaw: 0.23,
    }),
    species(
      "falls",
      "岩间叠瀑",
      "Cascading water",
      "水流三叠，岩台扬起水雾",
      [0x754341, 0xa17d6f, 0x7fd6ec, 0xf7ffff],
      "ring",
      0,
      falls,
      { yaw: -0.17 },
    ),
  ],
  ocean: [
    species("whale", "座头鲸", "Megaptera novaeangliae", "游动时长胸鳍展开，尾鳍上下推进", sea, "none", 0, whale, {
      yaw: 0.22,
      pitch: 0.41,
    }),
    species(
      "jelly",
      "海月水母",
      "Aurelia aurita",
      "伞体收缩后，触须逐次舒展",
      [0x13537c, 0x49a9da, 0xb29bff, 0xffeaff],
      "none",
      0,
      jelly,
      { scale: 0.86 },
    ),
    species(
      "octopus",
      "章鱼",
      "Octopus",
      "八条腕足卷动，显露吸盘",
      [0x472346, 0xb34d87, 0xef8da0, 0xffdfc2],
      "none",
      0,
      octopus,
    ),
  ],
};
