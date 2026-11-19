import type { ThemeName } from "@/lib/themes";

type Color = readonly [number, number, number];
type Point = readonly [number, number, number, number];
type Random = () => number;
type ThemeScene = {
  name: string;
  shader: number;
  background: Color;
  haze: Color;
  signal: Color;
  accent: Color;
  light: Color;
  sample: (random: Random, index: number) => Point;
};

const turn = Math.PI * 2;
const treePositions = [[-.12, .15, 1.35], [-1.08, -.14, .97], [.98, -.29, 1.11], [-1.58, -.69, .74], [1.55, -.97, .81], [-.75, -.96, .67], [.36, -.94, .74]] as const;
const iceberg = [[-1.79, -.62, .13], [-1.0, -.7, 1.10], [.75, -.76, 1.13], [1.75, -.65, .12], [.61, -.57, -1.11], [-.90, -.56, -1.19], [-.53, 1.16, -.23], [.28, .52, .48], [1.03, .77, -.25], [-1.25, .33, .25]] as const;
const icebergFaces = [[0, 1, 9], [1, 2, 7], [1, 7, 9], [2, 3, 8], [2, 7, 8], [3, 4, 8], [4, 5, 6], [4, 6, 8], [5, 0, 9], [5, 9, 6], [6, 7, 9], [6, 7, 8]] as const;

function forest(random: Random, index: number): Point {
  if (index % 10 < 2) {
    const x = (random() - .5) * 4.15;
    const z = (random() - .5) * 2.9;
    return [x, -.81 + Math.sin(x * 1.8 + z) * .085 + random() * .12, z, random() * .44];
  }
  const [treeX, treeZ, height] = treePositions[index % treePositions.length];
  const level = Math.floor(random() * 5);
  const y = (level + random() ** 1.25) / 5;
  const edge = Math.max(.04, (1 - y) * .66);
  const angle = random() * turn;
  const radius = edge * (.15 + random() ** .48 * .85) * (1 - (y * 5 % 1) * .48);
  return [treeX + Math.cos(angle) * radius * height, -.76 + y * height * 1.68, treeZ + Math.sin(angle) * radius, random()];
}

function ice(random: Random, index: number): Point {
  const [a, b, c] = icebergFaces[index % icebergFaces.length].map(point => iceberg[point]);
  const factor = random() ** .5;
  const fraction = index % 7 < 2 ? random() * .026 : random();
  const u = 1 - factor;
  const v = factor * fraction;
  const w = factor - v;
  const x = a[0] * u + b[0] * v + c[0] * w;
  const y = a[1] * u + b[1] * v + c[1] * w;
  const z = a[2] * u + b[2] * v + c[2] * w;
  return [x, y, z, Math.min(1, .38 + y * .15 + random() * .44)];
}

function grass(random: Random, index: number): Point {
  const strip = index % 8;
  const x = (random() - .5) * 4.25;
  const z = (strip - 3.5) * .36 + (random() - .5) * .25;
  const crest = Math.sin(x * 1.43 + z * .83) * .27 + Math.cos(z * 2.19) * .19;
  const tip = random() ** 2;
  return [x + tip * .14, crest + z * .19 + tip * .225 - .23, z, .18 + tip * .82];
}

function rift(random: Random, index: number): Point {
  const z = (random() - .5) * 3.24;
  const direction = index % 2 ? 1 : -1;
  const cut = .16 + Math.sin(z * 1.62) * .16 + Math.cos(z * 2.59) * .12;
  const rim = random() ** 1.43;
  const terrace = Math.floor(rim * 7) / 7;
  const x = cut + direction * (.16 + rim * 1.78);
  const y = Math.min(.91, -0.66 + terrace * 2.36) + Math.cos(z * 1.92 + direction) * .17 + random() * .06;
  return [x, y, z, index % 11 < 2 ? .83 + random() * .16 : rim * .76];
}

function ocean(random: Random, index: number): Point {
  const x = (random() - .5) * 4.25;
  const z = ((index % 7) - 3) * .47 + (random() - .5) * .39;
  const foam = random();
  return [x, Math.cos(x * 1.17 + z) * .09 + Math.sin(z * 3.4 + x * .49) * .27 - .08, z, foam ** .74];
}

export const adminThemeScenes: Record<ThemeName, ThemeScene> = {
  forest: { name: "林间微光", shader: 0, background: [.025, .057, .043], haze: [.07, .17, .109], signal: [.643, .89, .737], accent: [.929, .784, .541], light: [.73, .88, .6], sample: forest },
  iceberg: { name: "冰脊折光", shader: 1, background: [.024, .055, .095], haze: [.092, .151, .278], signal: [.671, .906, 1], accent: [.831, .722, .98], light: [.89, .968, 1], sample: ice },
  grassland: { name: "草坡风场", shader: 2, background: [.047, .069, .032], haze: [.154, .184, .072], signal: [.863, .906, .624], accent: [.957, .733, .486], light: [.96, .91, .67], sample: grass },
  rift: { name: "峡谷余辉", shader: 3, background: [.080, .034, .068], haze: [.204, .089, .124], signal: [1, .741, .604], accent: [.965, .671, .769], light: [1, .801, .586], sample: rift },
  ocean: { name: "深海涌浪", shader: 4, background: [.015, .053, .081], haze: [.047, .164, .219], signal: [.580, .894, .898], accent: [.949, .796, .612], light: [.677, .935, .974], sample: ocean },
};
