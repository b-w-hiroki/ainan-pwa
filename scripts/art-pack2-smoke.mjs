import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const required = [
  'fishing-game/assets/backgrounds/bg_fishing_harbor_v2.svg',
  'fishing-game/assets/backgrounds/bg_fishing_bay_v2.svg',
  'fishing-game/assets/backgrounds/bg_fishing_cape_v2.svg',
  'fishing-game/assets/boss/boss_harbor_runner.svg',
  'fishing-game/assets/boss/boss_bay_hunter.svg',
  'fishing-game/assets/boss/boss_kue.svg',
  'fishing-game/assets/fishing-field/location/location_harbor_overlay.svg',
  'fishing-game/assets/fishing-field/location/location_bay_overlay.svg',
  'fishing-game/assets/fishing-field/location/location_cape_overlay.svg',
]

for (const path of required) {
  assert.ok(existsSync(new URL('../' + path, import.meta.url)), 'missing Visual Art Pack 2 asset: ' + path)
}

const manifest = readFileSync(new URL('../fishing-game/js/config/assetManifest.js', import.meta.url), 'utf8')
for (const path of ['bg_fishing_harbor_v2.svg', 'bg_fishing_bay_v2.svg', 'bg_fishing_cape_v2.svg']) {
  assert.ok(manifest.includes(path), 'manifest must use v2 background: ' + path)
}
for (const key of ['boss_harbor_runner', 'boss_bay_hunter', 'boss_kue', 'ff_location_harbor', 'ff_location_bay', 'ff_location_cape']) {
  assert.ok(manifest.includes(key), 'manifest missing: ' + key)
}

const bossVisuals = await import('../fishing-game/js/game/bossVisuals.js')
for (const id of ['harborRunner', 'bayHunter', 'kue']) {
  const visual = bossVisuals.getBossVisual(id)
  assert.ok(visual?.asset?.key, id + ': missing boss visual')
  assert.ok(Array.isArray(visual.battleSize) && visual.battleSize[0] >= 230, id + ': boss battle art must be large')
  assert.ok(Array.isArray(visual.resultSize) && visual.resultSize[0] >= 230, id + ': boss result art must be large')
}

const blueprint = readFileSync(new URL('../fishing-game/js/game/installBlueprintFishingField.js', import.meta.url), 'utf8')
assert.ok(blueprint.includes('LOCATION_OVERLAY'), 'fishing world must use location overlays')
assert.ok(blueprint.includes('FIELD.locationHarbor'))
assert.ok(blueprint.includes('FIELD.locationBay'))
assert.ok(blueprint.includes('FIELD.locationCape'))

const bossPresentation = readFileSync(new URL('../fishing-game/js/game/installBossArtPresentation.js', import.meta.url), 'utf8')
assert.ok(bossPresentation.includes('applyBossBattleArt'), 'boss battle art must be wired')
assert.ok(bossPresentation.includes('buildBossResult'), 'boss result art must be wired')
assert.ok(bossPresentation.includes('qaBoss'), 'boss E2E forcing must stay available')
assert.ok(bossPresentation.includes('qaPoint'), 'location E2E forcing must stay available')
assert.ok(bossPresentation.includes('BOSS CATCH'), 'boss result payoff must stay visible')

const main = readFileSync(new URL('../fishing-game/js/main.js', import.meta.url), 'utf8')
assert.ok(main.includes('installBossArtPresentation(GameScene)'), 'boss art presentation must be installed')

const challenge = readFileSync(new URL('../fishing-game/js/scenes/ChallengeScene.js', import.meta.url), 'utf8')
assert.ok(challenge.includes('Object.values(ASSETS.bosses)'), 'challenge must preload boss art')
assert.ok(challenge.includes('ASSETS.bosses[state.id]'), 'challenge cards must show dedicated boss art')

console.log('Visual Art Pack 2 smoke QA passed')
console.log('  fishing locations: 3 distinct v2 backgrounds + overlays')
console.log('  boss art: 3 dedicated large assets (harborRunner / bayHunter / kue)')
console.log('  Challenge / Battle / Result integration: OK')
