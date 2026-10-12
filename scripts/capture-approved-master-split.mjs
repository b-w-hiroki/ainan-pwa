import assert from 'node:assert/strict'
import { existsSync, realpathSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const executable = process.env.PATH.split(':').map(folder => join(folder, 'playwright')).find(existsSync)
assert.ok(executable, 'Playwright executable missing from CI environment')
const { chromium } = await import(pathToFileURL(join(dirname(realpathSync(executable)), 'index.mjs')).href)
mkdirSync('artifacts/e2e', { recursive:true })

const cases=[
  {file:'64-approved-cast-original.png',preview:false},
  {file:'65-approved-cast-split-preview.png',preview:true},
]
const browser=await chromium.launch({headless:true})
try{
  for(const test of cases){
    const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1})
    try{
      const q=new URLSearchParams({qa:'1',scene:'GameScene',qaMockPhase:'cast'})
      if(test.preview)q.set('castApprovedSplit','1')
      await page.goto('http://127.0.0.1:4173/fishing-game/?'+q.toString(),{waitUntil:'domcontentloaded'})
      await page.waitForFunction(()=>{
        const scene=window.__game?.scene?.getScene('GameScene')
        const host=scene?._castPresentationHost
        return scene?.phase==='cast'&&host?.root?.visible&&host?.nodes?.castInteraction?.visible
      },{timeout:20000})
      await page.waitForTimeout(750)
      const state=await page.evaluate(()=>{
        const scene=window.__game?.scene?.getScene('GameScene')
        const host=scene?._castPresentationHost
        const split=host?.nodes?.approvedSplit
        return {
          phase:scene?.phase,owner:host?.root?.name,
          split:!!split,fieldVisible:host?.nodes?.castField?.visible,
          inputVisible:host?.nodes?.castInteraction?.visible,
          backgroundTexture:split?.background?.texture?.key,
          waterTexture:split?.water?.texture?.key,
          waterAboveBase:split?host.nodes.castField.list.indexOf(split.water)>host.nodes.castField.list.indexOf(split.background):null,
          noLegacy:scene?._finalCastOverlay?.visible!==true,
        }
      })
      assert.equal(state.phase,'cast',test.file+': unexpected phase')
      assert.equal(state.owner,'cast-presentation-host',test.file+': changed presentation owner')
      assert.equal(state.fieldVisible,true,test.file+': field hidden')
      assert.equal(state.inputVisible,true,test.file+': slingshot owner hidden')
      assert.equal(state.noLegacy,true,test.file+': old overlay reappeared')
      assert.equal(state.split,test.preview,test.file+': wrong art implementation')
      if(test.preview){
        assert.equal(state.backgroundTexture,'ui_approved_split_base_v2')
        assert.equal(state.waterTexture,'ui_approved_split_water_v2')
        assert.equal(state.waterAboveBase,true,'the water layer must render above background')
      }
      await page.screenshot({path:join('artifacts/e2e',test.file),animations:'disabled'})
      console.log('Verified approved master segmentation:',test.file,JSON.stringify(state))
    }finally{await page.close()}
  }
}finally{await browser.close()}
