import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/album-layout.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { albumPositions } = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputText).toString('base64'));

let checked = 0;
// The reported regression used a wide landscape, a narrow video, and a portrait.
// Their actual edges should overlap slightly, never drift apart along a fixed ruler.
for (const widths of [[335, 140, 165], [140, 335, 140], [335, 335, 335], [110, 140, 160]]) {
  for (let selected = 0; selected < widths.length; selected++) {
    const positions = albumPositions(widths, selected);
    assert.equal(positions[selected].x, 0, 'The selected print stays centered');
    const ordered = positions.map((p, i) => ({ ...p, width: widths[i] })).sort((a, b) => a.x - b.x);
    for (let i = 1; i < ordered.length; i++) {
      const a = ordered[i - 1], b = ordered[i];
      const gap = b.x - b.width * b.scale / 2 - a.x - a.width * a.scale / 2;
      assert(gap < 10 && gap > -40, `Mixed prints keep a composed seam, received ${gap}px`);
    }
    checked++;
  }
}

const widths = [335, 140, 210, 300, 155];
const before = albumPositions(widths, 4.999999), after = albumPositions(widths, 5.000001);
for (const i of [0, 1, 4]) assert(Math.abs(before[i].x - after[i].x) < .01, 'Wrapping the last print does not make the visible cards jump');
for (const mobile of [false, true]) {
  for (const position of [-.15, 0, .5, 2, 4.7, 5]) {
    for (const p of albumPositions(widths, position, mobile)) {
      assert(Object.values(p).every(v => typeof v !== 'number' || Number.isFinite(v)));
      assert(p.opacity >= 0 && p.opacity <= 1 && p.scale > 0);
      checked++;
    }
  }
}
// Very long scans can produce a print narrower than the normal overlap.
// Their order still has to follow left -> selected -> right, with no negative step.
for (const widths of [[23, 24, 335], [25, 27, 29], [335, 24]]) {
  for (let selected = 0; selected < widths.length; selected++) {
    const positions = albumPositions(widths, selected);
    for (let index = 0; index < positions.length; index++) {
      const delta = widths.length > 2 ? ((index - selected + widths.length * 1.5) % widths.length) - widths.length / 2 : index - selected;
      assert.equal(Math.sign(positions[index].x), Math.sign(delta), 'Narrow prints preserve their reading order');
      checked++;
    }
  }
}
// A spring and a pointer drag cross half-index positions; mixed widths must
// not switch their displacement multiplier abruptly at those boundaries.
for (const widths of [[335, 140, 210, 300, 155], [335, 140, 165]]) {
  for (const boundary of [-.5, .5, 1.5, widths.length - .5, widths.length]) {
    for (const mobile of [true, false]) {
      const before = albumPositions(widths, boundary - .000001, mobile);
      const after = albumPositions(widths, boundary + .000001, mobile);
      before.forEach((position, index) => {
        if (position.opacity > .01 || after[index].opacity > .01) assert(Math.abs(position.x - after[index].x) < .01, 'Visible prints move continuously across width and wrap boundaries');
        else assert(position.opacity < .01 && after[index].opacity < .01, 'A recycled print is fully faded before moving to the opposite side');
        checked++;
      });
    }
  }
}
assert.deepEqual(albumPositions([], 0), []);
assert.equal(albumPositions([140], 0)[0].x, 0);
console.log(`PASS: ${checked} album geometry cases (mixed widths, centering, wrap continuity, touch stack).`);
