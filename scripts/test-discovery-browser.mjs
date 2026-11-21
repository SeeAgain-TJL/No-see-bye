// Opt-in browser regression: point at a seeded LOCAL instance with public photos.
// Set QA_PLAYWRIGHT_MODULE if playwright-core is installed outside the checkout.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.QA_PLAYWRIGHT_MODULE || 'playwright-core');
const origin = new URL(process.env.QA_BASE || 'http://127.0.0.1:3210');
assert(['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname), 'Use a local fixture, not production');
const browser = await chromium.launch({ headless: true });
try {
  for (const [width, columns] of [[1440, 3], [768, 2], [390, 1], [320, 1]]) {
    const context = await browser.newContext({ baseURL: origin.origin, viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      await page.goto('/memories?scope=public&type=photo');
      const grid = page.locator('.memory-feed.grid'), card = grid.locator('.projection-contact-card').first();
      const photo = card.locator('.projection-contact-photo');
      await photo.scrollIntoViewIfNeeded();
      await card.locator('.contact-print [data-state=ready]').waitFor();
      await photo.hover();
      assert.equal(await grid.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), columns);
      const box = await card.boundingBox();
      assert(Math.abs(box.width / box.height - 0.8) < .01);
      assert.equal(await photo.locator('svg, .gallery-zoom, .projection-contact-expand').count(), 0, 'Opening a print must not need an icon');
      const [src, blur, fit] = await card.evaluate(el => [el.querySelector('.contact-print img').currentSrc === el.querySelector('.contact-backdrop img').currentSrc, getComputedStyle(el.querySelector('.contact-backdrop img')).filter, getComputedStyle(el.querySelector('.contact-print img')).objectFit]);
      assert(src); assert.match(blur, /blur\(/); assert.equal(fit, 'contain');
      await photo.dblclick();
      const viewer = page.locator('dialog.immersive-viewer[open]');
      await viewer.waitFor();
      await viewer.locator('.immersive-stage').dblclick();
      await viewer.locator('.is-zoomed').waitFor();
      await viewer.getByRole('button', { name: '关闭预览' }).click();
      await viewer.waitFor({ state: 'hidden' });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      console.log(`PASS ${width}px: 4:5 mount, contained print, clean hover, double-click, zoom and dismiss`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
