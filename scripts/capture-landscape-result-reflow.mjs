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
      await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene&qaAction=caught&cameraPan=1&coneLoop=1&qaFish=aji&qaLocation=pointA',{waitUntil:'domcontentloaded'})
      await page.waitForFunction(()=>{
        const s=window.__game?.scene?.getScene?.('GameScene')
        return s?.sys?.isActive?.()&&s.phase==='result'&&s.resultOverlay?.visible
      },null,{timeout:20000})
      // Aji / Harbor intentionally has no boss cut-in. Wait for the visible
      // premium Result fish and GET artwork after actual Phaser tweens settle;
      // the hidden legacy icon is not evidence of the rendered fish position.
      await page.waitForFunction(wide=>{
        const sc=window.__game.scene.getScene('GameScene')
        if(sc.fish?.id!=='aji'||sc.phase!=='result')return false
        if(wide) return Boolean(sc._resultHeroFish?.active
          &&sc._resultHeroFish.visible&&sc._resultHeroFish.alpha>=0.95
          &&sc._resultGetAsset?.active)
        // Portrait is already covered by the 50-screen production Golden
        // Screen suite. In this cameraPan=1 prototype it renders the legacy
        // Result icon, not the production Host fish sprite, so do not require
        // either an unrelated Host object or a duplicate premium image.
        return Boolean(sc.resultOverlay?.visible
          &&sc.resIcon?.active&&sc.resIcon?.texture?.key)
      },w>h,{timeout:10000}).catch(async error=>{
        const debug=await page.evaluate(()=>{
          const sc=window.__game.scene.getScene('GameScene')
          const hero=sc._resultHeroFish
          const get=sc._resultGetAsset
          const resIcon=sc.resIcon
          return {phase:sc.phase,fish:sc.fish?.id,mode:sc._nativeResultLayout?.mode,
            resultOverlay:sc.resultOverlay?.visible,
            hero:{active:hero?.active,visible:hero?.visible,alpha:hero?.alpha,
              key:hero?.texture?.key,x:hero?.x,y:hero?.y},
            get:{active:get?.active,visible:get?.visible,key:get?.texture?.key},
            resIcon:{active:resIcon?.active,key:resIcon?.texture?.key,x:resIcon?.x,y:resIcon?.y},
            title:sc.resLabel?.text,
          }
        })
        await page.screenshot({path:join(folder,'diagnostic-'+w+'x'+h+'.png'),animations:'disabled'})
        throw new Error('Premium Result state not ready: '+JSON.stringify(debug)+'; '+error.message)
      })
      const state=await page.evaluate(()=>{
        const s=window.__game.scene.getScene('GameScene')
        const root=s.resultOverlay
        const buttons=s.resultSuccessActions
        const wide=s._nativeResultLayout?.mode==='landscape'
        const fish=wide?s._resultHeroFish:s._castPresentationHost?.nodes?.resultFish
        return {phase:s.phase,mode:s._nativeResultLayout?.mode??'portrait',
          label:{x:root.x+s.resLabel.x,y:root.y+s.resLabel.y},
          fish:{x:fish?.x,y:fish?.y,
            width:fish?.displayWidth,height:fish?.displayHeight,
            alpha:fish?.alpha,texture:fish?.texture?.key},
          getArtwork:{x:s._resultGetAsset?.x,y:s._resultGetAsset?.y,
            width:s._resultGetAsset?.displayWidth,height:s._resultGetAsset?.displayHeight,
            visible:s._resultGetAsset?.visible},
          name:{x:root.x+s.resName.x,y:root.y+s.resName.y},
          points:{x:root.x+s.resPts.x,y:root.y+s.resPts.y},
          actions:buttons.list.filter(o=>o.type==='Rectangle'&&o.input?.enabled)
            .map(o=>({x:root.x+buttons.x+o.x,y:root.y+buttons.y+o.y,w:o.width,h:o.height}))}
      })
      console.log('Native Result layout evidence',JSON.stringify({viewport:[w,h],state}))
      // Preserve actual rendered evidence even on a failed geometry gate.
      const diagnostic=join(folder,'result-'+w+'x'+h+'.png')
      await page.screenshot({path:diagnostic,animations:'disabled'})
      assert.equal(state.phase,'result')
      if(w>h){
        assert.equal(state.mode,'landscape')
        assert.equal(state.actions.length,2,'Both CTA hit targets should exist')
        assert.ok(state.label.y>=70&&state.label.y<=130,'label: '+JSON.stringify(state))
        assert.ok(state.name.y>=120&&state.name.y<=200)
        assert.ok(state.points.y>state.name.y&&state.points.y<h-80)
        assert.ok(state.fish.x>50&&state.fish.x<w/2
          &&state.fish.y>90&&state.fish.y<h-85
          &&state.fish.width>=180&&state.fish.alpha>=0.95,
          'Premium fish must appear in left artwork column: '+JSON.stringify(state.fish))
        assert.ok(state.getArtwork.visible
          &&state.getArtwork.x-state.getArtwork.width/2>300
          &&state.getArtwork.y-state.getArtwork.height/2>60
          &&state.getArtwork.y+state.getArtwork.height/2<state.name.y,
          'GET artwork must not obscure fish or name: '+JSON.stringify(state.getArtwork))
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
        await page.evaluate(()=>{
          const sc=window.__game.scene.getScene('GameScene')
          window.__ainanTownButtonTrace={events:[]}
          sc.input.on('gameobjectdown',(_,target)=>window.__ainanTownButtonTrace.events.push('down:'+target?.type))
          sc.input.on('gameobjectup',(_,target)=>window.__ainanTownButtonTrace.events.push('up:'+target?.type))
        })
        await page.mouse.click(state.actions[0].x,state.actions[0].y)
        await page.waitForFunction(()=>window.__game?.scene?.getScene('TownScene')?.sys?.isActive?.(),
          null,{timeout:6000}).catch(async error=>{
          const debug=await page.evaluate(()=>{
            const game=window.__game
            const sc=game.scene.getScene('GameScene')
            return {phase:sc?.phase,resultVisible:sc?.resultOverlay?.visible,
              townActive:game.scene.getScene('TownScene')?.sys?.isActive?.(),
              scenes:game.scene.getScenes(true).map(s=>s.sys.settings.key),
              trace:window.__ainanTownButtonTrace,
              events:window.__ainanTownButtonTrace?.events,
              actualPointer:{x:sc.input.activePointer.x,y:sc.input.activePointer.y},
              errors:window.__ainanTownNavErrors}
          })
          await page.screenshot({path:join(folder,'town-click-failed-'+w+'x'+h+'.png'),animations:'disabled'})
          throw new Error('Town CTA click did not navigate: '+JSON.stringify({debug,errors})+'; '+error.message)
        })
      }
      assert.deepEqual(errors,[],'Unexpected native Result browser error')
      writeFileSync(join(folder,'layout-'+w+'x'+h+'.json'),
        JSON.stringify(state,null,2)+'\n')
    }finally{await context.close()}
  }
}finally{await browser.close()}
console.log('Landscape Result reflow and actual Town CTA PASS')
