import assert from 'node:assert/strict'
import { existsSync, mkdirSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

// Do not weaken the global pixel guard. QA-only shifts test whether the real
// Phaser character and native rod share the same world translation.
const executable=process.env.PATH.split(':').map(folder=>join(folder,'playwright')).find(existsSync)
assert.ok(executable,'Playwright executable missing')
const { chromium }=await import(pathToFileURL(join(dirname(realpathSync(executable)),'index.mjs')).href)
const browser=await chromium.launch({headless:true})
mkdirSync('artifacts/e2e',{recursive:true})
const observed=[]
try {
  for(const dx of [-18,0,18]){
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1})
    const page=await context.newPage()
    try {
      const qs=new URLSearchParams({
        qa:'1',scene:'GameScene',qaMockPhase:'cast',qaCharacterX:String(dx),
      })
      await page.goto('http://127.0.0.1:4173/fishing-game/?'+qs.toString(),
        {waitUntil:'domcontentloaded'})
      await page.waitForFunction(()=>{
        const scene=window.__game?.scene?.getScene('GameScene')
        const motion=scene?._castPresentationHost?.nodes?.characterMotion
        return scene?.phase==='cast'&&motion?.ready&&motion?.root?.active
          &&motion?.currentPose==='idle'
      },null,{timeout:20000})
      const state=await page.evaluate(()=>{
        const motion=window.__game.scene.getScene('GameScene')
          ._castPresentationHost.nodes.characterMotion
        return {
          phase:motion.layoutPhase, pose:motion.currentPose,
          requestedX:motion.root.getData('qaCharacterX'),
          rootX:motion.root.x,
          gripLocal:motion.root.getData('rodGripLocal'),
          gripWorld:motion.root.getData('rodGripWorld'),
          tipWorld:motion.root.getData('rodTipWorld'),
          lineTargetWorld:motion.root.getData('rodLineTargetWorld'),
          artApproved:motion.root.getData('actorMotionArtApproved'),
        }
      })
      assert.equal(state.phase,'cast')
      assert.equal(state.pose,'idle')
      assert.equal(state.requestedX,dx)
      assert.equal(state.rootX,dx)
      assert.equal(state.artApproved,false,'unapproved Harbor motion cannot claim approval')
      assert.ok(state.gripWorld&&state.gripLocal&&state.tipWorld&&state.lineTargetWorld)
      assert.ok(Math.abs(state.gripWorld.x-state.gripLocal.x-dx)<1e-8)
      assert.ok(Math.abs(state.gripWorld.y-state.gripLocal.y)<1e-8)
      assert.equal(state.lineTargetWorld.x,310,'world fishing target must not follow the player')
      assert.equal(state.lineTargetWorld.y,235)
      const filename='artifacts/e2e/'+({[-18]:'96-character-offset-neg18.png',
        0:'97-character-offset-zero.png',18:'98-character-offset-pos18.png'})[dx]
      let captured=false
      for(let retry=0;retry<5;retry++){
        await page.screenshot({path:filename,animations:'disabled'})
        if(statSync(filename).size>75000){captured=true;break}
        await page.waitForTimeout(180)
      }
      assert.ok(captured,dx+': blank Phaser character-grip screenshot')
      observed.push({dx,...state,file:filename})
    } finally { await page.close(); await context.close() }
  }
} finally { await browser.close() }
const neutral=observed.find(s=>s.dx===0)
for(const item of observed){
  assert.ok(Math.abs(item.gripWorld.x-neutral.gripWorld.x-item.dx)<1e-8,
    'translated grip must match player delta, not remain on static world')
  assert.ok(Math.abs(item.tipWorld.x-neutral.tipWorld.x-item.dx)<1e-8,
    'native rod tip must track the same player delta')
  assert.equal(item.lineTargetWorld.x,neutral.lineTargetWorld.x)
  assert.equal(item.lineTargetWorld.y,neutral.lineTargetWorld.y)
}
writeFileSync('artifacts/e2e/qa-character-grip-offsets.json',
  JSON.stringify({qaOnly:true,artApproved:false,productionPromoted:false,observed},null,2)+'\n')
console.log('QA-only character/rod translation and stable world target verified')
