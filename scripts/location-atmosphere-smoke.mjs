import assert from 'node:assert/strict'
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

assert.ok(source.includes("scene.env?.point === 'pointB'"), 'bay routing missing')
assert.ok(source.includes("scene.env?.point === 'pointC'"), 'cape routing missing')
assert.ok(source.includes('buildLocationAtmosphere(this)'), 'create integration missing')

const main = read('fishing-game/js/main.js')
assert.ok(main.includes('installLocationAtmosphere(GameScene)'), 'location atmosphere installer missing')

console.log('Location atmosphere smoke QA passed')
console.log('  harbor: ropes / boat shadows / buoys / lights')
console.log('  bay: shallow light / seaweed / fish school')
console.log('  cape: current / whitewater / giant shadow')
