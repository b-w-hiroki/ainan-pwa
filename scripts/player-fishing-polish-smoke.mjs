import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = read('fishing-game/js/game/installPlayerFishingPolish.js')
for (const path of [
  'fishing-game/assets/generated/hero/player_cast.svg',
  'fishing-game/assets/generated/hero/player_retrieve.svg',
]) {
  assert.ok(existsSync(new URL('../' + path, import.meta.url)), 'missing Fishing player pose: ' + path)
}
const presentation = read('fishing-game/js/game/installFishingPresentationGuard.js')
assert.ok(presentation.includes('fishingCastHero'), 'Cast hero must be wired')
assert.ok(presentation.includes('fishingRetrieveHero'), 'Retrieve hero must be wired')

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
const runtime = read('fishing-game/js/game/installFishingRuntime.js')
assert.ok((main + runtime).includes('installPlayerFishingPolish(GameScene)'), 'player fishing polish installer missing')

console.log('Player fishing polish smoke QA passed')
console.log('  hit reaction inset: OK')
console.log('  battle / boss reaction inset: OK')
console.log('  result player+fish composition: OK')
