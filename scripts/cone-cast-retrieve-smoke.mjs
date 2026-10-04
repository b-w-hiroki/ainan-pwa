import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildTrajectory } from '../fishing-game/js/game/cast.js'
import { CONE_CAST_TUNING, buildCastRangeGeometry, isValidCastLanding } from '../fishing-game/js/game/installConeCastRetrievePrototype.js'
import { FISHING_WORLD } from '../fishing-game/js/scenes/components/FishingCameraController.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = read('fishing-game/js/game/installConeCastRetrievePrototype.js')
const camera = read('fishing-game/js/game/installCastCameraPanPrototype.js')

assert.deepEqual(CONE_CAST_TUNING, { halfAngleDeg: 52, minDistancePx: 180, maxDistancePx: 780 })
const geometryScene = { anchorX: 192, anchorY: 1056, castRangePx: 420, _cameraPanRodTip: { x: 188, y: 1072 } }
const geometry = buildCastRangeGeometry(geometryScene)
const expectedCenter = buildTrajectory(geometryScene.anchorX, geometryScene.anchorY, 0, 0.95, geometryScene.castRangePx).at(-1)
const center = geometry.outer.reduce((best, point) => Math.abs(point.x - geometryScene.anchorX) < Math.abs(best.x - geometryScene.anchorX) ? point : best)
assert.ok(Math.hypot(center.x - expectedCenter.x, center.y - expectedCenter.y) < 0.01, 'fan center must use the real maximum trajectory landing')
assert.ok([...geometry.inner, ...geometry.outer].every(point => isValidCastLanding(point)), 'fan must contain water-valid landing points only')
assert.ok(geometry.samples.every(sample => sample.innerDistance >= 522.85), 'fan must start at the minimum armed pull, not the decorative distance floor')
assert.equal(isValidCastLanding({ x: 120, y: 1120 }), false, 'pier must not be advertised as castable water')
assert.deepEqual(geometry.origin, { x: 192, y: 1056 }, 'fan origin must remain the logical world cast origin')
assert.deepEqual(geometry.rodTip, { x: 188, y: 1072 }, 'visual rod-tip relationship must be retained')
assert.match(source, /phase !== 'cast' \|\| this\._coneCastState\.castLocked/, 'cast needs a phase and re-entry guard')
assert.match(source, /state\.hitCommitted \|\| state\.hitTransitioning \|\| this\.phase !== 'retrieve'/, 'hit transition needs a one-shot guard')
assert.match(source, /state\.hitCommitted = this\.phase === 'wait'/, 'hit must commit only after the existing transition succeeds')
assert.match(source, /event\.code === 'Enter'/, 'keyboard cast alternative missing')
assert.match(source, /event\.code === 'KeyR'/, 'keyboard retrieve alternative missing')
assert.match(source, /inSlingshotOrigin/, 'cast input must start from the character origin')
assert.match(source, /strokePoints\(selection\.points, false\)/, 'aim line must use the real lure trajectory')
assert.match(source, /buildCastRangeGeometry/, 'fan must use world trajectory geometry')
assert.match(source, /_coneCastRangeGeometryCache/, 'static world geometry must not be rebuilt every frame')
assert.match(source, /_startSlowRetrieve/, 'retrieve must reuse the existing reel mechanic')
assert.match(source, /isReducedMotion\(\)/, 'reduced-motion timing path missing')
assert.ok(!/localStorage|saveState|award|reward|score\s*[+]=/.test(source), 'prototype must not own save, economy, or reward writes')
assert.match(camera, /!scene\.bobber\?\.visible/, 'bait shortage must release camera/input lock after the tuned release event')
assert.match(camera, /battleHero\?\.removeFromDisplayList/, 'camera prototype must suppress the duplicate transparent battle hero')

console.log('Cone cast/retrieve smoke QA passed')
console.log('  slingshot aim + release commit + keyboard alternatives: OK')
console.log('  one-shot hit + save/economy isolation + shortage recovery: OK')
