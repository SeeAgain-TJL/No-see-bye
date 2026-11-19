import type { ThemeName } from "@/lib/themes";
import { adminThemeScenes } from "./admin-observatory-theme";

type Sample = { users: number; entries: number };
export type ObservatoryFrame = {
  time: number;
  yaw: number;
  pitch: number;
  zoom: number;
  morph: number;
  pulse: number;
  active: number;
  selectedDay: number;
  density: number;
};
export type ObservatoryRenderer = ReturnType<typeof createObservatoryRenderer>;

const pointCount = 9600;
const fullTurn = Math.PI * 2;
const activityRadii = [1.02, 1.53];
const cameraDistance = 4.85;
const projectionScale = 2.25;
const framingOffset = 0.05;

const skyVertex = `
  attribute vec2 aCorner;
  varying mediump vec2 vUv;
  void main() {
    vUv = aCorner * 0.5 + 0.5;
    gl_Position = vec4(aCorner, 0.0, 1.0);
  }
`;

const skyFragment = `
  precision mediump float;
  varying mediump vec2 vUv;
  uniform float uPulse;
  uniform float uMorph;
  uniform float uTime;
  uniform float uTheme;
  uniform vec3 uBackground;
  uniform vec3 uHaze;
  uniform vec3 uLight;
  float hash(vec2 p) {
    p = fract(p * vec2(0.31831, 0.367879) + vec2(0.1, 0.7));
    return fract(23.7 * p.x * p.y * (p.x + p.y));
  }
  void main() {
    vec2 center = (vUv - vec2(0.50, 0.52)) * vec2(1.2, 1.7);
    float falloff = exp(-dot(center, center) * 3.5);
    vec3 color = uBackground + uHaze * falloff * 0.63;
    float horizon = center.y + 0.12;
    if (uTheme < 0.5) horizon += sin(center.x * 4.5 + uTime * 0.24) * 0.07;
    else if (uTheme < 1.5) horizon += center.x * 0.49 - 0.21;
    else if (uTheme < 2.5) horizon += center.x * 0.22 + cos(center.x * 4.2 + uTime * 0.34) * 0.07;
    else if (uTheme < 3.5) horizon += 0.12 - abs(center.x * 0.32);
    else horizon += sin(center.x * 6.0 - uTime * 0.37) * 0.13;
    float light = exp(-abs(horizon) * 9.0) * falloff * (1.0 - uMorph);
    color += uHaze * (light * 0.41 + uPulse * falloff * 0.2);
    vec2 position = vUv * vec2(151.0, 88.0);
    float seed = hash(floor(position));
    float fleck = pow(max(1.0 - length(fract(position) - 0.5) * 2.05, 0.0), 3.2);
    color += uLight * fleck * smoothstep(0.987, 1.0, seed) * 0.17;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const pointVertex = `
  precision highp float;
  attribute vec4 aScene;
  attribute vec4 aHistory;
  attribute vec2 aIdentity;
  uniform vec4 uCamera;
  uniform vec4 uMotion;
  uniform vec4 uView;
  uniform vec3 uSignal;
  uniform vec3 uAccent;
  uniform vec3 uLight;
  uniform float uTheme;
  varying mediump vec3 vColor;
  varying mediump float vStrength;
  varying mediump float vCore;

  void main() {
    float time = uMotion.x;
    float morph = uMotion.y;
    float pulse = uMotion.z;
    float active = uMotion.w;
    float seeds = aScene.w;
    vec3 field = aScene.xyz;
    float distanceToCenter = length(field.xz);
    float wave = sin(time * 0.8 + field.x * 1.8 + field.z * 2.9);
    float glow = 1.0;
    if (uTheme < 0.5) {
      float canopy = clamp((field.y + 0.6) * 0.5, 0.0, 1.0);
      field.x += wave * canopy * 0.13;
      field.y += cos(time * 0.71 + seeds * 8.0 + field.z) * canopy * 0.044;
      glow = 0.58 + 0.42 * sin(time * 1.38 + seeds * 30.0 + field.x);
    } else if (uTheme < 1.5) {
      field.y += sin(time * 0.37 + field.z) * 0.038;
      glow = smoothstep(-0.50, 0.78, wave * 0.71 + field.y * 0.25);
    } else if (uTheme < 2.5) {
      field.x += wave * seeds * 0.16;
      field.y += wave * (0.035 + seeds * 0.063);
      glow = 0.64 + wave * 0.26;
    } else if (uTheme < 3.5) {
      float ember = smoothstep(0.85, 1.0, seeds);
      field.y += (0.5 + 0.5 * wave) * ember * 0.19;
      glow = 0.68 + ember * wave * 0.31;
    } else {
      float swell = sin(field.z * 3.0 + field.x * 0.62 - time * 1.6);
      field.z += sin(time + seeds * 4.0 + field.x) * 0.067;
      field.y += swell * 0.21 + wave * 0.058;
      glow = 0.63 + swell * 0.37;
    }
    float shock = exp(-pow((distanceToCenter - uView.w * 2.6) * 4.7, 2.0)) * pulse;
    field.y += shock * 0.048 * (1.0 + active);
    vec3 current = mix(field, aHistory.xyz, morph);
    float selected = step(abs(aIdentity.y - uView.z), 0.35) * step(0.0, aIdentity.y);

    float sy = sin(uCamera.x), cy = cos(uCamera.x);
    float sp = sin(uCamera.y), cp = cos(uCamera.y);
    current = vec3(current.x * cy + current.z * sy, current.y, -current.x * sy + current.z * cy);
    current = vec3(current.x, current.y * cp - current.z * sp, current.y * sp + current.z * cp);
    float depth = ${cameraDistance} - current.z;
    float frameScale = min(1.0, uView.x / 1.20);
    vec2 screen = current.xy * ${projectionScale} * uCamera.z * frameScale / vec2(uView.x, 1.0);
    screen.y += ${framingOffset} * depth;
    gl_Position = vec4(screen, -current.z * 0.1, depth);

    float front = smoothstep(-1.65, 1.80, current.z);
    float tone = smoothstep(0.25, 0.95, seeds);
    vec3 orbitColor = mix(uSignal * 0.61, uLight, tone);
    float warm = smoothstep(0.89, 1.0, seeds) * (uTheme > 3.5 ? 0.09 : 0.63);
    orbitColor = mix(orbitColor, uAccent, warm);
    orbitColor = mix(orbitColor, uLight, shock * 0.7);
    vec3 historyColor = mix(uSignal, uAccent, aIdentity.x);
    historyColor = mix(historyColor, uSignal * 0.52, step(aIdentity.y, -0.5));
    historyColor = mix(historyColor, vec3(0.83, 0.94, 1.0), selected * 0.42);
    vColor = mix(orbitColor, historyColor, morph);
    float orbitLight = 0.095 + (0.15 + front * 0.22) * glow + shock * 0.23;
    orbitLight += tone * 0.065 + active * 0.032;
    float historyLight = max(aHistory.w, 0.0) * (1.0 + selected * 0.75);
    vStrength = mix(orbitLight, historyLight, morph) * (0.77 + 0.23 * front);
    vCore = mix(0.13 + tone * 0.12, 0.35, morph);
    float pointScale = fract(seeds * 47.31);
    gl_PointSize = clamp((2.0 + pointScale * 3.1 + shock * 2.45 + selected * morph * 3.2) * uView.y * (4.5 / depth), 1.0, 13.0);
  }
`;

const pointFragment = `
  precision mediump float;
  varying mediump vec3 vColor;
  varying mediump float vStrength;
  varying mediump float vCore;
  void main() {
    vec2 local = gl_PointCoord - 0.5;
    float r = length(local);
    float glow = exp(-r * r * 24.0) * (1.0 - smoothstep(0.34, 0.5, r));
    float core = exp(-r * r * 124.0);
    float alpha = (glow * 0.23 + core * 0.95) * vStrength;
    gl_FragColor = vec4(mix(vColor, vec3(0.92, 0.97, 1.0), core * vCore), alpha);
  }
`;

function randomSequence(seed: number) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) | 0;
    return (state >>> 0) / 4294967296;
  };
}

function sceneAttributes(theme: ThemeName) {
  const values = new Float32Array(pointCount * 4);
  const random = randomSequence(9583);
  const { sample } = adminThemeScenes[theme];
  for (let index = 0; index < pointCount; index++) {
    values.set(sample(random, index), index * 4);
  }
  return values;
}

function historyAttributes(days: Sample[]) {
  const position = new Float32Array(pointCount * 4);
  const identity = new Float32Array(pointCount * 2);
  const random = randomSequence(2707);
  const peak = Math.max(1, ...days.flatMap(day => [day.users, day.entries]));
  let index = 0;

  function emit(angle: number, radius: number, height: number, strength: number, series: number, day: number) {
    if (index >= pointCount) return;
    position.set([Math.cos(angle) * radius, height, Math.sin(angle) * radius, strength], index * 4);
    identity.set([series, day], index * 2);
    index++;
  }
  for (const radius of [0.61, 0.92, 1.22, 1.53, 1.92, 2.17]) {
    for (let sample = 0; sample < 184; sample++) {
      emit(sample / 184 * fullTurn, radius, -0.30, radius === 2.17 ? 0.39 : 0.25, 0, -1);
    }
  }
  for (let day = 0; day < 30; day++) {
    const angle = day / 30 * fullTurn;
    for (let sample = 0; sample < 21; sample++) {
      emit(angle, 0.59 + sample * 0.077, -0.30, 0.17, 0, day);
    }
    const row = days[day];
    if (!row) continue;
    [row.users, row.entries].forEach((value, series) => {
      const radius = activityRadii[series];
      const height = 1.26 * value / peak;
      for (let sample = 0; sample < 13; sample++) {
        const offset = sample / 13 * fullTurn;
        emit(angle + Math.sin(offset) * 0.029, radius + Math.cos(offset) * 0.048, -0.29, 0.60, series, day);
      }
      if (!height) return;
      const many = 32 + Math.ceil(height * 70);
      for (let sample = 0; sample < many; sample++) {
        const progress = sample < 17 ? 1 : random();
        const offset = random() * fullTurn;
        const scatter = 0.021 + random() * 0.035;
        emit(angle + Math.sin(offset) * scatter, radius + Math.cos(offset) * scatter, -0.28 + progress * height, 0.59 + progress * 0.26, series, day);
      }
    });
  }
  return { position, identity };
}

export function pickActivityDay(days: Sample[], camera: Pick<ObservatoryFrame, "yaw" | "pitch" | "zoom">, x: number, y: number, width: number, height: number) {
  const aspect = width / height;
  const scale = projectionScale * camera.zoom * Math.min(1, aspect / 1.2);
  const sy = Math.sin(camera.yaw), cy = Math.cos(camera.yaw);
  const sp = Math.sin(camera.pitch), cp = Math.cos(camera.pitch);
  const peak = Math.max(1, ...days.flatMap(day => [day.users, day.entries]));

  function project(angle: number, radius: number, elevation: number) {
    const worldX = Math.cos(angle) * radius;
    const worldZ = Math.sin(angle) * radius;
    const turnedX = worldX * cy + worldZ * sy;
    const turnedZ = -worldX * sy + worldZ * cy;
    const depth = cameraDistance - (elevation * sp + turnedZ * cp);
    return {
      x: width / 2 + turnedX * scale * height / (2 * depth),
      y: height * (1 - framingOffset) / 2 - (elevation * cp - turnedZ * sp) * scale * height / (2 * depth),
    };
  }

  let closest = 14 ** 2;
  let selectedDay = -1;
  days.forEach((day, index) => {
    const angle = index / 30 * fullTurn;
    [day.users, day.entries].forEach((value, series) => {
      const base = project(angle, activityRadii[series], -0.29);
      const top = project(angle, activityRadii[series], -0.28 + 1.26 * value / peak);
      const dx = top.x - base.x;
      const dy = top.y - base.y;
      const lengthSquared = dx * dx + dy * dy;
      const progress = lengthSquared > 0 ? Math.max(0, Math.min(1, ((x - base.x) * dx + (y - base.y) * dy) / lengthSquared)) : 0;
      const distance = (x - base.x - progress * dx) ** 2 + (y - base.y - progress * dy) ** 2;
      if (distance < closest) {
        closest = distance;
        selectedDay = index;
      }
    });
  });
  return selectedDay;
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("WebGL shader allocation failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  const reason = gl.getShaderInfoLog(shader);
  gl.deleteShader(shader);
  throw new Error(reason || "WebGL shader compilation failed");
}

export function createObservatoryRenderer(gl: WebGLRenderingContext) {
  const shaders: WebGLShader[] = [];
  const programs: WebGLProgram[] = [];
  const buffers: WebGLBuffer[] = [];

  function program(vertex: string, fragment: string) {
    const vert = compile(gl, gl.VERTEX_SHADER, vertex);
    shaders.push(vert);
    const frag = compile(gl, gl.FRAGMENT_SHADER, fragment);
    shaders.push(frag);
    const linked = gl.createProgram();
    if (!linked) throw new Error("WebGL program allocation failed");
    programs.push(linked);
    gl.attachShader(linked, vert);
    gl.attachShader(linked, frag);
    gl.linkProgram(linked);
    if (!gl.getProgramParameter(linked, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(linked) || "WebGL program linking failed");
    return linked;
  }
  function buffer() {
    const value = gl.createBuffer();
    if (!value) throw new Error("WebGL buffer allocation failed");
    buffers.push(value);
    return value;
  }
  function upload(target: WebGLBuffer, values: Float32Array, usage: number = gl.STATIC_DRAW) {
    gl.bindBuffer(gl.ARRAY_BUFFER, target);
    gl.bufferData(gl.ARRAY_BUFFER, values, usage);
  }
  function attribute(location: number, source: WebGLBuffer, size: number) {
    gl.bindBuffer(gl.ARRAY_BUFFER, source);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  }
  function dispose() {
    for (const target of buffers) gl.deleteBuffer(target);
    for (const target of programs) gl.deleteProgram(target);
    for (const target of shaders) gl.deleteShader(target);
  }

  try {
    const sky = program(skyVertex, skyFragment);
    const points = program(pointVertex, pointFragment);
    const corners = buffer();
    const scene = buffer();
    const history = buffer();
    const identities = buffer();
    const skyCorner = gl.getAttribLocation(sky, "aCorner");
    const skyMorph = gl.getUniformLocation(sky, "uMorph");
    const skyPulse = gl.getUniformLocation(sky, "uPulse");
    const skyTime = gl.getUniformLocation(sky, "uTime");
    const skyTheme = gl.getUniformLocation(sky, "uTheme");
    const skyBackground = gl.getUniformLocation(sky, "uBackground");
    const skyHaze = gl.getUniformLocation(sky, "uHaze");
    const skyLight = gl.getUniformLocation(sky, "uLight");
    const pointScene = gl.getAttribLocation(points, "aScene");
    const pointHistory = gl.getAttribLocation(points, "aHistory");
    const pointIdentity = gl.getAttribLocation(points, "aIdentity");
    const pointCamera = gl.getUniformLocation(points, "uCamera");
    const pointMotion = gl.getUniformLocation(points, "uMotion");
    const pointView = gl.getUniformLocation(points, "uView");
    const pointTheme = gl.getUniformLocation(points, "uTheme");
    const pointSignal = gl.getUniformLocation(points, "uSignal");
    const pointAccent = gl.getUniformLocation(points, "uAccent");
    const pointLight = gl.getUniformLocation(points, "uLight");
    upload(corners, new Float32Array([-1, -1, 3, -1, -1, 3]));
    gl.disable(gl.DEPTH_TEST);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    function updateTheme(theme: ThemeName) {
      const spec = adminThemeScenes[theme];
      upload(scene, sceneAttributes(theme));
      gl.useProgram(sky);
      gl.uniform1f(skyTheme, spec.shader);
      gl.uniform3f(skyBackground, ...spec.background);
      gl.uniform3f(skyHaze, ...spec.haze);
      gl.uniform3f(skyLight, ...spec.light);
      gl.useProgram(points);
      gl.uniform1f(pointTheme, spec.shader);
      gl.uniform3f(pointSignal, ...spec.signal);
      gl.uniform3f(pointAccent, ...spec.accent);
      gl.uniform3f(pointLight, ...spec.light);
    }
    updateTheme("forest");

    function updateHistory(days: Sample[]) {
      const values = historyAttributes(days.slice(-30));
      upload(history, values.position, gl.DYNAMIC_DRAW);
      upload(identities, values.identity, gl.DYNAMIC_DRAW);
    }
    updateHistory([]);

    function draw(frame: ObservatoryFrame) {
      const { time, yaw, pitch, zoom, morph, pulse, active, selectedDay, density } = frame;
      const aspect = gl.drawingBufferWidth / Math.max(1, gl.drawingBufferHeight);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.disable(gl.BLEND);
      gl.useProgram(sky);
      attribute(skyCorner, corners, 2);
      gl.uniform1f(skyMorph, morph);
      gl.uniform1f(skyPulse, pulse);
      gl.uniform1f(skyTime, time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(skyCorner);

      gl.enable(gl.BLEND);
      gl.useProgram(points);
      attribute(pointScene, scene, 4);
      attribute(pointHistory, history, 4);
      attribute(pointIdentity, identities, 2);
      gl.uniform4f(pointCamera, yaw, pitch, zoom, 0);
      gl.uniform4f(pointMotion, time, morph, pulse, active);
      gl.uniform4f(pointView, aspect, density, selectedDay, 1.0 - pulse);
      gl.drawArrays(gl.POINTS, 0, pointCount);
      gl.disableVertexAttribArray(pointScene);
      gl.disableVertexAttribArray(pointHistory);
      gl.disableVertexAttribArray(pointIdentity);
      gl.disable(gl.BLEND);
    }
    return { draw, updateTheme, updateHistory, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
