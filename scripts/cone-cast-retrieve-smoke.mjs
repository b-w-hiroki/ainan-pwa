import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CONE_CAST_TUNING } from '../fishing-game/js/game/installConeCastRetrievePrototype.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = read('fishing-game/js/game/installConeCastRetrievePrototype.js')
const camera = read('fishing-game/js/game/installCastCameraPanPrototype.js')

assert.deepEqual(CONE_CAST_TUNING, { halfAngleDeg: 52, minDistancePx: 180, maxDistancePx: 780 })
assert.match(source, /phase !== 'cast' \|\| this\._coneCastState\.castLocked/, 'cast needs a phase and re-entry guard')
assert.match(source, /state\.hitCommitted \|\| state\.hitTransitioning \|\| this\.phase !== 'retrieve'/, 'hit transition needs a one-shot guard')
assert.match(source, /state\.hitCommitted = this\.phase === 'wait'/, 'hit must commit only after the existing transition succeeds')
assert.match(source, /event\.code === 'Enter'/, 'keyboard cast alternative missing')
assert.match(source, /event\.code === 'KeyR'/, 'keyboard retrieve alternative missing')
assert.match(source, /getWorldPoint/, 'aim input must resolve through the world camera')
assert.match(source, /_startSlowRetrieve/, 'retrieve must reuse the existing reel mechanic')
assert.match(source, /isReducedMotion\(\)/, 'reduced-motion timing path missing')
assert.ok(!/localStorage|saveState|award|reward|score\s*[+]=/.test(source), 'prototype must not own save, economy, or reward writes')
assert.match(camera, /!this\.bobber\?\.visible && this\.phase === 'cast'/, 'bait shortage must release camera/input lock')
assert.match(camera, /battleHero\?\.removeFromDisplayList/, 'camera prototype must suppress the duplicate transparent battle hero')

console.log('Cone cast/retrieve smoke QA passed')
console.log('  fan aim + separate commit + keyboard alternatives: OK')
console.log('  one-shot hit + save/economy isolation + shortage recovery: OK')
