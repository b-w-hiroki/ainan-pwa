import assert from 'node:assert/strict'
import { FISH_LIST } from '../fishing-game/js/game/fish.js'
import { getTownCatchReaction, TOWN_CATCH_REACTION_IDS, TOWN_CATCH_ICONS, getTownFeaturedCatch } from '../fishing-game/js/game/townCatchReactions.js'
import { readFileSync } from 'node:fs'
import { isCurrentFacilityLevel, didFacilityLevelAdvance } from '../fishing-game/js/game/townUpgradeFeedback.js'

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

console.log('Town catch species reactions QA passed:', fishIds.join(', '))
