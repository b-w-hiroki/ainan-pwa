import assert from 'node:assert/strict'
import { delimiter, join } from 'node:path'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { renderDensity } from '../fishing-game/js/presentation/denseRendering.js'
const bin=process.env.PATH.split(delimiter).find(dir=>existsSync(join(dir,'playwright'))||existsSync(join(dir,'playwright.cmd')))
assert.ok(bin)
const {chromium}=await import(pathToFileURL(join(bin,'..','playwright','index.mjs')).href)
const base=process.env.QA_URL??'http://127.0.0.1:4173'
const out='artifacts/dense-rendering'
mkdirSync(out,{recursive:true})
const evidence=[]
const browser=await chromium.launch({headless:true})
async function inspect(page,dpr,baseline=false) {
 const state=await page.evaluate(()=>{
  const g=window.__game,r=g.canvas.getBoundingClientRect()
  return {width:g.scale.width,height:g.scale.height,renderer:[g.renderer.width,g.renderer.height],
   backing:[g.canvas.width,g.canvas.height],css:[r.width,r.height],density:g._denseRendering.density}
 })
 const density=renderDensity(state.width,state.height,baseline?1:dpr)
 assert.equal(state.density,density)
 assert.deepEqual(state.backing,[Math.round(state.width*density),Math.round(state.height*density)])
 assert.deepEqual(state.renderer,[state.width,state.height])
 return state
}
try {
 for(const dpr of [1,1.25,2,3]) {
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:dpr})
  const page=await context.newPage()
  const errors=[]
  page.on('pageerror',e=>{if(e.message!=='service worker disabled in QA')errors.push(e.message)})
  await page.addInitScript(()=>localStorage.setItem('ainan_character_appearance','cute-b-01'))
  try {
   const phases=dpr===2?['cast','retrieve','battle','result']:['cast']
   for(const phase of phases) {
    await page.goto(`${base}/fishing-game/?qa=1&scene=GameScene&qaMockPhase=${phase}`)
    await page.waitForFunction(p=>window.__game?.scene.getScene('GameScene')?.phase===p,phase)
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))
    const state=await inspect(page,dpr)
    assert.deepEqual([state.width,state.height],[390,844])
    assert.deepEqual(state.css,[390,844])
    await page.screenshot({path:`${out}/${phase}-dpr${dpr}.png`})
    evidence.push({phase,dpr,...state})
   }
   if(dpr===2) {
    // Verify native-size offscreen targets, then restoration to the dense screen.
    const target=await page.evaluate(()=>{
     const r=window.__game.renderer,gl=r.gl
     r.beginCapture(64,32)
     const viewport=Array.from(gl.getParameter(gl.VIEWPORT))
     gl.disable(gl.SCISSOR_TEST)
     gl.clearColor(1,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT)
     const pixel=new Uint8Array(4)
     gl.readPixels(63,31,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel)
     r.endCapture();r.resetViewport();r.resetScissor()
     return {viewport,pixel:[...pixel],restored:[...gl.getParameter(gl.VIEWPORT)],height:r.drawingBufferHeight}
    })
    assert.deepEqual(target,{viewport:[0,0,64,32],pixel:[255,0,0,255],restored:[0,0,780,1688],height:844})
    evidence.push({offscreen:target})
    for(const scene of ['HomeScene','MapScene','TownScene','CollectionScene','MenuScene','SettingsScene','MissionScene','UpgradeScene']) {
     await page.goto(`${base}/fishing-game/?qa=1&scene=${scene}`)
     await page.waitForFunction(key=>window.__game?.scene.isActive(key),scene)
     await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))
     evidence.push({scene,...await inspect(page,dpr)})
     await page.screenshot({path:`${out}/${scene}.png`})
    }
    // A real Home CTA must still land on its expected scene at 2x density.
    await page.goto(`${base}/fishing-game/?qa=1&scene=HomeScene`)
    await page.waitForFunction(()=>window.__game?.scene.isActive('HomeScene'))
    const destination=await page.evaluate(()=>{
     const s=window.__game.scene.getScene('HomeScene');s._dismissDailyBonus();return s._journey.scene
    })
    await page.mouse.click(195,844*0.805)
    await page.waitForFunction(key=>window.__game.scene.isActive(key),destination)
    // Context restoration reuses the same logical projection and input scale.
    await page.evaluate(()=>{
     const gl=window.__game.renderer.gl,ext=gl.getExtension('WEBGL_lose_context')
     if(!ext)throw Error('Context loss test unavailable')
     window.__denseRestored=false
     window.__game.renderer.once('restorewebgl',()=>window.__denseRestored=true)
     ext.loseContext();setTimeout(()=>ext.restoreContext(),150)
    })
    await page.waitForFunction(()=>window.__denseRestored===true)
    await inspect(page,dpr)
    await page.screenshot({path:`${out}/context-restored.png`})
    // Native landscape uses the same coordinate system before/after rotation.
    await page.goto(`${base}/fishing-game/?qa=1&scene=GameScene&cameraPan=1&coneLoop=1`)
    await page.waitForFunction(()=>window.__game?.scene.getScene('GameScene')._coneCastHudNodes)
    for(const [width,height] of [[844,390],[932,430],[390,844]]) {
     await page.setViewportSize({width,height})
     await page.waitForFunction(w=>window.__game.scale.width===w,width)
     evidence.push({rotation:[width,height],...await inspect(page,dpr)})
     await page.screenshot({path:`${out}/rotate-${width}x${height}.png`})
    }
    assert.deepEqual(await page.evaluate(()=>{
     const s=window.__game.scene.getScene('GameScene')
     return [s._cameraPanHudNodes.location.style.resolution,s._coneCastHudNodes.label.style.resolution]
    }),[2,2],'HUD text textures must match the dense framebuffer')
    // Same-size surface must not drift after resize/restore or report GL errors.
    assert.equal(await page.evaluate(()=>window.__game.renderer.gl.getError()),0)
   }
   assert.deepEqual(errors,[])
  } finally {await context.close()}
 }
 // Normal startup must also work without any QA flags or prepared saves.
 const normal=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2})
 const normalErrors=[]
 normal.on('pageerror',e=>normalErrors.push(e.message))
 try {
  await normal.goto(`${base}/fishing-game/`)
  await normal.waitForFunction(()=>window.__game?.scene.isActive('TitleScene'))
  const state=await inspect(normal,2)
  assert.deepEqual([state.width,state.height],[390,844])
  assert.equal(await normal.evaluate(()=>location.search),'')
  await normal.screenshot({path:`${out}/normal-title.png`})
  await normal.mouse.click(195,844*0.735)
  await normal.waitForFunction(()=>window.__game.scene.isActive('HomeScene'))
  await normal.screenshot({path:`${out}/normal-home.png`})
  assert.deepEqual(normalErrors,[])
  evidence.push({normalStartup:true,homeReachedByRealTap:true,...state})
 } finally {await normal.close()}
 writeFileSync(`${out}/evidence.json`,JSON.stringify(evidence,null,2)+'\n')
 console.log('Dense rendering: DPR1/1.25/2/3; phases, scenes, real tap, rotation, offscreen and context restore passed')
} finally {await browser.close()}
