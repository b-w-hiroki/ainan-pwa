import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { HARBOR_BODY_VARIANTS, setHarborBodyVariant, syncHarborBodyHair, syncHarborBodyAction, installHarborBodyQa, harborBodyQaStart } from '../fishing-game/js/game/installHarborBodyQa.js'
import { CHARACTER_MOTION_POSES } from '../fishing-game/js/presentation/cast/CharacterMotionController.js'
import { ASSETS } from '../fishing-game/js/config/assetManifest.js'
const variant=HARBOR_BODY_VARIANTS.find(v=>v.id==='cute-b-01')
const info=JSON.parse(readFileSync('fishing-game/assets/candidates/w03-body-cute-b-01/poses.json'))
assert.equal(variant.poses.length,13)
for(const pose of variant.poses) for(const field of ['file','hair']) {
 const file='fishing-game/assets/candidates/w03-body-cute-b-01/'+info.poses[pose][field]
 assert.ok(existsSync(file),file)
 const png=readFileSync(file); assert.equal(png.readUInt32BE(16),640); assert.equal(png.readUInt32BE(20),840);assert.equal(png[25],6)
}
assert.equal(harborBodyQaStart('?qaBody=cute-b-01'),null)
const originals=Object.values(CHARACTER_MOTION_POSES).map(p=>[p,ASSETS.characters[p.asset].key,p.grip,p.tip,p.fish])
function image(key='idle') {
 const o={active:true,visible:true,x:30,y:100,originX:.5,originY:1,displayWidth:240,displayHeight:312,rotation:.2,flipX:false,flipY:false,scrollFactorX:1,scrollFactorY:1,depth:41,alpha:.7,texture:{key},scaleX:1,scaleY:1}
 const methods={setPosition:['x','y'],setOrigin:['originX','originY'],setDisplaySize:['displayWidth','displayHeight'],setRotation:['rotation'],setFlipX:['flipX'],setFlipY:['flipY'],setScrollFactor:['scrollFactorX','scrollFactorY'],setDepth:['depth'],setAlpha:['alpha'],setVisible:['visible']}
 for(const [m,fields] of Object.entries(methods)) o[m]=(...args)=>{fields.forEach((f,i)=>o[f]=args[i]);return o}
 o.setTexture=key=>{o.texture={key};return o};o.destroy=()=>o.active=false
 return o
}
class Scene { _cleanup(){} }
installHarborBodyQa(Scene)
const scene=new Scene()
Object.assign(scene,{_qaBodyCanvases:[],_qaBodyReady:[variant],cache:{json:{get:()=>info}},textures:{exists:()=>true},add:{image:(_x,_y,key)=>image(key)},_cameraPanPlayer:image(),_cameraPanPlayerBlend:image()})
assert.equal(setHarborBodyVariant(scene,variant.id),true)
assert.deepEqual(CHARACTER_MOTION_POSES.joyHold.fish,info.poses.joyHold.fish)
scene._cameraPanPlayer.setTexture('qa_body_cute-b-01_fightLeft')
scene._cameraPanPlayerBlend.setTexture('qa_body_cute-b-01_fightMid').setAlpha(.3)
syncHarborBodyHair(scene)
const layers=[...scene._qaBodyHair]
assert.equal(layers[0].texture.key,'qa_body_cute-b-01_fightLeft_hair')
assert.equal(layers[1].texture.key,'qa_body_cute-b-01_fightMid_hair')
assert.equal(layers[1].alpha,.3)
for(let i=0;i<2;i++) for(const field of ['x','y','originX','originY','displayWidth','displayHeight','rotation']) assert.equal(layers[i][field],[scene._cameraPanPlayer,scene._cameraPanPlayerBlend][i][field])
scene._cameraPanPlayer.setVisible(false);syncHarborBodyHair(scene);assert.equal(layers[0].visible,false)
scene._qaBody={id:'cute-a-01'};syncHarborBodyHair(scene);assert.equal(layers[1].visible,false)
scene._cleanup();scene._cleanup()
assert.ok(layers.every(l=>!l.active))
for(const [p,key,grip,tip,fish] of originals){assert.equal(ASSETS.characters[p.asset].key,key);assert.deepEqual(p.grip,grip);assert.deepEqual(p.tip,tip);assert.deepEqual(p.fish,fish)}
console.log('PASS cute girl: 13 RGBA frames, QA gate, fish sockets, crossfade hair, visibility, cleanup and global restoration')

let reduce=false
globalThis.localStorage={getItem:()=>reduce?'1':'0'}
const action={_qaBody:{id:'cute-b-01'},phase:'battle',time:{now:0},battleState:{isRaging:true},_setCameraPanPose(p){this._cameraPanPose=p}}
syncHarborBodyAction(action);assert.equal(action._cameraPanPose,'fightLeft')
action.time.now=640;syncHarborBodyAction(action);assert.equal(action._cameraPanPose,'fightRight')
reduce=true;syncHarborBodyAction(action);assert.equal(action._cameraPanPose,'fightMid')
action.phase='result';action._qaBodyOutcome='caught';syncHarborBodyAction(action);assert.equal(action._cameraPanPose,'joyHold')
action._qaBodyOutcome='escaped';syncHarborBodyAction(action);assert.equal(action._cameraPanPose,'sadSlump')
action.phase='cast';action._cameraPanPose='castWindup';syncHarborBodyAction(action);assert.equal(action._cameraPanPose,'castWindup')
scene._qaBody={id:'cute-b-01'};scene._cameraPanPlayer.setVisible(true);scene.time={now:0};scene._cameraPanHidePlayerUntil=900
syncHarborBodyHair(scene);assert.ok((scene._qaBodyHair??[]).every(h=>!h.visible))
console.log('PASS battle/result actions, reduced motion, cast ownership and hidden battle intro')
