import * as T from "three";

export const tau = Math.PI * 2;
export const v = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
export type Exhibit = { root: T.Group; animate: (time: number) => void };
export function rng(seed: number) {
  return () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
}
export function lit(color: number, metalness = 0.32, roughness = 0.36) {
  return new T.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    side: T.DoubleSide,
  });
}
export function mesh(
  parent: T.Object3D,
  geo: T.BufferGeometry,
  mat: T.Material,
  x = 0,
  y = 0,
  z = 0,
) {
  const obj = new T.Mesh(geo, mat);
  obj.position.set(x, y, z);
  parent.add(obj);
  return obj;
}
export function filament(
  parent: T.Object3D,
  points: T.Vector3[],
  color: number,
  opacity = 0.7,
) {
  const geo = new T.BufferGeometry().setFromPoints(points);
  const line = new T.Line(
    geo,
    new T.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    }),
  );
  parent.add(line);
  return line;
}
export function parametric(
  cols: number,
  rows: number,
  point: (u: number, v: number) => T.Vector3,
) {
  const verts: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= cols; i++) {
      verts.push(...point(i / cols, j / rows).toArray());
      uv.push(i / cols, j / rows);
      if (i < cols && j < rows) {
        const a = j * (cols + 1) + i,
          b = a + cols + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}
export function disposeTree(root: T.Object3D) {
  const mats = new Set<T.Material>(),
    geos = new Set<T.BufferGeometry>(),
    maps = new Set<T.Texture>();
  root.traverse((obj) => {
    const o = obj as T.Mesh;
    if (obj instanceof T.InstancedMesh) obj.dispose();
    if (o.geometry) geos.add(o.geometry);
    if (o.material)
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        mats.add(m);
  });
  mats.forEach((m) => {
    if ("map" in m && m.map instanceof T.Texture) maps.add(m.map);
    m.dispose();
  });
  maps.forEach((t) => t.dispose());
  geos.forEach((g) => g.dispose());
}
