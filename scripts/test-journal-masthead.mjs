// Exercises the real production bundle with isolated UI fixtures on loopback.
// QA_BASE instead runs read-only guest checks against an existing deployment.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.QA_PLAYWRIGHT_MODULE || 'playwright-core');
const external = Boolean(process.env.QA_BASE), output = process.env.QA_SCREENSHOTS;
const dimensions = [[540,720],[800,520],[512,512]];
const items = dimensions.map(([width,height],i) => ({id:`print-${i}`, userId:'tester', title:['山间小屋','草地','海洋'][i], tags:[], location:'', content:'', visibility:'public', pinned:false, user:{username:'tester'}, happenedAt:'2026-11-18T10:00:00Z', assets:[{id:`img-${i}`,filename:`photo-${i}.jpg`,mime:'image/jpeg',url:`/journal-fixture-${i}.jpg`,width,height}]}));
let app,server,browser;
try {
  let baseURL = process.env.QA_BASE;
  if (!baseURL) {
    process.env.NODE_ENV='production'; app=require('next')({dev:false}); await app.prepare();
    server=createServer(app.getRequestHandler()); server.listen(0,'127.0.0.1'); await once(server,'listening');
    baseURL=`http://127.0.0.1:${server.address().port}`;
  }
  if (output) await mkdir(output,{recursive:true});
  browser=await chromium.launch();
  const samples=external ? [] : await Promise.all(dimensions.map(([w,h],i)=>require('sharp')(`public/visuals/auth-${['grassland','forest','ocean'][i]}.webp`).resize(w,h).jpeg().toBuffer()));
  for(const width of [1920,1280,768,390,320]) {
    const ctx=await browser.newContext({baseURL,viewport:{width,height:width>=768?900:844}, reducedMotion:'reduce'});
    const page=await ctx.newPage(); page.setDefaultTimeout(10000);
    if(!external){
      await page.route('**/api/auth/me',r=>r.fulfill({json:{user:{id:'tester',username:'tester',email:null}}}));
      await page.route('**/api/memories?*',r=>r.fulfill({json:{items,nextCursor:null}}));
      await page.route('**/journal-fixture-*.jpg*',r=>r.fulfill({body:samples[Number(r.request().url().match(/fixture-(\d+)\.jpg/)[1])], contentType:'image/jpeg'}));
    }
    try {
      for(const scope of ['mine','public']) {
        await page.goto(`/memories?scope=${scope}`);
        const header=page.locator('header.journal-masthead');
        await header.getByRole('heading',{name:scope==='mine'?'我的日常':'发现日常'}).waitFor();
        const image=header.locator('.journal-cover-film img'); await image.evaluate(img=>img.decode());
        const frame=await header.boundingBox(), film=await image.boundingBox();
        assert(frame.height>=200 && frame.height<=400 && (width < 1500 || frame.width>1300), JSON.stringify(frame));
        assert(film.width>frame.width*.75 && Math.abs(film.height-frame.height)<1);
        for(const ctl of await header.locator('h1,.journal-masthead-actions > *, .journal-scope-switch').all()) {
          const b=await ctl.boundingBox(); assert(b.x>=frame.x && b.y>=frame.y && b.x+b.width<=frame.x+frame.width+1 && b.y+b.height<=frame.y+frame.height+1);
        }
        const video=header.locator('video'); assert.equal(await video.getAttribute('src'),null,'reduced motion should not fetch film');
        if (width===1280 || width===390) {
          await page.emulateMedia({reducedMotion:'no-preference'});
          await page.waitForFunction(()=>{const v=document.querySelector('.journal-cover-film video');return v?.dataset.live && v.currentTime>.15;});
          const t=await video.evaluate(v=>v.currentTime); await page.waitForFunction(t=>document.querySelector('.journal-cover-film video').currentTime>t+.25,t);
          await page.emulateMedia({reducedMotion:'reduce'});
        }
        await header.locator('.journal-cover-photo').click({position:{x:12,y:12}});
        const viewer=page.locator('dialog.immersive-viewer[open]'); await viewer.waitFor();
        await viewer.locator('.immersive-stage').click(); await viewer.waitFor({state:'hidden'});
        if(external && scope==='mine') {await header.locator('a[href="/login"]').waitFor();continue;}
        const month=header.getByRole('button',{name:'按月浏览'}); await month.click(); assert.equal(await month.getAttribute('aria-expanded'),'true'); await month.click();
        if(!external && scope==='public' && width===390){ await header.locator('.journal-main-action').click(); await page.waitForURL('**/memories/print-*'); }
        for(const view of ['grid','timeline','gallery']) {
          await page.goto(`/memories?scope=${scope}&view=${view}`);
          const card=page.locator(view==='grid'?'.projection-contact-photo':'.journal-mounted-photo').first();
          await card.scrollIntoViewIfNeeded();
          const fg=card.locator(view==='grid'?'.contact-print img':':scope > .decoded-image img'), bg=card.locator(view==='grid'?'.contact-backdrop img':'.journal-photo-matte img');
          await fg.evaluate(img=>img.decode()); await bg.evaluate(img=>img.decode());
          assert.equal(await fg.evaluate(e=>e.currentSrc),await bg.evaluate(e=>e.currentSrc));
          assert.equal(await fg.evaluate(e=>getComputedStyle(e).objectFit),'contain');
          assert.equal(await fg.evaluate(e=>getComputedStyle(e).filter),'none');
          assert.match(await bg.evaluate(e=>getComputedStyle(e).filter+' '+getComputedStyle(e.parentElement).filter),/blur\(/);
          if(view!=='grid') {
            const box=await card.boundingBox(),inner=await fg.boundingBox();
            assert(box.height>=115 && inner.width<box.width-6 && inner.height<box.height-6, JSON.stringify({width,view,box,inner}));
            if(view==='timeline' && !external) assert(box.width/box.height<1.3,'portrait must not sit in a horizontal strip');
          }
          await card.click(); await viewer.waitFor(); await viewer.locator('.immersive-stage').click(); await viewer.waitFor({state:'hidden'});
          assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
          if(output && scope==='public' && [390,1920].includes(width)){await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(output,`${view}-${width}.png`)});}
        }
      }
      console.log(`PASS ${width}px: panoramic covers, in-frame actions, photo viewer, mounted grid/timeline/wall photos`);
    } finally {await ctx.close();}
  }
} catch(e){console.error(e);process.exitCode=1;} finally {await browser?.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await app?.close();}
