import assert from 'node:assert/strict'
import { existsSync, realpathSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const executable=process.env.PATH.split(':').map(folder=>join(folder,'playwright')).find(existsSync)
assert.ok(executable,'Playwright executable missing in QA environment')
const { chromium }=await import(pathToFileURL(join(dirname(realpathSync(executable)),'index.mjs')).href)
mkdirSync('artifacts/location-preview',{recursive:true})
const browser=await chromium.launch({headless:true})
const cases=[
  ['cast','pointA','90-harbor-cast.png'],
  ['cast','pointB','91-bay-cast-preview.png'],
  ['cast','pointC','92-cape-cast-preview.png'],
  ['retrieve','pointA','93-harbor-retrieve.png'],
  ['retrieve','pointB','94-bay-retrieve-preview.png'],
  ['retrieve','pointC','95-cape-retrieve-preview.png'],
]
try{
  for(const [phase,point,filename] of cases){
    const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1})
    try{
      const query=new URLSearchParams({qa:'1',scene:'GameScene',qaMockPhase:phase,qaLocation:point,castLocationPreview:'1'})
      await page.goto('http://127.0.0.1:4173/fishing-game/?'+query.toString(),{waitUntil:'domcontentloaded'})
      await page.waitForFunction(({phase,point})=>{
        const scene=window.__game?.scene?.getScene('GameScene')
        const host=scene?._castPresentationHost
        return scene?.phase===phase&&scene?.env?.point===point
          &&host?.root?.visible
          &&(phase==='cast'?host.nodes.castField?.visible:host.nodes.retrieveField?.visible)
      },{phase,point},{timeout:20000})
      await page.waitForTimeout(350)
      const state=await page.evaluate(phase=>{
        const scene=window.__game.scene.getScene('GameScene')
        const host=scene._castPresentationHost
        const field=phase==='cast'?host.nodes.castField:host.nodes.retrieveField
        const overlay=phase==='cast'?host.nodes.castLocationOverlay:host.nodes.retrieveLocationOverlay
        const player=host.nodes.player
        return {
          phase:scene.phase,point:scene.env.point,owner:host.root.name,
          fieldVisible:field.visible,
          overlayVisible:overlay?.visible,
          overlayTexture:overlay?.texture?.key,
          overlayAlpha:overlay?.alpha,
          overlayWithinField:overlay?.parentContainer===field,
          overlayBelowPlayer:player?.parentContainer!==field||field.list.indexOf(overlay)<field.list.indexOf(player),
          inputVisible:phase==='cast'?host.nodes.castInteraction.visible:host.nodes.retrieveInteraction.visible,
          canvasPresent:Boolean(document.querySelector('#game-container canvas')?.isConnected),
        }
      },phase)
      assert.equal(state.phase,phase,filename+': wrong phase')
      assert.equal(state.point,point,filename+': wrong location')
      assert.equal(state.owner,'cast-presentation-host',filename+': presentation owner changed')
      assert.equal(state.fieldVisible,true)
      assert.equal(state.canvasPresent,true)
      assert.equal(state.inputVisible,true)
      assert.equal(state.overlayVisible,point!=='pointA',filename+': incorrect location overlay')
      if(point!=='pointA'){
        assert.equal(state.overlayTexture,point==='pointB'?'ff_location_bay':'ff_location_cape')
        assert.equal(state.overlayWithinField,true)
        assert.equal(state.overlayBelowPlayer,true,'location overlay must not cover player silhouette')
        assert.ok(state.overlayAlpha>0.10&&state.overlayAlpha<=0.25,'location overlay too prominent')
      }
      await page.screenshot({path:join('artifacts/location-preview',filename),animations:'disabled'})
      console.log('Captured location art preview:',filename,JSON.stringify(state))
    }finally{await page.close()}
  }
}finally{await browser.close()}
