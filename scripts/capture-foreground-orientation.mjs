import assert from 'node:assert/strict'
import { existsSync, realpathSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const executable = process.env.PATH.split(':').map(folder => join(folder, 'playwright')).find(existsSync)
assert.ok(executable, 'Playwright executable missing from CI environment')
const { chromium } = await import(pathToFileURL(join(dirname(realpathSync(executable)), 'index.mjs')).href)
mkdirSync('artifacts/e2e', {recursive:true})
mkdirSync('artifacts/orientation', {recursive:true})
const cases = [
  { size:{width:390,height:844}, preview:true, output:'artifacts/e2e/66-approved-foreground-preview.png' },
  { size:{width:844,height:390}, preview:false, output:'artifacts/orientation/67-landscape-current.png' },
  { size:{width:844,height:390}, preview:true, output:'artifacts/orientation/68-landscape-foreground-preview.png' },
]
const browser = await chromium.launch({headless:true})
try{
  for(const test of cases){
    const page = await browser.newPage({viewport:test.size,deviceScaleFactor:1})
    try{
      const query = new URLSearchParams({qa:'1',scene:'GameScene',qaMockPhase:'cast'})
      if(test.preview)query.set('castApprovedForeground','1')
      await page.goto('http://127.0.0.1:4173/fishing-game/?'+query.toString(),{waitUntil:'domcontentloaded'})
      await page.waitForFunction(() => {
        const scene = window.__game?.scene?.getScene('GameScene')
        const host = scene?._castPresentationHost
        return scene?.phase==='cast'&&host?.root?.visible&&host?.nodes?.castInteraction?.visible
      },{timeout:20000})
      await page.waitForTimeout(700)
      const state=await page.evaluate(() => {
        const scene=window.__game.scene.getScene('GameScene')
        const host=scene._castPresentationHost
        const split=host.nodes.approvedSplit
        const canvas=document.querySelector('#game-container canvas')
        const bounds=canvas?.getBoundingClientRect()
        const size=scene.scale
        const viewport={width:innerWidth,height:innerHeight}
        const touches=host.nodes.castHit?.input
        return {
          phase:scene.phase,
          root:host.root.name,
          preview:Boolean(split),
          partKeys:split?Object.keys(split).sort():[],
          playerTexture:split?.playerRegion?.texture?.key,
          pierTexture:split?.pier?.texture?.key,
          layerOrder:split?[
            split.background,split.water,split.pier,split.playerRegion,
          ].map(o=>host.nodes.castField.list.indexOf(o)):[],
          castInteractionVisible:host.nodes.castInteraction.visible,
          castHitEnabled:Boolean(touches?.enabled),
          canvasAttached:Boolean(canvas?.isConnected),
          canvasRect:bounds?{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height}:null,
          viewport,
          gameLogicalSize:{width:size.width,height:size.height},
          bodyScrollWidth:document.body.scrollWidth,
        }
      })
      assert.equal(state.phase,'cast',test.output+': wrong phase')
      assert.equal(state.root,'cast-presentation-host',test.output+': owner changed')
      assert.equal(state.preview,test.preview,test.output+': incorrect preview status')
      assert.equal(state.castInteractionVisible,true,test.output+': input owner hidden')
      assert.equal(state.castHitEnabled,true,test.output+': Cast input disabled')
      assert.equal(state.canvasAttached,true,test.output+': canvas removed')
      assert.ok(state.canvasRect.width>0&&state.canvasRect.height>0,test.output+': collapsed canvas')
      assert.ok(state.canvasRect.x>=-1&&state.canvasRect.y>=-1
        &&state.canvasRect.x+state.canvasRect.width<=state.viewport.width+1
        &&state.canvasRect.y+state.canvasRect.height<=state.viewport.height+1,
      test.output+': canvas clipped')
      assert.ok(state.bodyScrollWidth<=state.viewport.width+1,test.output+': horizontal scrolling')
      if(test.preview){
        assert.deepEqual(state.partKeys,['background','pier','playerRegion','water'])
        assert.equal(state.playerTexture,'ui_approved_split_player_v3')
        assert.equal(state.pierTexture,'ui_approved_split_pier_v3')
        assert.deepEqual(state.layerOrder,[0,1,2,3],test.output+': foreground render order drift')
      }
      await page.screenshot({path:test.output,animations:'disabled'})
      // Landscape currently letterboxes the portrait logical game. It is an
      // input/visibility baseline, not a fully adapted 844x390 release layout.
      const availablePhysicalTouch=44 * state.canvasRect.width / state.gameLogicalSize.width
      console.log('AINAN orientation/art capture:',test.output,JSON.stringify({
        ...state,
        estimated44pxTouchInCssPixels:Math.round(availablePhysicalTouch*10)/10,
        adaptiveLandscapeReady:state.viewport.width<=state.viewport.height ? null :
          availablePhysicalTouch>=44,
      }))
    }finally{await page.close()}
  }
}finally{await browser.close()}
