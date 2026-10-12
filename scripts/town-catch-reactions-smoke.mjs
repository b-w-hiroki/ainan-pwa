import assert from 'node:assert/strict'
import { FISH_LIST } from '../fishing-game/js/game/fish.js'
import { getTownCatchReaction, TOWN_CATCH_REACTION_IDS } from '../fishing-game/js/game/townCatchReactions.js'
import { readFileSync } from 'node:fs'

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
for (const id of fishIds) {
  const key = id === 'tai' ? 'madaiIcon' : id === 'bass' ? 'blackBassIcon' : id + 'Icon'
  assert.ok(implementation.includes(id + ': ASSETS.fish.' + key),
    id + ': Town fish texture mapping must not silently fall back to emoji')
}
assert.ok(implementation.includes('getTownCatchReaction(catchArrival.fishId) ?? copy.body'),
  'Rarity fallback must survive unknown fish IDs')
assert.ok(implementation.includes('this.load.image(art.key, art.path)'),
  'Direct Result→Town route must preload all fish art')
console.log('Town catch species reactions QA passed:', fishIds.join(', '))
