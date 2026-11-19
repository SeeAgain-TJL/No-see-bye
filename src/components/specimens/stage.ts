import * as T from "three";
import type { ThemeName } from "@/lib/themes";
import { adminThemeScenes } from "../admin-observatory-theme";
import { jelly } from "./jelly";
import { polar } from "./polar";
import { tree } from "./tree";
import { butterfly, condor } from "./wings";
import { disposeTree, filament, tau, v, type Exhibit } from "./tools";

const models = {
  forest: tree,
  iceberg: polar,
  ocean: jelly,
  rift: condor,
  grassland: butterfly,
};
export function createStage(
  canvas: HTMLCanvasElement,
  theme: ThemeName,
  instruments: boolean,
) {
  const gpu = new T.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  gpu.setClearColor(0, 0);
  gpu.toneMapping = T.ACESFilmicToneMapping;
  gpu.toneMappingExposure = 1.24;
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(34, 1, 0.1, 50),
    pivot = new T.Group(),
    plate = new T.Group(),
    history = new T.Group();
  scene.add(pivot, history);
  pivot.add(plate);
  const key = new T.DirectionalLight(0xffe7cd, 2.85);
  key.position.set(-3, 5, 4);
  const edge = new T.DirectionalLight(0xafeeee, 2.25);
  edge.position.set(2, 2, -3);
  scene.add(key, edge, new T.HemisphereLight(0xe2f5ff, 0x554e62, 1.85));
  let specimen: Exhibit,
    datum: T.Group,
    current: ThemeName | undefined,
    activity = false;
  function setTheme(name: ThemeName) {
    if (current === name) return;
    if (specimen) {
      plate.remove(specimen.root, datum);
      disposeTree(specimen.root);
      disposeTree(datum);
    }
    current = name;
    const ink = adminThemeScenes[name].ink;
    edge.color.setHex(ink);
    specimen = models[name]();
    datum = new T.Group();
    plate.add(specimen.root, datum);
    if (instruments) {
      for (const r of [1.79, 1.87, 2.07])
        filament(
          datum,
          Array.from({ length: 161 }, (_, i) =>
            v(
              Math.cos((i * tau) / 160) * r,
              -1.43,
              Math.sin((i * tau) / 160) * r,
            ),
          ),
          ink,
          r === 1.87 ? 0.32 : 0.16,
        );
      const marks = [];
      for (let j = 0; j < 96; j++) {
        const a = (j * tau) / 96,
          r = j % 8 ? 1.99 : 1.89;
        marks.push(
          v(2.06 * Math.cos(a), -1.43, 2.06 * Math.sin(a)),
          v(r * Math.cos(a), -1.43, r * Math.sin(a)),
        );
      }
      datum.add(
        new T.LineSegments(
          new T.BufferGeometry().setFromPoints(marks),
          new T.LineBasicMaterial({
            color: ink,
            transparent: true,
            opacity: 0.52,
          }),
        ),
      );
    }
  }
  function setHistory(
    days: { users: number; entries: number }[],
    selected: number,
  ) {
    if (!instruments) return;
    disposeTree(history);
    history.clear();
    if (!days.length) return;
    const max = Math.max(1, ...days.flatMap((day) => [day.users, day.entries])),
      step = 4.55 / days.length,
      base = -1.34,
      glass =
        days.length > 12
          ? Math.max(0.028, step * 0.28)
          : Math.min(0.13, step * 0.28);
    for (let i = 0; i < days.length; i++) {
      const x = -2.275 + step * (i + 0.5),
        series = [
          {
            value: days[i].users,
            color: adminThemeScenes[current!].ink,
            offset: -glass * 0.66,
          },
          {
            value: days[i].entries,
            color: adminThemeScenes[current!].gold,
            offset: glass * 0.66,
          },
        ];
      for (const data of series) {
        if (data.value <= 0) continue;
        const height = (1.73 * data.value) / max,
          w = glass;
        const shell = new T.Mesh(
          new T.BoxGeometry(w * 1.22, height, w * 1.22),
          new T.MeshPhysicalMaterial({
            color: data.color,
            emissive: data.color,
            emissiveIntensity: 0.12,
            metalness: 0.7,
            roughness: 0.17,
            transparent: true,
            opacity: 0.47,
            clearcoat: 1,
            clearcoatRoughness: 0.12,
          }),
        );
        shell.position.set(x + data.offset, base + height / 2, -0.36);
        history.add(shell);
        const core = new T.Mesh(
          new T.BoxGeometry(
            w * 0.46,
            Math.max(0.018, height - 0.035),
            w * 0.46,
          ),
          new T.MeshBasicMaterial({
            color: data.color,
            transparent: true,
            opacity: 0.74,
          }),
        );
        core.position.set(x + data.offset, base + height / 2, -0.34);
        history.add(core);
        const crown = new T.Mesh(
          new T.BoxGeometry(w * 1.2, 0.026, w * 1.2),
          new T.MeshBasicMaterial({
            color: 0xf2fbff,
            transparent: true,
            opacity: 0.95,
          }),
        );
        crown.position.set(x + data.offset, base + height, -0.34);
        history.add(crown);
      }
      if (i === selected) {
        const glow = new T.Mesh(
          new T.BoxGeometry(step * 0.8, 1.94, 0.008),
          new T.MeshBasicMaterial({
            color: adminThemeScenes[current!].ink,
            transparent: true,
            opacity: 0.09,
            depthWrite: false,
          }),
        );
        glow.position.set(x, -0.36, -0.62);
        history.add(glow);
      }
    }
    for (let j = 0; j < 5; j++) {
      const y = base + j * 0.44;
      const grid = filament(
        history,
        [v(-2.36, y, -0.57), v(2.36, y, -0.57)],
        0x9dc8cf,
        j === 0 ? 0.52 : 0.19,
      );
      grid.renderOrder = 1;
    }
    for (let i = 0; i <= days.length; i++) {
      if (
        days.length > 7 &&
        i % Math.ceil(days.length / 7) !== 0 &&
        i !== days.length
      )
        continue;
      const x = -2.275 + step * i;
      filament(
        history,
        [v(x, base, -0.57), v(x, base + 0.035, -0.57)],
        0xd6e9eb,
        0.47,
      );
    }
  }
  function size(w: number, h: number) {
    if (gpu.domElement.width !== w || gpu.domElement.height !== h)
      gpu.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  function draw(time: number, yaw: number, pitch: number, zoom: number) {
    if (!activity) specimen.animate(time);
    pivot.rotation.set(pitch - 0.17, yaw, 0, "XYZ");
    history.rotation.set(0, 0, 0);
    camera.position.set(
      0,
      0.08,
      6.9 / (zoom * Math.min(1, camera.aspect / 1.16)),
    );
    camera.lookAt(0, 0.03, 0);
    gpu.render(scene, camera);
  }
  function setActivity(value: boolean) {
    activity = value;
    pivot.visible = !value;
    history.visible = value;
  }
  function dayAt(x: number, y: number, count: number) {
    if (!activity || !count) return -1;
    const ray = new T.Raycaster();
    ray.setFromCamera(new T.Vector2(x * 2 - 1, 1 - y * 2), camera);
    const point = ray.ray.intersectPlane(new T.Plane(v(0, 0, 1), 0.36), v());
    if (
      !point ||
      point.x < -2.275 ||
      point.x >= 2.275 ||
      point.y < -1.47 ||
      point.y > 0.58
    )
      return -1;
    return Math.floor(((point.x + 2.275) / 4.55) * count);
  }
  setTheme(theme);
  setActivity(false);
  return {
    gpu,
    scene,
    camera,
    pivot,
    plate,
    size,
    setTheme,
    setHistory,
    setActivity,
    draw,
    dayAt,
    dispose() {
      disposeTree(scene);
      gpu.dispose();
    },
  };
}
