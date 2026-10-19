import assert from 'node:assert/strict'
import { existsSync, mkdirSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const executable=process.env.PATH.split(':')
  .map(folder=>join(folder,'playwright')).find(existsSync)
assert.ok(executable,'Playwright must be available')
const {chromium}=await import(pathToFileURL(join(dirname(realpathSync(executable)),'index.mjs')).href)
const path='artifacts/orientation/landscape-phases'
mkdirSync(path,{recursive:true})
const browser=await chromium.launch({headless:true})
try {
  const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1})
  const errors=[]
  page.on('pageerror',e=>{if(e.message!=='service worker disabled in QA')errors.push(e.message)})
  await page.addInitScript(()=>{
    localStorage.setItem('ainan_sound_enabled','0')
    localStorage.setItem('ainan_inventory',JSON.stringify({
      rods:{basic:1,carbon:1,premium:1},baits:{worm:12,shrimp:18,special:12}
    }))
    localStorage.setItem('ainan_equipment',JSON.stringify({rodType:'carbon',baitType:'shrimp'}))
  })
  const snapshot=async(name)=>{
    const dest=join(path,name+'.png')
    let accepted=false
    for(let attempt=0;attempt<4;attempt++){
      await page.screenshot({path:dest,animations:'disabled'})
      if(statSync(dest).size>15000){accepted=true;break}
      await page.waitForTimeout(160)
    }
    assert.ok(accepted,name+': WebGL screenshot blank')
  }
  try{
    await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene&cameraPan=1&coneLoop=1&castMotion=charged',
      {waitUntil:'domcontentloaded'})
    await page.waitForFunction(()=>{
      const s=window.__game?.scene?.getScene?.('GameScene')
      return s?.sys?.isActive?.()&&s.phase==='cast'&&s._coneCastHudNodes&&s._cameraPanRodGrip
    },null,{timeout:20000})
    const before=await page.evaluate(()=>{
      const s=window.__game.scene.getScene('GameScene')
      s._tickFishInterest=()=>{} // Keep the Cast and reel under test deterministic.
      const c=s.cameras.main
      c.setScroll(c.scrollX,Math.max(0,c.scrollY-70))
      const vX=c.scrollX+c.width/2-c.width/(2*c.zoom)
      const vY=c.scrollY+c.height/2-c.height/(2*c.zoom)
      const grip=s._cameraPanRodGrip
      const origin={x:c.x+(grip.x-vX)*c.zoom,y:c.y+(grip.y-vY)*c.zoom}
      const bait=s.env.player.baitType
      return {origin,bait,count:s.env.player.inventory.baits[bait],catchCount:s.catches.length}
    })
    assert.ok(before.origin.x>50&&before.origin.x<700&&
      before.origin.y>40&&before.origin.y<286,
      'real actor hand is not reachable in native landscape: '+JSON.stringify(before))
    const end={x:before.origin.x-25,y:before.origin.y+73}
    assert.ok(end.x>0&&end.y<388)
    await page.mouse.move(before.origin.x,before.origin.y)
    await page.mouse.down()
    await page.mouse.move(end.x,end.y,{steps:14})
    await page.waitForFunction(()=>{
      const s=window.__game.scene.getScene('GameScene')
      return s?._coneCastState?.pullArmedAt!=null&&s._coneCastPreview?.valid
    },null,{timeout:5000})
    await snapshot('01-aim')
    await page.waitForTimeout(700)
    await page.mouse.up()
    await page.waitForFunction(()=>window.__game.scene.getScene('GameScene').phase==='retrieve',
      null,{timeout:9000})
    const retrieve=await page.evaluate(()=>{
      const s=window.__game.scene.getScene('GameScene')
      return {phase:s.phase,
        count:s.env.player.inventory.baits[s.env.player.baitType],
        bobberVisible:s.bobber.visible,
        n:s.bg?._fishRuntime?.length}
    })
    assert.equal(retrieve.phase,'retrieve')
    assert.equal(retrieve.count,before.count-1,'one browser Cast must consume only one bait')
    assert.equal(retrieve.bobberVisible,true)
    assert.ok(retrieve.n>0,'actual fish runtime unavailable')
    await snapshot('02-retrieve')
    // The landing beat briefly rejects input. Wait for that real gate to open
    // before counting the two player decisions needed to attract a fish.
    await page.waitForFunction(()=>{
      const s=window.__game.scene.getScene('GameScene')
      return s.phase==='retrieve'&&s.time.now>=(s._retrieveReadyAt??0)
    },null,{timeout:3000})

    // Bounded QA-only HIT window extension: screenshot + GPU readback can
    // consume the normal 1200ms input window. This does not change any
    // production code or bypass the real Playwright pointer-based HIT.
    await page.evaluate(()=>{
      const scene=window.__game.scene.getScene('GameScene')
      const original=scene._openHitWindow.bind(scene)
      scene._openHitWindow=(ms=1200)=>original(Math.max(ms,5000))
    })
    // Exercise the real Retrieve decision methods before deterministic bite.
    // Vertical Slice agency requires >=2 meaningful actions, and fish
    // readability requires a 320ms hesitation. Never disable either gate.
    const decisions=await page.evaluate(()=>{
      const s=window.__game.scene.getScene('GameScene')
      if(s.phase!=='retrieve'||!s.retrieveState)return {phase:s.phase,count:0}
      s._twitchRetrieve()
      s._startSlowRetrieve()
      const count=s.retrieveState?.decisionCount??0
      s._stopSlowRetrieve()
      return {phase:s.phase,count}
    })
    assert.equal(decisions.phase,'retrieve','player decisions unexpectedly ended Retrieve')
    assert.ok(decisions.count>=2,'two real Retrieve decisions are required before bite: '+JSON.stringify(decisions))

    const primed=await page.evaluate(()=>{
      const s=window.__game.scene.getScene('GameScene')
      const candidates=s.bg?._fishRuntime??[]
      const runtime=candidates.find(item=>item?.fishDef&&item.gfx?.active)
      if(s.phase==='retrieve'&&runtime){
        // QA-only controlled fish-ready event, NOT a claim about fish RNG.
        runtime.state='biteReady'
        runtime._biteReadableReadyAt=0
        s._coneCastState.hitCommitted=false
        s._coneCastState.hitTransitioning=false
        s._beginRetrieveBite(runtime)
      }
      return {ready:Boolean(runtime),phase:s.phase,
        hesitationUntil:runtime?._biteReadableReadyAt??null,
        time:s.time.now,decisionCount:s.retrieveState?.decisionCount}
    })
    assert.ok(primed.ready&&primed.phase==='retrieve'&&primed.hesitationUntil>primed.time,
      'fish should visibly hesitate before the real bite: '+JSON.stringify(primed))
    await page.waitForTimeout(390)
    const started=await page.evaluate(()=>{
      const s=window.__game.scene.getScene('GameScene')
      const state=s._coneCastState
      const candidates=s.bg?._fishRuntime??[]
      const runtime=candidates.find(item=>item?.fishDef&&item.gfx?.active&&item._biteReadableReadyAt)
      const before=s.phase
      if(runtime&&s.phase==='retrieve')s._beginRetrieveBite(runtime)
      if(s.phase==='wait')s.fish={...s.fish,biteRate:1}
      return {started:s.phase==='wait',before,after:s.phase,
        runtimeFound:Boolean(runtime),runtimeCount:candidates.length,
        decisionCount:s.retrieveState?.decisionCount,
        fishId:s.fish?.id,hitCommitted:state.hitCommitted,
        hitTransitioning:state.hitTransitioning,
        biteDeadlineMs:s._biteConfig
          ? Math.min(30000,Math.max(12000,
            (s._biteConfig.chonCount+1)*s._biteConfig.waitMaxMs
            +s._biteConfig.chonCount*2*s._biteConfig.chonDurationMs
            +s._biteConfig.goonDurationMs+3000))
          : 12000}
    })
    assert.ok(started.started,'game bite transition did not enter Wait after real decision and hesitation: '+JSON.stringify({decisions,primed,started}))
    await page.waitForFunction(()=>window.__game.scene.getScene('GameScene').waitTapActive,
      null,{timeout:started.biteDeadlineMs}).catch(async error=>{
      const state=await page.evaluate(()=>{
        const s=window.__game.scene.getScene('GameScene')
        return {phase:s.phase,waitTapActive:s.waitTapActive,
          biteSequenceActive:s._biteSequenceActive,biteConfig:s._biteConfig,
          bobberY:s.bobber?.y,baseY:s._bobberBaseY}
      })
      throw Error('real bite did not open HIT window: '+JSON.stringify({started,state})+'; '+error.message)
    })
    await snapshot('03-hit-window')
    const beforeHit=await page.evaluate(()=>{
      const s=window.__game.scene.getScene('GameScene')
      return {phase:s.phase,windowActive:s.waitTapActive,
        skipNext:s._skipNextDown,
        target:document.elementFromPoint(450,198)?.tagName??null,
        canvas:document.querySelector('#game-container canvas')?.getBoundingClientRect().toJSON()}
    })
    assert.equal(beforeHit.phase,'wait','HIT window closed before physical input: '+JSON.stringify(beforeHit))
    assert.equal(beforeHit.windowActive,true,'real HIT click would miss timing window: '+JSON.stringify(beforeHit))
    // Real browser pointer hook; chance is fixed to 100% only in this QA page.
    await page.mouse.click(450,198)
    await page.waitForFunction(()=>{
      const s=window.__game.scene.getScene('GameScene')
      return s.phase==='battle'&&s.battleState
    },null,{timeout:5000}).catch(async e=>{
      const after=await page.evaluate(()=>{
        const s=window.__game.scene.getScene('GameScene')
        return {phase:s.phase,windowActive:s.waitTapActive,skipNext:s._skipNextDown,
          battle:Boolean(s.battleState)}
      })
      throw Error('real HIT pointer failed: '+JSON.stringify({beforeHit,after})+'; '+e.message)
    })
    const battle=await page.evaluate(()=>{
      const s=window.__game.scene.getScene('GameScene')
      const mode=s._castPresentationMode
      return {phase:s.phase,fish:s.fish?.id,mode,
        legacyBattleVisible:Boolean(s.battleHero?.active&&s.battleHero.visible),
        hostBattleVisible:Boolean(s._castPresentationHost?.nodes?.battleForeground?.visible),
        battlePanelVisible:Boolean(s.battlePanel?.visible),
        escapeVisible:Boolean(s.escapeBar?.visible),
        reelDialVisible:Boolean(s.reelCTA?.active&&s.reelCTA.visible),
        raging:Boolean(s.battleState?.isRaging)}
    })
    assert.equal(battle.phase,'battle')
    // cameraPan=1 explicitly opts into the legacy RC owner, not CastPresentationHost.
    assert.equal(battle.mode,'legacy','cameraPan prototype must use its actual legacy owner')
    assert.equal(battle.legacyBattleVisible,true,'legacy Battle hero must be rendered')
    await snapshot('04-battle')
    // BattleUI intentionally hides the numerical battlePanel and escapeBar:
    // the actual wide-screen control is the TENSION/reelCTA dial.
    assert.ok(battle.reelDialVisible||battle.raging,
      'active Legacy Battle must show reel tension control or rage cue: '+JSON.stringify(battle))

    // Short-circuit only the lengthy outcome simulation in this QA fixture;
    // production Battle odds and controls remain unchanged.
    const outcome=await page.evaluate(()=>{
      const s=window.__game.scene.getScene('GameScene')
      const result=s._finishBattle('caught')
      return {result,phase:s.phase,catches:s.catches.length,
        mode:s._castPresentationMode,
        legacyResultVisible:Boolean(s.resultOverlay?.visible),
        getHeading:s.resLabel?.text}
    })
    assert.notEqual(outcome.result,false)
    assert.equal(outcome.phase,'result')
    assert.equal(outcome.catches,before.catchCount+1)
    assert.equal(outcome.mode,'legacy','Result must keep its cameraPan legacy presentation owner')
    assert.equal(outcome.legacyResultVisible,true,'legacy Result card must be visible')
    assert.ok(['GET!','BOSS CATCH','★ BOSS RECORD ★'].includes(outcome.getHeading),
      'real Result must show an authored catch heading: '+JSON.stringify(outcome))
    // The real catch first displays GET! and can subsequently promote the
    // authored BOSS CATCH payoff. Do not mistake that valid title animation
    // for a lost Result; still require the same phase/owner and catch record.
    await page.waitForFunction(expectedCatchCount=>{
      const s=window.__game.scene.getScene('GameScene')
      return s.phase==='result'&&s._castPresentationMode==='legacy'
        &&s.resultOverlay?.visible&&s.catches?.length===expectedCatchCount
        &&['GET!','BOSS CATCH','★ BOSS RECORD ★'].includes(s.resLabel?.text)
    },outcome.catches,{timeout:6000}).catch(async error=>{
      // Keep the assertion, but distinguish an actual Result regression from
      // compositor/tween timing under the full 50-screen CI runner.
      const debug=await page.evaluate(()=>{
        const s=window.__game?.scene?.getScene('GameScene')
        return {active:s?.sys?.isActive?.(),phase:s?.phase,
          owner:s?._castPresentationMode,
          overlayVisible:s?.resultOverlay?.visible,
          overlayAlpha:s?.resultOverlay?.alpha,
          heading:s?.resLabel?.text,
          catches:s?.catches?.length,
          sceneKey:s?.sys?.settings?.key,
          resultBaseVisible:s?._resultGetAsset?.visible,
          payoffCount:s?._payoffVisuals?.length??0}
      })
      throw Error('Result follow-up vanished after synchronous success: '+
        JSON.stringify({outcome,debug})+'; '+error.message)
    })
    await snapshot('05-result')
    assert.deepEqual(errors,[],'Unexpected browser errors')
    writeFileSync(join(path,'evidence.json'),
      JSON.stringify({viewport:[844,390],realBrowserCast:true,
        actualRetrieve:true,deterministicBiteFixture:true,
        realHitTap:true,syntheticBattleVictory:true,automaticArtApproval:false,
        before,retrieve,started,battle,outcome},null,2)+'\n')
    console.log('Landscape phase handoff verified (deterministic bite/victory fixtures):',
      JSON.stringify({before,retrieve,started,battle,outcome}))
  }finally{await page.close()}
}finally{await browser.close()}
