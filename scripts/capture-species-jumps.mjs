import assert from 'node:assert/strict'
import { existsSync, realpathSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const executable=process.env.PATH.split(':').map(folder=>join(folder,'playwright')).find(existsSync)
assert.ok(executable,'Playwright executable missing')
const { chromium }=await import(pathToFileURL(join(dirname(realpathSync(executable)),'index.mjs')).href)
const cases=[
  ['aji','pointA','73-aji-jump.png'],
  ['saba','pointA','74-saba-jump.png'],
  ['kue','pointC','75-kue-jump.png'],
]
mkdirSync('artifacts/e2e',{recursive:true})
const browser=await chromium.launch({headless:true})
try{
  for(const [fishId,point,file] of cases){
    const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1})
    try{
      const q=new URLSearchParams({qa:'1',scene:'GameScene',qaAction:'battle',qaJump:'1',qaFish:fishId,qaLocation:point})
      await page.goto('http://127.0.0.1:4173/fishing-game/?'+q.toString(),{waitUntil:'domcontentloaded'})
      await page.waitForFunction(id=>{
        const scene=window.__game?.scene?.getScene('GameScene')
        const host=scene?._castPresentationHost
        return scene?.phase==='battle'&&scene?.fish?.id===id&&scene?.battleState?.isRaging
          &&host?.nodes?.battleFish?.texture?.key==='fish_jump_'+id
      },fishId,{timeout:20000})
      // Sample a real in-game rage from takeoff to the airborne peak. Use
      // normal scene timing; do not rewrite the Battle state or force the
      // sprite's coordinates from the QA harness.
      const motionFrame=()=>page.evaluate(()=>{
        const scene=window.__game.scene.getScene('GameScene')
        const fish=scene._castPresentationHost.nodes.battleFish
        const splash=scene._castPresentationHost.nodes.battleJumpFx
        return { phase:scene.phase, raging:scene.battleState?.isRaging,
          y:fish.y, angle:fish.angle, splashAlpha:splash.alpha }
      })
      // Watch actual rendered sprite positions, not a modulo game clock.
      // Game loop frame cadence and rage resets can make two nominal clock
      // windows sample different cycles. The three states must be observed
      // in order while rage and the species Jump texture stay live.
      const waitForPose = async (predicate, label) => {
        await page.waitForFunction(({id, condition}) => {
          const s=window.__game?.scene?.getScene('GameScene')
          const fish=s?._castPresentationHost?.nodes?.battleFish
          if(s?.phase!=='battle'||!s?.battleState?.isRaging||
              fish?.texture?.key!=='fish_jump_'+id) return false
          const y=fish.y
          if(condition==='surface') return y >= 320
          if(condition==='airborne') return y <= 306
          if(condition==='landing') return y >= 321
          return false
        },{id:fishId,condition:predicate},{timeout:12000,polling:'raf'})
      }
      await waitForPose('surface','takeoff')
      const takeoff=await motionFrame()
      await waitForPose('airborne','airborne')
      const airborne=await motionFrame()
      assert.equal(takeoff.phase,'battle')
      assert.equal(airborne.phase,'battle')
      assert.equal(airborne.raging,true)
      assert.ok(airborne.y<takeoff.y-9,
        fishId+': actual fish sprite failed to rise between takeoff and airborne frames '+JSON.stringify({takeoff,airborne}))
      const state=await page.evaluate(()=>{
        const scene=window.__game.scene.getScene('GameScene')
        const host=scene._castPresentationHost
        const image=host.nodes.battleFish
        return {
          phase:scene.phase,fish:scene.fish?.id,raging:scene.battleState?.isRaging,
          jumpTexture:image?.texture?.key,heroWidth:image?.displayWidth,
          splashTexture:host.nodes.battleJumpFx?.texture?.key,
          splashVisible:host.nodes.battleJumpFx?.visible,
          splashInForeground:host.nodes.battleJumpFx?.parentContainer===host.nodes.battleForeground,
          heroVisible:image?.visible,heroForeground:image?.parentContainer===host.nodes.battleForeground,
          resultHidden:!host.nodes.resultForeground.visible,
          rageLabel:host.nodes.battleRage?.visible,
          owner:host.root.name,
        }
      })
      assert.equal(state.phase,'battle')
      assert.equal(state.fish,fishId)
      assert.equal(state.raging,true)
      assert.equal(state.jumpTexture,'fish_jump_'+fishId)
      assert.equal(state.splashTexture,'fish_jump_splash_'+fishId)
      assert.equal(state.splashVisible,true)
      assert.equal(state.splashInForeground,true)
      assert.ok(state.heroWidth>=290&&state.heroVisible&&state.heroForeground)
      assert.equal(state.resultHidden,true)
      assert.equal(state.rageLabel,true)
      assert.equal(state.owner,'cast-presentation-host')
      await page.screenshot({path:join('artifacts/e2e',file),animations:'disabled'})
      // Validate actual return to water rather than accepting only a fixed
      // tilted Jump sprite. The landing frame also documents water FX.
      await waitForPose('landing','landing')
      const landing=await motionFrame()
      assert.equal(landing.phase,'battle')
      assert.equal(landing.raging,true)
      assert.ok(landing.y>airborne.y+12,
        fishId+': actual fish sprite failed to descend '+JSON.stringify({airborne,landing}))
      assert.ok(landing.splashAlpha>airborne.splashAlpha,
        fishId+': water splash must become stronger after re-entry')
      const landingFile=file.replace('-jump.png','-jump-landing.png')
      await page.screenshot({path:join('artifacts/e2e',landingFile),animations:'disabled'})
      console.log('Verified species Jump rise and landing:',file,JSON.stringify({state,takeoff,airborne,landing}))
    }finally{await page.close()}
  }
}finally{await browser.close()}
