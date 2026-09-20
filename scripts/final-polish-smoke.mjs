import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

class MemoryStorage {
  constructor() { this.map = new Map() }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null }
  setItem(key, value) { this.map.set(key, String(value)) }
  removeItem(key) { this.map.delete(key) }
  clear() { this.map.clear() }
}
globalThis.localStorage = new MemoryStorage()

const progress = await import('../fishing-game/js/game/progress.js')
const mid = await import('../fishing-game/js/game/midgameProgression.js')
const save = await import('../fishing-game/js/game/saveSystem.js')
const fishModule = await import('../fishing-game/js/game/fish.js')
const conditions = await import('../fishing-game/js/game/worldConditions.js')

// Save v1 -> v2 migration must preserve old progress and create new domains.
localStorage.setItem('ainan_score', '1234')
localStorage.setItem('ainan_catches', JSON.stringify([{ fishId: 'aji', score: 80, sizeCm: 24.1, timestamp: 1 }]))
localStorage.setItem('ainan_save_version', '1')
assert.equal(save.ensureSaveVersion(), 2)
assert.equal(localStorage.getItem('ainan_score'), '1234')
assert.equal(JSON.parse(localStorage.getItem('ainan_catches')).length, 1)
for (const key of ['ainan_materials', 'ainan_rod_levels', 'ainan_accessories', 'ainan_catch_stock', 'ainan_boss_trophies', 'ainan_collection_rewards']) {
  assert.ok(localStorage.getItem(key), 'missing migrated key: ' + key)
}
const migrationBackup = JSON.parse(localStorage.getItem('ainan_save_backup'))
assert.equal(migrationBackup.data.ainan_score, '1234', 'migration should preserve a pre-v2 backup')

// Restoring a legacy backup must also initialize v2-only fields.
localStorage.setItem('ainan_save_backup', JSON.stringify({
  version: 1,
  createdAt: 1,
  data: { ainan_score: '777', ainan_catches: '[]' },
}))
localStorage.setItem('ainan_score', '999')
localStorage.removeItem('ainan_materials')
localStorage.removeItem('ainan_rod_levels')
assert.equal(save.restoreLatestBackup(), true)
assert.equal(progress.getScore(), 777)
assert.ok(localStorage.getItem('ainan_materials'))
assert.ok(localStorage.getItem('ainan_rod_levels'))
assert.equal(localStorage.getItem('ainan_save_version'), '2')

// Expanded content contract.
assert.equal(fishModule.FISH_LIST.length, 9)
assert.equal(Object.keys(mid.BOSS_META).length, 3)
assert.equal(Object.keys(mid.MEAL_META).length, 3)
assert.equal(Object.keys(mid.ACCESSORY_META).length, 2)

// Deterministic in-game weather, not an external live-weather dependency.
const sample = conditions.getWorldConditions(new Date(2026, 8, 20, 12, 0, 0))
assert.equal(sample.season, 'autumn')
assert.equal(sample.timeOfDay, 'noon')
assert.ok(['sunny', 'cloudy', 'rainy'].includes(sample.weather))
assert.deepEqual(sample, conditions.getWorldConditions(new Date(2026, 8, 20, 12, 0, 0)))

// Economy projection using current weighted catch values in a neutral autumn/noon/sunny loop.
const rarityScoreMod = { common: 1, uncommon: 1.5, rare: 2.5, legendary: 5 }
const env = { season: 'autumn', timeOfDay: 'noon', weather: 'sunny', player: { baitType: 'worm' } }
const expectedByPoint = ['pointA', 'pointB', 'pointC'].map(point => {
  const candidates = fishModule.FISH_LIST.filter(fish => fish.habitat.includes(point) && fish.id !== 'kue')
  const rows = candidates.map(fish => ({
    weight: fishModule.calcFishWeight(fish, env),
    score: fish.scoreBase * (rarityScoreMod[fish.rarity] ?? 1),
  }))
  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0)
  return rows.reduce((sum, row) => sum + row.weight * row.score, 0) / totalWeight
})
const expectedPerCatch = expectedByPoint.reduce((sum, value) => sum + value, 0) / expectedByPoint.length
const hour1 = expectedPerCatch * 12
const hour3 = expectedPerCatch * 30
const week = expectedPerCatch * 100
const facilityCurve = [1, 1.9, 2.8, 3.7, 4.6].reduce((sum, value) => sum + value, 0)
const townMaxCost = progress.TOWN_FACILITY_META.reduce((sum, item) => sum + item.baseCost * facilityCurve, 0)
const rodMaxCost = 2200 + 2970 + 3960 + progress.ROD_META.premium.cost
const majorProgressionCost = townMaxCost + rodMaxCost + Object.values(mid.ACCESSORY_META).reduce((sum, item) => sum + item.scoreCost, 0)
assert.ok(hour1 < majorProgressionCost * 0.30, 'first-hour economy should not finish major progression')
assert.ok(hour3 < majorProgressionCost * 0.65, 'three-hour economy should leave meaningful progression')
assert.ok(week > majorProgressionCost, 'longer play should be able to complete major progression')

// Functional upgrade/material loop.
localStorage.clear()
progress.setScore(100000)
mid.saveMaterials({ scale: 100, shell: 100, ticket: 100, crystal: 20 })
for (const rodId of ['basic', 'carbon', 'premium']) {
  for (let i = 0; i < 4; i++) assert.equal(mid.upgradeRodLevel(rodId).ok, true, rodId + ' upgrade failed')
  assert.equal(mid.getRodLevels()[rodId], 5)
  assert.equal(mid.upgradeRodLevel(rodId).reason, 'max')
}
assert.equal(mid.purchaseAccessory('cap').ok, true)
assert.equal(mid.purchaseAccessory('bag').ok, true)

// Fish -> stock/material -> diner loop.
const aji = fishModule.FISH_LIST.find(fish => fish.id === 'aji')
assert.ok(aji)
mid.grantCatchLoot(aji, { sizeCm: 26, score: 80 }, 'pointA')
assert.ok((mid.getCatchStock().aji ?? 0) >= 1)
assert.equal(mid.cookMeal('harborBowl').ok, true)
assert.equal(mid.getActiveMeal()?.id, 'harborBowl')

// Final art and scene wiring guards.
const manifestSource = readFileSync(new URL('../fishing-game/js/config/assetManifest.js', import.meta.url), 'utf8')
assert.ok(!manifestSource.includes("status: 'planned'"), 'asset manifest should have no planned production assets')
for (const asset of [
  'fishing-game/assets/fish/fish_saba_icon.svg',
  'fishing-game/assets/fish/fish_isaki_icon.svg',
  'fishing-game/assets/fish/fish_hirame_icon.svg',
  'fishing-game/assets/fish/fish_kanpachi_icon.svg',
  'fishing-game/assets/town/town_facility_fish_shop.svg',
  'fishing-game/assets/town/town_facility_diner.svg',
  'fishing-game/assets/characters/ch_npc_diner_owner.svg',
  'fishing-game/assets/ui/ui_result_frame.svg',
  'fishing-game/assets/ui/ui_panel_harbor.svg',
  'fishing-game/assets/ui/ui_button_primary.svg',
]) {
  assert.ok(existsSync(new URL('../' + asset, import.meta.url)), 'missing final asset: ' + asset)
}

const mainSource = readFileSync(new URL('../fishing-game/js/main.js', import.meta.url), 'utf8')
const helpSource = readFileSync(new URL('../fishing-game/js/scenes/HelpScene.js', import.meta.url), 'utf8')
const menuSource = readFileSync(new URL('../fishing-game/js/scenes/MenuScene.js', import.meta.url), 'utf8')
const settingsSource = readFileSync(new URL('../fishing-game/js/scenes/SettingsScene.js', import.meta.url), 'utf8')
for (const scene of ['WorkshopScene', 'HarborServicesScene', 'ProfileScene', 'SettingsScene']) {
  assert.ok(mainSource.includes(scene), scene + ' must be registered')
}
assert.ok(helpSource.includes('魚市場Lv.2で魚屋'))
assert.ok(helpSource.includes('日替わり天候'))
assert.ok(menuSource.includes("scene: 'ProfileScene'"))
assert.ok(settingsSource.includes('動きを減らす'))
assert.ok(settingsSource.includes('振動'))

console.log('Final polish smoke QA passed')
console.log('  expected score/catch:', expectedPerCatch.toFixed(1))
console.log('  1h projection (12 catches):', Math.round(hour1), 'pt')
console.log('  3h projection (30 catches):', Math.round(hour3), 'pt')
console.log('  long-play projection (100 catches):', Math.round(week), 'pt')
console.log('  major progression cost:', Math.round(majorProgressionCost), 'pt')
console.log('  save migration / restore: OK')
console.log('  assets / profile / accessibility settings: OK')
