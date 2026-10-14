import assert from 'node:assert/strict'
import { existsSync, mkdirSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const executable=process.env.PATH.split(':').map(dir=>join(dir,'playwright')).find(existsSync)
assert.ok(executable,'Playwright binary missing')
const {chromium}=await import(pathToFileURL(join(dirname(realpathSync(executable)),'index.mjs')).href)
const root='artifacts/orientation/fast-result-cutins'
mkdirSync(root,{recursive:true})
const browser=await chromium.launch({headless:true})
try{
  for(const [w,h] of [[390,844],[844,390],[932,430]]){
    const context=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1})
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',e=>{if(e.message!=='service worker disabled in QA')errors.push(e.message)})
    try{
      await page.addInitScript(()=>localStorage.setItem('ainan_sound_enabled','0'))
      await page.goto(
        'http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene&qaAction=caught&qaReward=record&cameraPan=1&coneLoop=1&qaLocation=pointB',
        {waitUntil:'domcontentloaded'})
      await page.waitForFunction(()=>{
        const s=window.__game?.scene?.getScene('GameScene')
        return s?.sys?.isActive?.()&&s.phase==='result'&&s.resultOverlay?.visible
      },null,{timeout:20000})
      const result=await page.evaluate(()=>{
        const s=window.__game.scene.getScene('GameScene')
        const floating=s.children.list.filter(o=>o.active&&o.type==='Container'&&
          o.list?.some?.(child=>child?.text==='BIG HIT!'||child?.text==='DANGER'))
        return {phase:s.phase,fish:s.fish?.id,cutinAlive:!!s._bigHitCutin?.active,
          timerAlive:!!s._bigHitCutinDelay,foreignCutins:floating.length,
          resultVisible:s.resultOverlay.visible,
          caught:!!s.catches?.length}
      })
      assert.equal(result.phase,'result')
      assert.equal(result.cutinAlive,false,'BIG HIT cut-in must end on Result transition')
      assert.equal(result.timerAlive,false,'BIG HIT timer must be cleared on Result')
      assert.equal(result.foreignCutins,0,'Unowned old Battle cut-in is covering Result')
      assert.equal(result.resultVisible,true)
      assert.equal(result.caught,true)
      const destination=join(root,'fast-result-'+w+'x'+h+'.png')
      let visible=false
      for(let k=0;k<4;k++){
        await page.screenshot({path:destination,animations:'disabled'})
        if(statSync(destination).size>15000){visible=true;break}
        await page.waitForTimeout(160)
      }
      assert.ok(visible,'Blank Phaser screenshot is not accepted')
      assert.deepEqual(errors,[])
      writeFileSync(join(root,'state-'+w+'x'+h+'.json'),JSON.stringify(result,null,2)+'\n')
      console.log('No stale Battle cut-in in Result:',JSON.stringify({w,h,result}))
    }finally{await context.close()}
  }
}finally{await browser.close()}
