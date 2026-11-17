import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/photo-rows.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { photoRows } = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputText).toString('base64'));
let cases = 0;
for (const width of [280, 320, 390, 768, 1150, 1600]) {
  for (const ratios of [[1.5, .45, .6], [1.5, 1.5, .62], [.3, .4, .5, .6], [3, 4, 2, .3, 1], [1.5], [.2], [12], [NaN, 0, -1, Infinity], Array.from({ length: 100 }, (_, i) => [.45, .75, 1.5, 2][i % 4])]) {
    const target = width < 600 ? 160 : 230, gap = width < 600 ? 10 : 18;
    const rows = photoRows(ratios, width, target, gap);
    let cursor = 0;
    for (const row of rows) {
      assert.equal(row.start, cursor, 'Every image retains its original reading order');
      assert(row.height > 0 && row.height <= target * 1.4, 'Portraits never grow beyond the row height limit');
      assert.equal(row.widths.length, row.count);
      const occupied = row.widths.reduce((a, b) => a + b, 0) + gap * (row.count - 1);
      assert(occupied <= width + .001, 'No row overflows even on narrow mobile widths');
      if (row.height < target * 1.4 - .001) assert(Math.abs(occupied - width) < .001, 'Uncapped rows fill their available width');
      for (let i = 0; i < row.count; i++) {
        const raw = ratios[row.start + i], expected = Number.isFinite(raw) && raw > 0 ? raw : 1.5;
        assert(Math.abs(row.widths[i] / row.height - expected) < .001, 'The complete photograph keeps its exact aspect ratio');
      }
      cursor += row.count;
      cases++;
    }
    assert.equal(cursor, ratios.length, 'No photograph is omitted or repeated');
  }
}
assert.deepEqual(photoRows([], 1000), []);
assert.deepEqual(photoRows([1.5], 0), []);
const narrow = photoRows(Array(14).fill(.3), 1150, 230, 18);
assert.equal(narrow.length, 1, 'A run of narrow portraits shares a full row instead of leaving repeated half-empty rows');
assert(Math.abs(narrow[0].widths.reduce((a,b) => a+b,0) + 13*18 - 1150) < .001);
console.log('PASS: ' + cases + ' justified photo rows (mixed orientations, full content, bounded height, mobile widths, invalid metadata, ordered coverage).');
await import('./test-photo-gallery.mjs');
