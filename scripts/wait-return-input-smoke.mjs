import assert from 'node:assert/strict'
import { build } from 'esbuild'

globalThis.window = { devicePixelRatio: 1, location: { search: '' } }
const bundle = await build({
  stdin: {
    contents: "export { default as GameScene } from './fishing-game/js/scenes/GameScene.js'",
    resolveDir: process.cwd(), sourcefile: 'wait-return-test-entry.js',
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{
    name: 'phaser-scene-test-double',
    setup(bundler) {
      bundler.onResolve({ filter: /^phaser$/ }, () => ({ path: 'phaser', namespace: 'test' }))
      bundler.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
        contents: 'export default { Scene: class {}, Math: { Distance: { Between: (x1,y1,x2,y2) => Math.hypot(x2-x1,y2-y1) }, Clamp: (v,min,max) => Math.min(max,Math.max(min,v)) } }',
        loader: 'js',
      }))
    },
  }],
})
const { GameScene } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)

function makeScene() {
  const events = { toasts: [], tweens: [], delays: [], casts: 0 }
  const scene = Object.assign(Object.create(GameScene.prototype), {
    phase: 'wait', waitTapActive: false, _biteTimers: [],
    anchorX: 10, anchorY: 20, _targetFishIndex: null,
    bobber: { x: 100, y: 200, visible: true, setVisible(value) { this.visible = value } },
    lineGfx: { clear() {}, lineStyle() {}, lineBetween() {} },
    resultUI: { toast(message) { events.toasts.push(message) } },
    tweens: { add(config) { events.tweens.push(config); return config } },
    time: { delayedCall(_ms, callback) { events.delays.push(callback); return { remove() {} } } },
    _enterCast() { events.casts++; this.phase = 'cast'; this._waitReturnPending = false },
  })
  return { scene, events }
}

const manual = makeScene()
manual.scene._reelUp()
manual.scene._reelUp()
manual.scene._onDown({ x: 200, y: 400 })
assert.deepEqual(manual.events.toasts, ['引き上げた'])
assert.equal(manual.events.tweens.length, 1, 'manual return starts one tween')
manual.events.tweens[0].onComplete()
assert.equal(manual.events.casts, 1)
assert.equal(manual.scene.bobber.visible, false)

const miss = makeScene()
miss.scene._onMiss()
miss.scene._onMiss()
miss.scene._onDown({ x: 200, y: 400 })
assert.deepEqual(miss.events.toasts, ['タイミングを逃した…'])
assert.equal(miss.events.delays.length, 1, 'miss schedules one return')
assert.equal(miss.events.tweens.length, 1, 'miss starts one bounce')
miss.events.delays[0]()
assert.equal(miss.events.casts, 1)

const stale = makeScene()
stale.scene._waitReturnEpoch = 1
stale.scene._reelUp()
stale.scene.phase = 'battle'
stale.events.tweens[0].onComplete()
assert.equal(stale.events.casts, 0, 'late return cannot overwrite Battle')
assert.equal(stale.scene.bobber.visible, true)

const newerWait = makeScene()
newerWait.scene._waitReturnEpoch = 1
newerWait.scene._onMiss()
newerWait.scene._waitReturnEpoch = 2
newerWait.scene._waitReturnPending = true
newerWait.events.delays[0]()
assert.equal(newerWait.events.casts, 0, 'old miss timer cannot end a newer wait')

console.log('Wait return input: one reel/miss transition and no stale Battle overwrite PASS')
