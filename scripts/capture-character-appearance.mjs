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
  assert.deepEqual(state.body,[160,210])
  assert.deepEqual(state.hair,[224,210])
  assert.equal(state.hairKey,state.bodyKey+'_hair')
  assert.equal(state.background,true)
  await page.screenshot({path:join(root,pose+'.png')})
  evidence.push(state)
 }
 assert.deepEqual(errors,[])
 writeFileSync(join(root,'evidence.json'),JSON.stringify(evidence,null,2))
 console.log('PASS actual Phaser dimensions and matching hair for 13 poses')
} finally {await browser.close()}
