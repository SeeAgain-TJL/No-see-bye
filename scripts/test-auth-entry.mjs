// Read-only layout regression. With no QA_BASE, serve the current production build
// on loopback for the lifetime of this test; no forms or OAuth links are sent.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { once } from 'node:events';
const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.QA_PLAYWRIGHT_MODULE || 'playwright-core');
const output = process.env.QA_SCREENSHOTS;
if (output) await mkdir(output, { recursive: true });
let app, server, browser;
try {
  let baseURL = process.env.QA_BASE;
  if (!baseURL) {
    const social = process.env.QA_SOCIAL === 'off' ? '' : 'fixture';
    Object.assign(process.env, { NODE_ENV: 'production', GITHUB_CLIENT_ID: social, GITHUB_CLIENT_SECRET: social, QQ_APP_ID: social, QQ_APP_KEY: social });
    app = require('next')({ dev: false });
    await app.prepare();
    server = createServer(app.getRequestHandler());
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    baseURL = `http://127.0.0.1:${server.address().port}`;
    process.env.APP_ORIGIN = baseURL;
  }
  browser = await (process.env.QA_BROWSER === 'webkit' ? webkit : chromium).launch();
  const geometries = { card: '.auth-card', image: '.auth-story img', tabs: '.auth-mode-tabs', name: 'input[autocomplete=username]', password: 'input[name=password]', visibility: '.auth-password-visibility', submit: '.auth-submit', social: '.auth-social' };
  for (const [width, height] of [[1920,1080],[1728,1120],[1280,800],[768,900],[390,844],[320,568],[667,375]]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height }, hasTouch: width < 768 });
    try {
      const page = await context.newPage();
      const tabs = page.getByRole('navigation', { name: '账号入口' });
      const snapshot = async (mode) => {
        await page.locator(`main[data-auth-mode="${mode}"]`).waitFor();
        await page.locator('.auth-story img').evaluate(img => img.decode());
        await page.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
        return page.evaluate(({ geometries, mode }) => {
          const boxes = Object.fromEntries(Object.entries(geometries).flatMap(([key, selector]) => {
            const element = document.querySelector(selector);
            if (!element) return [];
            const { x,y,width,height } = element.getBoundingClientRect();
            return [[key, { x,y,width,height }]];
          }));
          const active = document.querySelector('.auth-mode-tabs [aria-current=page]');
          const style = getComputedStyle(active);
          return { boxes, x:scrollX, y:scrollY, overflow: document.documentElement.scrollWidth - innerWidth,
            active: new URL(active.href).pathname === `/${mode}`, height: active.offsetHeight,
            pill: parseFloat(style.borderRadius) > 20 && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.borderBottomWidth === '0px' };
        }, { geometries, mode });
      };
      for (const first of ['login','register']) {
        await page.goto(`/${first}`);
        const baseline = await snapshot(first);
        const { boxes } = baseline;
        assert(boxes.tabs.width <= 187 && boxes.name.width <= 561);
        if (!process.env.QA_BASE && width >= 1280) {
          assert(boxes.card.width >= .93 * width && boxes.card.width <= .95 * width, 'desktop card should use the viewport');
          assert(boxes.card.y < 110 && boxes.card.height >= height * .81, 'avoid oversized margins above and below the card');
          assert(boxes.name.width >= 440 && boxes.name.height >= 56 && boxes.submit.height >= 56, 'form itself should scale up');
        }
        if (!process.env.QA_BASE) assert.equal(Boolean(boxes.social), process.env.QA_SOCIAL !== 'off');
        const stable = async mode => {
          const now = await snapshot(mode);
          assert(now.active && now.pill && now.height >= 44, `missing selected pill: ${mode}`);
          assert(now.overflow <= 0 && now.x === baseline.x && now.y === baseline.y, `unexpected scroll: ${width}`);
          assert(Math.abs(now.boxes.card.x-boxes.card.x)<.5 && Math.abs(now.boxes.card.y-boxes.card.y)<.5);
          assert(Math.abs(now.boxes.card.height-boxes.card.height)<=(width<761?96:.5));
          for (const key of ['image','tabs','name','password','visibility']) {
            if (boxes[key]) for (const axis of ['x','y','width','height']) {
              assert(Math.abs(now.boxes[key][axis] - boxes[key][axis]) < .5, `${width} ${mode}: ${key}.${axis} moved`);
            }
          }
          const extra=now.boxes.password.height + 26 + (width<=760 ? 14 : 17);
          const actionShift=(Number(mode==='register')-Number(first==='register')) * extra;
          for(const key of ['submit','social']) if(boxes[key]) {
            assert(Math.abs(now.boxes[key].y - boxes[key].y - actionShift)<.5, `Only confirmation may shift ${key}`);
          }
          if (mode === 'register') {
            const confirm = await page.locator('input[name=confirmPassword]').boundingBox();
            assert(confirm.y >= now.boxes.password.y + now.boxes.password.height + 4);
            assert(Math.abs(confirm.width - now.boxes.name.width) < .5 && confirm.x === now.boxes.name.x);
            assert(await page.locator('.auth-password-visibility').evaluate(e => { const a=e.getBoundingClientRect(), p=document.querySelector('#auth-password').getBoundingClientRect(); return Math.abs((a.top+a.height/2)-(p.top+p.height/2))<1; }), 'Password visibility is not attached to the password field');
          }
        };
        await stable(first);
        if (first === 'register') {
          const password = page.locator('#auth-password'), confirm = page.locator('#auth-confirm-password');
          await page.getByRole('button', { name:'显示密码' }).click();
          assert.equal(await password.getAttribute('type'), 'text');
          assert.equal(await confirm.getAttribute('type'), 'text');
          await page.getByRole('button', { name:'隐藏密码' }).click();
          // This branch only validates mismatched input on loopback. Never submit on production.
          if (!process.env.QA_BASE && width === 390) {
            await page.locator('input[autocomplete=username]').fill('layout_check');
            await password.fill('test-value-one'); await confirm.fill('test-value-two');
            await page.locator('.auth-submit').click(); await page.getByRole('form').getByRole('alert').waitFor();
            assert.match(await page.getByRole('form').getByRole('alert').innerText(), /不一致/);
            await page.reload(); await stable(first);
          }
          // The reveal button can be below the fold in landscape: undo its test-induced scroll.
          await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo({top:0, behavior:'instant'}); });
        }
        const image = await page.locator('.auth-story img').elementHandle();
        const other = first === 'login' ? 'register' : 'login';
        for (const mode of [other,first,other]) {
          await tabs.locator(`[href="/${mode}"]`).click(); await stable(mode);
        }
        await page.goBack(); await stable(first);
        await page.goForward(); await stable(other);
        assert(await image.evaluate(el => el === document.querySelector('.auth-story img')), 'art remounted');
        if (output && [1920,1728,390,320].includes(width)) await page.screenshot({path: path.join(output, `${other}-${width}.png`)});
      }
      console.log(`PASS ${width}×${height}: direct entry, selected button, repeated switches, history, stable coordinates and scroll`);
    } finally { await context.close(); }
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await app?.close();
}
