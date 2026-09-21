import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

const blueprint = read('fishing-game/js/game/installBlueprintFishingField.js')
assert.equal((blueprint.match(/const LOCATION_OVERLAY/g) ?? []).length, 1, 'LOCATION_OVERLAY must be declared once')

const bossEvent = read('fishing-game/js/game/installBossEventPolish.js')
for (const token of ['BOSS ENCOUNTER', 'SPEED', 'HUNTER', 'HEAVY', 'TROPHY UNLOCKED', 'NEW RECORD', 'qaFreshBoss']) {
  assert.ok(bossEvent.includes(token), 'boss event polish missing: ' + token)
}
assert.ok(bossEvent.includes('this.env.bossId = id'), 'direct boss challenge must persist boss id')
assert.ok(bossEvent.includes('FISH_LIST.find'), 'direct boss challenge must force target fish')

const map = read('fishing-game/js/scenes/MapScene.js')
for (const token of ['BOSS!', '★ TROPHY', '大物挑戦 / 再戦', "this.scene.start('ChallengeScene')"]) {
  assert.ok(map.includes(token), 'map boss linkage missing: ' + token)
}

const challenge = read('fishing-game/js/scenes/ChallengeScene.js')
for (const token of ['SPEED', 'HUNTER', 'HEAVY', "'GameScene'", 'bossId: state.id', 'もう一度挑戦']) {
  assert.ok(challenge.includes(token), 'challenge boss showcase missing: ' + token)
}

const qa = read('fishing-game/js/game/qaBootstrap.js')
assert.ok(qa.includes("bossState") && qa.includes("qaFreshBoss"), 'QA must support pending/fresh boss states')
assert.ok(qa.includes("ainan_boss_trophies"), 'QA must reset boss trophies deterministically')

const main = read('fishing-game/js/main.js')
assert.ok(main.includes('installBossEventPolish(GameScene)'), 'Boss event polish must be installed')

console.log('Boss Event Polish smoke QA passed')
console.log('  main build duplicate regression: guarded')
console.log('  encounter / personalities / trophy-result: OK')
console.log('  Map -> Challenge -> Boss Battle routing: OK')
