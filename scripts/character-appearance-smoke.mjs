import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getCharacterAppearance, setCharacterAppearance, characterAppearanceCard, getActiveCharacterAppearance, isCharacterAppearancePreview } from '../fishing-game/js/game/characterAppearance.js'
import { CharacterMotionController, CHARACTER_MOTION_POSES, characterMotionAssets } from '../fishing-game/js/presentation/cast/CharacterMotionController.js'
const values = new Map()
globalThis.localStorage = { getItem: key => values.get(key), setItem: (key,value) => values.set(key,value) }
assert.equal(getCharacterAppearance(), 'classic')
const original = JSON.stringify(CHARACTER_MOTION_POSES)
assert.equal(setCharacterAppearance('invalid'), false)
assert.equal(setCharacterAppearance('cute-b-01'), true)
assert.equal(getCharacterAppearance(), 'cute-b-01')
assert.equal(getActiveCharacterAppearance(), 'classic')
for (const query of ['', '?qa=1', '?castLayers=1', '?qa=1&castLayers=1&cameraPan=1']) assert.equal(isCharacterAppearancePreview(query),false)
globalThis.window={location:{search:'?qa=1&castLayers=1'}}
assert.equal(getActiveCharacterAppearance(), 'cute-b-01')
assert.equal(characterMotionAssets().filter(a=>a.key.startsWith('character_cute_b_')).length,26)
const metadata=JSON.parse(readFileSync(new URL('../fishing-game/assets/candidates/w03-body-cute-b-01/poses.json',import.meta.url)))
// Chainable Phaser double; enough to execute mounting and actual pose/socket methods.
function display() { const obj={active:true,texture:{getSourceImage:()=>({width:100,height:60})},x:0,y:0};const proxy=new Proxy(obj,{get(t,k){if(k in t)return t[k];return (...a)=>{if(k==='setTexture')t.key=a[0];if(k==='setPosition')t.position=a;if(k==='setDisplaySize')t.size=a;return proxy}}});return proxy }
const scene={textures:{exists:()=>true},cache:{json:{get:()=>metadata}},add:{container:display,image:display,graphics:display},tweens:{killTweensOf(){}},events:{emit(){}},time:{delayedCall:()=>({remove(){}})}}
const actor=new CharacterMotionController(scene).mount(display())
assert.equal(actor.cute,true)
for(const name of Object.keys(CHARACTER_MOTION_POSES)) {
 assert.equal(actor._applyPose(name),true)
 assert.deepEqual(actor.poseFront.size,[140,183.75],'texture switch must restore dimensions for 640px source')
 assert.deepEqual(actor.hair.size,[140*896/640,183.75])
 assert.equal(actor.hair.key,`character_cute_b_${name}_hair`)
 assert.deepEqual(actor.poses[name].grip ?? actor.poses[name].fish,metadata.poses[name].grip ?? metadata.poses[name].fish)
}
actor._applyLayout('battle')
assert.deepEqual(actor.hair.size,[170*896/640,223.125])
assert.equal(JSON.stringify(CHARACTER_MOTION_POSES),original,'global sockets must remain unchanged')
actor.destroy()
scene.textures.exists=key=>!key.endsWith('_hair')
assert.equal(new CharacterMotionController(scene).mount(display()).cute,false,'missing hair must fall back as a whole')
let restarted=false
characterAppearanceCard({scene:{restart(){restarted=true}}})[2]()
assert.equal(restarted,true)
assert.equal(getCharacterAppearance(),'classic')
globalThis.localStorage={getItem(){throw Error('blocked')},setItem(){throw Error('full')}}
assert.equal(getCharacterAppearance(),'classic')
assert.equal(setCharacterAppearance('cute-b-01'),false)
console.log('PASS appearance persistence, 13 local sockets/hair, phase layout, fallback and storage errors')
