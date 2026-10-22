import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

assert.ok(existsSync(new URL('../public/ainan-icon.svg', import.meta.url)), 'PWA icon missing')

const root = read('index.html')
const game = read('fishing-game/index.html')
for (const [name, html] of [['root', root], ['fishing', game]]) {
  assert.ok(html.includes('viewport-fit=cover'), name + ': viewport-fit=cover missing')
  assert.ok(html.includes('apple-touch-icon'), name + ': install icon metadata missing')
  assert.ok(html.includes('apple-mobile-web-app-capable'), name + ': iOS standalone capability metadata missing')
  assert.ok(html.includes('apple-mobile-web-app-status-bar-style'), name + ': iOS status bar metadata missing')
  assert.ok(html.includes('apple-mobile-web-app-title'), name + ': iOS app title metadata missing')
  assert.ok(html.includes('serviceWorker'), name + ': service worker lifecycle listener missing')
}

assert.ok(game.includes('safe-area-inset-top'), 'safe-area top missing')
assert.ok(game.includes('safe-area-inset-bottom'), 'safe-area bottom missing')
assert.ok(game.includes('100dvh'), 'dynamic viewport height missing')
assert.ok(game.includes('touch-action: none'), 'mobile touch ownership missing')
assert.ok(game.includes("new URLSearchParams(location.search).get('qa') === '1'"), 'QA cache bypass gate missing')
assert.ok(game.includes('getRegistrations'), 'QA service-worker unregister missing')
assert.ok(game.includes('caches.keys()'), 'QA Cache Storage cleanup missing')

const vite = read('vite.config.ts')
assert.ok(vite.includes("registerType: 'autoUpdate'"), 'PWA auto-update missing')
assert.ok(vite.includes("display: 'standalone'"), 'PWA standalone display missing')
assert.ok(vite.includes("src: 'ainan-icon.svg'"), 'PWA manifest icon missing')
assert.ok(vite.includes("purpose: 'any maskable'"), 'maskable icon purpose missing')
assert.ok(vite.includes('cleanupOutdatedCaches: true'), 'cache cleanup missing')
assert.ok(vite.includes('clientsClaim: true'), 'service worker clientsClaim missing')

const gameScene = read('fishing-game/js/scenes/GameScene.js')
for (const event of ['pointerdown', 'pointermove', 'pointerup']) {
  assert.ok(gameScene.includes("this.input?.off?.('" + event + "'"), 'Fishing cleanup missing input off: ' + event)
}

const save = read('fishing-game/js/game/saveSystem.js')
assert.ok(save.includes('SAVE_VERSION = 3'), 'Save v3 missing')
for (const token of ['ainan_save_backup_1','ainan_save_backup_2','ainan_save_backup_3','checksumData','validateSnapshot','exportSaveData','importSaveData']) {
  assert.ok(save.includes(token), 'save readiness missing: ' + token)
}

const settings = read('fishing-game/js/scenes/SettingsScene.js')
const settingsActions = read('fishing-game/js/game/settingsEntries.js')
const settingsCapture = read('scripts/capture-settings-storage-actions.mjs')
assert.ok(settings.includes('buildSettingsCards(this)') && settingsActions.includes('if (!backupSave())'),
  'Settings must not claim backup success after storage write failure')
assert.ok(settings.includes("typeof navigator.clipboard?.writeText !== 'function'"),
  'Clipboard-unavailable Settings must show the prompt fallback')
assert.ok(!settings.includes('await navigator.clipboard?.writeText?.('),
  'Optional clipboard write must not falsely report success')
assert.ok(settings.includes('this.add.rectangle(x + w - 96, y, 96, h'),
  'Settings actions need full 96x52 touch regions')
for (const part of ['window.__ainanFailBackupCount', "dialog.defaultValue()", '99-settings-backup-failed.png']) {
  assert.ok(settingsCapture.includes(part), 'Missing actual Settings browser QA: ' + part)
}
const ci = read('.github/workflows/ci.yml')
assert.ok(ci.includes('node scripts/capture-settings-storage-actions.mjs'),
  'Settings storage/touch QA must run in full mobile E2E')

// Production must not silently enable the QA-only native-wide previews.
// Their Playwright success covers layout staging, not physical iPhone or
// approved world art; the final 1.0.0 readiness gate stays independent.
const boot=read('fishing-game/js/main.js')
const wideFlags=read('fishing-game/js/presentation/landscape/nativeLandscapeQaFlags.js')
const viewportContract=read('scripts/viewport-prototype-contract-smoke.mjs')
assert.ok(boot.includes('cameraPanPrototype || compactPortraitPrototype ? Phaser.Scale.RESIZE : Phaser.Scale.FIT')
  && boot.includes("new URLSearchParams(window.location.search).get('qa') === '1'")
  && boot.includes("new URLSearchParams(window.location.search).get('compactPortrait') === '1'"),
  'Default production viewport must stay portrait FIT until release gate')
assert.ok(boot.includes('isNativeLandscapeQaResize(window.location.search)'),
  'Wide QA Phaser viewport must use explicit opt-in')
assert.ok(game.includes("isQa && pageParams.get('nativeLandscapeAll') === '1'"),
  'Wide QA CSS viewport must require QA permission')
assert.ok(wideFlags.includes("params.get('qa') === '1'") &&
  wideFlags.includes("params.get('qa') !== '1'"),
  'Wide QA scene flags must never activate without QA')
assert.ok(viewportContract.includes("['?nativeLandscapeAll=1', false]") &&
  viewportContract.includes("['?qa=1&nativeLandscapeAll=1', true]"),
  'Wide QA preview must test both authorized and unauthorized launch URLs')
assert.ok(read('package.json').includes('"version": "1.0.0-rc.3"'),
  'Do not promote 1.0.0 before physical-iPhone and visual art approval')

console.log('Release readiness smoke QA passed')
console.log('  safe-area / dynamic viewport: OK')
console.log('  PWA manifest + icon + service worker: OK')
console.log('  QA cache bypass + Fishing input cleanup: OK')
console.log('  Save v3 + backups + checksum: OK')
