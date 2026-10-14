import assert from 'node:assert/strict'
import {existsSync,realpathSync,mkdirSync,statSync} from 'node:fs'
import {dirname,join} from 'node:path'
import {pathToFileURL} from 'node:url'
const exe=process.env.PATH.split(':').map(dir=>join(dir,'playwright')).find(existsSync)
assert.ok(exe,'Playwright executable missing')
const {chromium}=await import(pathToFileURL(join(dirname(realpathSync(exe)),'index.mjs')).href)
const dir='artifacts/orientation/collection-native'
mkdirSync(dir,{recursive:true})
const browser=await chromium.launch({headless:true})
try{
  for(const [width,height] of [[844,390],[932,430]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1})
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',e=>{if(e.message!=='service worker disabled in QA')errors.push(e.message)})
    try{
      await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=CollectionScene&cameraPan=1&nativeLandscapeCollection=1',{waitUntil:'domcontentloaded'})
      await page.waitForFunction(()=>{
        const scene=window.__game?.scene?.getScene('CollectionScene')
        return scene?.sys?.isActive?.()&&scene._qaNativeCollectionLayout&&scene._qaNativeCollectionBack?.active
      },null,{timeout:20000})
      const state=await page.evaluate(()=>{
        const scene=window.__game.scene.getScene('CollectionScene')
        const canvas=document.querySelector('#game-container canvas')?.getBoundingClientRect()
        return {
          logical:{width:scene.scale.width,height:scene.scale.height},
          canvas:canvas&&{width:canvas.width,height:canvas.height},
          ids:Object.keys(scene._qaNativeCollectionControls),
          controls:Object.entries(scene._qaNativeCollectionControls).map(([id,c])=>({
            id,x:c.hit.x,y:c.hit.y,width:c.hit.width,height:c.hit.height,
            enabled:c.hit.input?.enabled,count:c.count,
          })),
          scroll:{width:document.body.scrollWidth,height:document.body.scrollHeight},
          score:localStorage.getItem('ainan_score'),
          catches:localStorage.getItem('ainan_catches'),
        }
      })
      assert.deepEqual(state.logical,{width,height})
      assert.ok(state.canvas.width>width*.95&&state.canvas.height>height*.95)
      assert.equal(state.ids.length,9)
      assert.ok(state.controls.every(c=>c.enabled&&c.width>=44&&c.height>=44))
      assert.ok(state.scroll.width<=width+1&&state.scroll.height<=height+1)
      const filename=join(dir,'collection-'+width+'x'+height+'.png')
      await page.screenshot({path:filename,animations:'disabled'})
      assert.ok(statSync(filename).size>30000,'Blank fish collection screenshot')
      const first=state.controls[0]
      await page.mouse.click(first.x,first.y)
      await page.waitForFunction(id=>{
        const scene=window.__game?.scene?.getScene('CollectionScene')
        return scene?._qaNativeCollectionSelection===id&&scene?._qaNativeCollectionModal?.active
      },first.id,{timeout:8000})
      const modal=join(dir,'detail-'+width+'x'+height+'.png')
      await page.screenshot({path:modal,animations:'disabled'})
      assert.ok(statSync(modal).size>30000,'Blank fish detail image')
      await page.mouse.click(width/2,height/2+78)
      await page.waitForFunction(()=>!window.__game?.scene?.getScene('CollectionScene')?._qaNativeCollectionModal?.active,
        null,{timeout:5000})
      const after=await page.evaluate(()=>({
        score:localStorage.getItem('ainan_score'),
        catches:localStorage.getItem('ainan_catches'),
      }))
      assert.deepEqual(after,{score:state.score,catches:state.catches},
        'Viewing fish cannot change saves or grant collection rewards')
      assert.deepEqual(errors,[])
      console.log('Native Collection QA rendered and modal dismissed:',JSON.stringify({width,height,filename,modal,id:first.id}))
    }finally{await context.close()}
  }
  const page=await browser.newPage({viewport:{width:390,height:844}})
  try{
    await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=CollectionScene&nativeLandscapeCollection=1',{waitUntil:'domcontentloaded'})
    await page.waitForFunction(()=>window.__game?.scene?.getScene('CollectionScene')?.sys?.isActive?.(),null,{timeout:20000})
    const state=await page.evaluate(()=>{
      const scene=window.__game.scene.getScene('CollectionScene')
      return {staged:!!scene._qaNativeCollectionLayout,width:scene.scale.width,height:scene.scale.height}
    })
    assert.deepEqual(state,{staged:false,width:390,height:844})
  }finally{await page.close()}
}finally{await browser.close()}
