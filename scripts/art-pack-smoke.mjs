import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const facilityFiles = [
  'fishing-game/assets/town/town_facility_market_lv1.svg',
  'fishing-game/assets/town/town_facility_market_lv3.svg',
  'fishing-game/assets/town/town_facility_market_lv5.svg',
  'fishing-game/assets/town/town_facility_pier_lv1.svg',
  'fishing-game/assets/town/town_facility_pier_lv3.svg',
  'fishing-game/assets/town/town_facility_pier_lv5.svg',
  'fishing-game/assets/town/town_facility_guide_lv1.svg',
  'fishing-game/assets/town/town_facility_guide_lv3.svg',
  'fishing-game/assets/town/town_facility_guide_lv5.svg',
  'fishing-game/assets/town/town_facility_festival_lv1.svg',
  'fishing-game/assets/town/town_facility_festival_lv3.svg',
  'fishing-game/assets/town/town_facility_festival_lv5.svg',
]
const npcFiles = [
  'fishing-game/assets/characters/ch_npc_fishmonger_v2.svg',
  'fishing-game/assets/characters/ch_npc_harbor_captain_v2.svg',
  'fishing-game/assets/characters/ch_npc_guide_staff_v2.svg',
  'fishing-game/assets/characters/ch_npc_young_fisher_v2.svg',
  'fishing-game/assets/characters/ch_npc_diner_owner_v2.svg',
]

for (const path of [...facilityFiles, ...npcFiles]) {
  assert.ok(existsSync(new URL('../' + path, import.meta.url)), 'missing art pack asset: ' + path)
}

const resolver = await import('../fishing-game/js/game/townFacilityArt.js')
assert.equal(resolver.facilityArtTier(0), 1)
assert.equal(resolver.facilityArtTier(2), 1)
assert.equal(resolver.facilityArtTier(3), 3)
assert.equal(resolver.facilityArtTier(4), 3)
assert.equal(resolver.facilityArtTier(5), 5)

for (const id of ['market', 'pier', 'guide', 'festival']) {
  const one = resolver.getTownFacilityArt(id, 1)
  const three = resolver.getTownFacilityArt(id, 3)
  const five = resolver.getTownFacilityArt(id, 5)
  assert.ok(one?.key && three?.key && five?.key, id + ': missing tier')
  assert.notEqual(one.key, three.key, id + ': lv1 and lv3 must differ')
  assert.notEqual(three.key, five.key, id + ': lv3 and lv5 must differ')
}

const manifest = readFileSync(new URL('../fishing-game/js/config/assetManifest.js', import.meta.url), 'utf8')
for (const name of ['fishmonger_v2', 'harbor_captain_v2', 'guide_staff_v2', 'young_fisher_v2', 'diner_owner_v2']) {
  assert.ok(manifest.includes(name), 'manifest must use NPC v2: ' + name)
}

const town = readFileSync(new URL('../fishing-game/js/scenes/TownScene.js', import.meta.url), 'utf8')
assert.ok(town.includes('getTownFacilityArt(item.id, lv)'), 'Town must use level art')
assert.ok(town.includes('beforeArt = getTownFacilityArt'), 'growth BEFORE must use level art')
assert.ok(town.includes('afterArt = getTownFacilityArt'), 'growth AFTER must use level art')

console.log('Visual Art Pack 1 smoke QA passed')
console.log('  facility tiers: 4 x 3')
console.log('  unified NPCs: 5')
console.log('  town growth before/after art: OK')
