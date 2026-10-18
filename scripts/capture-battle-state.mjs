import assert from 'node:assert/strict'
import { mkdirSync, statSync } from 'node:fs'
import { delimiter, join } from 'node:path'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

// Real Phaser WebGL captures can be blank during one compositor readback.
// Never accept that frame or relax the existing global visual screenshot guard.
const executableDirectory=process.env.PATH.split(delimiter).find(folder =>
  existsSync(join(folder,'playwright')) || existsSync(join(folder,'playwright.cmd')))
assert.ok(executableDirectory,'Playwright executable missing')
const {chromium}=await import(pathToFileURL(join(executableDirectory,'..','playwright','index.mjs')).href)
const destination='artifacts/e2e/03-battle.png'
const openingDestination='artifacts/e2e/04-battle-opening.png'
const openingHitDestination='artifacts/e2e/05-battle-opening-hit.png'
const rageTapDestination='artifacts/e2e/06-battle-rage-tap.png'
const baseUrl=process.env.BATTLE_QA_BASE_URL ?? 'http://127.0.0.1:4173'
mkdirSync('artifacts/e2e',{recursive:true})
async function waitForRenderedFrames(page) {
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
}
const browser=await chromium.launch({headless:true})
try {
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1})
  try {
    await page.goto(`${baseUrl}/fishing-game/?qa=1&scene=GameScene&qaAction=battle`,
      {waitUntil:'domcontentloaded'})
    await page.waitForFunction(()=>{
      const scene=window.__game?.scene?.getScene('GameScene')
      return scene?.phase==='battle' && !!scene?._castPresentationHost?.root?.active
    },null,{timeout:20000})
    let accepted=false
    for(let attempt=1;attempt<=5;attempt++){
      const state=await page.evaluate(()=>{
        const scene=window.__game?.scene?.getScene('GameScene')
        return {phase:scene?.phase,hostActive:!!scene?._castPresentationHost?.root?.active}
      })
      assert.equal(state.phase,'battle','Battle phase changed before screenshot')
      assert.equal(state.hostActive,true,'Battle presentation host missing')
      await page.screenshot({path:destination,animations:'disabled'})
      const bytes=statSync(destination).size
      if(bytes>15000){
        console.log('Verified rendered Battle PNG',JSON.stringify({attempt,bytes,state}))
        accepted=true
        break
      }
      console.warn('Rejecting blank Battle WebGL capture',JSON.stringify({attempt,bytes}))
      await page.waitForTimeout(180)
    }
    assert.ok(accepted,'Battle screenshot did not render after five verified attempts')

    const opening=await page.evaluate(()=>{
      const scene=window.__game?.scene?.getScene('GameScene')
      if(scene?.phase!=='battle' || !scene?.battleState) return null
      Object.assign(scene.battleState,{
        isRaging:false,
        rageEndAt:0,
        nextRageAt:Number.POSITIVE_INFINITY,
        // Keep this QA-only visual state alive through slow WebGL screenshot
        // readbacks. Real gameplay keeps each species' shorter configured window.
        rageOpeningUntil:scene.time.now + Math.max(5000, (scene.fish?.rageOpeningMs ?? 1200) * 0.55),
        rageOpeningUsed:false,
        lastOpeningSwipeAt:0,
      })
      scene._syncBattleUI?.()
      scene._castPresentationHost?.sync?.()
      const host=scene._castPresentationHost
      return {
        cue:host?.nodes?.battleRage?.text,
        meterVisible:host?.nodes?.battleOpeningMeter?.visible,
        instruction:host?.nodes?.battleInstruction?.text,
        reel:scene.battleState.reel,
        duration:scene.fish?.rageOpeningMs ?? 1200,
      }
    })
    assert.ok(opening,'Could not enter deterministic recovery-window QA state')
    assert.match(opening.cue,/今が巻きどき/,'Recovery cue missing in the visible Battle HUD')
    assert.equal(opening.meterVisible,true,'Recovery countdown should be visible beside the reel instruction')
    assert.match(opening.instruction,/巻きどき！タップ \/ 下へスワイプ/,'The visible Battle instruction should explain both input methods during recovery')
    await waitForRenderedFrames(page)
    const renderedOpening=await page.evaluate(()=>{
      const scene=window.__game?.scene?.getScene('GameScene')
      const host=scene?._castPresentationHost
      return {cue:host?.nodes?.battleRage?.text,visible:host?.nodes?.battleRage?.visible,meterVisible:host?.nodes?.battleOpeningMeter?.visible,instruction:host?.nodes?.battleInstruction?.text}
    })
    assert.match(renderedOpening.cue,/今が巻きどき/,'Recovery cue should remain available through the screenshot readback')
    assert.equal(renderedOpening.visible,true,'Recovery cue should stay visible through the screenshot readback')
    assert.equal(renderedOpening.meterVisible,true,'Recovery countdown should stay visible through the screenshot readback')
    assert.match(renderedOpening.instruction,/巻きどき！タップ \/ 下へスワイプ/,'The visible instruction should remain rendered through screenshot readback')
    await page.screenshot({path:openingDestination,animations:'disabled'})
    assert.ok(statSync(openingDestination).size>15000,'Battle recovery screenshot did not render')

    await page.evaluate(()=>{
      const scene=window.__game?.scene?.getScene('GameScene')
      if(scene?.phase!=='battle' || !scene?.battleState) return null
      // Screenshot capture runs alongside many other QA images on CI. Keep a
      // deterministic five-second floor so the real gesture assertion does
      // not race the intentionally short, species-specific gameplay window.
      scene.battleState.isRaging=false
      scene.battleState.nextRageAt=Number.POSITIVE_INFINITY
      scene.battleState.rageOpeningUntil=scene.time.now + Math.max(5000, scene.fish?.rageOpeningMs ?? 1200)
      scene.battleState.rageOpeningUsed=false
      scene.battleState.lastOpeningSwipeAt=0
      scene._battleNextReelInputAt=0
    })
    const swipeTarget=await page.evaluate(()=>{
      const scene=window.__game?.scene?.getScene('GameScene')
      const canvas=document.querySelector('canvas')
      if(!scene?._reelCtaLayout || !canvas) return null
      const bounds=canvas.getBoundingClientRect()
      return {
        x:bounds.left+scene._reelCtaLayout.dialX/scene.scale.width*bounds.width,
        y:bounds.top+scene._reelCtaLayout.dialY/scene.scale.height*bounds.height,
      }
    })
    assert.ok(swipeTarget,'Game reel dial is missing for the real swipe test')
    const swipeX=swipeTarget.x
    const swipeY=swipeTarget.y
    await page.waitForTimeout(80)
    await page.mouse.move(swipeX,swipeY)
    await page.mouse.down()
    await page.mouse.move(swipeX,swipeY+52,{steps:4})
    await page.mouse.up()
    await page.waitForTimeout(100)
    const openingHit=await page.evaluate(()=>{
      const scene=window.__game?.scene?.getScene('GameScene')
      const host=scene?._castPresentationHost
      return {
        timestamp:scene?.battleState?.lastOpeningSwipeAt,
        cue:host?.nodes?.battleRage?.text,
        meterVisible:host?.nodes?.battleOpeningMeter?.visible,
        instruction:host?.nodes?.battleInstruction?.text,
        rageOpeningUsed:scene?.battleState?.rageOpeningUsed,
        reel:scene?.battleState?.reel,
      }
    })
    assert.ok(openingHit?.timestamp,'A down-swipe during the opening should be recorded')
    assert.equal(openingHit.rageOpeningUsed,true,'The opening bonus should be consumed exactly once')
    assert.equal(openingHit.cue,'好機をつかんだ！ +8%','Successful opening swipe should give immediate feedback')
    assert.equal(openingHit.meterVisible,false,'Countdown should clear when its single timed swipe is used')
    assert.equal(Math.round(openingHit.reel-opening.reel),8,'The first swipe should apply its configured one-time reel bonus')
    assert.equal(openingHit.instruction,'成功！落ち着いて巻き続けよう','The control instruction should follow successful recovery input')
    await waitForRenderedFrames(page)
    await page.screenshot({path:openingHitDestination,animations:'disabled'})
    assert.ok(statSync(openingHitDestination).size>15000,'Battle timed-swipe screenshot did not render')

    const tapReady=await page.evaluate(()=>{
      const scene=window.__game?.scene?.getScene('GameScene')
      if(scene?.phase!=='battle' || !scene?.battleState || !scene?._reelCtaLayout) return null
      scene.battleState.isRaging=false
      scene.battleState.nextRageAt=Number.POSITIVE_INFINITY
      scene.battleState.rageOpeningUntil=0
      scene.battleState.rageOpeningUsed=true
      scene.battleState.lastOpeningSwipeAt=0
      scene._battleNextReelInputAt=0
      scene._syncBattleUI?.()
      scene._castPresentationHost?.sync?.()
      const canvas=document.querySelector('canvas')
      const bounds=canvas.getBoundingClientRect()
      return {
        before:scene.battleState.reel,
        x:bounds.left+scene._reelCtaLayout.dialX/scene.scale.width*bounds.width,
        y:bounds.top+scene._reelCtaLayout.dialY/scene.scale.height*bounds.height,
        instruction:scene._castPresentationHost?.nodes?.battleInstruction?.text,
      }
    })
    assert.ok(tapReady,'Battle reel dial not available for the tap test')
    assert.match(tapReady.instruction,/タップ/,'The dial should advertise its tap action')
    await page.mouse.click(tapReady.x,tapReady.y)
    await page.waitForTimeout(100)
    const tapResult=await page.evaluate(()=>{
      const scene=window.__game?.scene?.getScene('GameScene')
      return {phase:scene?.phase,reel:scene?.battleState?.reel}
    })
    assert.equal(tapResult.phase,'battle','A reel-dial tap should keep Battle active')
    assert.equal(Math.round(tapResult.reel-tapReady.before),5,'A reel-dial tap should apply exactly one normal reel action')

    const rageReady=await page.evaluate(()=>{
      const scene=window.__game?.scene?.getScene('GameScene')
      if(scene?.phase!=='battle' || !scene?.battleState) return null
      scene.battleState.isRaging=true
      scene.battleState.rageEndAt=scene.time.now+10000
      scene.battleState.nextRageAt=Number.POSITIVE_INFINITY
      scene.battleState.rageOpeningUntil=0
      scene.battleState.rageOpeningUsed=true
      scene.battleState.lastOpeningSwipeAt=0
      scene._battleNextReelInputAt=0
      scene._syncBattleUI?.()
      scene._castPresentationHost?.sync?.()
      return {
        escape:scene.battleState.escape,
        reel:scene.battleState.reel,
        instruction:scene._castPresentationHost?.nodes?.battleInstruction?.text,
      }
    })
    assert.ok(rageReady,'Could not enter deterministic rage state for a real tap test')
    assert.equal(rageReady.instruction,'暴れてる！巻かずに待つ','Battle controls should tell players to wait while the fish rages')
    await waitForRenderedFrames(page)
    await page.mouse.click(tapReady.x,tapReady.y)
    await page.waitForTimeout(100)
    const rageTap=await page.evaluate(()=>{
      const scene=window.__game?.scene?.getScene('GameScene')
      return {escape:scene?.battleState?.escape,reel:scene?.battleState?.reel}
    })
    assert.ok(rageTap.escape-rageReady.escape>=20,'A reel tap during rage should retain the existing escape penalty')
    assert.equal(rageTap.reel,rageReady.reel,'A reel tap during rage must not advance reel progress')
    await page.screenshot({path:rageTapDestination,animations:'disabled'})
    assert.ok(statSync(rageTapDestination).size>15000,'Battle rage tap screenshot did not render')
    console.log('Verified Battle recovery cue, real swipe, normal tap, and rage penalty',JSON.stringify({opening,openingHit,tapResult,rageTap}))
  } finally { await page.close() }
} finally { await browser.close() }
