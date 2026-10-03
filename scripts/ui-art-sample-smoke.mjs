import fs from 'node:fs'

const required = [
  'footer-shell.png', 'tab-selected.png', 'icon-home.png', 'icon-equip.png', 'icon-town.png',
  'icon-exchange.png', 'icon-menu.png', 'button-primary.png', 'button-secondary.png',
  'button-primary-pressed.png', 'button-disabled.png',
]
for (const file of required) {
  const path = `fishing-game/assets/ui-art-v1/${file}`
  if (!fs.existsSync(path) || fs.statSync(path).size < 4_000) throw new Error(`Missing or implausibly small UI art asset: ${path}`)
}

const manifest = fs.readFileSync('fishing-game/js/config/assetManifest.js', 'utf8')
const home = fs.readFileSync('fishing-game/js/scenes/HomeScene.js', 'utf8')
const footer = fs.readFileSync('fishing-game/js/ui/FooterNav.js', 'utf8')
const button = fs.readFileSync('fishing-game/js/ui/Button.js', 'utf8')

for (const token of ['artFooterShell', 'artTabSelected', 'artIconHome', 'artButtonPrimary', 'artButtonPressed', 'artButtonDisabled']) {
  if (!manifest.includes(token)) throw new Error(`Asset manifest missing ${token}`)
}
if (!home.includes("buildFooterNav(this, W, H, 'home', { useArt: true })")) throw new Error('Home must opt in to the art footer explicitly')
if (!home.includes('artKeys: waiting')) throw new Error('Home CTA must select live art state keys')
if (!footer.includes('options.useArt !== false')) throw new Error('Footer art must be the default with an explicit fallback')
if (!button.includes('artSurface') || !button.includes('artIconKey')) throw new Error('Button must layer code-native content over optional art')

console.log('UI art sample smoke QA passed')
console.log('  generated raster inventory: OK')
console.log('  approved Home foundation retained for global rollout: OK')
console.log('  live text / interaction layer retained: OK')
