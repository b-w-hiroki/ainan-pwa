import assert from 'node:assert/strict'
import { existsSync, realpathSync, mkdirSync, statSync } from 'node:fs'
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
mkdirSync('artifacts/e2e/jump-motion',{recursive:true})
const browser=await chromium.launch({headless:true})
try{
  for(const [fishId,point,file] of cases){
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1})
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
      // CDP screenshots actually contain Phaser WebGL pixels. Playwright
      // screencast video yielded flat navy frames in headless CI, despite
      // a nominally successful WebM output, so use *real rendered PNGs*
      // separately captured at each observed motion stage instead.
      const snapshot = async (phase, destination) => {
        await page.waitForFunction(({id,phase}) => {
          const scene=window.__game?.scene?.getScene('GameScene')
          const fish=scene?._castPresentationHost?.nodes?.battleFish
          if(scene?.phase!=='battle'||!scene?.battleState?.isRaging||
             scene?.fish?.id!==id||fish?.texture?.key!=='fish_jump_'+id) return false
          if(phase==='takeoff') return fish.y>=320
          if(phase==='airborne') return fish.y<=305
          if(phase==='landing') return fish.y>=322
          return false
        },{id:fishId,phase},{timeout:15000,polling:'raf'})
        const path=join('artifacts/e2e',destination)
        await page.screenshot({path,animations:'disabled'})
        assert.ok(statSync(path).size>100000,
          fishId+': rendered '+phase+' screenshot is unexpectedly empty')
        console.log('Captured actual Phaser '+phase+' frame:',destination)
      }
      const takeoffFile=file.replace('-jump.png','-jump-takeoff.png')
      const landingFile=file.replace('-jump.png','-jump-landing.png')
      await snapshot('takeoff',takeoffFile)
      await snapshot('airborne',file)
      await snapshot('landing',landingFile)
      console.log('Verified species Jump rise and landing:',file,JSON.stringify({state,takeoff,airborne,landing}))
    }finally{
      await page.close()
      await context.close()
    }
  }
}finally{await browser.close()}
