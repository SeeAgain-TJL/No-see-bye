import * as T from "three";
import { filament, lit, mesh, tau, v, type Exhibit } from "./tools";

function body(
  parent: T.Object3D,
  mat: T.Material,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
) {
  const m = mesh(parent, new T.SphereGeometry(1, 20, 12), mat, x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}
function wingPainting() {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 640;
  const c = canvas.getContext("2d")!;
  c.scale(768, 640);
  const grad = c.createLinearGradient(0, 1, 1, 0);
  grad.addColorStop(0, "#412626");
  grad.addColorStop(0.43, "#ef9b38");
  grad.addColorStop(0.72, "#ffd485");
  grad.addColorStop(1, "#324244");
  c.fillStyle = grad;
  c.fillRect(0, 0, 1, 1);
  c.strokeStyle = "#33383b";
  c.lineCap = "round";
  for (let i = 0; i < 12; i++) {
    const x = 0.24 + i * 0.073,
      y = 0.04 + i * 0.065;
    c.lineWidth = 0.008 + i * 0.0006;
    c.beginPath();
    c.moveTo(0.035, 0.77);
    c.bezierCurveTo(0.33, 0.69, 0.52, 0.48, x, y);
    c.stroke();
  }
  c.lineWidth = 0.032;
  c.beginPath();
  c.moveTo(0.2, 0.1);
  c.bezierCurveTo(0.57, 0.15, 0.81, 0.25, 0.93, 0.56);
  c.stroke();
  for (let i = 0; i < 17; i++) {
    const a = i * 0.37;
    c.fillStyle = i % 3 ? "#fff0bd" : "#d0eee4";
    c.beginPath();
    c.ellipse(
      0.4 + 0.5 * Math.sin(a * 0.48),
      0.13 + 0.46 * (1 - Math.cos(a * 0.48)),
      0.012,
      0.021,
      -a * 0.3,
      0,
      tau,
    );
    c.fill();
  }
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}
function lobe(parent: T.Group, coords: number[][], mat: T.Material) {
  const shape = new T.Shape();
  shape.moveTo(coords[0][0], coords[0][1]);
  for (const c of coords.slice(1))
    shape.bezierCurveTo(c[0], c[1], c[2], c[3], c[4], c[5]);
  shape.closePath();
  const g = new T.ShapeGeometry(shape, 30);
  g.computeBoundingBox();
  const b = g.boundingBox!,
    p = g.attributes.position,
    uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i);
    uv.setXY(
      i,
      (x - b.min.x) / (b.max.x - b.min.x),
      (y - b.min.y) / (b.max.y - b.min.y),
    );
    p.setZ(i, 0.15 * Math.sin(x * 1.6) + 0.04 * y * y);
  }
  g.computeVertexNormals();
  mesh(parent, g, mat);
  filament(
    parent,
    shape
      .getPoints(32)
      .map((p) =>
        v(p.x, p.y, 0.018 + 0.15 * Math.sin(p.x * 1.6) + 0.04 * p.y * p.y),
      ),
    0xf0cf87,
    0.85,
  );
}
export function butterfly(): Exhibit {
  const root = new T.Group(),
    thorax = lit(0x594433),
    silk = new T.MeshStandardMaterial({
      map: wingPainting(),
      metalness: 0.25,
      roughness: 0.4,
      side: T.DoubleSide,
      emissive: 0xa06427,
      emissiveIntensity: 0.17,
    });
  body(root, thorax, 0, 0.03, 0, 0.092, 0.48, 0.094);
  body(root, thorax, 0, 0.37, 0, 0.12, 0.13, 0.12);
  const wings = [-1, 1].map((sign) => {
    const half = new T.Group(),
      fore = new T.Group(),
      hind = new T.Group();
    root.add(half);
    half.scale.x = sign;
    half.add(fore, hind);
    lobe(
      hind,
      [
        [0.03, 0.06],
        [0.28, 0.21, 0.79, 0.16, 1.03, -0.12],
        [1.11, -0.52, 0.8, -0.83, 0.55, -0.73],
        [0.49, -0.76, 0.44, -0.83, 0.39, -0.83],
        [0.16, -0.7, 0.12, -0.29, 0.03, 0.06],
      ],
      silk,
    );
    lobe(
      fore,
      [
        [0.04, 0.19],
        [0.33, 0.54, 1.1, 1.26, 1.52, 1.16],
        [1.65, 0.97, 1.38, 0.38, 1.21, 0.1],
        [0.98, -0.15, 0.58, -0.18, 0.04, -0.04],
        [0.03, 0.06, 0.03, 0.13, 0.04, 0.19],
      ],
      silk,
    );
    filament(
      half,
      [
        v(0, 0.42, 0.01),
        v(0.1, 0.59, 0.03),
        v(0.22, 0.73, 0.07),
        v(0.3, 0.76, 0.09),
      ],
      0xffdc97,
    );
    return { fore, hind };
  });
  return {
    root,
    animate(t) {
      const q = t * 4.65;
      for (const { fore, hind } of wings) {
        fore.rotation.y = -0.48 - 0.49 * Math.sin(q);
        hind.rotation.y = -0.4 - 0.46 * Math.sin(q - 0.37);
      }
      root.rotation.set(
        -0.23,
        0.24 + 0.19 * Math.sin(0.85 * t),
        -0.21 + 0.08 * Math.sin(t),
      );
      root.position.set(
        0.13 * Math.sin(0.75 * t),
        0.11 * Math.cos(q) + 0.1 * Math.sin(0.93 * t),
        0,
      );
    },
  };
}

export function condor(): Exhibit {
  const root = new T.Group(),
    bird = new T.Group(),
    chest = lit(0x725052),
    bronze = lit(0xc48768),
    dark = lit(0x40394a),
    tips = lit(0xeec5a2);
  root.add(bird);
  body(bird, chest, 0, 0, 0.04, 0.23, 0.17, 0.65);
  body(bird, tips, 0, 0.11, 0.52, 0.17, 0.15, 0.21);
  const bill = lit(0xd6a061, 0.2, 0.37),
    eyes = lit(0x241924, 0.11, 0.3);
  body(bird, bill, 0, 0.12, 0.71, 0.09, 0.066, 0.15);
  body(bird, bill, 0, 0.074, 0.817, 0.038, 0.066, 0.04);
  for (const sign of [-1, 1]) {
    body(bird, eyes, sign * 0.136, 0.164, 0.607, 0.023, 0.024, 0.031);
    body(bird, tips, sign * 0.151, 0.173, 0.619, 0.009, 0.009, 0.009);
  }
  function feather(
    parent: T.Group,
    x: number,
    z: number,
    width: number,
    length: number,
    angle: number,
    mat: T.Material,
  ) {
    const shape = new T.Shape();
    shape.moveTo(0, length);
    shape.bezierCurveTo(
      width * 0.75,
      length * 0.72,
      width * 1.18,
      -length * 0.16,
      width * 0.37,
      -length * 0.84,
    );
    shape.quadraticCurveTo(width * 0.12, -length * 1.04, 0, -length);
    shape.bezierCurveTo(
      -width * 0.83,
      -length * 0.51,
      -width * 1.12,
      length * 0.15,
      0,
      length,
    );
    const g = new T.ShapeGeometry(shape, 10);
    g.rotateX(Math.PI / 2);
    const feather = mesh(parent, g, mat, x, 0.004, z);
    feather.rotation.y = angle;
    filament(
      feather,
      [
        v(0, 0.008, length * 0.78),
        v(0, 0.009, 0),
        v(width * 0.08, 0.006, -length * 0.86),
      ],
      0xd6b09a,
      0.47,
    );
    return feather;
  }
  for (let i = -3; i <= 3; i++)
    feather(
      bird,
      i * 0.041,
      -0.6,
      0.068,
      0.39,
      i * 0.105,
      i % 2 ? dark : bronze,
    );
  const wings = [-1, 1].map((sign) => {
    const mirror = new T.Group(),
      arm = new T.Group(),
      hand = new T.Group();
    bird.add(mirror);
    mirror.scale.x = sign;
    mirror.add(arm);
    arm.add(hand);
    hand.position.set(0.85, 0, 0.02);
    body(arm, chest, 0.43, 0, 0, 0.56, 0.083, 0.31);
    for (let i = 0; i < 8; i++)
      feather(
        arm,
        0.14 + i * 0.109,
        -0.19 - i * 0.013,
        0.094,
        0.32,
        0.16 + i * 0.047,
        i % 3 ? bronze : dark,
      );
    body(hand, bronze, 0.25, 0, 0, 0.43, 0.059, 0.23);
    for (let i = 0; i < 8; i++) {
      const a = 0.46 + i * 0.119;
      feather(
        hand,
        0.16 + i * 0.074,
        -0.16 + i * 0.054,
        0.074,
        0.39 + (i < 5 ? i : 8 - i) * 0.029,
        -a,
        i % 3 ? dark : tips,
      );
    }
    return { arm, hand };
  });
  return {
    root,
    animate(t) {
      const q = t * 2.8,
        beat = 0.43 + 0.28 * Math.sin(t * 0.66);
      for (const { arm, hand } of wings) {
        arm.rotation.z = 0.15 + beat * Math.sin(q);
        hand.rotation.z = 0.03 + beat * 0.83 * Math.sin(q - 0.83);
      }
      bird.rotation.set(
        0.52 + 0.09 * Math.sin(t),
        0.73 + 0.23 * Math.sin(t * 0.68),
        -0.22 + 0.2 * Math.sin(t * 0.74),
      );
      bird.position.y = 0.1 * Math.cos(q) + 0.13 * Math.sin(t * 0.64);
    },
  };
}
