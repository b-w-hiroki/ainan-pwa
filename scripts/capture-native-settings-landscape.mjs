import assert from 'node:assert/strict'
import {existsSync,realpathSync,mkdirSync,statSync} from 'node:fs'
import {dirname,join} from 'node:path'
import {pathToFileURL} from 'node:url'
const exe=process.env.PATH.split(':').map(x=>join(x,'playwright')).find(existsSync)
assert.ok(exe,'Playwright executable missing')
const {chromium}=await import(pathToFileURL(join(dirname(realpathSync(exe)),'index.mjs')).href)
const folder='artifacts/orientation/settings-native'
mkdirSync(folder,{recursive:true})
const browser=await chromium.launch({headless:true})
try{
  for(const [width,height] of [[844,390],[932,430]]){
    const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1})
    const page=await ctx.newPage()
    const errors=[]
    page.on('pageerror',e=>{if(e.message!=='service worker disabled in QA')errors.push(e.message)})
    try{
      await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=SettingsScene&cameraPan=1&nativeLandscapeSettings=1',
        {waitUntil:'domcontentloaded'})
      await page.waitForFunction(()=>{
        const scene=window.__game?.scene?.getScene('SettingsScene')
        return scene?.sys?.isActive?.()&&scene._qaNativeSettingsLayout&&scene._qaNativeSettingsControls?.['サウンド']?.hit?.active
      },null,{timeout:20000})
      const state=await page.evaluate(()=>{
        const scene=window.__game.scene.getScene('SettingsScene')
        const c=document.querySelector('#game-container canvas')?.getBoundingClientRect()
        return{
          logical:{width:scene.scale.width,height:scene.scale.height},
          canvas:c&&{width:c.width,height:c.height},
          actions:Object.entries(scene._qaNativeSettingsControls).map(([label,item])=>({
            label,value:item.label,x:item.hit.x,y:item.hit.y,width:item.hit.width,
            height:item.hit.height,enabled:item.hit.input?.enabled,
          })),
          back:{width:scene._qaNativeSettingsBack.width,height:scene._qaNativeSettingsBack.height},
          scroll:{width:document.body.scrollWidth,height:document.body.scrollHeight},
          score:localStorage.getItem('ainan_score'),
          catches:localStorage.getItem('ainan_catches'),
        }
      })
      assert.deepEqual(state.logical,{width,height})
      assert.ok(state.canvas.width>width*.95&&state.canvas.height>height*.95)
      assert.equal(state.actions.length,8)
      assert.ok(state.actions.every(a=>a.enabled&&a.width>=44&&a.height>=44))
      assert.ok(state.back.width>=44&&state.back.height>=44)
      assert.ok(state.scroll.width<=width+1&&state.scroll.height<=height+1)
      const out=join(folder,'settings-'+width+'x'+height+'.png')
      await page.screenshot({path:out,animations:'disabled'})
      assert.ok(statSync(out).size>30000,'Blank Settings screenshot')
      const sound=state.actions.find(x=>x.label==='サウンド')
      await page.mouse.click(sound.x,sound.y)
      await page.waitForFunction(previous=>{
        const s=window.__game?.scene?.getScene('SettingsScene')
        return s?.sys?.isActive?.()&&s._qaNativeSettingsControls?.['サウンド']?.label!==previous
      },sound.value,{timeout:8000})
      const saved=await page.evaluate(()=>({
        score:localStorage.getItem('ainan_score'),
        catches:localStorage.getItem('ainan_catches'),
      }))
      assert.deepEqual(saved,{score:state.score,catches:state.catches},
        'Sound toggle must not modify progression data')
      assert.deepEqual(errors,[])
      console.log('Native Settings real sound toggle:',JSON.stringify({width,height,out,actions:state.actions.length}))
    }finally{await ctx.close()}
  }
  const page=await browser.newPage({viewport:{width:390,height:844}})
  try{
    await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=SettingsScene&nativeLandscapeSettings=1',
      {waitUntil:'domcontentloaded'})
    await page.waitForFunction(()=>window.__game?.scene?.getScene('SettingsScene')?.sys?.isActive?.(),null,{timeout:20000})
    const portrait=await page.evaluate(()=>{
      const s=window.__game.scene.getScene('SettingsScene')
      return{staged:!!s._qaNativeSettingsLayout,width:s.scale.width,height:s.scale.height}
    })
    assert.deepEqual(portrait,{staged:false,width:390,height:844})
  }finally{await page.close()}
}finally{await browser.close()}
