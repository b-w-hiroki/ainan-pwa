import assert from 'node:assert/strict'
import { existsSync, realpathSync, mkdirSync } from 'node:fs'
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
const browser=await chromium.launch({headless:true})
try{
  for(const [fishId,point,file] of cases){
    const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1})
    try{
      const q=new URLSearchParams({qa:'1',scene:'GameScene',qaAction:'battle',qaJump:'1',qaFish:fishId,qaLocation:point})
      await page.goto('http://127.0.0.1:4173/fishing-game/?'+q.toString(),{waitUntil:'domcontentloaded'})
      await page.waitForFunction(id=>{
        const scene=window.__game?.scene?.getScene('GameScene')
        const host=scene?._castPresentationHost
        return scene?.phase==='battle'&&scene?.fish?.id===id&&scene?.battleState?.isRaging
          &&host?.nodes?.battleFish?.texture?.key==='fish_jump_'+id
      },fishId,{timeout:20000})
      await page.waitForTimeout(380)
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
      console.log('Verified species Jump:',file,JSON.stringify(state))
    }finally{await page.close()}
  }
}finally{await browser.close()}
