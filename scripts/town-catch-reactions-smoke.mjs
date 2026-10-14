import assert from 'node:assert/strict'
import { FISH_LIST } from '../fishing-game/js/game/fish.js'
import { getTownCatchReaction, TOWN_CATCH_REACTION_IDS, TOWN_CATCH_ICONS, getTownFeaturedCatch } from '../fishing-game/js/game/townCatchReactions.js'
import { readFileSync } from 'node:fs'
import { isCurrentFacilityLevel, didFacilityLevelAdvance, getTownUpgradeAction } from '../fishing-game/js/game/townUpgradeFeedback.js'

const fishIds = FISH_LIST.map(fish => fish.id).sort()
assert.deepEqual([...TOWN_CATCH_REACTION_IDS].sort(), fishIds, 'Every gameplay species must have a Town reaction')
const reactions = fishIds.map(id => getTownCatchReaction(id))
assert.equal(new Set(reactions).size, fishIds.length, 'Town reactions must be species-specific, not generic')
for (const [index, body] of reactions.entries()) {
  assert.ok(typeof body === 'string' && body.length >= 15 && body.length <= 65,
    fishIds[index] + ': missing or oversized Town dialogue')
  assert.ok(!/[<>]/.test(body), fishIds[index] + ': unsafe markup in UI text')
}
assert.equal(getTownCatchReaction('unknown'), null, 'Unknown fish must use rarity fallback')
assert.equal(getTownCatchReaction('__proto__'), null, 'Prototype fields are not valid fish IDs')
// Arrival rarity is a display hint, not a trusted object lookup key.
const { getTownArrivalCopy } = await import('../fishing-game/js/game/installTownCatchArrival.js')
const commonArrival = getTownArrivalCopy('common')
for (const rarity of ['uncommon', 'rare', 'legendary']) {
  assert.ok(getTownArrivalCopy(rarity)?.title, rarity + ': missing supported arrival copy')
}
for (const invalid of ['__proto__', 'constructor', 'toString', null, undefined, 'unknown']) {
  assert.equal(getTownArrivalCopy(invalid), commonArrival,
    String(invalid) + ': invalid rarity must fall back to ordinary display copy')
}
const implementation = readFileSync('fishing-game/js/game/installTownCatchArrival.js', 'utf8')
const townSource = readFileSync('fishing-game/js/scenes/TownScene.js','utf8')
const { ASSETS } = await import('../fishing-game/js/config/assetManifest.js')
assert.deepEqual(Object.keys(TOWN_CATCH_ICONS).sort(), fishIds, 'Town art must cover exactly 9 fish')
for (const id of fishIds) {
  const key = id === 'tai' ? 'madaiIcon' : id === 'bass' ? 'blackBassIcon' : id + 'Icon'
  assert.equal(TOWN_CATCH_ICONS[id], ASSETS.fish[key], id + ': wrong art ref for Town')
}
assert.equal(getTownFeaturedCatch([]), null, 'No catches must show no market fish')
assert.equal(getTownFeaturedCatch(null), null, 'No catches must not crash')
const catches = [{ fishId: 'aji' }, { fishId: '__proto__' }, {fishId:'kanpachi'}]
assert.equal(getTownFeaturedCatch(catches)?.fishId,'kanpachi','latest known species must win')
assert.equal(getTownFeaturedCatch([{fishId:'aji'},{fishId:'unknown'}])?.fishId,'aji',
  'unknown IDs should be ignored without losing a known catch')
assert.equal(getTownFeaturedCatch([{ fishId: 'not-fish' }]), null)
assert.equal(getTownFeaturedCatch(catches)?.art, ASSETS.fish.kanpachiIcon)
assert.ok(townSource.includes('this._drawCatchAtShop') && townSource.includes('this._featuredCatch'),
  'Town market/diner must display the actual latest fish without a new modal')
assert.ok(townSource.includes("this._qaTownFeaturedCatch = Object.freeze"),
  'in-world fish display must be inspectable in real-browser QA')
assert.ok(implementation.includes('getTownCatchReaction(catchArrival.fishId) ?? copy.body'),
  'Rarity fallback must survive unknown fish IDs')
assert.ok(implementation.includes('this.load.image(art.key, art.path)'),
  'Direct Result→Town route must preload all fish art')

const before = { facilities: { market: 1, pier: 0, guide: 2, festival: 5 } }
const after = { facilities: { ...before.facilities, market: 2 } }
assert.equal(isCurrentFacilityLevel(before, 'market', 1), true)
assert.equal(isCurrentFacilityLevel(before, 'market', 0), false, 'stale duplicate tap must not spend points')
assert.equal(isCurrentFacilityLevel(before, '__proto__', 0), false, 'unsafe IDs must not match')
assert.equal(isCurrentFacilityLevel(before, 'unknown', 0), false)
assert.equal(isCurrentFacilityLevel(before, 'festival', 5), true)
assert.equal(didFacilityLevelAdvance(before, after, 'market'), true)
assert.equal(didFacilityLevelAdvance(before, before, 'market'), false, 'failed purchase has no success sound')
assert.equal(didFacilityLevelAdvance(before, { facilities: { ...before.facilities, market: 3 } }, 'market'), false,
  'abnormal +2 levels must not count as one successful purchase')
assert.equal(didFacilityLevelAdvance(before, after, '__proto__'), false)
const townLogic = readFileSync('fishing-game/js/game/installMidgameProgression.js','utf8')
assert.ok(townLogic.includes('didFacilityLevelAdvance(before, getTownSummary(), facilityId)'),
  'upgrade sound must check persisted successful transition')
assert.ok(townSource.includes('isCurrentFacilityLevel(getTownSummary(), id, currentLevel)'),
  'stale modal taps must be rejected before points are deducted')

// Exercise the real localStorage-backed transaction boundary, not just a
// mocked TownScene label. A damaged backup or stale caller must not add
// points, charge for an unknown facility or persist arbitrary object keys.
const originalStorage = globalThis.localStorage
const saved = new Map()
globalThis.localStorage = {
  getItem: key => saved.has(key) ? saved.get(key) : null,
  setItem: (key, value) => { saved.set(key, String(value)) },
  removeItem: key => { saved.delete(key) },
}
try {
  const progress = await import('../fishing-game/js/game/progress.js')
  assert.equal(progress.getScore(), 0)
  assert.equal(progress.setScore(1000), true)
  assert.equal(progress.getScore(), 1000)
  assert.equal(progress.spendScore(-180), false, 'negative price must never credit points')
  assert.equal(progress.spendScore(Infinity), false, 'non-finite price must never be accepted')
  assert.equal(progress.spendScore(1.5), false, 'fractional charges must not silently round')
  assert.equal(progress.getScore(), 1000)
  assert.equal(progress.getTownFacilityCost('unknown'), null)
  assert.equal(progress.upgradeTownFacility('__proto__').ok, false, 'prototype ID must not spend')
  assert.equal(progress.upgradeTownFacility('other').ok, false, 'unknown ID must not spend')
  assert.equal(progress.getScore(), 1000)
  assert.deepEqual(progress.upgradeTownFacility('market'), {ok: true, level: 1})
  assert.equal(progress.getTownFacilities().market, 1)
  assert.equal(progress.getScore(), 820, 'one valid facility upgrade costs 180pt')
  assert.deepEqual(progress.upgradeTownFacility('market'), {ok: true, level: 2})
  assert.equal(progress.getScore(), 478, 'second upgrade charges the established 342pt cost')
  saved.set('ainan_score', 'Infinity')
  assert.equal(progress.getScore(), 0, 'corrupt points must not become Infinity')
  assert.equal(progress.upgradeTownFacility('pier').ok, false)
  assert.equal(progress.getTownFacilities().pier, 0, 'no facility advanced with corrupt points')
  saved.set('ainan_score', '99.9')
  assert.equal(progress.getScore(), 99, 'fractional older saves keep their integer point balance')
  assert.equal(progress.setScore(NaN), false, 'invalid points must not be stored')
  assert.equal(progress.getScore(), 99)

  saved.set('ainan_town_facilities',
    '{"market":2,"pier":"5","guide":-1,"festival":99,"__proto__":{"polluted":true}}')
  const facilities = progress.getTownFacilities()
  assert.deepEqual(facilities, {market:2,pier:0,guide:0,festival:0},
    'corrupt saved levels and forged facility keys must be discarded')
  assert.equal(Object.prototype.hasOwnProperty.call(facilities, '__proto__'), false)
  assert.equal(progress.getTownFacilityCost('pier'), 260)
  progress.saveTownFacilities({...facilities, unexpected:5})
  assert.deepEqual(JSON.parse(saved.get('ainan_town_facilities')), facilities,
    'facility save must write only the established four progression keys')
} finally {
  if (originalStorage === undefined) delete globalThis.localStorage
  else globalThis.localStorage = originalStorage
}

// Real Town affordance: a shortfall must lead back to fishing instead of
// charging or stranding the player in a purchase-error toast.
assert.deepEqual(getTownUpgradeAction(0, 180, 180),
  {kind:'upgrade', label:'180ptで発展', missing:0})
assert.deepEqual(getTownUpgradeAction(0, 180, 0),
  {kind:'fish', label:'あと180pt・釣りへ', missing:180})
assert.equal(getTownUpgradeAction(4, 2024, 1500).kind, 'fish')
assert.equal(getTownUpgradeAction(4, 2024, 2500).kind, 'upgrade')
for (const bad of [
  [5, 180, 500], [-1, 180, 500],
  [0, -1, 500], [0, NaN, 500], [0, 180, Infinity], [0, 180, -1],
]) assert.equal(getTownUpgradeAction(...bad), null, 'invalid cost/level/points cannot offer a purchase')
assert.ok(townSource.includes('getTownUpgradeAction(lv, cost, getScore())'),
  'Town must show the affordance based on the latest saved points')
assert.ok(townSource.includes("upgradeAction.kind === 'upgrade'"),
  'only an affordable CTA may invoke upgrade')
assert.ok(townSource.includes("this.scene.start('MapScene')"),
  'shortage CTA must have a usable navigation destination')

console.log('Town catch species reactions QA passed:', fishIds.join(', '))
