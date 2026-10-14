import assert from 'node:assert/strict'
import { existsSync, mkdirSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

// Run an actual WebKit renderer and browser-originated swipe. This is NOT a
// physical iPhone Safari/PWA test and must never close Issue #27 by itself.
const executable=process.env.PATH.split(':')
  .map(path=>join(path,'playwright')).find(existsSync)
assert.ok(executable,'Playwright executable missing in CI PATH')
const {webkit}=await import(pathToFileURL(join(dirname(realpathSync(executable)),'index.mjs')).href)
const dir='artifacts/orientation/webkit'
mkdirSync(dir,{recursive:true})
const browser=await webkit.launch({headless:true})
const result=[]
try{
  for(const [width,height] of [[390,844],[844,390]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'})
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',e=>{if(e.message!=='service worker disabled in QA')errors.push(e.message)})
    try{
      await page.addInitScript(()=>{
        localStorage.setItem('ainan_sound_enabled','0')
        localStorage.setItem('ainan_reduced_motion','1')
        localStorage.setItem('ainan_inventory',JSON.stringify({
          rods:{basic:1,carbon:1,premium:1},
          baits:{worm:15,shrimp:16,special:7}
        }))
        localStorage.setItem('ainan_equipment',JSON.stringify({rodType:'carbon',baitType:'shrimp'}))
      })
      await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene&cameraPan=1&coneLoop=1&castMotion=charged',
        {waitUntil:'domcontentloaded'})
      await page.waitForFunction(()=>{
        const s=window.__game?.scene?.getScene?.('GameScene')
        return s?.sys?.isActive?.()&&s.phase==='cast'&&s._cameraPanRodGrip
          &&s._coneCastHudNodes
      },null,{timeout:30000})
      const pre=await page.evaluate(()=>{
        const s=window.__game.scene.getScene('GameScene')
        const c=s.cameras.main
        if(c.height<520)c.setScroll(c.scrollX,Math.max(0,c.scrollY-70))
        const visibleX=c.scrollX+c.width/2-c.width/(2*c.zoom)
        const visibleY=c.scrollY+c.height/2-c.height/(2*c.zoom)
        const grip=s._cameraPanRodGrip
        return {
          gripScreen:{x:c.x+(grip.x-visibleX)*c.zoom,
            y:c.y+(grip.y-visibleY)*c.zoom},
          canvas:(()=>{
            const r=document.querySelector('#game-container canvas')?.getBoundingClientRect()
            return r?{width:r.width,height:r.height}:null
          })(),
          phase:s.phase,
          bait:s.env?.player?.baitType,
          count:s.env?.player?.inventory?.baits?.[s.env?.player?.baitType]
        }
      })
      assert.ok(pre.canvas?.width>=width-10&&pre.canvas?.height>=height-10,
        'WebKit must paint a native-size game canvas: '+JSON.stringify(pre))
      assert.equal(pre.phase,'cast')
      assert.equal(pre.bait,'shrimp')
      assert.ok(pre.count>0)
      const from=pre.gripScreen,to={x:from.x-25,y:from.y+73}
      assert.ok(from.x>40&&from.x<width-45&&from.y>45&&to.y<height-4,
        'WebKit rod-grip cannot be touched: '+JSON.stringify({width,height,pre,to}))
      await page.mouse.move(from.x,from.y)
      await page.mouse.down()
      await page.mouse.move(to.x,to.y,{steps:14})
      await page.waitForFunction(()=>{
        const s=window.__game?.scene?.getScene('GameScene')
        return s?._coneCastState?.inputMode==='pull'
          &&s._coneCastState.pullArmedAt!=null
          &&s._coneCastPreview?.valid===true
      },null,{timeout:8000})
      const aim=join(dir,'aim-'+width+'x'+height+'.png')
      let ok=false
      for(let n=0;n<4;n++){
        await page.screenshot({path:aim,animations:'disabled'})
        if(statSync(aim).size>15000){ok=true;break}
        await page.waitForTimeout(220)
      }
      assert.ok(ok,'WebKit produced a blank Cast aim screenshot')
      await page.waitForTimeout(650)
      await page.mouse.up()
      await page.waitForFunction(()=>window.__game.scene.getScene('GameScene')?.phase==='retrieve',
        null,{timeout:12000})
      const post=await page.evaluate(()=>{
        const s=window.__game.scene.getScene('GameScene')
        return {phase:s.phase,count:s.env.player.inventory.baits[s.env.player.baitType],
          bobberVisible:!!s.bobber?.visible}
      })
      assert.equal(post.phase,'retrieve')
      assert.equal(post.count,pre.count-1,'Real WebKit Cast must consume exactly one bait')
      assert.ok(post.bobberVisible)
      const land=join(dir,'retrieve-'+width+'x'+height+'.png')
      ok=false
      for(let n=0;n<4;n++){
        await page.screenshot({path:land,animations:'disabled'})
        if(statSync(land).size>15000){ok=true;break}
        await page.waitForTimeout(220)
      }
      assert.ok(ok,'WebKit produced a blank Retrieve screenshot')
      assert.deepEqual(errors,[],'Unexpected WebKit page exception')
      result.push({viewport:[width,height],realInput:true,pre,post})
      console.log('WebKit actual pointer Cast/landing PASS',JSON.stringify({width,height,pre,post}))
    }finally{await context.close()}
  }
}finally{await browser.close()}
writeFileSync(join(dir,'evidence.json'),
  JSON.stringify({browser:'Playwright WebKit headless',physicalIPhoneVerified:false,
    fullPwaStandaloneVerified:false,cases:result},null,2)+'\n')
