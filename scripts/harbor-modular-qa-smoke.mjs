import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolveHarborPartSocket, isHarborModularQaEnabled } from '../fishing-game/js/game/installHarborModularQa.js'
import { ACCESSORY_VISUALS } from '../fishing-game/js/presentation/equipmentVisuals.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const flag='?qa=1&qaHarborPlayable=1&cameraPan=1&coneLoop=1&qaParts=1'
assert.equal(isHarborModularQaEnabled(flag),true)
for(const search of ['', '?qaParts=1', '?qa=1&qaParts=1', '?qa=1&qaParts=1&cameraPan=1&coneLoop=1']){
  assert.equal(isHarborModularQaEnabled(search),false,'H03 QA parts must not load on ordinary game')
}
const actor={x:140,y:1160,displayWidth:160,displayHeight:210,angle:0}
const cap=resolveHarborPartSocket(actor,ACCESSORY_VISUALS.cap.anchors.idle)
const bag=resolveHarborPartSocket(actor,ACCESSORY_VISUALS.bag.anchors.idle)
assert.ok(cap.y<bag.y&&bag.y<actor.y, 'Hat/bag must follow respective body sockets')
assert.equal(cap.scale,0.5)
assert.ok(Math.abs(cap.x-141.5)<.01)
const rotated=resolveHarborPartSocket({...actor,angle:35},ACCESSORY_VISUALS.cap.anchors.castWindup)
assert.ok(Number.isFinite(rotated.x+rotated.y+rotated.rotation))
assert.notDeepEqual(rotated,cap,'Pose and actor angle must update accessory sockets')
assert.throws(()=>resolveHarborPartSocket({x:NaN,y:0,displayWidth:120,displayHeight:200,angle:0},[160,107,0]),/finite/)
const src=read('fishing-game/js/game/installHarborModularQa.js')
const runtime=read('fishing-game/js/game/installFishingRuntime.js')
assert.ok(runtime.indexOf('installHarborModularQa(GameScene)')>runtime.indexOf('installHarborPlayableQa(GameScene)'))
assert.match(src,/this\._cameraPanRodVisual = ROD_VISUALS\[qaRod\]/,'Rod visuals must reuse the native owner')
assert.doesNotMatch(src,/saveState|setEquipment|saveAccessoryState|localStorage|award|addCatch|Math\.random/,'QA overlays must not alter equipment persistence or odds')
assert.match(src,/independentBodyVariantsReady: false/,'Missing approved body variants cannot be called complete')
assert.match(src,/optionArtApproved: false/,'QA cat cannot be promoted as final painted option')
assert.match(src,/isHarborModularQaEnabled\(search\(\)\) && params\.get\('qaCatArt'\) === '1'/,'Candidate cat loads only behind the full QA gate')
assert.match(src,/setData\('artApproved', false\)/,'Candidate cat remains unapproved')
assert.match(src,/catArtCandidate: parts\.catArt/,'QA snapshot identifies painted candidate separately from approval')
assert.match(src,/p\.cat\?\.destroy\?\.\(true\)/,'Companion must be cleaned up')
console.log('H03 accessories: independent sockets, safe QA gate, native rod ownership and no save writes PASS')
