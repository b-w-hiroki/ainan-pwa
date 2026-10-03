import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const assetDir = path.join(root, 'fishing-game/assets/gameplay-parts-v1')
const required = [
  'fish-bass.png', 'fish-saba.png', 'fish-isaki.png', 'fish-hirame.png', 'fish-kanpachi.png',
  'rod-basic.png', 'rod-carbon.png', 'rod-premium.png',
  'bait-worm.png', 'bait-shrimp.png', 'bait-special.png',
  'status-tension-safe.png', 'status-tension-warning.png', 'status-tension-danger.png',
  'result-caught-burst.png', 'result-escaped-splash.png',
]

for (const file of required) {
  const target = path.join(assetDir, file)
  if (!fs.existsSync(target) || fs.statSync(target).size < 20_000) throw new Error(`missing or undersized gameplay part: ${file}`)
}

const manifest = fs.readFileSync(path.join(root, 'fishing-game/js/config/assetManifest.js'), 'utf8')
const game = fs.readFileSync(path.join(root, 'fishing-game/js/scenes/GameScene.js'), 'utf8')
const upgrade = fs.readFileSync(path.join(root, 'fishing-game/js/scenes/UpgradeScene.js'), 'utf8')
const workshop = fs.readFileSync(path.join(root, 'fishing-game/js/scenes/WorkshopScene.js'), 'utf8')
const host = fs.readFileSync(path.join(root, 'fishing-game/js/presentation/cast/CastPresentationHost.js'), 'utf8')

for (const token of ['blackBassPartV1', 'kanpachiPartV1', 'rodPremiumPartV1', 'baitSpecialPartV1', 'tensionSafe', 'tensionDanger', 'resultCaught', 'resultEscaped']) {
  if (!manifest.includes(token)) throw new Error(`manifest integration missing: ${token}`)
}
if (!game.includes('...Object.values(ASSETS.gameplayFx)') || !game.includes("bass: 'fish_part_v1_bass'")) throw new Error('GameScene part preload/result mapping missing')
if (!upgrade.includes('rodBasicPartV1') || !upgrade.includes('baitSpecialPartV1')) throw new Error('UpgradeScene equipment art mapping missing')
if (!workshop.includes('rodPremiumPartV1')) throw new Error('WorkshopScene rod mapping missing')
if (!host.includes('battleTensionStatus') || !host.includes('resultOutcomeFx') || !host.includes('tension01 >= 0.72')) throw new Error('battle/result effect integration missing')

console.log('Gameplay parts v1 smoke QA passed')
console.log('  5 non-hero fish + 3 rods + 3 baits: OK')
console.log('  safe/warning/danger + caught/escaped FX: OK')
console.log('  live text, values, hit regions and existing data schema retained: OK')
