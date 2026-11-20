import * as T from "three";
import { GROUND, TAU, clamp, rng, smooth, type Creature, type Species } from "./kit";
import type { Look } from "./looks";

const vertex =
  /* glsl */ "\n" +
  [
    "attribute vec3 tint;",
    "attribute float grain;",
    "attribute float gain;",
    "uniform float density;",
    "uniform float clock;",
    "uniform vec2 pointer;",
    "uniform vec2 impact;",
    "uniform float age;",
    "uniform float ratio;",
    "varying vec3 vColor;",
    "varying float vGain;",
    "varying float vKind;",
    "void main(){",
    "  vec4 mv=modelViewMatrix*vec4(position,1.); vec4 clip=projectionMatrix*mv;",
    "  vec2 xy=clip.xy/clip.w; vec2 unit=vec2(ratio,1.);",
    "  vec2 d=(xy-pointer)*unit; float l=length(d);",
    "  xy+=d/(l+.08)*.068*exp(-25.*l*l)/unit;",
    "  d=(xy-impact)*unit; l=length(d); float crest=l-age*.83;",
    "  xy+=d/(l+.12)*sin(30.*crest)*exp(-130.*crest*crest)*max(0.,1.-age*.7)*.075/unit;",
    "  clip.xy=xy*clip.w; gl_Position=clip;",
    "  float k=fract(float(gl_VertexID)*.61803399);",
    "  vColor=tint; vGain=clamp(.8+.36*(mv.z+8.),.4,1.15)*max(0.,1.+gain)*(.79+.21*sin(k*43.+clock*2.7)); vKind=grain<0.?1.:0.;",
    "  gl_PointSize=abs(grain)*density*(.93+.11*sin(k*20.+clock*2.));",
    "}",
  ].join("\n");
const fragment = [
  "varying vec3 vColor;",
  "varying float vGain;",
  "varying float vKind;",
  "void main(){",
  "  float r=length(gl_PointCoord*2.-1.); if(r>1.) discard;",
  "  float core=exp(-19.*r*r); float halo=exp(-4.5*r*r)*(1.-smoothstep(.72,1.,r));",
  "  float d=r-.69; float ring=exp(-320.*d*d);",
  "  float value=mix(core*.56+halo*.14,ring*.24+core*.08,vKind)*vGain;",
  "  gl_FragColor=vec4(vColor*value,value);",
  "}",
].join("\n");

export function makeEngine(
  canvas: HTMLCanvasElement,
  fallback: HTMLCanvasElement,
  look: Look,
  initial: Species,
  small: boolean,
) {
  const count = small ? 6400 : 11800,
    environment = small ? 140 : 320,
    lights = 28,
    total = count + environment + lights;
  const position = new Float32Array(total * 3),
    colors = new Float32Array(total * 3),
    size = new Float32Array(total),
    gain = new Float32Array(total);
  const target = new Float32Array(count * 3),
    origin = new Float32Array(count * 3),
    spread = new Float32Array(count * 3),
    lag = new Float32Array(count);
  const previousColor = new Float32Array(count * 3),
    nextColor = new Float32Array(count * 3);
  const random = rng(471),
    seeds = Array.from({ length: environment }, () => [random(), random(), random(), random()]);
  const scene = new T.Scene(),
    body = new T.Group(),
    camera = new T.OrthographicCamera(-3.5, 3.5, 1.95, -1.95, 0.1, 40);
  camera.position.set(0, 0, 8);
  body.rotation.x = 0.16;
  scene.add(body);
  const geometry = new T.BufferGeometry();
  const positions = new T.BufferAttribute(position, 3).setUsage(T.DynamicDrawUsage),
    tints = new T.BufferAttribute(colors, 3).setUsage(T.DynamicDrawUsage);
  const grains = new T.BufferAttribute(size, 1).setUsage(T.DynamicDrawUsage),
    gains = new T.BufferAttribute(gain, 1).setUsage(T.DynamicDrawUsage);
  geometry.setAttribute("position", positions);
  geometry.setAttribute("tint", tints);
  geometry.setAttribute("grain", grains);
  geometry.setAttribute("gain", gains);
  const uniforms = {
    density: { value: 1 },
    clock: { value: 0 },
    pointer: { value: new T.Vector2(9, 9) },
    impact: { value: new T.Vector2(9, 9) },
    age: { value: 5 },
    ratio: { value: 1 },
  };
  const material = new T.ShaderMaterial({
    uniforms,
    vertexShader: vertex,
    fragmentShader: fragment,
    depthWrite: false,
    depthTest: false,
    transparent: true,
    blending: T.CustomBlending,
    blendSrc: T.OneFactor,
    blendDst: T.OneFactor,
  });
  const points = new T.Points(geometry, material);
  points.frustumCulled = false;
  body.add(points);
  const floorVertices: number[] = [];
  for (const radius of [1.57, 1.64, 1.91, 2.38])
    for (let i = 0; i < 160; i++) {
      const a = (i / 160) * TAU,
        b = ((i + 1) / 160) * TAU;
      if (i % 8 < 6 || radius === 1.64)
        floorVertices.push(
          radius * Math.cos(a),
          0,
          radius * Math.sin(a),
          radius * Math.cos(b),
          0,
          radius * Math.sin(b),
        );
    }
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * TAU,
      r = i % 8 === 0 ? 1.83 : 1.87;
    floorVertices.push(r * Math.cos(a), 0, r * Math.sin(a), 1.915 * Math.cos(a), 0, 1.915 * Math.sin(a));
  }
  const floorGeo = new T.BufferGeometry().setAttribute("position", new T.Float32BufferAttribute(floorVertices, 3));
  const floorMat = new T.LineBasicMaterial({
    color: look.primary,
    transparent: true,
    opacity: 0.23,
    depthTest: false,
    depthWrite: false,
  });
  const floor = new T.LineSegments(floorGeo, floorMat);
  floor.position.y = GROUND;
  scene.add(floor);
  const scanGeo = new T.BufferGeometry();
  const scanPos = new Float32Array(2 * 3 * 9);
  for (let i = 0; i < 9; i++) {
    scanPos[i * 6] = -2.5;
    scanPos[i * 6 + 2] = (i - 4) * 0.45;
    scanPos[i * 6 + 3] = 2.5;
    scanPos[i * 6 + 5] = (i - 4) * 0.45;
  }
  scanGeo.setAttribute("position", new T.BufferAttribute(scanPos, 3));
  const scan = new T.LineSegments(scanGeo, floorMat);
  scan.position.y = GROUND;
  scene.add(scan);
  let renderer: T.WebGLRenderer | undefined,
    ctx: CanvasRenderingContext2D | null = null;
  const activateFallback = () => {
    ctx = fallback.getContext("2d");
    canvas.hidden = true;
    fallback.hidden = !ctx;
  };
  try {
    renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "low-power" });
    renderer.setClearColor(0, 0);
  } catch {
    activateFallback();
  }
  canvas.addEventListener("webglcontextlost", activateFallback);

  let current = initial,
    creature: Creature,
    at = 0,
    elapsed = 0,
    now = 0,
    ripple = -10,
    aspect = 1,
    width = 0,
    height = 0,
    density = 1;
  let yaw = 0,
    pitch = 0.16,
    zoom = 1,
    online = 0;
  const color = new T.Color(),
    sourceColor = new T.Color(),
    paletteColor = new T.Color();
  const colorU = { r: 0, g: 0, b: 0 };
  function setTint(i: number, hex: number) {
    color.setHex(hex).getRGB(colorU, T.SRGBColorSpace);
    colors[i * 3] = colorU.r;
    colors[i * 3 + 1] = colorU.g;
    colors[i * 3 + 2] = colorU.b;
  }
  for (let i = 0; i < count; i++) {
    const x = random() * 2 - 1,
      y = random() * 2 - 1,
      z = random() * 2 - 1;
    const j = i * 3;
    spread[j] = x * 1.65;
    spread[j + 1] = y * 1.18;
    spread[j + 2] = z * 1.6;
    lag[i] = random() * 0.24;
    position[j] = x * 3.45;
    position[j + 1] = y * 2.13;
    position[j + 2] = z * 2.6;
    setTint(i, look.primary);
  }
  for (let i = count; i < total; i++) setTint(i, i < count + environment ? look.primary : look.accent);

  function select(next: Species, animate: boolean) {
    origin.set(position.subarray(0, count * 3));
    previousColor.set(colors.subarray(0, count * 3));
    current = next;
    creature = next.build(count);
    at = elapsed;
    now = animate ? 0 : Infinity;
    const palette = next.palette.map((hex) => new T.Color(hex));
    for (let i = 0; i < count; i++) {
      const x = clamp(creature.tone[i]) * (palette.length - 1),
        k = Math.min(palette.length - 2, Math.floor(x));
      sourceColor.copy(palette[k]);
      paletteColor.copy(palette[k + 1]);
      sourceColor.lerp(paletteColor, x - k).getRGB(colorU, T.SRGBColorSpace);
      const j = i * 3;
      nextColor[j] = colorU.r;
      nextColor[j + 1] = colorU.g;
      nextColor[j + 2] = colorU.b;
      size[i] = (small ? 4.1 : 4.8) * creature.size[i];
      gain[i] = 0;
    }
    floor.visible = next.floor !== "none";
    scan.visible = next.floor === "walk";
  }
  select(initial, true);

  function resize(w: number, h: number) {
    width = w;
    height = h;
    aspect = w / Math.max(1, h);
    density = Math.min(devicePixelRatio || 1, 1.55, Math.sqrt(1_350_000 / Math.max(1, w * h)));
    const span = Math.max(3.72, 4.76 / aspect);
    camera.left = (-span * aspect) / 2;
    camera.right = (span * aspect) / 2;
    camera.top = span / 2;
    camera.bottom = -span / 2;
    camera.updateProjectionMatrix();
    uniforms.density.value = density;
    uniforms.ratio.value = aspect;
    renderer?.setPixelRatio(density);
    renderer?.setSize(w, h, false);
    fallback.width = Math.max(1, Math.round(w * density));
    fallback.height = Math.max(1, Math.round(h * density));
  }

  const pixel = new T.Vector3(),
    matrix = new T.Matrix4();
  function draw2d() {
    if (!ctx) return;
    const w = fallback.width,
      h = fallback.height;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    body.updateMatrixWorld();
    camera.updateMatrixWorld();
    matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(body.matrixWorld);
    for (let i = 0; i < total; i++) {
      if ((i < count && i % 2) || gain[i] < -0.99) continue;
      const j = i * 3;
      pixel.set(position[j], position[j + 1], position[j + 2]).applyMatrix4(matrix);
      const x = (pixel.x * 0.5 + 0.5) * w,
        y = (0.5 - pixel.y * 0.5) * h,
        r = Math.max(0.6, Math.abs(size[i]) * density * 0.24);
      ctx.fillStyle =
        "rgb(" +
        Math.round(colors[j] * 255) +
        " " +
        Math.round(colors[j + 1] * 255) +
        " " +
        Math.round(colors[j + 2] * 255) +
        ")";
      ctx.globalAlpha = clamp((0.36 + (i % 5) * 0.08) * (1 + gain[i]));
      ctx.fillRect(x, y, r, r);
    }
  }
  function draw(dt: number, still: boolean) {
    if (!width || !height) return;
    elapsed += dt;
    now += dt;
    if (still) now = Infinity;
    const t = still ? 0.38 : elapsed - at,
      view = current.view,
      scale = view?.scale ?? 1;
    const tilt = view?.pitch ?? 0,
      st = Math.sin(tilt),
      ct = Math.cos(tilt);
    const turn = (view?.yaw ?? 0) + (still ? 0 : 0.13 * Math.sin(elapsed * 0.75)),
      s = Math.sin(turn),
      c = Math.cos(turn);
    creature.pose(t, target, gain);
    for (let i = 0; i < count; i++) {
      const j = i * 3,
        x = target[j],
        y = target[j + 1] * ct - target[j + 2] * st,
        z = target[j + 2] * ct + target[j + 1] * st;
      const q = smooth((now - lag[i]) / (1.64 - lag[i])),
        bloom = Math.sin(Math.PI * q) ** 1.5;
      const twist = 0.38 * bloom,
        twistS = 1 + twist;
      position[j] = origin[j] * (1 - q) + (scale * (x * c + z * s) + (view?.x ?? 0)) * q + spread[j] * bloom * twistS;
      position[j + 1] = origin[j + 1] * (1 - q) + (scale * y + (view?.y ?? 0)) * q + spread[j + 1] * bloom;
      position[j + 2] = origin[j + 2] * (1 - q) + scale * (z * c - x * s) * q + spread[j + 2] * bloom;
      colors[j] = previousColor[j] * (1 - q) + nextColor[j] * q;
      colors[j + 1] = previousColor[j + 1] * (1 - q) + nextColor[j + 1] * q;
      colors[j + 2] = previousColor[j + 2] * (1 - q) + nextColor[j + 2] * q;
    }
    const ocean = look.ambient === "bubbles",
      snow = look.ambient === "snow",
      ember = look.ambient === "embers";
    for (let p = 0; p < environment; p++) {
      const [a, b, c, d] = seeds[p],
        i = count + p,
        j = i * 3;
      const direction = snow ? -1 : 1,
        speed = ocean ? 0.093 : snow ? 0.066 : ember ? 0.14 : 0.036;
      position[j] = (a - 0.5) * 9 + Math.sin(elapsed * (0.7 + c) + d * TAU) * (0.17 + c * 0.16);
      position[j + 1] = (((((b + direction * elapsed * speed * (0.44 + c)) % 1) + 1) % 1) - 0.5) * 5.55;
      position[j + 2] = (d - 0.5) * 5.8;
      size[i] = ocean && p % 6 === 0 ? -(5 + c * 11) : 2 + c * 3.5;
      gain[i] = -0.78 + 0.42 * Math.sin(elapsed * (0.6 + c) + p * 0.81) ** 2;
    }
    for (let i = 0; i < lights; i++) {
      const n = count + environment + i,
        j = n * 3,
        a = i * 2.399963 + elapsed * 0.24;
      position[j] = 2.02 * Math.cos(a);
      position[j + 1] = -1.22 + (i % 4) * 0.12 + 0.071 * Math.sin(elapsed * 1.8 + i);
      position[j + 2] = 1.48 * Math.sin(a);
      gain[n] = i < online ? 0.15 + 0.29 * Math.sin(elapsed * 2.2 + i) ** 2 : -1;
      size[n] = 6.6 + (i % 4) * 0.35;
    }
    body.rotation.set(pitch, yaw, 0);
    body.scale.setScalar(zoom);
    floor.rotation.set(pitch * 0.37, elapsed * 0.12 + yaw, 0);
    floor.scale.setScalar(zoom);
    scan.rotation.y = yaw;
    scan.position.x = -(elapsed * current.speed) % 0.45;
    scan.scale.setScalar(zoom);
    positions.needsUpdate = tints.needsUpdate = grains.needsUpdate = gains.needsUpdate = true;
    uniforms.clock.value = elapsed;
    uniforms.age.value = elapsed - ripple;
    if (ctx) draw2d();
    else renderer?.render(scene, camera);
  }
  return {
    draw,
    resize,
    select,
    sceneStatus: () => (ctx ? "2d" : renderer ? "3d" : "unavailable"),
    aim: (x: number, y: number, z: number) => {
      yaw = x;
      pitch = y;
      zoom = z;
    },
    presence: (n: number) => {
      online = clamp(n, 0, lights);
    },
    point: (x: number, y: number) => uniforms.pointer.value.set(x, y),
    ping: (x: number, y: number) => {
      uniforms.impact.value.set(x, y);
      ripple = elapsed;
    },
    dispose: () => {
      canvas.removeEventListener("webglcontextlost", activateFallback);
      geometry.dispose();
      material.dispose();
      floorGeo.dispose();
      scanGeo.dispose();
      floorMat.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
    },
  };
}
