import assert from 'node:assert/strict'
import { mkdirSync, existsSync, realpathSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const executable=process.env.PATH.split(':').map(x=>join(x,'playwright')).find(existsSync)
assert.ok(executable,'Playwright CLI not in PATH')
const { chromium }=await import(pathToFileURL(join(dirname(realpathSync(executable)),'index.mjs')).href)
const folder='artifacts/orientation/home-native'
mkdirSync(folder,{recursive:true})
const browser=await chromium.launch({headless:true})
try {
  for(const [width,height] of [[844,390],[932,430]]) {
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1})
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',e=>{ if(e.message!=='service worker disabled in QA') errors.push(e.message) })
    try {
      await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=HomeScene&cameraPan=1&nativeLandscapeHome=1&nativeLandscapeMap=1',{waitUntil:'domcontentloaded'})
      await page.waitForFunction(()=>{
        const home=window.__game?.scene?.getScene('HomeScene')
        return home?.sys?.isActive?.() && home?._qaNativeHomeLayout && home?._qaNativeHomeControls?.fish?.hit?.active
      },null,{timeout:20000})
      const state=await page.evaluate(()=>{
        const home=window.__game.scene.getScene('HomeScene')
        const canvas=document.querySelector('#game-container canvas')
        const bounds=canvas?.getBoundingClientRect()
        return {
          layout:home._qaNativeHomeLayout,
          actions:Object.entries(home._qaNativeHomeControls).map(([key,a])=>({
            key,label:a.text.text,scene:a.destination,x:a.hit.x,y:a.hit.y,
            width:a.hit.width,height:a.hit.height,enabled:a.hit.input?.enabled,
          })),
          logical:{width:home.scale.width,height:home.scale.height},
          canvas:bounds?{width:bounds.width,height:bounds.height,x:bounds.x,y:bounds.y}:null,
          scroll:{width:document.body.scrollWidth,height:document.body.scrollHeight},
        }
      })
      assert.deepEqual(state.logical,{width,height},'Native Home scene still portrait-scaled')
      assert.ok(state.canvas.width>width*0.95 && state.canvas.height>height*0.95,'Canvas did not occupy the wide viewport')
      assert.ok(state.scroll.width<=width+1 && state.scroll.height<=height+1,'Native Home unexpectedly scrolls')
      assert.deepEqual(state.actions.map(x=>x.key),['fish','town','collection','settings'])
      for(const a of state.actions){
        assert.ok(a.enabled && a.width>=44 && a.height>=44,a.label+': undersized/disabled hit area')
        assert.ok(a.x-a.width/2>=0&&a.y-a.height/2>=0&&a.x+a.width/2<=width&&a.y+a.height/2<=height)
      }
      assert.deepEqual(errors,[])
      const output=join(folder,'home-'+width+'x'+height+'.png')
      await page.screenshot({path:output,animations:'disabled'})
      assert.ok(statSync(output).size>30000,'Blank native Home screenshot')
      await page.mouse.click(state.actions[0].x,state.actions[0].y)
      await page.waitForFunction(()=>{
        const scene=window.__game?.scene?.getScene('MapScene')
        return scene?.sys?.isActive?.() && scene?._qaNativeMapLayout && scene?._qaNativeMapControls?.pointA?.hit?.active
      },null,{timeout:8000})
      const map=await page.evaluate(()=>{
        const scene=window.__game.scene.getScene('MapScene')
        return {
          layout:scene._qaNativeMapLayout,
          actions:Object.entries(scene._qaNativeMapControls).map(([point,a])=>({
            point,label:a.label,unlocked:a.unlocked,x:a.hit.x,y:a.hit.y,
            width:a.hit.width,height:a.hit.height,enabled:a.hit.input?.enabled,
          })),
          back:{width:scene._qaNativeMapBack.width,height:scene._qaNativeMapBack.height},
          logical:{width:scene.scale.width,height:scene.scale.height},
        }
      })
      assert.deepEqual(map.logical,{width,height},'Map reverted to portrait logical resolution')
      assert.deepEqual(map.actions.map(a=>a.point),['pointA','pointB','pointC'])
      assert.ok(map.actions.every(a=>a.enabled&&a.width>=44&&a.height>=44))
      assert.ok(map.back.width>=44&&map.back.height>=44)
      assert.equal(map.actions[0].unlocked,true,'Harbor must be unlocked for the basic journey')
      const mapOutput=join(folder,'map-'+width+'x'+height+'.png')
      await page.screenshot({path:mapOutput,animations:'disabled'})
      assert.ok(statSync(mapOutput).size>30000,'Native Map screenshot blank')
      await page.mouse.click(map.actions[0].x,map.actions[0].y)
      await page.waitForFunction(()=>{
        const game=window.__game?.scene?.getScene('GameScene')
        return game?.sys?.isActive?.()&&game.env?.point==='pointA'
      },null,{timeout:14000})
      assert.deepEqual(errors,[],'Home to Map to Fishing raised a page error')
      console.log('Native Home→Map→Fishing real route and images:',JSON.stringify({
        width,height,actions:state.actions,homeOutput:output,mapOutput,point:'pointA',
      }))
    } finally { await context.close() }
  }
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1})
  const page=await context.newPage()
  try {
    await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=HomeScene&nativeLandscapeHome=1',{waitUntil:'domcontentloaded'})
    await page.waitForFunction(()=>window.__game?.scene?.getScene('HomeScene')?.sys?.isActive?.(),null,{timeout:15000})
    const state=await page.evaluate(()=>{
      const scene=window.__game.scene.getScene('HomeScene')
      return {adapted:Boolean(scene._qaNativeHomeLayout),width:scene.scale.width,height:scene.scale.height}
    })
    assert.deepEqual(state,{adapted:false,width:390,height:844},'Portrait approved Home must remain untouched')
    await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=MapScene&nativeLandscapeMap=1',{waitUntil:'domcontentloaded'})
    await page.waitForFunction(()=>window.__game?.scene?.getScene('MapScene')?.sys?.isActive?.(),null,{timeout:15000})
    const mapFallback=await page.evaluate(()=>{
      const scene=window.__game.scene.getScene('MapScene')
      return {adapted:Boolean(scene._qaNativeMapLayout),width:scene.scale.width,height:scene.scale.height}
    })
    assert.deepEqual(mapFallback,{adapted:false,width:390,height:844},'Portrait Map must retain original layout')
  } finally { await context.close() }
} finally { await browser.close() }
