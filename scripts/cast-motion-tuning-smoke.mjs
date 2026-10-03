import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  CAST_FLIGHT_TUNING,
  CAST_MOTION_PROFILES,
  castFlightDurationMs,
  resolveCastMotionProfile,
} from '../fishing-game/js/game/castMotionTuning.js'
import { ROD_VISUALS } from '../fishing-game/js/presentation/equipmentVisuals.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const presentation = read('fishing-game/js/game/installCastCameraPanPrototype.js')
const retrieve = read('fishing-game/js/game/installRetrieveGameplay.js')
const camera = read('fishing-game/js/scenes/components/FishingCameraController.js')

const phaseIds = ['ready', 'drawBack', 'charge', 'swing', 'followThrough']
for (const [name, profile] of Object.entries(CAST_MOTION_PROFILES)) {
  assert.deepEqual(profile.phases.map(phase => phase.id), phaseIds, `${name}: five authored phases`)
  assert.equal(new Set(profile.phases.map(phase => phase.durationMs)).size, 5, `${name}: phase durations tune independently`)
  const resolved = resolveCastMotionProfile(`?castMotion=${name}`, false)
  assert.equal(resolved.name, name)
  assert.ok(resolved.releaseEventMs > resolved.phaseStartMs.swing)
  assert.notEqual(resolved.camera.panStartMs, resolved.releaseEventMs, `${name}: camera and release are independent`)
}

const standard = resolveCastMotionProfile('?castMotion=standard', false)
const charged = resolveCastMotionProfile('?castMotion=charged', false)
const reduced = resolveCastMotionProfile('?castMotion=charged', true)
assert.ok(charged.phases.find(phase => phase.id === 'charge').durationMs > standard.phases.find(phase => phase.id === 'charge').durationMs)
assert.ok(charged.releaseEventMs > standard.releaseEventMs)
assert.ok(reduced.totalMs < charged.totalMs)
assert.ok(reduced.phases.every(phase => phase.bodyAngleDeg === 0))
assert.ok(reduced.phases.some(phase => phase.rodAngleOffsetDeg !== 0))

assert.deepEqual(CAST_FLIGHT_TUNING, {
  baseMs: 620,
  distanceFactorMsPerPx: 0.42,
  minMs: 720,
  maxMs: 1080,
  ease: 'Quad.out',
})
assert.equal(castFlightDurationMs(0), 720)
assert.equal(castFlightDurationMs(2000), 1080)
assert.match(retrieve, /castFlightDurationMs\(castDistance\)/)
assert.match(retrieve, /ease: CAST_FLIGHT_TUNING\.ease/)
assert.match(camera, /beginCastPan\(angleDeg, power01, tuning = \{\}\)/)
assert.match(presentation, /scene\.fishingCamera\?\.beginCastPan/)
assert.match(presentation, /originalFireCast\.apply\(scene, args\)/)
assert.match(presentation, /_cameraPanCasting\) return false/, 'double input guard missing')
assert.match(presentation, /cancelCastMotion\(this/, 'interruption cleanup missing')
assert.ok(!/localStorage|saveState|award|reward|score\s*[+]=|stamina\s*[+-]=/.test(presentation), 'visual timing must not own rewards/save/stamina')
assert.deepEqual(Object.keys(ROD_VISUALS).sort(), ['basic', 'carbon', 'premium'])
for (const visual of Object.values(ROD_VISUALS)) {
  assert.equal(visual.source.grip.length, 2)
  assert.equal(visual.source.tip.length, 2)
}

console.log('Cast motion tuning smoke QA passed')
console.log(`  release: standard ${standard.releaseEventMs}ms / charged ${charged.releaseEventMs}ms`)
console.log('  five phases / independent camera / reduced motion / three rods: OK')
console.log('  flight, reward, save, stamina isolation: OK')
