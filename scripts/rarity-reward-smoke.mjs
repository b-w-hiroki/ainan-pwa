import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

const rarity = read('fishing-game/js/game/installRarityWaterReadability.js')
for (const token of ['RARITY_WATER_STYLE', 'uncommon', 'rare', 'legendary']) {
  assert.ok(rarity.includes(token), 'rarity water missing: ' + token)
}
assert.ok(rarity.includes('setTint(0xcff7df)'), 'uncommon tint missing')
assert.ok(rarity.includes('setTint(0xe1d4ff)'), 'rare tint missing')
assert.ok(rarity.includes('setTint(0xffefad)'), 'legendary tint missing')
assert.ok(rarity.includes('scale: 1.05'), 'uncommon scale missing')
assert.ok(rarity.includes('scale: 1.11'), 'rare scale missing')
assert.ok(rarity.includes('scale: 1.18'), 'legendary scale missing')

const reward = read('fishing-game/js/game/installCatchRewardPolish.js')
assert.ok(reward.includes('qaReward'), 'reward polish missing QA forcing')
for (const kind of ['first', 'record', 'rare', 'legendary']) {
  assert.ok(reward.includes("rewardToken('" + kind + "')"), 'reward polish missing shared token: ' + kind)
}

const rewardPresentation = read('fishing-game/js/game/rewardPresentation.js')
for (const token of ['FIRST CATCH', 'NEW RECORD', 'RARE CATCH', 'LEGENDARY']) {
  assert.ok(rewardPresentation.includes(token), 'shared reward language missing: ' + token)
}
assert.ok(reward.includes("scene.env.point = 'pointA'"), 'legendary QA must stay non-boss')
assert.ok(reward.includes("return 124"), 'legendary QA size must be deterministic')

const main = read('fishing-game/js/main.js')
assert.ok(main.includes('installRarityWaterReadability(GameScene)'), 'rarity water installer missing')
assert.ok(main.includes('installCatchRewardPolish(GameScene)'), 'catch reward installer missing')

console.log('Rarity / Reward polish smoke QA passed')
console.log('  water rarity tiers: common / uncommon / rare / legendary')
console.log('  result rewards: first / new record / rare / legendary')
