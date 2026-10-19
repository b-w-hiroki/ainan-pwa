import assert from 'node:assert/strict'
import { build } from 'esbuild'

globalThis.window = { devicePixelRatio: 1, location: { search: '' } }
const bundle = await build({
  stdin: {
    contents: "export { default as GameScene } from './fishing-game/js/scenes/GameScene.js'",
    resolveDir: process.cwd(), sourcefile: 'wait-hint-test-entry.js',
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{
    name: 'phaser-scene-test-double',
    setup(bundler) {
      bundler.onResolve({ filter: /^phaser$/ }, () => ({ path: 'phaser', namespace: 'test' }))
      bundler.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
        contents: 'export default { Scene: class {} }', loader: 'js',
      }))
    },
  }],
})
const { GameScene } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)

function makeScene() {
  const events = { delays: [], messages: [], tweens: [], killed: [] }
  const scene = Object.assign(Object.create(GameScene.prototype), {
    phase: 'wait', _waitReturnEpoch: 1, _biteTimers: [],
    scale: { width: 390, height: 844 },
    add: { text() {
      const msg = {
        destroyed: false,
        setOrigin() { return this }, setDepth() { return this }, setAlpha() { return this },
        destroy() { this.destroyed = true },
      }
      events.messages.push(msg)
      return msg
    } },
    tweens: {
      add(config) { events.tweens.push(config); return config },
      killTweensOf(target) { events.killed.push(target) },
    },
    time: { delayedCall(_ms, callback) {
      const timer = { callback, removed: false, remove() { this.removed = true } }
      events.delays.push(timer)
      return timer
    } },
  })
  return { scene, events }
}

const beforeDisplay = makeScene()
beforeDisplay.scene._scheduleNoFishMessage()
beforeDisplay.scene._waitReturnPending = true
beforeDisplay.events.delays[0].callback()
assert.equal(beforeDisplay.events.messages.length, 0, 'no hint appears during return')

const visible = makeScene()
visible.scene._scheduleNoFishMessage()
visible.events.delays[0].callback()
assert.equal(visible.events.messages.length, 1)
const hint = visible.events.messages[0]
const fadeTimer = visible.events.delays[1]
visible.scene._killWaitTimers()
assert.equal(hint.destroyed, true, 'return removes visible hint immediately')
assert.equal(fadeTimer.removed, true, 'return cancels delayed fade')
fadeTimer.callback()
assert.equal(visible.events.tweens.length, 1, 'stale fade does not animate old hint')

const newerWait = makeScene()
newerWait.scene._scheduleNoFishMessage()
newerWait.scene._waitReturnEpoch = 2
newerWait.events.delays[0].callback()
assert.equal(newerWait.events.messages.length, 0, 'old wait cannot display hint in new wait')

console.log('Wait no-fish hint: transition cleanup and stale callback protection PASS')
