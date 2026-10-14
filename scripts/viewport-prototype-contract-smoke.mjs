import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const html = readFileSync(new URL('../fishing-game/index.html', import.meta.url), 'utf8')
const boot = readFileSync(new URL('../fishing-game/js/main.js', import.meta.url), 'utf8')
const inline = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
assert.ok(inline, 'inline viewport setup missing')

// Run actual page bootstrap statement, not a copied reimplementation, without
// browser-only globals. QA/PWA cleanup remains outside this non-QA check.
function htmlMode(search) {
  const dataset = {}
  const context = {
    URLSearchParams, location: { search },
    document: { documentElement: { dataset } },
    navigator: {}, window: {},
  }
  vm.runInNewContext(inline, context, { timeout: 1000 })
  return dataset.cameraPanPrototype === '1'
}

const cases = [
  ['', false],
  ['?cameraPan=0', false],
  ['?coneLoop=0', false],
  ['?cameraPan=1', true],
  ['?cameraPan=true', true],
  ['?coneLoop=1', true],
  ['?cameraPan=0&coneLoop=1', true],
  ['?cameraPan=true&coneLoop=0', true],
  ['?qa=1&nativeLandscapeAll=1', true],
  ['?qa=0&nativeLandscapeAll=1', false],
  ['?nativeLandscapeAll=1', false],
  ['?qa=1&nativeLandscapeAll=0', false],
]
for (const [query, expected] of cases) {
  assert.equal(htmlMode(query), expected, 'viewport mode mismatch for '+query)
}
assert.match(html, /html\[data-camera-pan-prototype='1'\] #game-container canvas\s*\{[^}]*width:\s*100%\s*!important;[^}]*height:\s*100%\s*!important;/s,
  'native canvas must fill its available CSS viewport in opt-in mode')
assert.match(boot, /new URLSearchParams\(window\.location\.search\)\.get\('coneLoop'\) === '1'/,
  'runtime RESIZE must remain gated by coneLoop=1')
assert.match(boot, /\['1', 'true'\]\.includes\(new URLSearchParams\(window\.location\.search\)\.get\('cameraPan'\)\)/,
  'runtime RESIZE must remain gated by cameraPan=1')
assert.match(boot,/isNativeLandscapeQaResize\(window\.location\.search\)/,
  'continuous QA preview must enable Phaser RESIZE with matching CSS gate')
console.log('Prototype CSS/Phaser canvas modes agree across 12 URL variants')
console.log('Production still uses approved portrait FIT; this is not landscape ship readiness')
