import assert from 'node:assert/strict'
import { existsSync, realpathSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const executable=process.env.PATH.split(':').map(p=>join(p,'playwright')).find(existsSync)
assert.ok(executable,'Playwright executable missing')
const { chromium }=await import(pathToFileURL(join(dirname(realpathSync(executable)),'index.mjs')).href)
const output='artifacts/orientation/landscape-journey'
mkdirSync(output,{recursive:true})
const browser=await chromium.launch({headless:true})
async function open(page,scene) {
  const query=new URLSearchParams({qa:'1',nativeLandscapeAll:'1',scene})
  await page.goto('http://127.0.0.1:4173/fishing-game/?'+query.toString(),{waitUntil:'domcontentloaded'})
  await page.waitForFunction(key=>window.__game?.scene?.getScene(key)?.sys?.isActive?.(),scene,{timeout:20000})
}
async function active(page,name,qaNode) {
  await page.waitForFunction(({name,qaNode})=>{
    const scene=window.__game?.scene?.getScene(name)
    return scene?.sys?.isActive?.() && scene[qaNode]
  },{name,qaNode},{timeout:10000})
}
async function point(page,name,node) {
  return page.evaluate(({name,node})=>{
    const scene=window.__game.scene.getScene(name)
    const hit=scene[node]
    if(!hit?.active||!hit.input?.enabled)throw Error('Inactive hit '+name+'.'+node)
    return {x:hit.x,y:hit.y,width:hit.width,height:hit.height}
  },{name,node})
}
async function click(page,p) {
  assert.ok(p.width>=44&&p.height>=44,'undersized real control')
  await page.mouse.click(p.x,p.y)
}
try {
  for(const [width,height] of [[844,390],[932,430]]) {
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1})
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',e=>{if(e.message!=='service worker disabled in QA')errors.push(e.message)})
    try{
      // No cameraPan or per-scene flag: the one new QA opt-in must own
      // matching DOM CSS, Phaser RESIZE and scene presentation modes.
      await open(page,'HomeScene')
      await active(page,'HomeScene','_qaNativeHomeLayout')
      const home=await page.evaluate(()=>{
        const scene=window.__game.scene.getScene('HomeScene')
        const rect=document.querySelector('#game-container canvas')?.getBoundingClientRect()
        const controls=scene._qaNativeHomeControls
        return {logical:{width:scene.scale.width,height:scene.scale.height},
          canvas:{width:rect?.width,height:rect?.height},scroll:document.body.scrollWidth,
          fish:{x:controls.fish.hit.x,y:controls.fish.hit.y,width:controls.fish.hit.width,height:controls.fish.hit.height},
          town:{x:controls.town.hit.x,y:controls.town.hit.y,width:controls.town.hit.width,height:controls.town.hit.height},
          collection:{x:controls.collection.hit.x,y:controls.collection.hit.y,width:controls.collection.hit.width,height:controls.collection.hit.height},
        }
      })
      assert.deepEqual(home.logical,{width,height},'qa all-scenes must use native logical viewport')
      assert.ok(home.canvas.width>=width-2 && home.canvas.height>=height-2,'CSS canvas disagrees with Phaser viewport')
      assert.ok(home.scroll<=width+1)
      await click(page,home.fish)
      await active(page,'MapScene','_qaNativeMapLayout')
      const map=await page.evaluate(()=>{
        const scene=window.__game.scene.getScene('MapScene')
        const hit=scene._qaNativeMapControls.pointA.hit
        return {x:hit.x,y:hit.y,width:hit.width,height:hit.height,active:hit.input?.enabled}
      })
      assert.equal(map.active,true)
      await click(page,map)
      await page.waitForFunction(()=>{
        const scene=window.__game?.scene?.getScene('GameScene')
        return scene?.sys?.isActive?.()&&scene.env?.point==='pointA'
      },null,{timeout:15000})
      const fishOut=join(output,'fishing-'+width+'x'+height+'.png')
      await page.screenshot({path:fishOut,animations:'disabled'})
      assert.ok(statSync(fishOut).size>30000,'No rendered Fishing pixels')
      // Town is entered from saved catches elsewhere; this QA handoff
      // directly stages the Town scene without granting a test fish.
      await page.evaluate(()=>window.__game.scene.getScene('GameScene').scene.start('TownScene'))
      await active(page,'TownScene','_qaNativeTownLayout')
      const townBack=await page.evaluate(()=>{
        const control=window.__game.scene.getScene('TownScene')._qaNativeTownControls.map
        return {x:control.x,y:control.y,width:control.width,height:control.height}
      })
      const townOut=join(output,'town-'+width+'x'+height+'.png')
      await page.screenshot({path:townOut,animations:'disabled'})
      assert.ok(statSync(townOut).size>30000)
      await click(page,townBack)
      await active(page,'MapScene','_qaNativeMapLayout')

      // Stage a new real Home action to Collection and its interactive fish
      // modal to confirm the shared flag survives scene transitions.
      await page.evaluate(()=>window.__game.scene.getScene('MapScene').scene.start('HomeScene'))
      await active(page,'HomeScene','_qaNativeHomeLayout')
      await click(page,home.collection)
      await active(page,'CollectionScene','_qaNativeCollectionLayout')
      const selection=await page.evaluate(()=>{
        const c=Object.values(window.__game.scene.getScene('CollectionScene')._qaNativeCollectionControls)[0].hit
        return {x:c.x,y:c.y,width:c.width,height:c.height}
      })
      await click(page,selection)
      await page.waitForFunction(()=>window.__game.scene.getScene('CollectionScene')._qaNativeCollectionModal?.active,
        null,{timeout:8000})
      const detailOut=join(output,'collection-detail-'+width+'x'+height+'.png')
      await page.screenshot({path:detailOut,animations:'disabled'})
      assert.ok(statSync(detailOut).size>30000)
      await page.mouse.click(width/2,height/2+78)
      await page.waitForFunction(()=>!window.__game.scene.getScene('CollectionScene')._qaNativeCollectionModal?.active,
        null,{timeout:8000})
      await page.evaluate(()=>window.__game.scene.getScene('CollectionScene').scene.start('MenuScene'))
      await active(page,'MenuScene','_qaNativeMenuLayout')
      const menuToSettings=await page.evaluate(()=>{
        const scene=window.__game.scene.getScene('MenuScene')
        const hit=scene._qaNativeMenuControls.SettingsScene?.hit
        return hit?{x:hit.x,y:hit.y,width:hit.width,height:hit.height}:null
      })
      assert.ok(menuToSettings,'Menu has no usable Settings navigation')
      await click(page,menuToSettings)
      await active(page,'SettingsScene','_qaNativeSettingsLayout')
      const settingsOut=join(output,'settings-'+width+'x'+height+'.png')
      await page.screenshot({path:settingsOut,animations:'disabled'})
      assert.ok(statSync(settingsOut).size>30000)
      const back=await page.evaluate(()=>{
        const h=window.__game.scene.getScene('SettingsScene')._qaNativeSettingsBack
        return {x:h.x,y:h.y,width:h.width,height:h.height}
      })
      await click(page,back)
      await active(page,'MenuScene','_qaNativeMenuLayout')
      assert.deepEqual(errors,[],'QA all-scenes flow triggered browser exceptions')
      console.log('Native QA-only contiguous horizontal journey passed:',
        JSON.stringify({width,height,fishOut,townOut,detailOut,settingsOut}))
    } finally {await context.close()}
  }
  // No QA flag: a lone nativeLandscapeAll token is not authorization
  // to reflow any production scene or the Phaser FIT canvas.
  const page=await browser.newPage({viewport:{width:844,height:390}})
  try{
    await page.goto('http://127.0.0.1:4173/fishing-game/?scene=HomeScene&nativeLandscapeAll=1',
      {waitUntil:'domcontentloaded'})
    await page.waitForFunction(()=>window.__game?.scale?.width===390,
      null,{timeout:20000})
    const state=await page.evaluate(()=>{
      const scene=window.__game.scene.getScene('HomeScene')
      return {qaNative:!!scene._qaNativeHomeLayout,logical:{width:window.__game.scale.width,height:window.__game.scale.height}}
    })
    assert.equal(state.qaNative,false,'Normal production must never enable QA scene layout')
    assert.deepEqual(state.logical,{width:390,height:844},'Production scale must remain portrait FIT')
  } finally{await page.close()}
}finally{await browser.close()}
