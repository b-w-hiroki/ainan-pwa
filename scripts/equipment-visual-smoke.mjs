import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

class MemoryStorage {
  constructor() { this.map = new Map() }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null }
  setItem(key, value) { this.map.set(key, String(value)) }
  removeItem(key) { this.map.delete(key) }
  clear() { this.map.clear() }
  snapshot() { return JSON.stringify([...this.map.entries()].sort(([a], [b]) => a.localeCompare(b))) }
}

globalThis.localStorage = new MemoryStorage()
const visuals = await import('../fishing-game/js/presentation/equipmentVisuals.js')
const { CHARACTER_MOTION_POSES } = await import('../fishing-game/js/presentation/cast/CharacterMotionController.js')
const { ACCESSORY_META } = await import('../fishing-game/js/game/midgameProgression.js')

assert.deepEqual(Object.keys(visuals.ROD_VISUALS), ['basic', 'carbon', 'premium'])
assert.deepEqual(Object.keys(ACCESSORY_META), ['cap', 'bag'], 'only the existing cap and bag accessory items may be visualized')
assert.equal(ACCESSORY_META.cap.slot, 'hat')
assert.equal(ACCESSORY_META.bag.slot, 'bag')

const poseNames = Object.keys(CHARACTER_MOTION_POSES)
assert.equal(poseNames.length, 13)
for (const [id, visual] of Object.entries(visuals.ACCESSORY_VISUALS)) {
  assert.deepEqual(Object.keys(visual.anchors), poseNames, `${id}: every authored pose needs an explicit anchor policy`)
  for (const [pose, anchor] of Object.entries(visual.anchors)) {
    assert.ok(anchor[0] >= 0 && anchor[0] <= 320 && anchor[1] >= 0 && anchor[1] <= 420, `${id}/${pose}: anchor outside source frame`)
  }
}

localStorage.setItem('ainan_inventory', JSON.stringify({ rods: { basic: 1, carbon: 1, premium: 1 }, baits: { worm: 12, shrimp: 5, special: 2 } }))
localStorage.setItem('ainan_equipment', JSON.stringify({ rodType: 'premium', baitType: 'shrimp' }))
localStorage.setItem('ainan_accessories', JSON.stringify({ owned: { cap: true, bag: true }, equipped: { hat: 'cap', bag: 'bag' } }))
const beforeRead = localStorage.snapshot()
let loadout = visuals.getVisualLoadout()
assert.equal(loadout.rod.id, 'premium')
assert.equal(loadout.rod.fallback, false)
assert.deepEqual(loadout.accessories, { hat: 'cap', bag: 'bag' })
assert.equal(localStorage.snapshot(), beforeRead, 'visual resolution must not mutate save state')

localStorage.setItem('ainan_inventory', JSON.stringify({ rods: { basic: 1, carbon: 1, premium: 0 } }))
loadout = visuals.getVisualLoadout('premium')
assert.equal(loadout.rod.id, 'basic')
assert.equal(loadout.rod.fallbackReason, 'unowned')

loadout = visuals.getVisualLoadout('tampered-rod')
assert.equal(loadout.rod.id, 'basic')
assert.equal(loadout.rod.fallbackReason, 'invalid')

localStorage.setItem('ainan_accessories', JSON.stringify({ owned: { cap: false, bag: true }, equipped: { hat: 'cap', bag: 'tampered-bag' } }))
loadout = visuals.getVisualLoadout('basic')
assert.deepEqual(loadout.accessories, { hat: null, bag: null }, 'unowned or invalid accessories must not render')

const upgrade = readFileSync(new URL('../fishing-game/js/scenes/UpgradeScene.js', import.meta.url), 'utf8')
const home = readFileSync(new URL('../fishing-game/js/scenes/HomeScene.js', import.meta.url), 'utf8')
const controller = readFileSync(new URL('../fishing-game/js/presentation/cast/CharacterMotionController.js', import.meta.url), 'utf8')
assert.ok(upgrade.includes('fishingMotionIdle') && upgrade.includes('createAccessoryAccent'), 'loadout preview must use the fishing avatar and equipped accents')
assert.ok(home.includes('this._visualLoadout.rod.accent'), 'Home identity chip must reflect the equipped rod')
assert.ok(controller.includes('_applyAccessories(pose)'), 'fishing and result motion must apply accessory anchors')

console.log('Equipment visual smoke QA passed')
console.log('  real schema: rods, baits, hat/cap, bag only')
console.log('  3 rods x 13 poses + cap/bag anchors: declared')
console.log('  unowned/invalid visual fallbacks are read-only and safe')
