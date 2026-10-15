import assert from 'node:assert/strict'
import { existsSync, realpathSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const binary=process.env.PATH.split(':').map(d=>join(d,'playwright')).find(existsSync)
assert.ok(binary,'Playwright binary unavailable')
const {chromium}=await import(pathToFileURL(join(dirname(realpathSync(binary)),'index.mjs')).href)
const dir='artifacts/orientation/native-rotation'
mkdirSync(dir,{recursive:true})
const cases=[
  ['HomeScene','_qaNativeHomeLayout'],
  ['MapScene','_qaNativeMapLayout'],
  ['TownScene','_qaNativeTownLayout'],
  ['CollectionScene','_qaNativeCollectionLayout'],
  ['MenuScene','_qaNativeMenuLayout'],
  ['SettingsScene','_qaNativeSettingsLayout'],
]
const browser=await chromium.launch({headless:true})
try{
  for(const [sceneName,prop] of cases){
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1})
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',e=>{if(e.message!=='service worker disabled in QA')errors.push(e.message)})
    try {
      const query=new URLSearchParams({qa:'1',nativeLandscapeAll:'1',scene:sceneName})
      await page.goto('http://127.0.0.1:4173/fishing-game/?'+query.toString(),
        {waitUntil:'domcontentloaded'})
      const ready=async(width,height,staged)=>page.waitForFunction(({sceneName,prop,width,height,staged})=>{
        const game=window.__game
        const scene=game?.scene?.getScene(sceneName)
        return scene?.sys?.isActive?.() && game?.scale?.width===width &&
          game?.scale?.height===height && Boolean(scene[prop])===staged
      },{sceneName,prop,width,height,staged},{timeout:20000,polling:100})
      await ready(390,844,false)
      const initial=await page.evaluate(()=>({
        score:localStorage.getItem('ainan_score'),catches:localStorage.getItem('ainan_catches'),
        listeners:window.__game.scale.listenerCount('resize'),
      }))
      await page.setViewportSize({width:844,height:390})
      await ready(844,390,true)
      const wide=await page.evaluate(({sceneName,prop})=>{
        const game=window.__game,scene=game.scene.getScene(sceneName)
        const canvas=document.querySelector('#game-container canvas')?.getBoundingClientRect()
        return {
          viewport:scene[prop]?.viewport,
          canvas:{width:canvas?.width,height:canvas?.height},
          listeners:game.scale.listenerCount('resize'),
          scroll:{width:document.body.scrollWidth,height:document.body.scrollHeight},
        }
      },{sceneName,prop})
      assert.deepEqual(wide.viewport,{width:844,height:390})
      assert.ok(wide.canvas.width>=842&&wide.canvas.height>=388)
      assert.ok(wide.scroll.width<=845&&wide.scroll.height<=391)
      assert.ok(wide.listeners<=initial.listeners+1,
        sceneName+': resize listeners grew during initial rotation')
      await page.waitForTimeout(250)
      const shot=join(dir,sceneName+'-wide.png')
      await page.screenshot({path:shot,animations:'disabled'})
      assert.ok(statSync(shot).size>22000,sceneName+': blank wide-screen screenshot')
      await page.setViewportSize({width:390,height:844})
      await ready(390,844,false)
      await page.setViewportSize({width:932,height:430})
      await ready(932,430,true)
      const size=await page.evaluate(()=>({
        listenerCount:window.__game.scale.listenerCount('resize'),
        logical:{width:window.__game.scale.width,height:window.__game.scale.height},
        score:localStorage.getItem('ainan_score'),catches:localStorage.getItem('ainan_catches'),
      }))
      assert.deepEqual(size.logical,{width:932,height:430})
      assert.ok(size.listenerCount<=initial.listeners+1,
        sceneName+': event listeners duplicated by repeated rotation')
      assert.deepEqual({score:size.score,catches:size.catches},
        {score:initial.score,catches:initial.catches},sceneName+': viewport reset changed saves')
      assert.deepEqual(errors,[],sceneName+': browser errors after orientation reflow')
      console.log('QA native scene rotation verified',JSON.stringify({sceneName,shot,listeners:size.listenerCount}))
    }finally{await context.close()}
  }
}finally{await browser.close()}
