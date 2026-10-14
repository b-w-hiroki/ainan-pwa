import assert from 'node:assert/strict'
import { existsSync, realpathSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const cli=process.env.PATH.split(':').map(dir=>join(dir,'playwright')).find(existsSync)
assert.ok(cli,'Playwright executable missing')
const {chromium}=await import(pathToFileURL(join(dirname(realpathSync(cli)),'index.mjs')).href)
const folder='artifacts/orientation/menu-native'
mkdirSync(folder,{recursive:true})
const browser=await chromium.launch({headless:true})
try{
  for(const [width,height] of [[844,390],[932,430]]) {
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1})
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',e=>{if(e.message!=='service worker disabled in QA')errors.push(e.message)})
    try{
      const url='http://127.0.0.1:4173/fishing-game/?qa=1&scene=MenuScene&cameraPan=1&nativeLandscapeMenu=1'
      await page.goto(url,{waitUntil:'domcontentloaded'})
      await page.waitForFunction(()=>{
        const scene=window.__game?.scene?.getScene('MenuScene')
        return scene?.sys?.isActive?.() && scene._qaNativeMenuLayout && scene._qaNativeMenuControls?.CollectionScene?.hit?.active
      },null,{timeout:20000})
      const info=await page.evaluate(()=>{
        const scene=window.__game.scene.getScene('MenuScene')
        const rect=document.querySelector('#game-container canvas')?.getBoundingClientRect()
        return {
          logical:{width:scene.scale.width,height:scene.scale.height},
          canvas:rect&&{width:rect.width,height:rect.height},
          actions:Object.entries(scene._qaNativeMenuControls).map(([destination,ctrl])=>({
            destination,title:ctrl.title,x:ctrl.hit.x,y:ctrl.hit.y,
            width:ctrl.hit.width,height:ctrl.hit.height,enabled:ctrl.hit.input?.enabled,
          })),
          back:{width:scene._qaNativeMenuBack.width,height:scene._qaNativeMenuBack.height},
          scrollWidth:document.body.scrollWidth,scrollHeight:document.body.scrollHeight,
          score:localStorage.getItem('ainan_score'),
          catches:localStorage.getItem('ainan_catches'),
        }
      })
      assert.deepEqual(info.logical,{width,height})
      assert.ok(info.canvas.width>width*.95&&info.canvas.height>height*.95)
      assert.equal(info.actions.length,8)
      assert.ok(info.actions.every(x=>x.enabled&&x.width>=44&&x.height>=44))
      assert.ok(info.back.width>=44&&info.back.height>=44)
      assert.ok(info.scrollWidth<=width+1&&info.scrollHeight<=height+1)
      const filename=join(folder,'menu-'+width+'x'+height+'.png')
      await page.screenshot({path:filename,animations:'disabled'})
      assert.ok(statSync(filename).size>30000,'Blank menu screenshot')
      const gallery=info.actions.find(a=>a.destination==='CollectionScene')
      await page.mouse.click(gallery.x,gallery.y)
      await page.waitForFunction(()=>window.__game?.scene?.getScene('CollectionScene')?.sys?.isActive?.(),null,{timeout:10000})
      const saved=await page.evaluate(()=>({
        score:localStorage.getItem('ainan_score'),
        catches:localStorage.getItem('ainan_catches'),
      }))
      assert.deepEqual(saved,{score:info.score,catches:info.catches},
        'Browsing Menu must not mutate score or catches')
      assert.deepEqual(errors,[])
      console.log('Native Menu QA real navigation:',JSON.stringify({width,height,filename,actions:info.actions.length}))
    }finally{await context.close()}
  }
  const page=await browser.newPage({viewport:{width:390,height:844}})
  try{
    await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=MenuScene&nativeLandscapeMenu=1',{waitUntil:'domcontentloaded'})
    await page.waitForFunction(()=>window.__game?.scene?.getScene('MenuScene')?.sys?.isActive?.(),null,{timeout:15000})
    const portrait=await page.evaluate(()=>{
      const s=window.__game.scene.getScene('MenuScene')
      return {staged:!!s._qaNativeMenuLayout,width:s.scale.width,height:s.scale.height}
    })
    assert.deepEqual(portrait,{staged:false,width:390,height:844})
  }finally{await page.close()}
}finally{await browser.close()}
