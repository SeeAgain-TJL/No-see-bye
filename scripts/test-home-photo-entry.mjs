// Production bundle and fixture-only photos; never modifies a deployed site.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.QA_PLAYWRIGHT_MODULE || 'playwright-core');
const sharp = require('sharp');
const output = process.env.QA_SCREENSHOTS;
const ratios = [[640,480],[480,640],[600,600],[640,428]];
const samples = await Promise.all(ratios.map(([width,height], i) => sharp(`public/visuals/auth-${['grassland','forest','ocean','rift'][i]}.webp`).resize(width,height).webp().toBuffer()));
const items = Array.from({ length: 8 }, (_, i) => {
  const [width,height] = ratios[i % ratios.length];
  return { id:`home-${i}`, userId:'other', user:{username:'other'}, title:`测试相片 ${i+1}`, visibility:'public', tags:[], happenedAt:'2026-11-18T10:00:00Z',
    assets:[{id:`img-${i}`,filename:`print-${i}.webp`,mime:'image/webp',url:`/home-photo-fixture-${i}.webp`,width,height}] };
});
let app, server, browser;
try {
  process.env.NODE_ENV = 'production';
  app = require('next')({ dev:false });
  await app.prepare();
  server = createServer(app.getRequestHandler()); server.listen(0,'127.0.0.1'); await once(server,'listening');
  const baseURL = `http://127.0.0.1:${server.address().port}`;
  if (output) await mkdir(output,{ recursive:true });
  browser = await chromium.launch();
  for (const width of [1920, 1280, 390, 320]) {
    const ctx = await browser.newContext({ baseURL, viewport:{width,height:width>=1280?1080:844}, reducedMotion:width===1920?'no-preference':'reduce', hasTouch:width<760 });
    const page = await ctx.newPage(); page.setDefaultTimeout(8000);
    const auth = Promise.withResolvers(), firstPreview = Promise.withResolvers();
    try {
      await page.route('**/api/auth/me',async route=>{ await auth.promise; await route.fulfill({json:{user:null}}); });
      await page.route('**/api/memories?*',route=>route.fulfill({json:{items,nextCursor:null}}));
      await page.route('**/home-photo-fixture-*.webp*',async route=>{
        const n = Number(route.request().url().match(/fixture-(\d+)/)[1]);
        if(n===0) await firstPreview.promise;
        await route.fulfill({body:samples[n % samples.length],contentType:'image/webp'});
      });
      let filmRequested = false;
      await page.route('**/visuals/films/*.mp4',route=>{ filmRequested = true; return route.abort(); });
      const previewRequested = page.waitForRequest(req=>req.url().includes('home-photo-fixture-0.webp?variant=preview'));
      await page.goto('/',{waitUntil:'domcontentloaded'});
      await previewRequested; // Session response is still held: no serial dependency.
      assert.equal(filmRequested,false,'decorative movie started ahead of the first thumbnail');
      const cards = page.locator('.projection-contact-grid .projection-contact-card');
      assert.equal(await cards.count(),8);
      const pics = cards.locator('.contact-print img');
      assert.deepEqual(await pics.evaluateAll(imgs=>imgs.map(img=>img.loading)),Array.from({length:8},(_,i)=>i<4?'eager':'lazy'));
      // Entrance/hover transforms don't change which grid row a print occupies.
      const layout = await cards.evaluateAll(elements=>elements.map(el=>({top:el.offsetTop,ratio:el.offsetWidth/el.offsetHeight})));
      assert.equal(layout.filter(({top})=>Math.abs(top-layout[0].top)<1).length,width>=1280?4:2);
      assert(layout.every(({ratio})=>Math.abs(ratio-.8)<.015));
      const cta = page.getByRole('link',{name:'查看照片',exact:true});
      assert((await cta.boundingBox()).height>=44);
      assert.equal(await cta.getAttribute('href'),'/memories?scope=public&type=photo&view=gallery');
      firstPreview.resolve();
      await cards.first().locator('.contact-print .decoded-image[data-state=ready]').waitFor();
      const printRatio = await pics.first().evaluate(img => img.clientWidth / img.clientHeight);
      assert(Math.abs(printRatio - ratios[0][0] / ratios[0][1]) < .02, 'the preview should retain its original proportions');
      auth.resolve();
      if (width===1920) await page.waitForFunction(()=>document.querySelector('.living-photo-render')?.getAttribute('src')?.endsWith('.mp4'));
      else assert.equal(await page.locator('.living-photo-render').getAttribute('src'),null);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
      if (output && [1920,390].includes(width)) {
        await page.locator('.projection-contact-heading').evaluate(el=>el.scrollIntoView({behavior:'instant'}));
        await pics.evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
        await page.screenshot({path:path.join(output,`home-${width}.png`),animations:'disabled'});
      }
      await cards.first().getByRole('button').click();
      const modal = page.locator('dialog.immersive-viewer[open]');
      await modal.waitFor();
      await modal.locator('.immersive-stage').click(); await modal.waitFor({state:'hidden'});
      await cta.click();
      await page.locator('.photo-wall').waitFor();
      console.log(`PASS ${width}px: parallel guest fetch, first image priority, ${width>=1280?4:2} columns, photo viewer and gallery CTA`);
    } finally { auth.resolve(); firstPreview.resolve(); await ctx.close(); }
  }
  // An authenticated result must replace the in-flight guest query, not mix with it.
  const ctx = await browser.newContext({ baseURL, viewport:{width:1280,height:800}, reducedMotion:'reduce' });
  const session = Promise.withResolvers(), guest = Promise.withResolvers();
  try {
    const page = await ctx.newPage();
    await page.route('**/api/auth/me', async route => {
      await session.promise;
      await route.fulfill({json:{user:{id:'owner',username:'owner',role:'USER'}}});
    });
    await page.route('**/api/memories?*', async route => {
      const scope = new URL(route.request().url()).searchParams.get('scope');
      if (scope === 'public') {
        await guest.promise;
        await route.fulfill({json:{items,nextCursor:null}}).catch(() => {});
      } else {
        await route.fulfill({json:{items:[{...items[0],userId:'owner',title:'仅我可见的照片',visibility:'private'}],nextCursor:null}});
      }
    });
    await page.route('**/home-photo-fixture-*.webp*',route=>route.fulfill({body:samples[0],contentType:'image/webp'}));
    const guestRequested = page.waitForRequest('**/api/memories?scope=public&type=photo');
    await page.goto('/',{waitUntil:'domcontentloaded'});
    await guestRequested;
    session.resolve();
    const heading = page.getByRole('heading',{name:'近来拾光',exact:true});
    await heading.waitFor();
    guest.resolve();
    const cards = page.locator('.projection-contact-grid .projection-contact-card');
    await cards.filter({hasText:'仅我可见的照片'}).waitFor();
    assert.equal(await cards.count(),1);
    assert.equal(await page.getByRole('link',{name:'查看照片',exact:true}).getAttribute('href'),'/memories?scope=mine&type=photo&view=gallery');
    console.log('PASS authenticated home: separate photo scope and album destination');
  } finally { session.resolve(); guest.resolve(); await ctx.close(); }
} catch(error) { console.error(error); process.exitCode=1; }
finally { await browser?.close(); if(server){server.closeAllConnections(); await new Promise(resolve=>server.close(resolve));} await app?.close(); }
