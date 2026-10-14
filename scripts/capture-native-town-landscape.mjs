import assert from 'node:assert/strict'
import { existsSync,realpathSync,mkdirSync,statSync } from 'node:fs'
import { dirname,join } from 'node:path'
import { pathToFileURL } from 'node:url'

const cli=process.env.PATH.split(':').map(dir=>join(dir,'playwright')).find(existsSync)
assert.ok(cli,'Playwright executable missing')
const {chromium}=await import(pathToFileURL(join(dirname(realpathSync(cli)),'index.mjs')).href)
const folder='artifacts/orientation/town-native'
mkdirSync(folder,{recursive:true})
const browser=await chromium.launch({headless:true})
try{
  for(const [width,height] of [[844,390],[932,430]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1})
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',e=>{if(e.message!=='service worker disabled in QA') errors.push(e.message)})
    try {
      const params=new URLSearchParams({qa:'1',scene:'TownScene',cameraPan:'1',nativeLandscapeTown:'1'})
      await page.goto('http://127.0.0.1:4173/fishing-game/?'+params,{waitUntil:'domcontentloaded'})
      await page.waitForFunction(()=>{
        const scene=window.__game?.scene?.getScene('TownScene')
        return scene?.sys?.isActive?.()&&scene._qaNativeTownLayout&&scene._qaNativeTownControls?.map?.active
      },null,{timeout:20000})
      const state=await page.evaluate(()=>{
        const scene=window.__game.scene.getScene('TownScene')
        const canvas=document.querySelector('#game-container canvas')
        const rect=canvas?.getBoundingClientRect()
        return {
          screen:{width:scene.scale.width,height:scene.scale.height},
          canvas:rect&&{width:rect.width,height:rect.height},
          facilities:scene._qaNativeTownFacilityState,
          actions:Object.entries(scene._qaNativeTownControls).map(([key,a])=>({
            key,x:a.x,y:a.y,width:a.width,height:a.height,enabled:a.input?.enabled,
          })),
          score:localStorage.getItem('ainan_score'),
          catches:localStorage.getItem('ainan_catches'),
          upgrades:localStorage.getItem('ainan_town_facilities'),
          scrollWidth:document.body.scrollWidth,
          scrollHeight:document.body.scrollHeight,
        }
      })
      assert.deepEqual(state.screen,{width,height})
      assert.ok(state.canvas.width>width*0.95 && state.canvas.height>height*0.95)
      assert.ok(state.scrollWidth<=width+1 && state.scrollHeight<=height+1)
      assert.deepEqual(Object.keys(state.facilities).sort(),['festival','guide','market','pier'])
      assert.deepEqual(state.actions.map(a=>a.key),['map','home'])
      assert.ok(state.actions.every(a=>a.enabled&&a.width>=44&&a.height>=44))
      const out=join(folder,'town-'+width+'x'+height+'.png')
      await page.screenshot({path:out,animations:'disabled'})
      assert.ok(statSync(out).size>30000,'Blank native Town image')
      await page.mouse.click(state.actions[0].x,state.actions[0].y)
      await page.waitForFunction(()=>window.__game?.scene?.getScene('MapScene')?.sys?.isActive?.(),null,{timeout:8000})
      const saved=await page.evaluate(()=>({
        score:localStorage.getItem('ainan_score'),
        catches:localStorage.getItem('ainan_catches'),
        upgrades:localStorage.getItem('ainan_town_facilities'),
      }))
      assert.deepEqual(saved,{score:state.score,catches:state.catches,upgrades:state.upgrades},
        'Town staging navigation must not modify economy or catches')
      assert.deepEqual(errors,[])
      console.log('Native QA Town→Map real navigation:',JSON.stringify({width,height,out,levels:state.facilities}))
    }finally{await context.close()}
  }
  const page=await browser.newPage({viewport:{width:390,height:844}})
  try {
    await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=TownScene&nativeLandscapeTown=1',{waitUntil:'domcontentloaded'})
    await page.waitForFunction(()=>window.__game?.scene?.getScene('TownScene')?.sys?.isActive?.(),null,{timeout:20000})
    const fallback=await page.evaluate(()=>{
      const town=window.__game.scene.getScene('TownScene')
      return {staged:!!town._qaNativeTownLayout,width:town.scale.width,height:town.scale.height}
    })
    assert.deepEqual(fallback,{staged:false,width:390,height:844})
  }finally{await page.close()}
}finally{await browser.close()}
