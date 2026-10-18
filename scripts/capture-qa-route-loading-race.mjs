import assert from 'node:assert/strict'
import { delimiter, join } from 'node:path'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const bin = process.env.PATH.split(delimiter).find(dir => existsSync(join(dir,'playwright')) || existsSync(join(dir,'playwright.cmd')))
assert.ok(bin)
const { chromium } = await import(pathToFileURL(join(bin,'..','playwright','index.mjs')).href)
const base = process.env.QA_URL ?? 'http://127.0.0.1:4173'
const output = 'artifacts/qa-route-loading'
mkdirSync(output,{recursive:true})
const browser = await chromium.launch({headless:true})
const evidence=[]
try {
 for (const delay of ['town','title','none']) {
  for (const fish of ['aji','kanpachi']) {
   const page=await browser.newPage({viewport:{width:390,height:844}})
   const errors=[]
   page.on('pageerror',e=>errors.push(e.message))
   try {
    if(delay!=='none') {
     const asset=delay==='town'?'bg_town_growing.svg':'bg_title_harbor_morning.png'
     await page.route(`**/${asset}`,async route=>{
      const response=await route.fetch()
      await new Promise(resolve=>setTimeout(resolve,1200))
      await route.fulfill({response})
     })
    }
    await page.goto(`${base}/fishing-game/?qa=1&scene=TownScene&qaCatchArrival=${fish}`)
    try {
     await page.waitForFunction(id=>{
      const town=window.__game?.scene.getScene('TownScene')
      return town?.sys.isActive()&&town._qaCatchArrivalSnapshot?.fishId===id
     },fish,{timeout:6000})
    } catch(error) {
     const state=await page.evaluate(()=>window.__game?.scene.scenes.map(s=>({scene:s.sys.settings.key,status:s.sys.settings.status,arrival:s._qaCatchArrivalSnapshot??null})))
     await page.screenshot({path:`${output}/failed-${delay}-${fish}.png`})
     throw new Error(JSON.stringify({delay,fish,errors,state}),{cause:error})
    }
    const state=await page.evaluate(()=>window.__game.scene.getScene('TownScene')._qaCatchArrivalSnapshot)
    assert.equal(state.fishTexture,`fish_${fish}_icon`)
    assert.equal(state.speciesReaction,true)
    // Built preview injects Workbox registration; index.html deliberately
    // rejects it in QA. Keep every other page error fatal, and independently
    // verify that this documented rejection leaves no worker in control.
    assert.deepEqual(errors.filter(error=>error!=='service worker disabled in QA'),[])
    const worker=await page.evaluate(async()=>({
     controlled:Boolean(navigator.serviceWorker?.controller),
     registrations:(await navigator.serviceWorker?.getRegistrations?.()??[]).length,
    }))
    assert.deepEqual(worker,{controlled:false,registrations:0})
    await page.screenshot({path:`${output}/${delay}-${fish}.png`})
    evidence.push({delay,delayMs:delay==='none'?0:1200,fish,state,errors,worker})
   } finally {await page.close()}
  }
 }
 for(const query of ['?qa=1&scene=TitleScene','?scene=TownScene&qaCatchArrival=aji']) {
  const page=await browser.newPage({viewport:{width:390,height:844}})
  try {
   await page.goto(`${base}/fishing-game/${query}`)
   await page.waitForFunction(()=>window.__game?.scene.getScene('TitleScene')?.sys.isActive(),null,{timeout:10000})
   await page.waitForTimeout(1100)
   const active=await page.evaluate(()=>window.__game.scene.getScenes(true).map(s=>s.sys.settings.key))
   assert.deepEqual(active,['TitleScene'])
   evidence.push({query,active})
  } finally {await page.close()}
 }
 writeFileSync(`${output}/evidence.json`,JSON.stringify(evidence,null,2)+'\n')
 console.log('QA scene arrival preserved across slow Town, slow Title and normal loading:',evidence.length)
} finally {await browser.close()}
