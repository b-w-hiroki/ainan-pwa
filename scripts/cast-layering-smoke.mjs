import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { CAST_LAYER_CONFIG, readCastLayerDevOptions } from '../fishing-game/js/presentation/cast/castLayerConfig.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

for (const name of ['sky', 'clouds', 'distantHarbor', 'sea', 'platform', 'character', 'heldRod', 'fish', 'target', 'hud', 'controls']) {
  assert.ok(CAST_LAYER_CONFIG.layers[name], `missing independently adjustable Cast layer: ${name}`)
}
assert.equal(new Set(Object.values(CAST_LAYER_CONFIG.layers).map(value => value.z)).size, 11, 'layer overlap order must be independently configurable')

assert.deepEqual(CAST_LAYER_CONFIG.rod.lineStart, CAST_LAYER_CONFIG.rod.joints.at(-1), 'line must start at the rod tip')
assert.ok(CAST_LAYER_CONFIG.player.handAnchor, 'player hand anchor missing')
assert.deepEqual(CAST_LAYER_CONFIG.player.modularHandAnchor, CAST_LAYER_CONFIG.rod.modularJoints[0], 'modular rod must start at the player hand')
assert.deepEqual(CAST_LAYER_CONFIG.rod.lineStart, CAST_LAYER_CONFIG.rod.modularJoints.at(-1), 'modular line must start at the rod tip')
assert.ok(CAST_LAYER_CONFIG.controls.castButton.radius >= 44, 'Cast touch target is too small')

const demo = readCastLayerDevOptions('?castLayers=1&castLayer=clouds&castLayerX=32&castLayerY=-4&castLayerScale=1.1&castWeather=overcast')
assert.equal(demo.enabled, true)
assert.deepEqual(demo.adjustment, { name: 'clouds', x: 32, y: -4, scale: 1.1, visible: true })
assert.equal(demo.weather, 'overcast')

const hidden = readCastLayerDevOptions('?castLayers=1&castLayer=heldRod&castLayerVisible=0')
assert.equal(hidden.adjustment.visible, false)

const rodlessAsset = 'fishing-game/assets/generated/hero/player_cast_rodless.svg'
assert.ok(existsSync(new URL('../' + rodlessAsset, import.meta.url)), 'rodless player asset missing')
const rodless = read(rodlessAsset)
assert.ok(!rodless.includes('M207 110 Q227 86 245 39'), 'held rod leaked into rodless player asset')

const layeredScene = read('fishing-game/js/presentation/cast/CastLayeredScene.js')
for (const token of ['drawSky', 'drawClouds', 'drawDistantHarbor', 'drawSea', 'drawPlatform', 'drawRod']) {
  assert.ok(layeredScene.includes(token), `layer renderer missing: ${token}`)
}
assert.ok(!layeredScene.includes('localStorage'), 'presentation layers must not mutate saves')

const host = read('fishing-game/js/presentation/cast/CastPresentationHost.js')
assert.ok(host.includes("layeredScene.nodes.fish.add(fishShadows)"), 'fish layer is not physically separated')
assert.ok(host.includes("layeredScene.nodes.target.add(target)"), 'target layer is not physically separated')
assert.ok(host.includes("applyCastLayerAdjustment(chrome, 'hud'"), 'HUD layer is not configurable')
assert.ok(host.includes("applyCastLayerAdjustment(castDock, 'controls'"), 'controls layer is not configurable')

console.log('Cast layering smoke QA passed')
console.log('  independent layers: 11')
console.log('  hand -> rod tip -> line anchor: OK')
console.log('  weather extension presets: OK')
console.log('  save/rules isolation: OK')
