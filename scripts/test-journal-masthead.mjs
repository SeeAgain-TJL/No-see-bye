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
    const ctx=await browser.newContext({baseURL,viewport:{width,height:width>=768?900:844}, reducedMotion:'reduce', hasTouch:width<760});
    const page=await ctx.newPage(); page.setDefaultTimeout(10000);
    if(!external){
      await page.route('**/api/auth/me',r=>r.fulfill({json:{user:{id:'tester',username:'tester',email:null}}}));
      await page.route('**/api/memories?*',r=>r.fulfill({json:{items,nextCursor:null}}));
      await page.route(/\/api\/memories\/print-\d+(?:\/engagement)?(?:\?|$)/, async route => {
        const url = new URL(route.request().url());
        const item = items.find(entry => url.pathname.split('/')[3] === entry.id);
        if (url.pathname.endsWith('/engagement')) {
          if (route.request().method() === 'PUT') {
            const { kind, active } = route.request().postDataJSON();
            return route.fulfill({ json: { likes: kind === 'like' && active ? 1 : 0, comments: 0, liked: kind === 'like' && active, saved: kind === 'save' && active } });
          }
          return route.fulfill({ json: { items: [], nextCursor: null } });
        }
        return route.fulfill({ json: item });
      });
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
        if(!external && scope==='public' && width===390){
          await header.locator('.journal-main-action').tap();
          await page.waitForURL(url => url.pathname.startsWith('/memories/print-') && url.searchParams.get('scope') === 'public');
          await page.locator('.public-comments').waitFor();
          assert.equal(await page.locator('.detail-actions').count(),0);
        }
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
          if(view==='grid' && !external) {
            const mount=await card.boundingBox(), print=await fg.boundingBox();
            const row=await page.locator('.memory-feed.grid').boundingBox();
            assert(Math.abs(mount.width / mount.height - .8)<.02, 'mount should scale proportionally');
            assert(Math.abs(print.width / print.height - .75)<.02, 'portrait must preserve the source ratio');
            if (width===1920) assert(mount.width<row.width*.26, 'desktop grid should have four smaller mounts');
            if (scope==='mine') {
              assert.equal(await page.locator('.journal-entry-actions').count(),0);
              const trigger=page.getByRole('button',{name:'更多日常操作'}).first();
              assert((await trigger.boundingBox()).height>=44);
              if(width<760) await trigger.tap();
              else { await trigger.focus(); await page.keyboard.press('Enter'); }
              const menu=page.getByRole('dialog',{name:'日常操作'});
              await menu.getByRole('link',{name:'编辑'}).waitFor();
              await menu.getByRole('button',{name:'移到回收站'}).click();
              const confirm=page.getByRole('dialog',{name:'移到回收站？'});
              await confirm.getByRole('button',{name:'再想想'}).click();
              await confirm.waitFor({state:'hidden'});
            } else {
              assert.equal(await page.getByRole('button',{name:'更多日常操作'}).count(),0);
              const actions=page.getByRole('group',{name:'公开日常互动'}).first();
              await actions.getByRole('button',{name:/^点赞/}).click();
              await actions.getByRole('button',{name:/^取消点赞/}).waitFor();
              assert(await actions.getByRole('link',{name:'评论',exact:true}).getAttribute('href') === '/memories/print-0?scope=public#comments');
            }
          }
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
      if (!external && [1920,390].includes(width)) {
        await page.goto('/');
        const play=page.getByRole('button',{name:'自动播放照片，每张停留2秒'});
        await play.waitFor();
        await page.waitForFunction(() => [...document.querySelectorAll('.gallery-photo[data-current=true] img')].some(img => img.complete && img.naturalWidth > 0));
        assert.equal(await page.locator('.gallery-playback-progress').count(),0);
        const grid=await page.locator('.projection-contact-grid').boundingBox(), sheet=await page.locator('.projection-contact-sheet').boundingBox();
        assert(grid.width/sheet.width<=.93,'home photo mounts should leave breathing room');
        if (width===1920) {
          await page.emulateMedia({reducedMotion:'no-preference'});
          const next=page.getByRole('button',{name:'第2张照片',exact:true});
          await play.click(); await page.mouse.move(0,0);
          const start=performance.now();
          await page.waitForFunction(()=>document.querySelector('.gallery-contacts button:nth-child(2)')?.getAttribute('aria-pressed')==='true',{},{timeout:2900});
          assert(performance.now()-start>=1750);
          assert.equal(await next.getAttribute('aria-pressed'),'true');
        }
      }
      console.log(`PASS ${width}px: panoramic covers, in-frame actions, photo viewer, mounted grid/timeline/wall photos`);
    } finally {await ctx.close();}
  }
} catch(e){console.error(e);process.exitCode=1;} finally {await browser?.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await app?.close();}
