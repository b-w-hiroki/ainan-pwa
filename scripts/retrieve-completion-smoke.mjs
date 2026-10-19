import assert from 'node:assert/strict'
import { build } from 'esbuild'

// Bundle the real installers against only the Phaser math used by this
// headless transition test. Browser rendering remains covered by mobile E2E.
globalThis.window = { location: { search: '' } }
const bundle = await build({
  stdin: {
    contents: "export { installRetrieveGameplay } from './fishing-game/js/game/installRetrieveGameplay.js'; export { installRetrieveCompletion } from './fishing-game/js/game/installRetrieveCompletion.js'",
    resolveDir: process.cwd(),
    sourcefile: 'retrieve-completion-test-entry.js',
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{
    name: 'phaser-math-test-double',
    setup(bundler) {
      bundler.onResolve({ filter: /^phaser$/ }, () => ({ path: 'phaser', namespace: 'test' }))
      bundler.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
        contents: 'export default { Math: { Distance: { Between: (x1,y1,x2,y2) => Math.hypot(x2-x1,y2-y1) }, Clamp: (v,min,max) => Math.min(max,Math.max(min,v)) } }',
        loader: 'js',
      }))
    },
  }],
})
const { installRetrieveGameplay, installRetrieveCompletion } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)

class Scene {
  update() {}
  _enterCast() { this.phase = 'cast'; this.castEntries++ }
  _onDown() {}
  _onMove() {}
  _cleanup() {}
  _enterBattle() {}
  _finishBattle() {}
  _showBigHitCutin() {}
  _syncTackle() {}
  _fireCast() {}
  _stopSlowRetrieve() { this.retrieveState.slowHeld = false }
}

installRetrieveGameplay(Scene)
installRetrieveCompletion(Scene)

const events = { toasts: [], returns: [], interestStops: 0, delayed: 0 }
const visible = value => ({ setVisible() { return this }, visible: value })
const bobber = {
  x: 60, y: 0, visible: true,
  setVisible(value) { this.visible = value; return this },
  setPosition(x, y) { this.x = x; this.y = y; return this },
}
const scene = Object.assign(new Scene(), {
  phase: 'retrieve', castEntries: 0, anchorX: 0, anchorY: 0, bobber,
  retrieveState: { action: 'idle', appeal: 0.3, slowHeld: false, twitchUntil: 0 },
  retrieveUI: { syncAppeal() {}, hide() {}, setHint() {} },
  resultUI: { toast(message) { events.toasts.push(message) } },
  fishingCamera: { focusPlayer() {} },
  playerActionInset: { setVisible() {} }, retrieveCoach: { hide() {} },
  scoreBar: visible(false), schoolFx: visible(false),
  _distanceBadge: visible(true), castHintBg: visible(false), hintText: visible(false),
  _retrieveInterestTimer: { remove() { events.interestStops++ } },
  bg: { _fishRuntime: [] },
  lineGfx: { clear() {}, lineStyle() {}, lineBetween() {} },
  time: { now: 1000, delayedCall() { events.delayed++; throw new Error('obsolete return timer') } },
  tweens: { add(config) { events.returns.push(config); return config } },
  _syncRetrieveWorldUI() {}, _stepFishPursuit() {},
})

scene._stepRetrieve(16)
assert.equal(scene._retrieveReturning, true)
assert.deepEqual(events.toasts, ['仕掛けを回収'])
assert.equal(events.returns.length, 1)
assert.equal(events.interestStops, 1)
assert.equal(scene._retrieveInterestTimer, null)
assert.equal(events.delayed, 0)

scene._stepRetrieve(16)
scene._twitchRetrieve()
scene._startSlowRetrieve()
scene._setRetrieveIdle()
assert.equal(events.returns.length, 1, 'return animation must start once')
assert.equal(scene.retrieveState.action, 'idle', 'inputs are ignored during return')

events.returns[0].onComplete()
assert.equal(scene.phase, 'cast')
assert.equal(scene.castEntries, 1)
assert.equal(scene.bobber.visible, false)
assert.equal(scene._retrieveReturning, false)
assert.equal(events.toasts.length, 1)

scene.phase = 'retrieve'
scene.bobber.visible = true
scene.retrieveState = { action: 'idle', appeal: 0.3, slowHeld: false }
scene._completeRetrieveToPlayer()
scene.phase = 'battle'
events.returns[1].onComplete()
assert.equal(scene.castEntries, 1, 'late return callback must not leave a later phase')
assert.equal(scene.bobber.visible, true, 'late return callback must not hide the battle bobber')

console.log('Retrieve completion: one return animation, one toast, no stale input or timer PASS')
