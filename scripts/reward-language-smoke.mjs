import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

const presentation = read('fishing-game/js/game/rewardPresentation.js')
for (const token of [
  'FIRST CATCH',
  'NEW RECORD',
  'RARE CATCH',
  'LEGENDARY',
  'TROPHY UNLOCKED',
  'ACHIEVEMENT',
  'TOWN GROWTH',
  'showRewardBanner',
]) assert.ok(presentation.includes(token), 'reward language missing: ' + token)

const catchReward = read('fishing-game/js/game/installCatchRewardPolish.js')
assert.ok(catchReward.includes("rewardToken('first')"), 'catch FIRST must use shared token')
assert.ok(catchReward.includes("rewardToken('legendary')"), 'catch LEGENDARY must use shared token')

const boss = read('fishing-game/js/game/installBossEventPolish.js')
assert.ok(boss.includes("rewardToken('trophy')"), 'boss trophy must use shared token')
assert.ok(boss.includes("rewardToken('record')"), 'boss record must use shared token')

const achievement = read('fishing-game/js/scenes/AchievementScene.js')
assert.ok(achievement.includes("kind: 'achievement'"), 'achievement must use shared banner')

const town = read('fishing-game/js/scenes/TownScene.js')
assert.ok(town.includes('REWARD_THEME.growth.label'), 'town growth must use shared label')

console.log('Reward language smoke QA passed')
console.log('  catch / boss / achievement / town: shared language')
