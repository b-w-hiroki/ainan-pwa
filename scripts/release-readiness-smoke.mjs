import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

assert.ok(existsSync(new URL('../public/ainan-icon.svg', import.meta.url)), 'PWA icon missing')

const root = read('index.html')
const game = read('fishing-game/index.html')
for (const [name, html] of [['root', root], ['fishing', game]]) {
  assert.ok(html.includes('viewport-fit=cover'), name + ': viewport-fit=cover missing')
  assert.ok(html.includes('apple-touch-icon'), name + ': install icon metadata missing')
  assert.ok(html.includes('serviceWorker'), name + ': service worker lifecycle listener missing')
}

assert.ok(game.includes('safe-area-inset-top'), 'safe-area top missing')
assert.ok(game.includes('safe-area-inset-bottom'), 'safe-area bottom missing')
assert.ok(game.includes('100dvh'), 'dynamic viewport height missing')
assert.ok(game.includes('touch-action: none'), 'mobile touch ownership missing')

const vite = read('vite.config.ts')
assert.ok(vite.includes("registerType: 'autoUpdate'"), 'PWA auto-update missing')
assert.ok(vite.includes("display: 'standalone'"), 'PWA standalone display missing')
assert.ok(vite.includes("src: 'ainan-icon.svg'"), 'PWA manifest icon missing')
assert.ok(vite.includes("purpose: 'any maskable'"), 'maskable icon purpose missing')
assert.ok(vite.includes('cleanupOutdatedCaches: true'), 'cache cleanup missing')
assert.ok(vite.includes('clientsClaim: true'), 'service worker clientsClaim missing')

const save = read('fishing-game/js/game/saveSystem.js')
assert.ok(save.includes('SAVE_VERSION = 3'), 'Save v3 missing')
for (const token of ['ainan_save_backup_1','ainan_save_backup_2','ainan_save_backup_3','checksumData','validateSnapshot','exportSaveData','importSaveData']) {
  assert.ok(save.includes(token), 'save readiness missing: ' + token)
}

console.log('Release readiness smoke QA passed')
console.log('  safe-area / dynamic viewport: OK')
console.log('  PWA manifest + icon + service worker: OK')
console.log('  Save v3 + backups + checksum: OK')
