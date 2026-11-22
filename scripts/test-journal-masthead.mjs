// Local acceptance checks for the compact account entry and both journal covers.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)(process.env.QA_PLAYWRIGHT_MODULE || 'playwright-core');
const origin = new URL(process.env.QA_BASE || 'http://localhost:3224');
assert(['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname));
const output = process.env.QA_SCREENSHOTS;
if (output) await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  for (const width of [1920, 1280, 768, 390, 320]) {
    const context = await browser.newContext({ baseURL: origin.origin, viewport: { width, height: width < 768 ? 844 : 900 }, hasTouch: width < 768, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      const capture = async name => { if (output && [1920,390].includes(width)) await page.screenshot({ path: path.join(output, `${name}-${width}.png`) }); };
      await page.goto('/login');
      const tabs = page.getByRole('navigation', { name: '账号入口' });
      for (const [mode, label] of [['login','登录'], ['register','注册']]) {
        await tabs.getByRole('link', { name: label, exact: true }).click();
        await page.getByRole('form', { name: label }).waitFor();
        assert.equal(await tabs.locator('[aria-current=page]').innerText(), label);
        assert.equal(await page.locator('.auth-form h1:visible, .auth-story video, .auth-story canvas').count(), 0);
        const card = await page.locator('.auth-card').boundingBox();
        assert(card.width <= 1401 && card.height <= 740, JSON.stringify(card));
        await page.locator('.auth-static-art img').evaluate(img => img.decode());
        await capture(mode);
      }
      for (const [url, title] of [['/memories','我的日常'], ['/memories?scope=public','发现日常']]) {
        await page.goto(url);
        const header = page.locator('header.journal-masthead');
        await header.getByRole('heading', { name:title }).waitFor();
        const image = header.locator('.journal-cover-photo img'); await image.evaluate(img => img.decode());
        const [box, photo] = await Promise.all([header.boundingBox(), image.boundingBox()]);
        assert(box.height <= 232, JSON.stringify(box));
        assert(Math.abs(photo.width / photo.height - 16/9) < .02);
        assert.equal(await image.evaluate(el=>getComputedStyle(el).objectFit), 'contain');
        await capture(title === '我的日常' ? 'mine' : 'discover');
        await header.locator('.journal-cover-photo').click();
        const viewer = page.locator('dialog.immersive-viewer[open]'); await viewer.waitFor();
        await viewer.locator('.immersive-stage').click(); await viewer.waitFor({state:'hidden'});
        if (title === '发现日常') { const btn=header.getByRole('button', { name:'按月浏览' }); await btn.click(); assert.equal(await btn.getAttribute('aria-expanded'), 'true'); }
        assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
      }
      console.log(`PASS ${width}px: account tabs and dimensions, both journal layouts, full photo, tap-to-close and month browsing`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
