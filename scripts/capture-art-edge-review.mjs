import assert from 'node:assert/strict'
import { delimiter, join } from 'node:path'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const bin = process.env.PATH.split(delimiter).find(dir => existsSync(join(dir,'playwright')) || existsSync(join(dir,'playwright.cmd')))
assert.ok(bin)
const { chromium } = await import(pathToFileURL(join(bin,'..','playwright','index.mjs')).href)
// Source art is served by Vite dev; unapproved originals are not copied to dist.
const base = process.env.ART_EDGE_QA_URL ?? 'http://127.0.0.1:5173'
const out = 'artifacts/art-edge-review'
mkdirSync(out,{recursive:true})
const browser = await chromium.launch({headless:true})
try {
 const page = await browser.newPage({viewport:{width:1200,height:900}})
 await page.goto('about:blank')
 await page.setContent(`<style>body{margin:0;background:#dce9ef;font:16px sans-serif}main{display:flex;gap:12px;padding:12px}.panel{width:380px;height:850px;overflow:hidden;position:relative;background:white}.dark{background:#073754;color:white}h3{margin:12px}img{position:absolute;max-width:none;width:1254px;left:-425px;top:-90px}.small img{width:300px;left:30px;top:80px}.small{background:#91e5f0}</style><main><section class=panel><h3>Source, actual alpha on white, 1:1</h3><img src="${base}/docs/art-source/w03-cute-body/W03-CUTE-B-idle-01.png"></section><section class="panel dark"><h3>Source, actual alpha on sea blue, 1:1</h3><img src="${base}/docs/art-source/w03-cute-body/W03-CUTE-B-idle-01.png"></section><section class="panel small"><h3>Source at 300px</h3><img src="${base}/docs/art-source/w03-cute-body/W03-CUTE-B-idle-01.png"></section></main>`)
 await page.evaluate(()=>Promise.all([...document.images].map(im=>im.decode())))
 await page.screenshot({path:`${out}/alpha-backgrounds.png`})
 const evidence=[]
 for(const dpr of [1,2]) {
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:dpr})
  const game=await context.newPage()
  await game.addInitScript(()=>localStorage.setItem('ainan_character_appearance','cute-b-01'))
  await game.goto(`${base}/fishing-game/?qa=1&scene=GameScene&qaMockPhase=cast`)
  await game.waitForFunction(()=>window.__game?.scene.getScene('GameScene').phase==='cast')
  await game.waitForFunction(()=>window.__game.scene.getScene('GameScene')._castPresentationHost?.nodes.characterMotion?.cute)
  await game.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
  await game.evaluate(()=>window.__game.scene.getScene('GameScene').scene.pause())
  evidence.push(await game.evaluate(()=>{
   const canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect()
   return {dpr:devicePixelRatio,backingWidth:canvas.width,backingHeight:canvas.height,cssWidth:r.width,cssHeight:r.height,antialias:window.__game.config.antialias,roundPixels:window.__game.config.roundPixels}
  }))
  await game.screenshot({path:`${out}/game-before-dpr${dpr}.png`})
  const replaced=await game.evaluate(async url=>{
   const s=window.__game.scene.getScene('GameScene')
   const image=new Image();image.src=url;await image.decode()
   s.textures.addImage('edge_review_soft_water',image)
   let count=0
   const visit=(node,parentVisible=true)=>{
    const visible=parentVisible&&node.visible!==false&&node.alpha!==0
    if(visible&&node.texture?.key==='character_preview_harbor_morning') {
     const bounds=[node.x,node.y,node.displayWidth,node.displayHeight]
     node.setTexture('edge_review_soft_water')
     if(JSON.stringify(bounds)!==JSON.stringify([node.x,node.y,node.displayWidth,node.displayHeight])) throw Error('Review texture changed background geometry')
     count++
    }
    if(Array.isArray(node.list))node.list.forEach(child=>visit(child,visible))
   }
   s.children.list.forEach(node=>visit(node))
   return count
  },`${base}/docs/art-source/harbor-soft-water-v1/harbor-morning-soft-water.png`)
  assert.equal(replaced,1,'review must replace exactly one existing background owner')
  await game.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
  await game.screenshot({path:`${out}/game-after-dpr${dpr}.png`})
  await context.close()
 }
 writeFileSync(`${out}/render-evidence.json`,JSON.stringify(evidence,null,2)+'\n')
 console.log(JSON.stringify(evidence))
 console.log('Saved source alpha composites and normal actor rendering for visual edge review')
} finally {await browser.close()}
