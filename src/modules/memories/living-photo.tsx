"use client";

import { useEffect, useRef } from "react";
import type { ThemeName } from "@/lib/themes";

const layers: Record<ThemeName, number> = { ocean: 0, iceberg: 1, forest: 2, grassland: 3, rift: 4 };
const vertex = `
  attribute vec2 aPoint;
  varying mediump vec2 vScreen;
  void main() {
    vScreen = vec2(aPoint.x * .5 + .5, .5 - aPoint.y * .5);
    gl_Position = vec4(aPoint, 0., 1.);
  }
`;
const fragment = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
  varying mediump vec2 vScreen;
  uniform sampler2D uPhoto;
  uniform vec4 uCrop;
  uniform float uSeconds;
  uniform int uScene;

  float light(vec3 c) { return dot(c, vec3(.21, .72, .07)); }
  vec3 colorAt(vec2 uv) { return texture2D(uPhoto, clamp(uv, .001, .999)).rgb; }
  float interval(float v, float lo, float hi) { return smoothstep(lo, lo + .10, v) * (1. - smoothstep(hi, hi + .10, v)); }

  float grain(vec2 p) {
    vec3 v = fract(vec3(p.xyx) * .1031);
    v += dot(v, v.yzx + 33.33);
    return fract((v.x + v.y) * v.z);
  }

  float cloud(vec2 p) {
    vec2 cell = floor(p);
    vec2 edge = fract(p);
    edge = edge * edge * (3. - 2. * edge);
    return mix(mix(grain(cell), grain(cell + vec2(1., 0.)), edge.x),
               mix(grain(cell + vec2(0., 1.)), grain(cell + vec2(1.)), edge.x), edge.y);
  }

  void main() {
    vec2 uv = vScreen * uCrop.xy + uCrop.zw;
    vec3 photo = colorAt(uv);
    float warmth = photo.r - photo.b;
    float time = uSeconds;
    if (uScene == 0) {
      float swell = sin(uv.x * 31. + uv.y * 22. - time * 2.3 + sin(uv.y * 18.) * .75);
      float eddy = sin(uv.y * 35. - uv.x * 18. + time * 1.6);
      photo = colorAt(uv + vec2(swell * .022 + eddy * .007, swell * .017 - eddy * .005));
      float ripple = sin(uv.x * 108. + uv.y * 60. + sin(uv.y * 37.) * 2. - time * 3.2);
      float foam = smoothstep(.09, .40, photo.b);
      photo += vec3(.042, .064, .075) * foam * ripple;
    } else if (uScene == 1) {
      float water = smoothstep(.79, .87, uv.y);
      float current = sin(uv.y * 82. - time * 2.9 + sin(uv.x * 21.) * 1.6);
      vec2 shift = vec2(.021 * current, sin(uv.x * 24. + time * 2.2) * .011);
      photo = mix(photo, colorAt(uv + shift), water);
      float ripple = sin(uv.y * 103. - uv.x * 14. - time * 2.9) * .5 + .5;
      photo += vec3(.070, .096, .11) * water * ripple * (1. - .51 * light(photo));
      float sky = 1. - smoothstep(.13, .25, uv.y);
      float drift = cloud(vec2(uv.x * 5. - time * .27, uv.y * 15.));
      photo = mix(photo, vec3(.63, .76, .81), sky * smoothstep(.30, .88, drift) * .24);
    } else if (uScene == 2) {
      vec2 wind = vec2(uv.x - time * .077, uv.y + time * .021);
      float ribbon = .63 - uv.x * .10 + (cloud(wind * vec2(4., 7.)) - .5) * .24;
      float layers = .64 * cloud(wind * vec2(9., 13.)) + .36 * cloud(wind * vec2(23., 24.));
      float mist = exp(-pow((uv.y - ribbon) * 7.5, 2.)) * smoothstep(.23, .84, layers);
      photo = mix(photo, vec3(.71, .79, .75), mist * .53 * (1. - light(photo) * .48));
    } else if (uScene == 3) {
      float grass = smoothstep(.53, .79, uv.y);
      vec2 wind = vec2(uv.x - time * .098, uv.y * 1.4 + time * .017);
      float wake = cloud(wind * vec2(6., 11.)) * .67 + cloud(wind * vec2(17., 29.)) * .33;
      float breeze = sin(uv.x * 38. + uv.y * 43. - time * 3.4 + wake * 4.);
      vec3 swayed = colorAt(uv + vec2(breeze * .011, breeze * -.005));
      float relief = smoothstep(.29, .82, wake) - .48;
      photo = mix(photo, swayed * (1. + relief * .26) + vec3(.082, .066, .027) * wake, grass * .87);
    } else {
      vec2 wind = vec2(uv.x - time * .070, uv.y + time * .020);
      float haze = cloud(wind * vec2(6., 21.)) * .69 + cloud(wind * vec2(18., 48.)) * .31;
      float lift = interval(uv.y + uv.x * .24, .49, .73);
      photo = mix(photo, vec3(.78, .65, .55), lift * smoothstep(.27, .84, haze) * .38);
      float sun = cloud(vec2(uv.x * 4. - time * .21, uv.y * 7.));
      photo *= 1. + (sun - .5) * .23 * smoothstep(-.06, .10, warmth) * smoothstep(.24, .46, uv.y);
    }
    gl_FragColor = vec4(photo, 1.);
  }
`;

function startRenderer(gl: WebGLRenderingContext, theme: ThemeName) {
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  if (!program || !buffer || !texture) return;
  function attach(type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader) return false;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const valid = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (valid) gl.attachShader(program!, shader);
    gl.deleteShader(shader);
    return valid;
  }
  function dispose() {
    gl.deleteTexture(texture);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  }
  if (!attach(gl.VERTEX_SHADER, vertex) || !attach(gl.FRAGMENT_SHADER, fragment)) {
    dispose();
    return;
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    dispose();
    return;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const point = gl.getAttribLocation(program, "aPoint");
  gl.enableVertexAttribArray(point);
  gl.vertexAttribPointer(point, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(gl.getUniformLocation(program, "uPhoto"), 0);
  gl.uniform1i(gl.getUniformLocation(program, "uScene"), layers[theme]);
  const crop = gl.getUniformLocation(program, "uCrop");
  const seconds = gl.getUniformLocation(program, "uSeconds");
  return {
    upload(image: HTMLImageElement) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      return gl.getError() === gl.NO_ERROR;
    },
    draw(time: number, sx: number, sy: number, x: number, y: number) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.uniform4f(crop, sx, sy, x, y);
      gl.uniform1f(seconds, time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose,
  };
}

export function LivingPhoto({ theme, paused = false }: { theme: ThemeName; paused?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const open = useRef(paused);
  const wake = useRef<() => void>(() => {});
  useEffect(() => { open.current = paused; wake.current(); }, [paused]);
  useEffect(() => {
    const canvas = ref.current;
    const plate = canvas?.parentElement;
    if (!canvas || !plate) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let renderer: ReturnType<typeof startRenderer>;
    let unavailable = false;
    let visible = false;
    let active = true;
    let bitmap: HTMLImageElement | null = null;
    let requested = "";
    let frame = 0;
    let previous = 0;
    let elapsed = 0;
    let crop: [number, number, number, number] = [1, 1, 0, 0];
    const allowed = () => visible && !document.hidden && !reduced.matches && !open.current && !unavailable;
    const hide = () => { canvas.removeAttribute("data-live"); };

    function draw(now: number) {
      frame = 0;
      if (!allowed() || !renderer || !bitmap) return;
      if (!previous || now - previous >= 28) {
        elapsed += previous ? Math.min(now - previous, 75) / 1000 : 0;
        previous = now;
        renderer.draw(elapsed, ...crop);
        if (!canvas!.hasAttribute("data-live")) canvas!.setAttribute("data-live", theme);
      }
      frame = requestAnimationFrame(draw);
    }
    function measure() {
      if (!canvas || !plate) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      const style = getComputedStyle(plate);
      const dpr = Math.min(devicePixelRatio || 1, 1.4, Math.sqrt(900_000 / (width * height)));
      const pixelWidth = Math.max(1, Math.round(width * dpr));
      const pixelHeight = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      if (bitmap) {
        const aspect = bitmap.naturalWidth / bitmap.naturalHeight;
        const sx = Math.min(1, width / (height * aspect));
        const sy = Math.min(1, height * aspect / width);
        crop = [sx, sy, (1 - sx) * (parseFloat(style.backgroundPositionX) || 0) / 100, (1 - sy) * (parseFloat(style.backgroundPositionY) || 0) / 100];
      }
      if (!allowed()) return;
      const url = style.backgroundImage.match(/^url\("(.*)"\)$/)?.[1];
      if (!url || requested === url) return;
      requested = url;
      const next = new Image();
      next.decoding = "async";
      next.src = url;
      void next.decode().then(() => {
        if (!active || requested !== url || unavailable || !renderer) return;
        if (!renderer.upload(next)) { unavailable = true; hide(); return; }
        bitmap = next;
        measure();
        if (!frame && allowed()) frame = requestAnimationFrame(draw);
      }).catch(() => { if (requested === url) hide(); });
    }
    function sync() {
      if (!allowed()) {
        cancelAnimationFrame(frame);
        frame = 0;
        previous = 0;
        if (reduced.matches) hide();
        return;
      }
      if (!renderer) {
        const gl = canvas!.getContext("webgl", { alpha: false, antialias: false, depth: false, powerPreference: "low-power" });
        renderer = gl ? startRenderer(gl, theme) : undefined;
        if (!renderer) { unavailable = true; return; }
      }
      measure();
      if (!frame && bitmap) frame = requestAnimationFrame(draw);
    }
    function loss() { unavailable = true; hide(); sync(); }
    const observer = new IntersectionObserver(([entry]) => { visible = Boolean(entry?.isIntersecting); sync(); });
    const resize = new ResizeObserver(measure);
    observer.observe(canvas);
    resize.observe(canvas);
    canvas.addEventListener("webglcontextlost", loss);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    wake.current = sync;
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      renderer?.dispose();
      hide();
      canvas.removeEventListener("webglcontextlost", loss);
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
      wake.current = () => {};
    };
  }, [theme]);
  return <canvas className="living-photo-render" ref={ref} aria-hidden="true" />;
}
