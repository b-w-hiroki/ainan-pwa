import assert from 'node:assert/strict'
import { existsSync, realpathSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { countGetHeaderPixels } from './result-screen-pixel-guard.mjs'

const executable=process.env.PATH.split(':').map(folder=>join(folder,'playwright')).find(existsSync)
assert.ok(executable,'Playwright executable missing from CI')
const { chromium }=await import(pathToFileURL(join(dirname(realpathSync(executable)),'index.mjs')).href)
mkdirSync('artifacts/e2e',{recursive:true})
const cases=[
  { file:'22-boss-kue-result.png', query:'qa=1&scene=GameScene&qaAction=caught&qaBoss=kue', first:false },
  { file:'27-kue-first-trophy.png', query:'qa=1&scene=GameScene&qaAction=caught&qaBoss=kue&qaFreshBoss=1', first:true },
]
const browser=await chromium.launch({headless:true})
try{
  for (const test of cases) {
    const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1})
    try {
      await page.goto('http://127.0.0.1:4173/fishing-game/?'+test.query,{waitUntil:'domcontentloaded'})
      await page.waitForSelector('body[data-qa-result-ready="caught"]',{timeout:20000})
      await page.waitForFunction(()=>{
        const s=window.__game?.scene?.getScene('GameScene')
        return s?.phase==='result'&&s?._castPresentationOutcome==='caught'
          &&s?._bossRecordBadge?.active&&s?._castPresentationHost?.nodes?.resultForeground?.visible
      },{timeout:20000})
      const inspect=()=>page.evaluate(()=>{
        const scene=window.__game?.scene?.getScene('GameScene')
        const host=scene?._castPresentationHost
        const badge=scene?._bossRecordBadge
        const canvas=document.querySelector('#game-container canvas')
        return {
          phase:scene?.phase, outcome:scene?._castPresentationOutcome,
          bossId:scene?._bossEventMeta?.id,
          fishId:scene?.fish?.id, 
          badgeActive:Boolean(badge?.active),badgeAlpha:badge?.alpha,
          badgeLabel:badge?.list?.find(x=>typeof x?.text==='string' && /TROPHY|RECORD|CLEARED/.test(x.text))?.text??null,
          resultVisible:host?.nodes?.resultForeground?.visible,
          battleVisible:host?.nodes?.battleForeground?.visible,
          heroVisible:host?.nodes?.resultFish?.visible,
          canvasAttached:Boolean(canvas?.isConnected&&canvas.width>0&&canvas.height>0),
        }
      })
      let lastGold=0
      for(let attempt=1;attempt<=4;attempt++){
        const state=await inspect()
        assert.equal(state.phase,'result',test.file+': wrong phase')
        assert.equal(state.outcome,'caught',test.file+': lost catch')
        assert.equal(state.bossId,'kue',test.file+': wrong boss')
        assert.equal(state.fishId,'kue',test.file+': wrong hero fish')
        assert.equal(state.badgeActive,true,test.file+': boss badge missing')
        if(test.first) assert.equal(state.badgeLabel,'★ TROPHY UNLOCKED ★',test.file+': first trophy not granted')
        else assert.ok(state.badgeLabel,test.file+': boss clearance label missing')
        assert.equal(state.resultVisible,true,test.file+': result foreground hidden')
        assert.equal(state.battleVisible,false,test.file+': Battle resurfaced')
        assert.equal(state.heroVisible,true,test.file+': fish hero hidden')
        assert.equal(state.canvasAttached,true,test.file+': canvas unavailable')
        if(state.badgeAlpha<0.95){await page.waitForTimeout(220);continue}
        await page.screenshot({path:join('artifacts/e2e',test.file),animations:'disabled'})
        lastGold=countGetHeaderPixels(test.file)
        if(lastGold>450){
          console.log('Verified rendered Boss Result:',test.file,JSON.stringify({state,attempt,goldPixels:lastGold}))
          break
        }
        if(attempt<4)await page.waitForTimeout(280)
      }
      assert.ok(lastGold>450,test.file+': actual GET heading absent after bounded screenshot retries ('+lastGold+' pixels)')
    }finally{await page.close()}
  }
}finally{await browser.close()}
