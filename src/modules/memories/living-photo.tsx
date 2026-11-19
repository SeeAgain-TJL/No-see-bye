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
      float water = smoothstep(.62, .83, uv.y);
      vec2 shift = vec2(sin(uv.y * 122. - time * 2.7) * .009, sin(uv.x * 21. + time * 2.1) * .006);
      photo = mix(photo, colorAt(uv + shift), water * .87);
      photo += vec3(.022, .036, .043) * water * sin(uv.y * 98. - uv.x * 12. - time * 2.4);
    } else if (uScene == 2) {
      float ribbon = .52 + uv.x * .10 + sin(uv.x * 12. - time * .47) * .054;
      float mist = exp(-pow((uv.y - ribbon) * 13., 2.)) * (.52 + sin(uv.x * 15. - time * .38) * .46);
      photo = mix(photo, vec3(.69, .77, .71), mist * .24 * (1. - light(photo) * .66));
    } else if (uScene == 3) {
      float grass = smoothstep(.44, .70, uv.y);
      float breeze = sin(uv.x * 39. + uv.y * 44. - time * 2.8 + sin(uv.y * 19. + time * .4));
      vec3 swayed = colorAt(uv + vec2(breeze * .005, breeze * -.003));
      photo = mix(photo, swayed + vec3(.055, .050, .028) * breeze, grass * .60);
    } else {
      float sun = sin(uv.x * 6. + uv.y * 8. - time * .42);
      float dust = interval(uv.y + uv.x * .22, .41, .60) * (.56 + sun * .44);
      photo = mix(photo, vec3(.77, .59, .48), dust * .15);
      photo += vec3(.041, .026, .015) * sun * smoothstep(-.04, .13, warmth) * light(photo);
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
        renderer.draw(elapsed % 180, ...crop);
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
