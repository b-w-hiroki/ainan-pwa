import assert from 'node:assert/strict'
import { existsSync, realpathSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { renameSync, statSync } from 'node:fs'
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
mkdirSync('artifacts/e2e/jump-motion',{recursive:true})
const browser=await chromium.launch({headless:true})
try{
  for(const [fishId,point,file] of cases){
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,
      recordVideo:{dir:'artifacts/e2e/jump-motion',size:{width:390,height:844}}})
    const page=await context.newPage()
    try{
      const q=new URLSearchParams({qa:'1',scene:'GameScene',qaAction:'battle',qaJump:'1',qaFish:fishId,qaLocation:point})
      await page.goto('http://127.0.0.1:4173/fishing-game/?'+q.toString(),{waitUntil:'domcontentloaded'})
      await page.waitForFunction(id=>{
        const scene=window.__game?.scene?.getScene('GameScene')
        const host=scene?._castPresentationHost
        return scene?.phase==='battle'&&scene?.fish?.id===id&&scene?.battleState?.isRaging
          &&host?.nodes?.battleFish?.texture?.key==='fish_jump_'+id
      },fishId,{timeout:20000})
      // Capture *actual rendered fish positions in Chromium* on the same
      // 960ms cycle. Separate Playwright round trips can cross cycles even
      // when each check observes a valid pose.
      await page.evaluate(() => {
        const scene=window.__game.scene.getScene('GameScene')
        const host=scene._castPresentationHost
        const trace={ cycles:{}, frames:0 }
        window.__qaJumpTrace=trace
        const sample=()=>{
          const elapsed=scene.time.now-(host._jumpRageStartedAt??0)
          const cycle=Math.floor(elapsed/960)
          const ms=((elapsed%960)+960)%960
          const fish=host.nodes.battleFish
          const splash=host.nodes.battleJumpFx
          if(scene.phase==='battle'&&scene.battleState?.isRaging
            &&fish?.visible&&Number.isFinite(elapsed)&&cycle>=0){
            const pose=ms>=45&&ms<130?'takeoff'
              :ms>=265&&ms<345?'airborne'
              :ms>=655&&ms<735?'landing':null
            if(pose){
              const group=trace.cycles[cycle]??={}
              if(!group[pose])group[pose]={
                phase:scene.phase,raging:Boolean(scene.battleState.isRaging),
                fishId:scene.fish?.id,texture:fish.texture.key,
                cycle,ms,y:fish.y,angle:fish.angle,splashAlpha:splash.alpha,
              }
            }
          }
          trace.frames++
          requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
      })
      await page.waitForFunction(() => Object.values(window.__qaJumpTrace?.cycles??{})
        .some(group=>group.takeoff&&group.airborne&&group.landing),
      null,{timeout:15000})
      const trace=await page.evaluate(()=>{
        const group=Object.values(window.__qaJumpTrace.cycles)
          .find(item=>item.takeoff&&item.airborne&&item.landing)
        return {takeoff:group.takeoff,airborne:group.airborne,landing:group.landing,
          frameCount:window.__qaJumpTrace.frames}
      })
      const {takeoff,airborne,landing}=trace
      for(const frame of [takeoff,airborne,landing]){
        assert.equal(frame.phase,'battle',fishId+': Jump phase lost')
        assert.equal(frame.raging,true,fishId+': rage ended')
        assert.equal(frame.fishId,fishId,fishId+': wrong species')
        assert.equal(frame.texture,'fish_jump_'+fishId,
          fishId+': hero texture changed during same-cycle capture')
      }
      assert.ok(airborne.y<takeoff.y-9,
        fishId+': sprite failed to rise during same cycle '+JSON.stringify(trace))
      assert.ok(landing.y>airborne.y+12,
        fishId+': sprite failed to descend during same cycle '+JSON.stringify(trace))
      assert.ok(landing.splashAlpha>airborne.splashAlpha,
        fishId+': re-entry splash missing during same cycle '+JSON.stringify(trace))
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
      // Landing measurements above came from the same real in-browser cycle.
      // Do not force the game clock or suppress the screenshot assertion.
      const landingFile=file.replace('-jump.png','-jump-landing.png')
      await page.screenshot({path:join('artifacts/e2e',landingFile),animations:'disabled'})
      console.log('Verified species Jump rise and landing:',file,JSON.stringify({state,takeoff,airborne,landing}))
    }finally{
      // Persist actual Chromium frames, not screen captures made after the
      // trace has already finished. Video shows real takeoff/peak/landing.
      const video=page.video()
      await page.close()
      await context.close()
      assert.ok(video,'real Jump motion must be recorded')
      const captured=await video.path()
      const finalPath=join('artifacts/e2e/jump-motion',fishId+'-jump.webm')
      renameSync(captured,finalPath)
      assert.ok(statSync(finalPath).size>5000,fishId+': empty rendered Jump video')
      console.log('Recorded real Jump video:',finalPath)
    }
  }
}finally{await browser.close()}
