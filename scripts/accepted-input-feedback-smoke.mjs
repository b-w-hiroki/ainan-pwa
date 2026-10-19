import assert from 'node:assert/strict'
import { installFishingFeelPass } from '../fishing-game/js/game/installFishingFeelPass.js'
import { castLaunched, slowRetrieveStarted, twitchStarted } from '../fishing-game/js/game/retrieveInputAcceptance.js'

const savedStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
const savedNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
const vibrations = []
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { getItem: () => '1' },
})
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { vibrate: pattern => { vibrations.push(pattern); return true } },
})

try {
  class Scene {
    _fireCast() {
      if (this.acceptCast) this.bobber.visible = true
    }
    _twitchRetrieve() {
      if (!this.acceptTwitch) return
      this.retrieveState.action = 'twitch'
      this.retrieveState.twitchUntil = this.time.now + 320
    }
    _startSlowRetrieve() {
      if (this.acceptSlow) this.retrieveState.slowHeld = true
    }
    _openHitWindow() {}
    _enterBattle() {}
    _finishBattle() {}
  }
  installFishingFeelPass(Scene)

  const effects = { shakes: 0, ellipses: 0 }
  const shape = { setStrokeStyle() { return this }, setDepth() { return this }, setScrollFactor() { return this } }
  const scene = Object.assign(new Scene(), {
    phase: 'cast', bobber: { x: 100, y: 200, visible: false },
    retrieveState: { action: 'idle', twitchUntil: 0, slowHeld: false },
    time: { now: 1000 }, scale: { width: 390, height: 844 },
    cameras: { main: { shake: () => { effects.shakes++ }, scrollX: 0, scrollY: 0 } },
    add: { ellipse: () => { effects.ellipses++; return shape } },
    tweens: { add: () => {} },
  })

  scene.acceptCast = false
  scene._fireCast()
  assert.equal(castLaunched(scene), false)
  assert.equal(effects.shakes, 0, 'rejected cast must not shake')
  assert.equal(vibrations.length, 0, 'rejected cast must not vibrate')

  scene.acceptCast = true
  scene._fireCast()
  assert.equal(effects.shakes, 1)
  assert.equal(vibrations.length, 1)

  scene.phase = 'retrieve'
  scene.acceptTwitch = false
  scene._twitchRetrieve()
  assert.equal(twitchStarted(scene, 0), false)
  assert.equal(effects.ellipses, 0, 'ignored twitch must not burst')
  assert.equal(vibrations.length, 1)

  scene.acceptTwitch = true
  scene._twitchRetrieve()
  assert.equal(effects.ellipses, 2)
  assert.equal(vibrations.length, 2)
  scene.acceptTwitch = false
  scene._twitchRetrieve()
  assert.equal(effects.ellipses, 2, 'cooldown twitch must not repeat burst')
  assert.equal(vibrations.length, 2)

  scene.acceptSlow = false
  scene._startSlowRetrieve()
  assert.equal(slowRetrieveStarted(scene), false)
  assert.equal(vibrations.length, 2)
  scene.acceptSlow = true
  scene._startSlowRetrieve()
  assert.equal(vibrations.length, 3)
  scene._startSlowRetrieve()
  assert.equal(vibrations.length, 3, 'continued hold must not vibrate every tick')
} finally {
  if (savedStorage) Object.defineProperty(globalThis, 'localStorage', savedStorage)
  else delete globalThis.localStorage
  if (savedNavigator) Object.defineProperty(globalThis, 'navigator', savedNavigator)
  else delete globalThis.navigator
}

console.log('Accepted input feedback: rejected cast, twitch cooldown and slow hold PASS')
