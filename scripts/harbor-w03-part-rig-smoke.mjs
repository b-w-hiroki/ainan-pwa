import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MODULAR_POSES,BODY_VARIANTS,PART_LAYERS,poseRigSockets,
  resolveModularSocket,prepareModularParts } from '../fishing-game/js/presentation/modularPlayerParts.js'
import { CHARACTER_MOTION_POSES } from '../fishing-game/js/presentation/cast/CharacterMotionController.js'
import { ROD_VISUALS } from '../fishing-game/js/presentation/equipmentVisuals.js'
import { resolveHarborPartSocket } from '../fishing-game/js/game/installHarborModularQa.js'

assert.equal(MODULAR_POSES.length,13)
assert.deepEqual(BODY_VARIANTS,['body-a','body-b'])
assert.deepEqual(MODULAR_POSES,Object.keys(CHARACTER_MOTION_POSES))
assert.equal(new Set(PART_LAYERS.map(x=>x.id)).size,PART_LAYERS.length)
assert.ok(PART_LAYERS.every(x=>x.alpha),'All parts must be alpha-compatible')
assert.deepEqual(PART_LAYERS.filter(x=>x.owner==='existing-native-rod').map(x=>x.id),['rod'])
assert.deepEqual(PART_LAYERS.filter(x=>x.owner==='existing-native-line').map(x=>x.id),['line'])
const actor={x:138,y:1160,displayWidth:150,displayHeight:195,angle:0}
for(const poseName of MODULAR_POSES){
  const points=poseRigSockets(poseName)
  for(const key of ['feet','hat','bag']){
    const position=resolveModularSocket(actor,points[key])
    assert.ok(Number.isFinite(position.x+position.y+position.rotation))
  }
  const feet=resolveModularSocket(actor,points.feet)
  assert.equal(feet.x,actor.x)
  assert.equal(feet.y,actor.y)
  for(const key of ['hand','rodTip']){
    assert.equal(Boolean(points[key]), Boolean(CHARACTER_MOTION_POSES[poseName][key==='hand'?'grip':'tip']))
    if(points[key])assert.ok(Number.isFinite(resolveModularSocket(actor,points[key]).x))
  }
  const old=resolveHarborPartSocket(actor,points.hat)
  const next=resolveModularSocket(actor,points.hat)
  assert.deepEqual(old,next,'Existing QA accessory and W03 rig diverged at '+poseName)
}
const b=resolveModularSocket({...actor,angle:25,displayWidth:200},poseRigSockets('castWindup').hat)
assert.ok(b.scale>0.6&&Math.abs(b.rotation)>0)
const combos=[]
for(const bodyVariant of BODY_VARIANTS){
  for(const rodId of Object.keys(ROD_VISUALS)){
    const parts=prepareModularParts({bodyVariant,rodId,hatId:'cap',bagId:'bag',companionId:'cat-01',
      upperId:'jacket01',lowerId:'shorts01',shoesId:'shoes01',hairId:'hair01'})
    assert.equal(parts.options.bodyVariant,bodyVariant)
    assert.equal(parts.options.rodId,rodId)
    assert.equal(parts.nativeRodOwnerCount,1)
    assert.equal(parts.availableNewSourceFiles,0)
    assert.equal(parts.independentBodiesApproved,false)
    assert.equal(parts.independentOutfitsApproved,false)
    assert.equal(parts.companionApproved,false)
    assert.equal(parts.sourceFiles.length,2)
    assert.ok(parts.sourceFiles.every(f=>f.sourcePath===null&&!f.artApproval&&f.poseFilesRequired.length===13))
    combos.push(bodyVariant+':'+rodId)
  }
}
assert.equal(new Set(combos).size,6)
assert.throws(()=>prepareModularParts({bodyVariant:'body-c'}),/Unknown body/)
assert.throws(()=>prepareModularParts({rodId:'laser'}),/Unknown rod/)
assert.throws(()=>prepareModularParts({upperId:''}),/Outfit IDs/)
assert.throws(()=>resolveModularSocket({...actor,x:NaN},[160,200,0]),/Finite/)
const src=readFileSync(new URL('../fishing-game/js/presentation/modularPlayerParts.js',import.meta.url),'utf8')
assert.doesNotMatch(src,/localStorage|saveAccessoryState|saveProgress|setEquipment|awardScore|Math\.random/)
console.log('W03 rig source contracts: all 13 pose sockets, 2 body variants x 3 rods, QA accessory shared transform, no false art approval PASS')
