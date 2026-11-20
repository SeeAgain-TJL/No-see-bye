import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Run deterministic render math without WebGL, a browser or a live database.
async function moduleUrl(path, dependencies = {}) {
  const src = await readFile(new URL("../src/" + path + ".ts", import.meta.url), "utf8");
  let js = ts.transpileModule(src, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  for (const [specifier, url] of Object.entries(dependencies))
    js = js
      .replaceAll("'" + specifier + "'", JSON.stringify(url))
      .replaceAll('"' + specifier + '"', JSON.stringify(url));
  return "data:text/javascript;base64," + Buffer.from(js).toString("base64");
}
const kit = await moduleUrl("components/observatory/kit");
const forms = await moduleUrl("components/observatory/forms", { "./kit": kit });
const { habitats } = await import(
  await moduleUrl("components/observatory/creatures", { "./kit": kit, "./forms": forms })
);
const { themeNames, defaultTheme, THEME_STORAGE_KEY, themeInitScript } = await import(await moduleUrl("lib/themes"));
assert.equal(defaultTheme, "grassland");
for (const [choice, expected] of [
  [null, "grassland"],
  ["ocean", "ocean"],
  ["unrecognized", "grassland"],
]) {
  const store = new Map([["theme", "ocean"], ...(choice ? [[THEME_STORAGE_KEY, choice]] : [])]);
  const document = { documentElement: { dataset: { theme: defaultTheme } } };
  runInNewContext(themeInitScript, {
    document,
    localStorage: {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k),
    },
  });
  assert.equal(document.documentElement.dataset.theme, expected);
  assert.equal(store.has("theme"), false);
}
const ids = new Set();
for (const theme of themeNames) {
  assert.equal(habitats[theme].length, 3);
  for (const specimen of habitats[theme]) {
    assert(!ids.has(specimen.id));
    ids.add(specimen.id);
    for (const n of [6400, 11800]) {
      const creature = specimen.build(n),
        gains = new Float32Array(n),
        a = new Float32Array(n * 3).fill(NaN),
        b = new Float32Array(n * 3).fill(NaN);
      creature.pose(0.45, a, gains);
      creature.pose(0.94, b, gains);
      assert(
        a.every(Number.isFinite) && b.every(Number.isFinite) && gains.every(Number.isFinite),
        specimen.id + " incomplete pose",
      );
      assert(
        creature.size.every((x) => x > 0) && creature.tone.every((x) => x >= 0 && x <= 1),
        specimen.id + " invalid particle attributes",
      );
      assert(
        b.some((x, i) => Math.abs(x - a[i]) > 0.04),
        specimen.id + " must articulate at different times",
      );
    }
  }
}
console.log("PASS: theme migration and 15 articulated specimens at mobile and desktop densities.");
