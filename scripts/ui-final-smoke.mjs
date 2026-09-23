import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

const glyph = read('fishing-game/js/ui/UiGlyph.js')
assert.ok(!glyph.includes('strokeArc'), 'UiGlyph must use Phaser-supported graphics APIs')
for (const token of ['rod','trophy','fish','mission','ticket','gift','profile','settings','book','shop','rank','help']) {
  assert.ok(glyph.includes(`type === '${token}'`), 'shared glyph missing: ' + token)
}

const home = read('fishing-game/js/scenes/HomeScene.js')
assert.ok(home.includes("drawUiGlyph(this, 42, 45, 'rod'"), 'Home profile icon must use shared glyph')
assert.ok(home.includes("glyph: 'mission'"), 'Home mission shortcut must use shared glyph')
assert.ok(home.includes("glyph: 'ticket'"), 'Home license shortcut must use shared glyph')
assert.ok(home.includes("glyph: 'gift'"), 'Home daily shortcut must use shared glyph')

const menu = read('fishing-game/js/scenes/MenuScene.js')
for (const token of ['book','trophy','gift','shop','rank','profile','help','settings']) {
  assert.ok(menu.includes(`glyph: '${token}'`), 'Menu card must use shared glyph: ' + token)
}

const footer = read('fishing-game/js/ui/FooterNav.js')
assert.ok(footer.includes("import { drawGlyph } from './UiGlyph.js'"), 'Footer must share glyph renderer')
assert.equal((footer.match(/function drawGlyph\(/g) ?? []).length, 0, 'Footer must not duplicate drawGlyph implementation')

console.log('UI final unification smoke QA passed')
console.log('  Home / Menu / Footer share UiGlyph')
