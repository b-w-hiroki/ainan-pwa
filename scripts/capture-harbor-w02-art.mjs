import assert from 'node:assert/strict'
import { existsSync, realpathSync, mkdirSync, writeFileSync, statSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'

const executable=process.env.PATH.split(':').map(p=>join(p,'playwright')).find(existsSync)
assert.ok(executable, 'Playwright browser binary not installed')
const {chromium}=await import(pathToFileURL(join(dirname(realpathSync(executable)),'index.mjs')).href)
const browser=await chromium.launch({headless:true})
const root='artifacts/art-review/w02-harbor-v1'
mkdirSync(root,{recursive:true})
const base='http://127.0.0.1:4173/fishing-game/'
const url=base+'?qa=1&scene=GameScene&cameraPan=1&coneLoop=1&qaHarborPlayable=1&qaArtCandidate=w02-harbor-v1&castMotion=charged'
const report=[]

const seed=()=> {
  localStorage.setItem('ainan_sound_enabled','0')
  localStorage.setItem('ainan_inventory',JSON.stringify({rods:{basic:1,carbon:1,premium:1},baits:{worm:40,shrimp:40,special:40}}))
  localStorage.setItem('ainan_equipment',JSON.stringify({rodType:'carbon',baitType:'shrimp'}))
}
const digest=file=>createHash('sha256').update(readFileSync(file)).digest('hex')
try {
 for(const [width,height] of [[390,844],[844,390],[932,430]]){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1})
   const page=await ctx.newPage()
   const errors=[]
   page.on('pageerror',error=>{if(error.message!=='service worker disabled in QA')errors.push(error.message)})
   await page.addInitScript(seed)
   try{
     await page.goto(url,{waitUntil:'domcontentloaded'})
     await page.waitForFunction(()=>{
       const scene=window.__game?.scene?.getScene?.('GameScene')
       return scene?.sys?.isActive?.() && scene._qaHarborPlayable
         && scene._qaHarborArtCandidate==='w02-harbor-v1'
         && scene._qaHarborWorldLayers?.length===3 && scene._coneCastHudNodes
     },null,{timeout:27000})
     const before=await page.evaluate(()=>{
       const s=window.__game.scene.getScene('GameScene')
       return {camera:[s.cameras.main.scrollX,s.cameras.main.scrollY],
         layers:s._qaHarborWorldLayers.map(x=>({key:x.texture.key,width:x.texture.source[0].image?.width??0,height:x.texture.source[0].image?.height??0,
            scroll:x.scrollFactorX,depth:x.depth,visible:x.visible,approved:x.getData('artApproved')})),
         actor:s._cameraPanPlayer?.visible, rodOwner:s._cameraPanRod?.active,
         phase:s.phase,flags:s._qaHarborArtCandidate,
         world:[s.fishingCamera.world.width,s.fishingCamera.world.height] }
     })
     assert.equal(before.phase,'cast')
     assert.equal(before.flags,'w02-harbor-v1')
     assert.deepEqual(before.world,[2160,1800])
     assert.deepEqual(before.layers.map(l=>l.key),['qa_art_w02_v1_far','qa_art_w02_v1_sea','qa_art_w02_v1_quay'])
     assert.ok(before.layers.every(l=>l.visible&&l.scroll===1&&!l.approved&&l.width===2160&&l.height===1800),
        'W02 candidates did not fully decode/draw: '+JSON.stringify(before.layers))
     assert.ok(before.actor&&before.rodOwner,'Should retain canonical player and native rod')
     const first=`${root}/game-${width}x${height}-idle.png`
     await page.screenshot({path:first})
     assert.ok(statSync(first).size>22000,'Blank/failed art canvas screenshot')
     for(let i=0;i<12;i++)await page.keyboard.press('ArrowRight')
     await page.keyboard.press('Enter')
     await page.waitForFunction(()=>{
       const s=window.__game?.scene?.getScene?.('GameScene')
       return s?._pullCastTimeline?.lureReleasedAt!=null||s?.phase==='retrieve'
     },null,{timeout:15000})
     await page.waitForFunction(([x,y])=>{
       const s=window.__game?.scene?.getScene?.('GameScene')
       return s?._qaHarborPlayable && Math.hypot(s.cameras.main.scrollX-x,s.cameras.main.scrollY-y)>40
     },before.camera,{timeout:12000})
     const after=await page.evaluate(()=>{
       const s=window.__game.scene.getScene('GameScene')
       return {phase:s.phase,camera:[s.cameras.main.scrollX,s.cameras.main.scrollY],
         lure:[s.bobber.x,s.bobber.y], artApproved:s._qaHarborWorldLayers.some(x=>x.getData('artApproved')),
         nativeRod:s._cameraPanRod?.active}
     })
     assert.equal(after.artApproved,false)
     assert.equal(after.nativeRod,true)
     const second=`${root}/game-${width}x${height}-flight.png`
     await page.screenshot({path:second})
     assert.ok(statSync(second).size>22000)
     assert.notEqual(digest(first),digest(second),'Camera movement invisible to rasterized screenshot')
     assert.deepEqual(errors,[])
     report.push({viewport:`${width}x${height}`,before,after,
       screenshots:[{name:first,sha256:digest(first)},{name:second,sha256:digest(second)}]})
   } finally {await ctx.close()}
 }
 // No implicit switch without the fully opt-in QA URL.
 const normal=await browser.newPage({viewport:{width:390,height:844}})
 await normal.goto(base+'?qa=1&scene=GameScene',{waitUntil:'domcontentloaded'})
 await normal.waitForFunction(()=>window.__game?.scene?.getScene?.('GameScene')?.sys?.isActive?.(),null,{timeout:15000})
 const unchanged=await normal.evaluate(()=>{
   const s=window.__game.scene.getScene('GameScene')
   return {candidate:s._qaHarborArtCandidate??null,width:s.fishingCamera.world.width,
     texture:s.textures.exists('qa_art_w02_v1_sea')}
 })
 assert.deepEqual(unchanged,{candidate:null,width:900,texture:false})
 await normal.close()
 const evidence={workUnit:218,sourceCandidate:'w02-harbor-v1',mainProductionChanged:false,
   artApproved:false,physicalIPhoneVerified:false,recordedAt:new Date().toISOString(),report,unchanged}
 writeFileSync(root+'/qa-evidence.json',JSON.stringify(evidence,null,2)+'\n')
 console.log('W02 candidate renders within actual GameScene and cast camera on all QA viewports; artistic acceptance pending')
}finally{await browser.close()}
