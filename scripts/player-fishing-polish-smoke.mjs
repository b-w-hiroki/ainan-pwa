import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = read('fishing-game/js/game/installPlayerFishingPolish.js')

for (const token of [
  'HIT!',
  'BOSS FIGHT',
  'REEL!',
  'NICE!',
  'qaPlayer',
  'showResultPartner',
]) {
  assert.ok(source.includes(token), 'player fishing polish missing: ' + token)
}
assert.ok(source.includes('ch_player_fight_anim'), 'fight animation asset must be reused')
assert.ok(source.includes('ch_player_catch_anim'), 'catch animation asset must be reused')
assert.ok(source.includes('isReducedMotion'), 'Reduced Motion support missing')

const main = read('fishing-game/js/main.js')
assert.ok(main.includes('installPlayerFishingPolish(GameScene)'), 'player fishing polish installer missing')

console.log('Player fishing polish smoke QA passed')
console.log('  hit reaction inset: OK')
console.log('  battle / boss reaction inset: OK')
console.log('  result player+fish composition: OK')
