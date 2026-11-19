import * as T from "three";
import { filament, mesh, parametric, tau, v, type Exhibit } from "./tools";

// The meridians, scalloped hem and canal network share the bell surface;
// trailing arms deform down their length, not as a group of orbiting dots.
export function jelly(): Exhibit {
  const root = new T.Group(),
    animal = new T.Group(),
    bell = new T.Group();
  root.add(animal);
  animal.add(bell);
  const shell = (u: number, s: number) => {
    const a = u * tau,
      p = s * 1.69,
      r = (0.97 + 0.035 * Math.cos(a * 16) * s ** 3) * Math.sin(p);
    return v(
      r * Math.cos(a),
      0.32 + 0.85 * Math.cos(p) + s ** 6 * 0.044 * Math.cos(a * 16),
      r * Math.sin(a),
    );
  };
  const mat = new T.ShaderMaterial({
    side: T.DoubleSide,
    transparent: true,
    depthWrite: false,
    uniforms: {},
    vertexShader: `varying vec3 n;varying vec3 eye;varying vec2 st;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalMatrix*normal;eye=-p.xyz;st=uv;gl_Position=projectionMatrix*p;}`,
    fragmentShader: `varying vec3 n;varying vec3 eye;varying vec2 st;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(eye))),1.7);float ribs=pow(.5+.5*cos(st.x*100.531),12.)*smoothstep(.04,.78,st.y);float lace=pow(.5+.5*cos(st.x*402.12+sin(st.y*32.)*1.8),9.)*smoothstep(.48,1.,st.y);vec3 col=mix(vec3(.07,.33,.48),vec3(.45,.98,1.),rim+.37*ribs)+vec3(.32,.12,.24)*lace;gl_FragColor=vec4(col,.23+.48*rim+.18*ribs+.12*lace);}`,
  });
  mesh(bell, parametric(112, 32, shell), mat).renderOrder = 2;
  for (const s of [0.88, 0.96, 1])
    filament(
      bell,
      Array.from({ length: 145 }, (_, i) => shell(i / 144, s)),
      0xaaefff,
      s === 1 ? 0.94 : 0.3,
    );
  for (let i = 0; i < 4; i++) {
    const a = (i * tau) / 4,
      loop = Array.from({ length: 61 }, (_, j) => {
        const q = (j / 60) * tau,
          r = 0.23 * (1 + 0.42 * Math.cos(q));
        return v(
          (0.2 + r * Math.cos(q)) * Math.cos(a) - r * Math.sin(q) * Math.sin(a),
          0.56 + 0.045 * Math.cos(2 * q),
          (0.2 + r * Math.cos(q)) * Math.sin(a) + r * Math.sin(q) * Math.cos(a),
        );
      });
    filament(bell, loop, 0xffc6a7, 0.95);
  }
  const tendrils = Array.from({ length: 39 }, (_, i) => {
    const big = i < 7,
      a = i * 2.39996,
      rad = big ? 0.28 : 0.85,
      len = (big ? 1.32 : 1.05) + 0.57 * (0.5 + 0.5 * Math.cos(i * 23.18));
    const coords = new Float32Array(65 * (big ? 2 : 1) * 3);
    const geo = new T.BufferGeometry();
    geo.setAttribute(
      "position",
      new T.BufferAttribute(coords, 3).setUsage(T.DynamicDrawUsage),
    );
    const mat = big
      ? new T.MeshBasicMaterial({
          color: i % 2 ? 0xf0afab : 0xcaa8fb,
          side: T.DoubleSide,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        })
      : new T.LineBasicMaterial({
          color: i % 3 ? 0x8de9fc : 0xf6c3a8,
          transparent: true,
          opacity: 0.61,
        });
    if (big) {
      const idx = [];
      for (let j = 0; j < 64; j++)
        idx.push(2 * j, 2 * j + 1, 2 * j + 2, 2 * j + 1, 2 * j + 3, 2 * j + 2);
      geo.setIndex(idx);
    }
    const obj = big ? new T.Mesh(geo, mat) : new T.Line(geo, mat);
    obj.frustumCulled = false;
    animal.add(obj);
    return { a, rad, len, big, coords, geo };
  });
  return {
    root,
    animate(t) {
      const phase = t * 2.55,
        puff = Math.sin(phase);
      bell.scale.set(1 + 0.135 * puff, 1 - 0.105 * puff, 1 + 0.135 * puff);
      animal.position.set(
        0.15 * Math.sin(0.64 * t),
        0.18 + 0.16 * Math.cos(phase) - 0.07 * Math.sin(t),
        0,
      );
      animal.rotation.z = -0.17 + 0.095 * Math.sin(t * 0.77);
      for (const { a, rad, len, big, coords, geo } of tendrils) {
        for (let j = 0; j <= 64; j++) {
          const s = j / 64,
            r = rad * (1 + 0.135 * Math.sin(phase - 2 * s)) * (1 - 0.22 * s),
            bend = s ** 1.24;
          const x =
            r * Math.cos(a) +
            bend * (0.25 * Math.sin(phase * 0.73 - 6 * s + a) + 0.29 * s);
          const z =
            r * Math.sin(a) + bend * 0.24 * Math.cos(phase * 0.71 - 6 * s + a);
          const y =
            0.23 * (1 - 0.105 * puff) -
            s * len +
            0.07 * s * Math.sin(phase - 4 * s);
          if (big) {
            const width =
              0.11 *
              Math.sin(Math.PI * s) ** 0.65 *
              (1 + 0.48 * Math.sin(28 * s + phase * 0.45));
            const q = 5 * s + a + phase * 0.27;
            coords.set(
              [
                x - width * Math.cos(q),
                y,
                z - width * Math.sin(q),
                x + width * Math.cos(q),
                y + 0.05 * Math.sin(22 * s + a),
                z + width * Math.sin(q),
              ],
              j * 6,
            );
          } else coords.set([x, y, z], j * 3);
        }
        geo.attributes.position.needsUpdate = true;
      }
    },
  };
}
