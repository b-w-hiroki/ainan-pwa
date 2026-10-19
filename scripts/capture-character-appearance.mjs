import assert from 'node:assert/strict'
import { existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
const executable=process.env.PATH.split(':').map(dir=>join(dir,'playwright')).find(existsSync)
assert.ok(executable)
const {chromium}=await import(pathToFileURL(join(dirname(realpathSync(executable)),'index.mjs')).href)
const appearance=process.env.CHARACTER_APPEARANCE ?? 'cute-b-01'
assert.ok(['cute-a-01','cute-b-01'].includes(appearance))
const root='artifacts/character-appearance/'+appearance
mkdirSync(root,{recursive:true})
const browser=await chromium.launch({headless:true})
try {
 const page=await browser.newPage({viewport:{width:390,height:844}})
 const errors=[]
 page.on('pageerror',e=>{if(e.message!=='service worker disabled in QA')errors.push(e.message)})
 await page.addInitScript(id=>{localStorage.setItem('ainan_character_appearance',id);localStorage.setItem('ainan_sound_enabled','0');if(!localStorage.getItem('ainan_accessories'))localStorage.setItem('ainan_accessories',JSON.stringify({owned:{cap:true,bag:true},equipped:{hat:'cap',bag:'bag'}}))},appearance)
 await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene')
 await page.waitForFunction(()=>window.__game?.scene?.getScene('GameScene')?._castPresentationHost?.nodes?.characterMotion?.cute)
 await page.evaluate(()=>window.__game.scene.getScene('GameScene').scene.pause())
 const poses=['idle','castWindup','castMid','castRelease','fightLeft','fightMid','fightRight','joyLift','joyMid','joyHold','sadDrop','sadMid','sadSlump']
 const evidence=[]
 for (const pose of poses) {
  const state=await page.evaluate(name=>{
   const s=window.__game.scene.getScene('GameScene')
   const c=s._castPresentationHost.nodes.characterMotion
   c._cancel();c._applyPose(name)
   const equipment=[]
   for(const equipped of [{},{hat:'cap'},{bag:'bag'},{hat:'cap',bag:'bag'}]) {
    c._setAccessoryVisuals(equipped)
    equipment.push({hat:c.accessoryAccents.cap.visible,bag:c.accessoryAccents.bag.visible})
   }
   return {equipment,capKey:c.accessoryAccents.cap.texture.key,bagKey:c.accessoryAccents.bag.texture.key,pose:c.currentPose,body:[c.poseFront.displayWidth,c.poseFront.displayHeight],hair:c.hair ? [c.hair.displayWidth,c.hair.displayHeight] : null,bodyKey:c.poseFront.texture.key,hairKey:c.hair?.texture.key ?? null,background:s.textures.exists('character_preview_harbor_morning'),grip:c.root.getData('rodGripLocal')}
  },pose)
  assert.equal(state.pose,pose)
  assert.deepEqual(state.equipment,[{hat:false,bag:false},{hat:true,bag:false},{hat:false,bag:true},{hat:true,bag:true}])
  assert.equal(state.capKey,'character_cute_cap')
  assert.equal(state.bagKey,'character_cute_bag')
  assert.deepEqual(state.body,[140,183.75])
  assert.deepEqual(state.hair,appearance==='cute-b-01'?[196,183.75]:null)
  assert.equal(state.bodyKey,`character_cute_${appearance==='cute-a-01'?'a':'b'}_${pose}`)
  assert.equal(state.hairKey,appearance==='cute-b-01'?state.bodyKey+'_hair':null)
  assert.equal(state.background,true)
  await page.screenshot({path:join(root,pose+'.png')})
  evidence.push(state)
 }
 // Retrieve must retain the selected actor over a character-free world while
 // keeping the existing three-button input owner. This used to fall back to a
 // full-screen bitmap with the classic fisher painted into it.
 await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene&qaMockPhase=retrieve')
 await page.waitForFunction(()=>window.__game?.scene?.getScene('GameScene')?.phase==='retrieve')
 await page.waitForTimeout(300)
 const retrieve=await page.evaluate(()=>{
  const host=window.__game.scene.getScene('GameScene')._castPresentationHost
  return {actor:host.nodes.characterMotion.root.visible,
    background:host.nodes.retrieveField.list[0].texture.key,
    hud:host.nodes.chrome.visible, dock:host.nodes.retrieveField.list.length}
 })
 assert.equal(retrieve.actor,true)
 assert.equal(retrieve.background,'character_preview_harbor_morning')
 assert.equal(retrieve.hud,true)
 assert.ok(retrieve.dock>=3)
 await page.screenshot({path:join(root,'retrieve-selected-actor.png')})
 await page.evaluate(()=>{
  const host=window.__game.scene.getScene('GameScene')._castPresentationHost
  window.__retrieveWaitCalls=0
  host.adapter.retrieveWait=()=>{window.__retrieveWaitCalls++}
 })
 await page.mouse.click(72,752)
 assert.equal(await page.evaluate(()=>window.__retrieveWaitCalls),1)
 // Reeling must move the same visible lure and its line, while the distance
 // badge reports the gameplay bobber rather than a fixed mock value.
 const retrieveMotion=await page.evaluate(()=>{
  const scene=window.__game.scene.getScene('GameScene'),host=scene._castPresentationHost
  scene.scene.pause()
  host.sync()
  const before={distance:host.nodes.distance.text,x:host.nodes.retrieveLure.x,y:host.nodes.retrieveLure.y}
  scene._retrieveReadyAt=0 // Complete the landing beat before testing accepted input.
  scene._startSlowRetrieve()
  scene._stepRetrieve(700)
  scene._stopSlowRetrieve()
  host.sync()
  const after={distance:host.nodes.distance.text,x:host.nodes.retrieveLure.x,y:host.nodes.retrieveLure.y,
   lineTarget:host.nodes.characterMotion.root.getData('rodLineTargetWorld'),
   gameLure:[scene.retrieveState.lureX,scene.retrieveState.lureY],
   worldLure:[scene.bobber.x,scene.bobber.y]}
  return {before,after}
 })
 assert.ok(parseFloat(retrieveMotion.after.distance)<parseFloat(retrieveMotion.before.distance))
 assert.ok(retrieveMotion.after.x<retrieveMotion.before.x&&retrieveMotion.after.y>retrieveMotion.before.y)
 assert.deepEqual(retrieveMotion.after.lineTarget,{x:retrieveMotion.after.x,y:retrieveMotion.after.y})
 assert.deepEqual(retrieveMotion.after.gameLure,retrieveMotion.after.worldLure)
 await page.screenshot({path:join(root,'retrieve-reelled.png')})
 const fishFeedback=await page.evaluate(()=>{
  const scene=window.__game.scene.getScene('GameScene'),host=scene._castPresentationHost
  const runtimes=scene.bg?._fishRuntime??[]
  const runtime=runtimes.find(item=>item.gfx?.active)
  if(!runtime)return null
  runtimes.forEach(item=>{item.state='cruise'})
  host.sync()
  const idle={label:host.nodes.retrieveStatusText.text,
   x:host.nodes.retrieveFishShadows[0].x,y:host.nodes.retrieveFishShadows[0].y}
  runtime.state='follow'
  runtime.gfx.setPosition(scene.bobber.x-90,scene.bobber.y+80)
  host.sync()
  const follow={label:host.nodes.retrieveStatusText.text,
   x:host.nodes.retrieveFishShadows[0].x,y:host.nodes.retrieveFishShadows[0].y}
  runtime.state='biteReady'
  runtime.gfx.setPosition(scene.bobber.x-20,scene.bobber.y+22)
  host.sync()
  const bite={label:host.nodes.retrieveStatusText.text,
   x:host.nodes.retrieveFishShadows[0].x,y:host.nodes.retrieveFishShadows[0].y}
  return {idle,follow,bite}
 })
 assert.ok(fishFeedback,'real fish runtime must be available for Retrieve feedback')
 assert.equal(fishFeedback.idle.label,'魚影を探す')
 assert.equal(fishFeedback.follow.label,'追っている')
 assert.equal(fishFeedback.bite.label,'食いそう')
 assert.notDeepEqual([fishFeedback.follow.x,fishFeedback.follow.y],[fishFeedback.idle.x,fishFeedback.idle.y])
 assert.notDeepEqual([fishFeedback.bite.x,fishFeedback.bite.y],[fishFeedback.follow.x,fishFeedback.follow.y])
 await page.screenshot({path:join(root,'retrieve-fish-reacting.png')})
 evidence.push({retrieve,waitTapCalls:1,retrieveMotion,fishFeedback})
 // Exercise real phase entry, then freeze the scene to capture deterministic
 // authored frames. These are phase-layout checks, not live timing claims.
 for (const [width,height] of [[390,844],[844,390]]) {
  await page.setViewportSize({width,height})
  for (const outcome of ['battle','caught','escaped']) {
   await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene&qaAction=battle')
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
     if(s.phase==='result') c.fish.setVisible(false)
     // Inspect source alpha, not the oversized transparent canvas bounds.
     const image=c.hair ?? c.poseFront,source=image.texture.getSourceImage(),canvas=document.createElement('canvas')
     canvas.width=source.width;canvas.height=source.height
     const ctx=canvas.getContext('2d');ctx.drawImage(source,0,0)
     const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data
     let left=canvas.width,right=0,bottom=0
     for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>32){left=Math.min(left,x);right=Math.max(right,x);bottom=Math.max(bottom,y)}
     const matrix=image.getWorldTransformMatrix()
     const points=[[left,bottom],[right,bottom]].map(([x,y])=>matrix.transformPoint(x-image.displayOriginX,y-image.displayOriginY))
     const rect=s.game.canvas.getBoundingClientRect()
     const sx=rect.width/s.scale.width,sy=rect.height/s.scale.height
     const bodyY=c.poseFront.getWorldTransformMatrix().transformPoint(0,0).y
     return {phase:s.phase,pose:c.currentPose,left:rect.left+Math.min(...points.map(p=>p.x))*sx,right:rect.left+Math.max(...points.map(p=>p.x))*sx,bodyBottom:rect.top+bodyY*sy,designBottom:c.layout.y,hairKey:image.texture.key}
    },name)
    assert.equal(state.phase,outcome==='battle'?'battle':'result')
    assert.ok(state.left>=4,JSON.stringify(state))
    assert.ok(state.right<=width-4,JSON.stringify(state))
    assert.ok(state.bodyBottom<height,JSON.stringify(state))
    assert.ok(state.designBottom<(outcome==='battle'?630:440),'body must stay above controls/result card')
    await page.screenshot({path:join(root,`${outcome}-${name}-${width}x${height}.png`)})
    evidence.push({...state,width,height})
   }
  }
 }
 // Verify saved choice on a normal URL, without QA scene or rendering flags.
 await page.setViewportSize({width:390,height:844})
 await page.goto('http://127.0.0.1:4173/fishing-game/')
 await page.waitForFunction(()=>window.__game?.scene?.getScenes(true).length>0)
 await page.evaluate(()=>{
  const game=window.__game
  for(const scene of game.scene.getScenes(true)) game.scene.stop(scene.scene.key)
  game.scene.start('SettingsScene')
 })
 await page.waitForFunction(()=>window.__game.scene.isActive('SettingsScene'))
 await page.screenshot({path:join(root,'normal-settings.png')})
 await page.evaluate(()=>window.__game.scene.getScene('SettingsScene').scene.start('GameScene',{point:'pointA'}))
 await page.waitForFunction(()=>window.__game.scene.getScene('GameScene')._castPresentationHost?.nodes?.characterMotion?.cute===true)
 assert.equal(await page.evaluate(()=>location.search),'')
 await page.screenshot({path:join(root,'normal-harbor.png')})
 // Real Workshop tap: remove, reload, check normal-play visibility, then re-equip.
 await page.evaluate(()=>window.__game.scene.getScene('GameScene').scene.start('WorkshopScene'))
 await page.waitForFunction(()=>window.__game.scene.isActive('WorkshopScene'))
 const wallet=await page.evaluate(()=>[localStorage.getItem('ainan_score'),localStorage.getItem('ainan_materials')])
 const targets=await page.evaluate(()=>window.__game.scene.getScene('WorkshopScene').children.list.filter(o=>o.getData?.('accessoryId')).map(o=>({id:o.getData('accessoryId'),width:o.width,height:o.height})))
 const descriptions=await page.evaluate(()=>window.__game.scene.getScene('WorkshopScene').children.list.filter(o=>o.getData?.('accessoryDescription')).map(o=>({width:o.width,right:o.getBounds().right,bottom:o.getBounds().bottom})))
 assert.equal(descriptions.length,2)
 assert.ok(descriptions.every(d=>d.width<=138&&d.right<=370&&d.bottom<=583),JSON.stringify(descriptions))
 assert.equal(targets.length,2)
 assert.ok(targets.every(t=>t.width>=44&&t.height>=44))
 await page.mouse.click(105,661)
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ainan_accessories')).equipped.hat===null)
 assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('ainan_score'),localStorage.getItem('ainan_materials')]),wallet)
 await page.waitForFunction(()=>window.__game.scene.getScene('WorkshopScene').children.list.filter(o=>o.text==='外す').length===1)
 await page.screenshot({path:join(root,'workshop-cap-removed.png')})
 await page.reload({waitUntil:'domcontentloaded'})
 await page.waitForFunction(()=>window.__game?.scene?.getScenes(true).length>0)
 await page.evaluate(()=>{const game=window.__game;for(const s of game.scene.getScenes(true))game.scene.stop(s.scene.key);game.scene.start('GameScene',{point:'pointA'})})
 await page.waitForFunction(()=>window.__game.scene.getScene('GameScene')._castPresentationHost?.nodes?.characterMotion?.cute)
 const removed=await page.evaluate(()=>{const c=window.__game.scene.getScene('GameScene')._castPresentationHost.nodes.characterMotion;return {cap:c.accessoryAccents.cap.visible,bag:c.accessoryAccents.bag.visible,owned:JSON.parse(localStorage.getItem('ainan_accessories')).owned.cap}})
 assert.deepEqual(removed,{cap:false,bag:true,owned:true})
 await page.screenshot({path:join(root,'normal-cap-removed.png')})
 await page.evaluate(()=>window.__game.scene.getScene('GameScene').scene.start('WorkshopScene'))
 await page.waitForFunction(()=>window.__game.scene.isActive('WorkshopScene'))
 await page.mouse.click(105,661)
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ainan_accessories')).equipped.hat==='cap')
 await page.waitForFunction(()=>window.__game.scene.getScene('WorkshopScene').children.list.filter(o=>o.text==='外す').length===2)
 await page.screenshot({path:join(root,'workshop-equipped.png')})
 assert.deepEqual(errors,[])
 writeFileSync(join(root,'evidence.json'),JSON.stringify(evidence,null,2))
 console.log('PASS actual Phaser dimensions and matching hair for 13 poses')
} finally {await browser.close()}

