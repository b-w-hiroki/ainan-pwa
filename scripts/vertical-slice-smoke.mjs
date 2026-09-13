import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { buildTrajectory, clampLanding } from '../fishing-game/js/game/cast.js'
import { FISH_LIST } from '../fishing-game/js/game/fish.js'
import { updateFishInterest, FISH_INTEREST_STATE } from '../fishing-game/js/game/fishInterest.js'
import { createBattleState, applySwipe, battleOutcome } from '../fishing-game/js/game/battle.js'
import { ROD_STATS } from '../fishing-game/js/game/params.js'
import { installVerticalSliceHookInput } from '../fishing-game/js/game/installVerticalSliceHookInput.js'

const WORLD = {
  player: { x: 138, y: 1160 },
  waterBounds: { minX: 70, maxX: 830, minY: 120, maxY: 1020 },
  pxPerMeter: 18,
}
const BASE_CAST_WORLD_PX = 420
const DISPLAY_H = 210
const DISPLAY_W = DISPLAY_H * (64 / 72)
const ANCHOR = {
  x: WORLD.player.x + DISPLAY_W * 0.42,
  y: WORLD.player.y - DISPLAY_H * 0.77,
}

function landingMeters(rodId, power, angle = 0) {
  const range = BASE_CAST_WORLD_PX * ROD_STATS[rodId].castRange
  const pts = buildTrajectory(ANCHOR.x, ANCHOR.y, angle, power, range)
  clampLanding(pts, WORLD.waterBounds)
  const end = pts.at(-1)
  assert.ok(Number.isFinite(end.x) && Number.isFinite(end.y), `${rodId}: landing must be finite`)
  assert.ok(end.x >= WORLD.waterBounds.minX && end.x <= WORLD.waterBounds.maxX, `${rodId}: landing x out of bounds`)
  assert.ok(end.y >= WORLD.waterBounds.minY && end.y <= WORLD.waterBounds.maxY, `${rodId}: landing y out of bounds`)
  return Math.max(0, (WORLD.player.y - end.y) / WORLD.pxPerMeter)
}

function zoneForMeters(meters) {
  if (meters < 23) return 'near'
  if (meters < 35) return 'mid'
  return 'far'
}

function makeRuntime(fish) {
  return {
    fishDef: fish,
    state: FISH_INTEREST_STATE.CRUISE,
    interest: 0,
    stimulation: 0,
    lastDistance: Infinity,
    spooked: false,
  }
}

const ENV = {
  season: 'spring',
  timeOfDay: 'morning',
  weather: 'sunny',
}

function runInterest(fish, action, ticks = 8, distance = 80, appeal = 0.5, baitType = 'worm') {
  const runtime = makeRuntime(fish)
  for (let i = 0; i < ticks; i++) {
    updateFishInterest(runtime, {
      distance,
      action,
      appeal,
      baitType,
      env: ENV,
      townAttractMod: 1,
    })
  }
  return runtime
}

// 1) Near / mid / far must all be reachable without zooming the viewport out.
const nearM = landingMeters('basic', 0.15)
const midM = landingMeters('carbon', 0.60)
const farM = landingMeters('premium', 0.95)
assert.equal(zoneForMeters(nearM), 'near', `expected near cast, got ${nearM.toFixed(1)}m`)
assert.equal(zoneForMeters(midM), 'mid', `expected mid cast, got ${midM.toFixed(1)}m`)
assert.equal(zoneForMeters(farM), 'far', `expected far cast, got ${farM.toFixed(1)}m`)
assert.ok(nearM < midM && midM < farM, 'rod/power progression must increase cast reach')

// 2) Every range band used by the Vertical Slice must have at least one fish.
for (const zone of ['near', 'mid', 'far']) {
  assert.ok(FISH_LIST.some(fish => fish.castZones?.includes(zone)), `no fish configured for ${zone} zone`)
}

// 3) Retrieve choices must matter by species.
const byId = Object.fromEntries(FISH_LIST.map(fish => [fish.id, fish]))
assert.ok(runInterest(byId.aji, 'twitch').interest > runInterest(byId.aji, 'idle').interest, 'aji should respond better to movement than pure idle')
assert.ok(runInterest(byId.tai, 'idle').interest > runInterest(byId.tai, 'twitch').interest, 'madai should prefer stopping')
assert.ok(runInterest(byId.bass, 'twitch').interest > runInterest(byId.bass, 'idle').interest, 'bass should prefer twitch retrieve')
assert.ok(runInterest(byId.buri, 'slowReel').interest > runInterest(byId.buri, 'idle').interest, 'buri should prefer slow retrieve')
assert.ok(runInterest(byId.kue, 'idle', 8, 80, 0.35, 'special').interest > runInterest(byId.kue, 'slowReel', 8, 80, 0.55, 'special').interest, 'kue should reward cautious stopping')

const cautious = makeRuntime(byId.kue)
let spooked = false
for (let i = 0; i < 14; i++) {
  updateFishInterest(cautious, {
    distance: 70,
    action: 'twitch',
    appeal: 0.9,
    baitType: 'special',
    env: ENV,
    townAttractMod: 1,
  })
  if (cautious.spooked) spooked = true
}
assert.ok(spooked, 'overworking the lure should be able to spook a cautious fish')

// 4) Hook input must be deterministic once the visible HIT window is active.
class HookSceneMock {
  constructor() {
    this.phase = 'wait'
    this.waitTapActive = true
    this.killed = false
    this.enteredBattle = false
    this.originalDownCalls = 0
  }
  _onDown() { this.originalDownCalls += 1 }
  _killWaitTimers() { this.killed = true; this.waitTapActive = false }
  _enterBattle() { this.enteredBattle = true; this.phase = 'battle' }
}
installVerticalSliceHookInput(HookSceneMock)
const hookScene = new HookSceneMock()
hookScene._onDown({})
assert.ok(hookScene.killed, 'HIT tap should close wait timers')
assert.ok(hookScene.enteredBattle, 'HIT tap inside the active window should always enter battle')
assert.equal(hookScene.originalDownCalls, 0, 'HIT tap must not fall through to legacy random hook logic')

const ordinaryInputScene = new HookSceneMock()
ordinaryInputScene.phase = 'cast'
ordinaryInputScene.waitTapActive = false
ordinaryInputScene._onDown({})
assert.equal(ordinaryInputScene.originalDownCalls, 1, 'non-HIT input must still use the normal input path')

// 5) Battle rules must support both clear success and clear failure paths.
const calmBattle = createBattleState(byId.aji, { pullPower: 1.2 })
for (let i = 0; i < 12 && !battleOutcome(calmBattle); i++) applySwipe(calmBattle, false)
assert.equal(battleOutcome(calmBattle), 'caught', 'calm repeated reel input should be able to catch a common fish')

const recklessBattle = createBattleState(byId.aji, { pullPower: 1.2 })
for (let i = 0; i < 6 && !battleOutcome(recklessBattle); i++) applySwipe(recklessBattle, true)
assert.equal(battleOutcome(recklessBattle), 'escaped', 'reeling repeatedly while raging should allow the fish to escape')

// 6) Integration guards: installers, explicit result routing and QA controls must stay wired.
const mainSource = readFileSync(new URL('../fishing-game/js/main.js', import.meta.url), 'utf8')
for (const installer of [
  'installVerticalSliceLayout',
  'installVerticalSliceAgency',
  'installVerticalSliceFishReadability',
  'installVerticalSliceBitePresentation',
  'installVerticalSliceBattleContinuity',
  'installVerticalSliceResultRouting',
  'installVerticalSliceHookInput',
  'installVerticalSliceQaMode',
  'installTownCatchArrival',
]) {
  assert.ok(mainSource.includes(`${installer}(`), `${installer} is not wired in main.js`)
}

const resultUiSource = readFileSync(new URL('../fishing-game/js/scenes/components/ResultUI.js', import.meta.url), 'utf8')
const resultRoutingSource = readFileSync(new URL('../fishing-game/js/game/installVerticalSliceResultRouting.js', import.meta.url), 'utf8')
const qaSource = readFileSync(new URL('../fishing-game/js/game/installVerticalSliceQaMode.js', import.meta.url), 'utf8')
assert.ok(resultUiSource.includes('resultSuccessActions'), 'success result controls must be grouped for explicit routing')
assert.ok(resultRoutingSource.includes('resultSuccessActions?.setVisible(!escaped)'), 'escaped result must hide success-only actions')
for (const label of ['HITミス', '逃走', '釣果GET']) {
  assert.ok(qaSource.includes(label), `QA shortcut missing: ${label}`)
}

for (const asset of [
  'fishing-game/assets/characters/player_cast_anim.webp',
  'fishing-game/assets/characters/player_fight_anim.webp',
  'fishing-game/assets/characters/player_catch_anim.webp',
]) {
  assert.ok(existsSync(new URL(`../${asset}`, import.meta.url)), `missing required asset: ${asset}`)
}

console.log('Vertical Slice smoke QA passed')
console.log(`  near: ${nearM.toFixed(1)}m / mid: ${midM.toFixed(1)}m / far: ${farM.toFixed(1)}m`)
console.log('  retrieve preferences: OK')
console.log('  deterministic hook input: OK')
console.log('  battle success/failure paths: OK')
console.log('  result routing / QA shortcuts: OK')
console.log('  integration/assets: OK')
