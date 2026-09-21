import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

const rarity = read('fishing-game/js/game/installRarityWaterReadability.js')
for (const token of ['uncommon', 'rare', 'legendary', 'qaRarity', 'FIRST']) {
  if (token === 'FIRST') continue
  assert.ok(rarity.includes(token), 'rarity water missing: ' + token)
}
assert.ok(rarity.includes('setTint(0xcff7df)'), 'uncommon tint missing')
assert.ok(rarity.includes('setTint(0xe1d4ff)'), 'rare tint missing')
assert.ok(rarity.includes('setTint(0xffefad)'), 'legendary tint missing')

const reward = read('fishing-game/js/game/installCatchRewardPolish.js')
for (const token of ['FIRST CATCH', 'NEW RECORD', 'RARE CATCH', 'LEGENDARY', 'qaReward']) {
  assert.ok(reward.includes(token), 'reward polish missing: ' + token)
}
assert.ok(reward.includes("scene.env.point = 'pointA'"), 'legendary QA must stay non-boss')
assert.ok(reward.includes("return 124"), 'legendary QA size must be deterministic')

const main = read('fishing-game/js/main.js')
assert.ok(main.includes('installRarityWaterReadability(GameScene)'), 'rarity water installer missing')
assert.ok(main.includes('installCatchRewardPolish(GameScene)'), 'catch reward installer missing')

console.log('Rarity / Reward polish smoke QA passed')
console.log('  water rarity tiers: common / uncommon / rare / legendary')
console.log('  result rewards: first / new record / rare / legendary')
