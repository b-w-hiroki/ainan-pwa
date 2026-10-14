import assert from 'node:assert/strict'
import {existsSync,mkdirSync,realpathSync,statSync,writeFileSync} from 'node:fs'
import {dirname,join} from 'node:path'
import {pathToFileURL} from 'node:url'
const executable=process.env.PATH.split(':').map(dir=>join(dir,'playwright')).find(existsSync)
assert.ok(executable,'Playwright binary unavailable')
const {chromium}=await import(pathToFileURL(join(dirname(realpathSync(executable)),'index.mjs')).href)
const folder='artifacts/orientation/battle-compact'
mkdirSync(folder,{recursive:true})
const browser=await chromium.launch({headless:true})
const measurements=[]
try{
  for(const [w,h] of [[390,844],[844,390],[932,430]]){
    const context=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1})
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',e=>{if(e.message!=='service worker disabled in QA')errors.push(e.message)})
    try{
      await page.addInitScript(()=>localStorage.setItem('ainan_sound_enabled','0'))
      await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene&qaAction=battle&qaFish=aji&cameraPan=1&coneLoop=1',{waitUntil:'domcontentloaded'})
      await page.waitForFunction(()=>{
        const s=window.__game?.scene?.getScene?.('GameScene')
        return s?.sys?.isActive?.()&&s.phase==='battle'&&s._reelCtaLayout&&s.reelCTA
      },null,{timeout:15000})
      const data=await page.evaluate(()=>{
        const s=window.__game.scene.getScene('GameScene')
        const c=s.reelCTA
        return {phase:s.phase,mode:s._castPresentationMode,...s._reelCtaLayout,
          actualDialWidth:c.list?.find(node=>node.type==='Image')?.displayWidth,
          viewport:{width:s.scale.width,height:s.scale.height}}
      })
      assert.equal(data.phase,'battle')
      assert.equal(data.viewport.width,w)
      assert.equal(data.viewport.height,h)
      if(w>h){
        assert.equal(data.landscape,true)
        assert.ok(data.controlsTop>=h-130&&data.controlsHeight<=130,
          'Landscape dock covers fish/water: '+JSON.stringify(data))
        assert.ok(data.dialX>w*.75&&data.dialX+data.dialSize/2<=w,
          'Battle reel dial clipped: '+JSON.stringify(data))
        assert.ok(data.dialSize>=88&&data.actualDialWidth===data.dialSize,
          'Battle dial visibility mismatch')
        assert.ok(data.textX>180&&data.textX<w*.6)
      }else{
        assert.equal(data.landscape,false)
        assert.equal(data.dialSize,168,'portrait Battle dial must stay unchanged')
      }
      const out=join(folder,'battle-'+w+'x'+h+'.png')
      let rendered=false
      for(let attempt=0;attempt<4;attempt++){
        await page.screenshot({path:out,animations:'disabled'})
        if(statSync(out).size>15000){rendered=true;break}
        await page.waitForTimeout(180)
      }
      assert.ok(rendered,'blank Phaser Battle screenshot')
      assert.deepEqual(errors,[])
      measurements.push({width:w,height:h,...data})
    }finally{await context.close()}
  }
}finally{await browser.close()}
writeFileSync(join(folder,'layout-evidence.json'),JSON.stringify({measurements,artApproved:false},null,2)+'\n')
console.log('Landscape Battle dock QA PASS',JSON.stringify(measurements))
