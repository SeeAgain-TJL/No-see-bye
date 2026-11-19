import * as T from "three";
import { lit, mesh, parametric, rng, v, type Exhibit } from "./tools";

export function tree(): Exhibit {
  const root = new T.Group(),
    random = rng(147),
    bark = lit(0x9f8061, 0.38),
    leaves = lit(0xffffff, 0.16, 0.41);
  const twigs: { joint: T.Group; phase: number; depth: number }[] = [];
  const leafGeo = parametric(5, 6, (u, s) =>
    v(
      (u - 0.5) * Math.sin(Math.PI * s) * 0.19,
      s * 0.26,
      0.05 * Math.sin(s * Math.PI) * (1 - Math.abs(u - 0.5)),
    ),
  );
  const wood = (
    parent: T.Group,
    start: T.Vector3,
    end: T.Vector3,
    r: number,
    r2: number,
  ) => {
    const direction = end.clone().sub(start),
      part = mesh(
        parent,
        new T.CylinderGeometry(r2, r, direction.length(), 9),
        bark,
      );
    part.position.copy(start).lerp(end, 0.5);
    part.quaternion.setFromUnitVectors(v(0, 1, 0), direction.normalize());
  };
  function branch(
    parent: T.Group,
    origin: T.Vector3,
    direction: T.Vector3,
    length: number,
    radius: number,
    depth: number,
  ) {
    const joint = new T.Group();
    parent.add(joint);
    joint.position.copy(origin);
    const bend = direction.clone().multiplyScalar(length * 0.54);
    bend.z += length * 0.09;
    const tip = direction.clone().multiplyScalar(length);
    tip.x += length * (random() - 0.46) * 0.48;
    wood(joint, v(), bend, radius, radius * 0.72);
    wood(joint, bend, tip, radius * 0.76, radius * 0.47);
    if (depth) twigs.push({ joint, phase: origin.x * 2 + random(), depth });
    if (depth === 3) {
      const foliage = new T.InstancedMesh(leafGeo, leaves, 34),
        dummy = new T.Object3D();
      for (let i = 0; i < 34; i++) {
        const a = random() * 6.283,
          r = Math.sqrt(random()) * 0.36;
        dummy.position
          .copy(tip)
          .add(
            v(
              Math.cos(a) * r,
              (random() - 0.53) * 0.22,
              Math.sin(a) * r * 0.78,
            ),
          );
        dummy.rotation.set(random() * 1.5, a, random() * 2.6 - 1.3);
        dummy.scale.setScalar(0.66 + random() * 0.72);
        dummy.updateMatrix();
        foliage.setMatrixAt(i, dummy.matrix);
        foliage.setColorAt(
          i,
          new T.Color().setHSL(
            0.29 + random() * 0.15,
            0.35 + random() * 0.3,
            0.25 + random() * 0.33,
          ),
        );
      }
      joint.add(foliage);
      return;
    }
    const n = depth === 0 ? 5 : 3;
    for (let k = 0; k < n; k++) {
      const a = (k / n + random() * 0.18) * Math.PI * 2;
      const start = tip.clone().multiplyScalar(0.48 + (0.52 * (k + 1)) / n);
      const d = v(
        direction.x * 0.55 + Math.cos(a) * (0.65 + random() * 0.3),
        depth === 0 ? 0.56 + random() * 0.42 : 0.33 + random() * 0.62,
        direction.z * 0.48 + Math.sin(a) * 0.8,
      ).normalize();
      branch(
        joint,
        start,
        d,
        length * (depth === 0 ? 0.76 : 0.64),
        radius * 0.51,
        depth + 1,
      );
    }
  }
  branch(root, v(0, -1, 0), v(-0.22, 1, 0).normalize(), 1.26, 0.21, 0);
  for (let i = 0; i < 9; i++) {
    const a = i * 0.698;
    wood(
      root,
      v(0, -0.88, 0),
      v(Math.cos(a) * (0.55 + 0.16 * random()), -1.12, Math.sin(a) * 0.48),
      0.14,
      0.014,
    );
  }
  root.position.y = -0.23;
  return {
    root,
    animate(t) {
      for (const { joint, phase, depth } of twigs) {
        joint.rotation.z =
          (0.012 + 0.014 * depth) * Math.sin(t * 1.9 + phase - depth * 0.53) +
          0.024 * Math.sin(t * 0.75);
        joint.rotation.x = 0.023 * depth * Math.cos(t * 1.32 + phase);
      }
    },
  };
}
