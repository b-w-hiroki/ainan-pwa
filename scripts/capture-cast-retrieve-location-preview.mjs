import assert from 'node:assert/strict'
import { getFishingGroundName } from '../fishing-game/js/game/fishingGroundNames.js'
import { existsSync, realpathSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { readRgbPixels } from './field-pixel-diff-guard.mjs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const executable=process.env.PATH.split(':').map(folder=>join(folder,'playwright')).find(existsSync)
assert.ok(executable,'Playwright executable missing in QA environment')
const { chromium }=await import(pathToFileURL(join(dirname(realpathSync(executable)),'index.mjs')).href)
mkdirSync('artifacts/location-preview',{recursive:true})
const browser=await chromium.launch({headless:true})
const labels = Object.freeze({ pointA:getFishingGroundName('pointA'), pointB:getFishingGroundName('pointB'), pointC:getFishingGroundName('pointC') })
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
          hudVisible:host.nodes.chrome.visible,
          hudBackingVisible:host.nodes.retrieveHudCover.visible,
          instructionVisible:host.nodes.instruction.visible,
          locationLabel:host.nodes.location.text,
          distanceLabel:host.nodes.distance.text,
        }
      },phase)
      assert.equal(state.phase,phase,filename+': wrong phase')
      assert.equal(state.point,point,filename+': wrong location')
      assert.equal(state.owner,'cast-presentation-host',filename+': presentation owner changed')
      assert.equal(state.fieldVisible,true)
      assert.equal(state.canvasPresent,true)
      assert.equal(state.inputVisible,true)
      assert.equal(state.locationLabel,labels[point],filename+': wrong live fishing ground name')
      assert.equal(state.hudVisible,phase==='cast'||point!=='pointA',
        filename+': native HUD must replace stale baked Retrieve label only off Harbor')
      assert.equal(state.hudBackingVisible,phase==='retrieve'&&point!=='pointA',
        filename+': opaque HUD backing must only cover non-Harbor Retrieve')
      assert.equal(state.instructionVisible,phase==='cast',
        filename+': Cast-only instruction must not appear over Retrieve')
      if(phase==='retrieve'&&point!=='pointA') assert.equal(state.distanceLabel,'18m')
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

  // Baseline-preserving real output: with preview disabled, Retrieve must
  // display each selected location instead of Harbor's baked bitmap header.
  // These are production composition snapshots reached using QA scene setup;
  // no QA-only art overlays may leak into them.
  for(const [point,filename] of [
    ['pointB','96-bay-retrieve-default.png'],
    ['pointC','97-cape-retrieve-default.png'],
  ]) {
    const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1})
    try {
      const q=new URLSearchParams({qa:'1',scene:'GameScene',qaMockPhase:'retrieve',qaLocation:point})
      await page.goto('http://127.0.0.1:4173/fishing-game/?'+q.toString(),{waitUntil:'domcontentloaded'})
      await page.waitForFunction(point=>{
        const scene=window.__game?.scene?.getScene('GameScene')
        const host=scene?._castPresentationHost
        return scene?.phase==='retrieve'&&scene.env?.point===point
          &&host?.root?.visible&&host.nodes.chrome.visible
      },point,{timeout:20000})
      const result=await page.evaluate(()=>{
        const host=window.__game.scene.getScene('GameScene')._castPresentationHost
        return {
          label:host.nodes.location.text,
          distance:host.nodes.distance.text,
          overlayVisible:host.nodes.retrieveLocationOverlay?.visible,
          instructionVisible:host.nodes.instruction.visible,
          hudBackingVisible:host.nodes.retrieveHudCover.visible,
          nativeOwner:host.root.name,
        }
      })
      assert.equal(result.label,labels[point],filename+': wrong production location header')
      assert.equal(result.distance,'18m')
      assert.equal(result.overlayVisible,false,'QA-only location overlay leaked into production')
      assert.equal(result.instructionVisible,false)
      assert.equal(result.hudBackingVisible,true,'baked Harbor header needs full opacity')
      assert.equal(result.nativeOwner,'cast-presentation-host')
      const destination=join('artifacts/location-preview',filename)
      await page.screenshot({path:destination,animations:'disabled'})
      assert.ok(statSync(destination).size>15000,filename+': empty real browser capture')
      console.log('Live Retrieve HUD species-neutral location QA:',filename,JSON.stringify(result))
    }finally{await page.close()}
  }
}finally{await browser.close()}

// Decoded WebGL pixel comparison. A unique location label/HUD cannot fake
// water-world variation: measure only the central fishing field, not text.
const folder='artifacts/location-preview'
function meaningfulWaterPixels(first,second) {
  const a=readRgbPixels(join(folder,first))
  const b=readRgbPixels(join(folder,second))
  let changed=0, sum=0
  for(let y=140;y<550;y++) for(let x=60;x<350;x++) {
    const i=(y*390+x)*3
    const diff=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])
    if(diff>=24)changed++
    sum+=diff
  }
  return {changedPixels:changed,totalPixels:410*290,meanRgbDistance:Math.round(sum/(410*290)*100)/100}
}
const comparisons=[
  ['cast','harbor-bay','90-harbor-cast.png','91-bay-cast-preview.png',950],
  ['cast','harbor-cape','90-harbor-cast.png','92-cape-cast-preview.png',950],
  ['cast','bay-cape','91-bay-cast-preview.png','92-cape-cast-preview.png',950],
  ['retrieve','harbor-bay','93-harbor-retrieve.png','94-bay-retrieve-preview.png',750],
  ['retrieve','harbor-cape','93-harbor-retrieve.png','95-cape-retrieve-preview.png',950],
  ['retrieve','bay-cape','94-bay-retrieve-preview.png','95-cape-retrieve-preview.png',950],
]
const results=comparisons.map(([phase,places,a,b,floor])=>({
  phase,places,...meaningfulWaterPixels(a,b),requiredPixels:floor,previewOnly:true,
}))
for(const result of results){
  assert.ok(result.changedPixels>=result.requiredPixels,
    result.phase+'/'+result.places+': rendered fishing water did not visibly differ ('+JSON.stringify(result)+')')
}
assert.equal(meaningfulWaterPixels('90-harbor-cast.png','90-harbor-cast.png').changedPixels,0,
  'Negative control: identical pixels must not be reported as a location difference')
writeFileSync(join(folder,'location-phase-pixel-contrast.json'),
  JSON.stringify({source:'real 390x844 WebGL PNGs',roi:{x:[60,350],y:[140,550]},
    presentation:'QA-only location preview; no art approval',comparisons:results},null,2)+'\\n')
console.log('Visible fishing-field pixel contrast QA passed; art approval still pending',JSON.stringify(results))
