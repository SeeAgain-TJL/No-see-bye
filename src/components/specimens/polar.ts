import * as T from "three";
import {
  filament,
  lit,
  mesh,
  parametric,
  rng,
  tau,
  v,
  type Exhibit,
} from "./tools";

export function polar(): Exhibit {
  const root = new T.Group(),
    random = rng(191),
    ice = lit(0xffffff, 0.21, 0.27);
  ice.vertexColors = true;
  ice.flatShading = true;
  function berg(x: number, z: number, r: number, h: number) {
    const rings: T.Vector3[][] = [],
      count = 10;
    for (const [level, s] of [
      [-0.55, 0.49],
      [-0.04, 1],
      [0.29, 0.9],
      [0.72, 0.57],
      [1, 0.2],
    ]) {
      const ring = [];
      for (let j = 0; j < count; j++) {
        const a = (j / count) * tau,
          rr = r * s * (0.83 + random() * 0.29);
        ring.push(
          v(
            rr * Math.cos(a) - level * 0.23 * r,
            level * h + random() * 0.14 * h,
            rr * Math.sin(a) * 0.82,
          ),
        );
      }
      rings.push(ring);
    }
    const verts: number[] = [],
      colors: number[] = [];
    function face(a: T.Vector3, b: T.Vector3, c: T.Vector3, k: number) {
      verts.push(...a.toArray(), ...b.toArray(), ...c.toArray());
      const color = new T.Color().setHSL(
        0.51 + random() * 0.09,
        0.38 + random() * 0.32,
        0.21 + 0.115 * k + random() * 0.13,
      );
      for (let s = 0; s < 3; s++) colors.push(color.r, color.g, color.b);
    }
    for (let k = 0; k < 4; k++)
      for (let j = 0; j < count; j++) {
        const n = (j + 1) % count;
        face(rings[k][j], rings[k + 1][j], rings[k][n], k);
        face(rings[k][n], rings[k + 1][j], rings[k + 1][n], k);
      }
    for (let j = 1; j < count - 1; j++)
      face(rings[4][0], rings[4][j + 1], rings[4][j], 4);
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
    g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return mesh(root, g, ice, x, -0.58, z);
  }
  const floes = [
    berg(-0.5, 0.05, 0.93, 1.24),
    berg(0.68, -0.29, 0.74, 0.86),
    berg(1, 0.46, 0.38, 0.26),
    berg(-1.12, 0.69, 0.31, 0.19),
  ];
  const uniforms = { t: { value: 0 } };
  const curtain = new T.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    blending: T.AdditiveBlending,
    vertexShader: `uniform float t; varying vec2 st; void main(){st=uv;vec3 p=position;p.y+=.18*sin(uv.x*8.+t*1.2)+.1*cos(uv.x*17.-t*.8);p.z+=.28*sin(uv.x*6.+t*.85);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `uniform float t;varying vec2 st;void main(){float ribs=.45+.55*pow(.5+.5*sin(st.x*122.+2.*sin(16.*st.x+t)),3.);float a=pow(1.-st.y,1.8)*smoothstep(0.,.065,st.y)*sin(st.x*3.14159)*ribs;vec3 col=mix(vec3(.13,1.,.64),vec3(.68,.26,1.),st.y+.18*sin(st.x*8.+t));gl_FragColor=vec4(col,a*.88);}`,
  });
  for (let k = 0; k < 2; k++)
    mesh(
      root,
      parametric(100, 12, (u, s) =>
        v(
          (u - 0.5) * 4,
          0.55 + s * 0.99 + 0.18 * Math.sin(5 * u + k) + k * 0.16,
          -0.9 + 0.38 * Math.sin(u * 7 + k) - k * 0.37,
        ),
      ),
      curtain,
    );
  const wakes = floes.map((f, i) => {
    const rr = [1.04, 0.85, 0.42, 0.33][i];
    return filament(
      root,
      Array.from({ length: 81 }, (_, j) =>
        v(
          Math.cos((j / 80) * tau) * rr,
          0,
          Math.sin((j / 80) * tau) * rr * 0.81,
        ),
      ),
      0x8cdadf,
      0.35,
    );
  });
  return {
    root,
    animate(t) {
      uniforms.t.value = t;
      floes.forEach((f, i) => {
        f.position.y = -0.58 + 0.057 * Math.sin(t * 1.6 + i);
        f.rotation.z = 0.034 * Math.sin(t * 1.3 + i);
        wakes[i].position.set(f.position.x, -0.53, f.position.z);
        wakes[i].scale.setScalar(1.03 + 0.07 * Math.sin(t * 1.6 + i));
      });
    },
  };
}
