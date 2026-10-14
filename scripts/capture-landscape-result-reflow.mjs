import assert from 'node:assert/strict'
import {existsSync,mkdirSync,realpathSync,statSync,writeFileSync} from 'node:fs'
import {dirname,join} from 'node:path'
import {pathToFileURL} from 'node:url'

const executable=process.env.PATH.split(':')
  .map(dir=>join(dir,'playwright')).find(existsSync)
assert.ok(executable,'CI Playwright binary missing')
const {chromium}=await import(pathToFileURL(join(dirname(realpathSync(executable)),'index.mjs')).href)
const folder='artifacts/orientation/result-reflow'
mkdirSync(folder,{recursive:true})
const browser=await chromium.launch({headless:true})
try{
  for(const [w,h] of [[390,844],[844,390],[932,430]]){
    const context=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1})
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',e=>{
      if(e.message!=='service worker disabled in QA')errors.push(e.message)
    })
    try{
      await page.addInitScript(()=>localStorage.setItem('ainan_sound_enabled','0'))
      await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene&qaAction=caught&cameraPan=1&coneLoop=1',{waitUntil:'domcontentloaded'})
      await page.waitForFunction(()=>{
        const s=window.__game?.scene?.getScene?.('GameScene')
        return s?.sys?.isActive?.()&&s.phase==='result'&&s.resultOverlay?.visible
      },null,{timeout:20000})
      const state=await page.evaluate(()=>{
        const s=window.__game.scene.getScene('GameScene')
        const root=s.resultOverlay
        const buttons=s.resultSuccessActions
        return {phase:s.phase,mode:s._nativeResultLayout?.mode??'portrait',
          label:{x:root.x+s.resLabel.x,y:root.y+s.resLabel.y},
          fish:{x:root.x+(s.resIcon?.x??s.resEmoji.x),y:root.y+(s.resIcon?.y??s.resEmoji.y)},
          name:{x:root.x+s.resName.x,y:root.y+s.resName.y},
          points:{x:root.x+s.resPts.x,y:root.y+s.resPts.y},
          actions:buttons.list.filter(o=>o.type==='Rectangle'&&o.input?.enabled)
            .map(o=>({x:root.x+buttons.x+o.x,y:root.y+buttons.y+o.y,w:o.width,h:o.height}))}
      })
      assert.equal(state.phase,'result')
      if(w>h){
        assert.equal(state.mode,'landscape')
        assert.equal(state.actions.length,2,'Both CTA hit targets should exist')
        assert.ok(state.label.y>=70&&state.label.y<=130)
        assert.ok(state.name.y>=120&&state.name.y<=200)
        assert.ok(state.points.y>state.name.y&&state.points.y<h-80)
        assert.ok(state.fish.x>50&&state.fish.x<w/2)
        for(const hit of state.actions){
          assert.ok(hit.w>=44&&hit.h>=44
            &&hit.x-hit.w/2>=10&&hit.x+hit.w/2<=w-10
            &&hit.y-hit.h/2>=60&&hit.y+hit.h/2<=h-10,
            'wide Result button clipped: '+JSON.stringify(hit))
        }
      }else assert.equal(state.mode,'portrait','Portrait layout must remain approved')
      const image=join(folder,'result-'+w+'x'+h+'.png')
      let visible=false
      for(let attempt=0;attempt<4;attempt++){
        await page.screenshot({path:image,animations:'disabled'})
        if(statSync(image).size>15000){visible=true;break}
        await page.waitForTimeout(180)
      }
      assert.ok(visible,'Blank WebGL Result frame')
      if(w>h){
        await page.mouse.click(state.actions[0].x,state.actions[0].y)
        await page.waitForFunction(()=>window.__game?.scene?.getScene('TownScene')?.sys?.isActive?.(),
          null,{timeout:6000})
      }
      assert.deepEqual(errors,[],'Unexpected native Result browser error')
      writeFileSync(join(folder,'layout-'+w+'x'+h+'.json'),
        JSON.stringify(state,null,2)+'\n')
    }finally{await context.close()}
  }
}finally{await browser.close()}
console.log('Landscape Result reflow and actual Town CTA PASS')
