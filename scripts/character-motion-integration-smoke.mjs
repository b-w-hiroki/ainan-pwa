import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { CHARACTER_MOTION_LAYOUTS, CHARACTER_MOTION_POSES, CHARACTER_MOTION_TIMING, DEFAULT_ROD_VISUAL_ID, ROD_VISUALS } from '../fishing-game/js/presentation/cast/CharacterMotionController.js'
import { ROD_STATS } from '../fishing-game/js/game/params.js'

const root = new URL('../', import.meta.url)
const read = path => readFileSync(new URL(path, root), 'utf8')
const assetDirectory = new URL('fishing-game/assets/characters/animation-v1/', root)

for (const name of ['idle', 'cast-windup', 'cast-mid', 'cast-release', 'fight-left', 'fight-mid', 'fight-right', 'joy-lift', 'joy-mid', 'joy-hold', 'sad-drop', 'sad-mid', 'sad-slump', 'held-rod']) {
  const file = new URL(`${name}.png`, assetDirectory)
  assert.ok(existsSync(file), `missing character motion asset: ${name}`)
  const bytes = readFileSync(file)
  assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a', `${name}: invalid PNG signature`)
  if (name !== 'held-rod') {
    assert.equal(bytes.readUInt32BE(16), 320, `${name}: frame width drift`)
    assert.equal(bytes.readUInt32BE(20), 420, `${name}: frame height drift`)
  }
}

for (const id of ['basic', 'carbon', 'premium']) {
  const file = new URL(`held-rod-${id}.svg`, assetDirectory)
  assert.ok(existsSync(file), `missing held rod visual: ${id}`)
  const svg = readFileSync(file, 'utf8')
  assert.ok(svg.includes('viewBox="0 0 390 844"'), `${id}: held rod canvas drift`)
  const visual = ROD_VISUALS[id]
  assert.ok(visual, `${id}: declarative visual missing`)
  assert.deepEqual(visual.source.grip, [130, 515], `${id}: grip anchor drift`)
  assert.deepEqual(visual.source.tip, [169, 379], `${id}: tip anchor drift`)
  assert.ok(visual.lengthScale > 0.9 && visual.lengthScale < 1.1, `${id}: unsafe display length`)
  assert.ok(visual.line.width >= 1.3, `${id}: line treatment missing`)
}
assert.equal(DEFAULT_ROD_VISUAL_ID, 'carbon', 'existing default rod must remain carbon')
assert.deepEqual(ROD_STATS, {
  basic: { castRange: 1, pullPower: 1, attractRadius: 1 },
  carbon: { castRange: 1.4, pullPower: 1.2, attractRadius: 1.2 },
  premium: { castRange: 2, pullPower: 1.5, attractRadius: 1.5 },
}, 'visual integration must not change rod performance')

for (const [name, pose] of Object.entries(CHARACTER_MOTION_POSES)) {
  for (const anchor of [pose.grip, pose.tip, pose.fish].filter(Boolean)) {
    assert.ok(anchor[0] >= 0 && anchor[0] <= 320 && anchor[1] >= 0 && anchor[1] <= 420, `${name}: anchor outside frame`)
  }
}
assert.ok(CHARACTER_MOTION_TIMING.release.some(frame => frame.pose === 'castMid'), 'cast release must use an in-between')
assert.ok(CHARACTER_MOTION_TIMING.fight.some(frame => frame.pose === 'fightMid'), 'fight loop must use an in-between')
assert.ok(CHARACTER_MOTION_TIMING.joy.some(frame => frame.pose === 'joyMid'), 'joy must use an in-between')
assert.ok(CHARACTER_MOTION_TIMING.sad.some(frame => frame.pose === 'sadMid'), 'sadness must use an in-between')
assert.ok(CHARACTER_MOTION_LAYOUTS.battle.y < CHARACTER_MOTION_LAYOUTS.cast.y, 'battle actor must stay above the control dock')
assert.ok(CHARACTER_MOTION_LAYOUTS.result.y < CHARACTER_MOTION_LAYOUTS.battle.y, 'result actor must stay above result actions')

const controller = read('fishing-game/js/presentation/cast/CharacterMotionController.js')
for (const token of ['isReducedMotion', "phase === 'battle'", "phase === 'result'", 'this.previous.charging', 'this.token += 1', 'fishingMotionHeldRod']) {
  assert.ok(controller.includes(token), `motion controller missing: ${token}`)
}
for (const token of ['ROD_VISUALS', 'rodTextureFallback', 'this._setRodVisual(rodType)', 'curveSteps = 8']) {
  assert.ok(controller.includes(token), `rod visual integration missing: ${token}`)
}
for (const forbidden of ['_saveProgress', 'localStorage.setItem', 'totalScore +=', '_consumeBaitForCast']) {
  assert.ok(!controller.includes(forbidden), `presentation must not alter gameplay: ${forbidden}`)
}

const host = read('fishing-game/js/presentation/cast/CastPresentationHost.js')
assert.ok(host.includes('new CharacterMotionController(scene).mount(field)'), 'motion controller not mounted in real Cast host')
assert.ok(host.includes('characterMotion?.sync(view)'), 'game phase is not connected to motion controller')
assert.ok(host.includes('battleForeground') && host.includes('resultForeground'), 'battle/result UI must render in front of character motion')
const guard = read('fishing-game/js/game/installFishingPresentationGuard.js')
assert.ok(guard.includes('...characterMotionAssets()'), 'motion assets are not preloaded')
assert.ok(guard.includes('_castMotionInputLocked'), 'cast double-input guard missing')
const viewModel = read('fishing-game/js/presentation/cast/CastViewModel.js')
assert.ok(viewModel.includes("rodType: scene.rod?.id"), 'equipped rod is not exposed to the real presentation view')

console.log('Character motion integration smoke QA passed')
console.log('  charge/release, fight loop, caught/escaped one-shots: wired')
console.log('  4 authored in-betweens + separated rod: OK')
console.log('  Basic / Carbon / Premium held visuals + fallback: OK')
console.log('  gameplay/reward/save mutation isolation: OK')
