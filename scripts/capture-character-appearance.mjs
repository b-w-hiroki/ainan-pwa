import assert from 'node:assert/strict'
import { existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
const executable=process.env.PATH.split(':').map(dir=>join(dir,'playwright')).find(existsSync)
assert.ok(executable)
const {chromium}=await import(pathToFileURL(join(dirname(realpathSync(executable)),'index.mjs')).href)
const root='artifacts/character-appearance'
mkdirSync(root,{recursive:true})
const browser=await chromium.launch({headless:true})
try {
 const page=await browser.newPage({viewport:{width:390,height:844}})
 const errors=[]
 page.on('pageerror',e=>{if(e.message!=='service worker disabled in QA')errors.push(e.message)})
 await page.addInitScript(()=>{localStorage.setItem('ainan_character_appearance','cute-b-01');localStorage.setItem('ainan_sound_enabled','0')})
 await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene&castLayers=1')
 await page.waitForFunction(()=>window.__game?.scene?.getScene('GameScene')?._castPresentationHost?.nodes?.characterMotion?.cute)
 await page.evaluate(()=>window.__game.scene.getScene('GameScene').scene.pause())
 const poses=['idle','castWindup','castMid','castRelease','fightLeft','fightMid','fightRight','joyLift','joyMid','joyHold','sadDrop','sadMid','sadSlump']
 const evidence=[]
 for (const pose of poses) {
  const state=await page.evaluate(name=>{
   const s=window.__game.scene.getScene('GameScene')
   const c=s._castPresentationHost.nodes.characterMotion
   c._cancel();c._applyPose(name)
   return {pose:c.currentPose,body:[c.poseFront.displayWidth,c.poseFront.displayHeight],hair:[c.hair.displayWidth,c.hair.displayHeight],bodyKey:c.poseFront.texture.key,hairKey:c.hair.texture.key,background:s.textures.exists('character_preview_harbor_morning'),grip:c.root.getData('rodGripLocal')}
  },pose)
  assert.equal(state.pose,pose)
  assert.deepEqual(state.body,[140,183.75])
  assert.deepEqual(state.hair,[196,183.75])
  assert.equal(state.hairKey,state.bodyKey+'_hair')
  assert.equal(state.background,true)
  await page.screenshot({path:join(root,pose+'.png')})
  evidence.push(state)
 }
 // Exercise real phase entry, then freeze the scene to capture deterministic
 // authored frames. These are phase-layout checks, not live timing claims.
 for (const [width,height] of [[390,844],[844,390]]) {
  await page.setViewportSize({width,height})
  for (const outcome of ['battle','caught','escaped']) {
   await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene&castLayers=1&qaAction=battle')
   await page.waitForFunction(()=>window.__game?.scene?.getScene('GameScene')?.phase==='battle')
   if(outcome!=='battle') await page.evaluate(value=>window.__game.scene.getScene('GameScene')._finishBattle(value),outcome)
   await page.waitForTimeout(1300)
   await page.evaluate(()=>{
    const s=window.__game.scene.getScene('GameScene');s._castPresentationHost.sync();s.scene.pause()
   })
   const names=outcome==='battle'?['fightLeft','fightMid','fightRight']:outcome==='caught'?['joyLift','joyMid','joyHold']:['sadDrop','sadMid','sadSlump']
   for(const name of names) {
    const state=await page.evaluate(pose=>{
     const s=window.__game.scene.getScene('GameScene'),c=s._castPresentationHost.nodes.characterMotion
     c._cancel();c._applyPose(pose)
     // Inspect source alpha, not the oversized transparent canvas bounds.
     const image=c.hair,source=image.texture.getSourceImage(),canvas=document.createElement('canvas')
     canvas.width=source.width;canvas.height=source.height
     const ctx=canvas.getContext('2d');ctx.drawImage(source,0,0)
     const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data
     let left=canvas.width,right=0,bottom=0
     for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>32){left=Math.min(left,x);right=Math.max(right,x);bottom=Math.max(bottom,y)}
     const matrix=image.getWorldTransformMatrix()
     const points=[[left,bottom],[right,bottom]].map(([x,y])=>matrix.transformPoint(x-image.displayOriginX,y-image.displayOriginY))
     return {phase:s.phase,pose:c.currentPose,left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),bodyBottom:c.poseFront.getBounds().bottom,hairKey:image.texture.key}
    },name)
    assert.equal(state.phase,outcome==='battle'?'battle':'result')
    assert.ok(state.left>=4,JSON.stringify(state))
    assert.ok(state.right<=width-4,JSON.stringify(state))
    assert.ok(state.bodyBottom<height,JSON.stringify(state))
    await page.screenshot({path:join(root,`${outcome}-${name}-${width}x${height}.png`)})
    evidence.push({...state,width,height})
   }
  }
 }
 assert.deepEqual(errors,[])
 writeFileSync(join(root,'evidence.json'),JSON.stringify(evidence,null,2))
 console.log('PASS actual Phaser dimensions and matching hair for 13 poses')
} finally {await browser.close()}
