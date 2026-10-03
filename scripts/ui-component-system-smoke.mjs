import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
const footer = read('fishing-game/js/ui/FooterNav.js')
const button = read('fishing-game/js/ui/Button.js')
const primitives = read('fishing-game/js/ui/UiPrimitives.js')
const home = read('fishing-game/js/scenes/HomeScene.js')
const map = read('fishing-game/js/scenes/MapScene.js')
const result = read('fishing-game/js/presentation/cast/CastPresentationHost.js')
const docs = read('docs/ui-component-system-v1.md')

assert.ok(footer.includes('hitHeight: 72') && footer.includes('bottomInset: 6'), 'footer safe spacing/touch target contract missing')
for (const state of ['idle', 'focus', 'pressed', 'selected', 'disabled']) assert.ok(footer.includes(`'${state}'`), `footer state missing: ${state}`)
assert.ok(footer.includes("keydown-LEFT") && footer.includes("keydown-ENTER") && footer.includes("keydown-ESC"), 'footer keyboard path missing')

assert.ok(button.includes('minHeight: 44') && button.includes('minHitHeight: 48'), 'button target minimum missing')
assert.ok(button.includes('isReducedMotion()') && button.includes('lockMs: 220'), 'button reduced-motion or double-input guard missing')
assert.ok(button.includes('createBackButton') && map.includes('createBackButton(this'), 'shared back hierarchy missing')
assert.ok(home.includes('this._mainCta = new Button') && home.includes("glyph: 'rod'"), 'Home primary action is not using the component')

for (const state of ['selected', 'disabled', 'locked', 'shortage']) assert.ok(primitives.includes(`${state}:`), `card state missing: ${state}`)
assert.ok(primitives.includes('drawStatusMeter') && home.includes('drawStatusMeter(bar'), 'shared status meter missing')
assert.ok(result.includes("labelsAreLiveText: true") && result.includes("'もう一度釣る'"), 'result buttons must keep labels as live text')
assert.ok(result.includes('secondaryHitHeight: 80') && result.includes('_resultInputLocked = true'), 'result target or input lock missing')

for (const phrase of ['Minimum touch target', 'Equipment card', 'Responsive contract']) assert.ok(docs.includes(phrase), `component inventory missing: ${phrase}`)

console.log('UI component system smoke QA passed')
console.log('  footer/button/back states and 44px targets: OK')
console.log('  meter/equipment/result component contracts: OK')
console.log('  live text and responsive inventory: OK')
