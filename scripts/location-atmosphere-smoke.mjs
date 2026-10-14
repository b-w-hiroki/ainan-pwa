import assert from 'node:assert/strict'
import { FISHING_GROUND_NAMES, getFishingGroundName } from '../fishing-game/js/game/fishingGroundNames.js'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = read('fishing-game/js/game/installLocationAtmosphere.js')

for (const token of [
  'function harbor',
  'function bay',
  'function cape',
  'Small fish school',
  'giant deep-water silhouette',
  'ReducedMotion',
]) {
  if (token === 'ReducedMotion') assert.ok(source.includes('isReducedMotion'), 'Reduced Motion support missing')
  else assert.ok(source.includes(token), 'location atmosphere missing: ' + token)
}

assert.ok(source.includes("qaLocation"), 'QA location override missing')
assert.ok(source.includes("point === 'pointB'"), 'bay routing missing')
assert.ok(source.includes("point === 'pointC'"), 'cape routing missing')
assert.ok(source.includes('buildLocationAtmosphere(this)'), 'create integration missing')

const main = read('fishing-game/js/main.js')
const runtime = read('fishing-game/js/game/installFishingRuntime.js')
assert.ok((main + runtime).includes('installLocationAtmosphere(GameScene)'), 'location atmosphere installer missing')

console.log('Location atmosphere smoke QA passed')
console.log('  harbor: ropes / boat shadows / buoys / lights')
console.log('  bay: shallow light / seaweed / fish school')
console.log('  cape: current / whitewater / giant shadow')

// Map is the authoritative point selection. The Fishing host must show
// exactly that name, not a separate Bay/Cape alias after entering the scene.
const mapText = readFileSync(new URL('../fishing-game/js/scenes/MapScene.js', import.meta.url), 'utf8')
const viewText = readFileSync(new URL('../fishing-game/js/presentation/cast/CastViewModel.js', import.meta.url), 'utf8')
for (const point of ['pointA','pointB','pointC']) {
  assert.ok(getFishingGroundName(point), point+': missing canonical name')
  assert.ok(mapText.includes(`name: getFishingGroundName('${point}')`), point+': Map diverges from shared names')
}
assert.ok(viewText.includes('locationLabel: getFishingGroundName(scene.env?.point)'),
  'Fishing HUD must use the same canonical Map names')
assert.equal(getFishingGroundName('pointB'), '蒼海湾')
assert.equal(getFishingGroundName('pointC'), '黒潮崎')
for(const bad of [null,undefined,'__proto__','constructor','unknown']) {
  assert.equal(getFishingGroundName(bad),FISHING_GROUND_NAMES.pointA)
}
