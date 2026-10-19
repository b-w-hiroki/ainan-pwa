import assert from 'node:assert/strict'
import { installRetrieveFeedback } from '../fishing-game/js/game/installRetrieveFeedback.js'
import { readCastViewModel } from '../fishing-game/js/presentation/cast/CastViewModel.js'
import { readRetrieveTutorialDone, writeRetrieveTutorialDone } from '../fishing-game/js/game/retrieveTutorialProgress.js'

const bobber = { x: 100, y: 100 }
const fish = (index, interest, state, spooked = false) => ({
  index, interest, state, spooked,
  gfx: { active: true, x: 100 + index * 15, y: 110, scaleX: 1 },
})
const focused = fish(0, 70, 'follow')
const other = fish(1, 40, 'noticed', true)

class Scene {
  _enterRetrieve() { this.phase = 'retrieve' }
  _tickFishInterest() {}
}
installRetrieveFeedback(Scene)
const observed = { sense: [], hints: [] }
const scene = Object.assign(new Scene(), {
  phase: 'cast', bobber, anchorX: 100, anchorY: 400,
  env: { point: 'pointA' }, rod: { id: 'basic', name: '竿' },
  time: { now: 1000 }, retrieveState: { action: 'idle', appeal: 0.3, startedAt: 1 },
  bg: { _fishRuntime: [focused, other] },
  retrieveUI: {
    syncFishSense: (...args) => observed.sense.push(args),
    setHint: text => observed.hints.push(text),
  },
})

scene._enterRetrieve()
scene._tickFishInterest()
assert.deepEqual(observed.sense.at(-1), ['follow', false], 'another fish must not mark the focused fish as spooked')
assert.match(observed.hints.at(-1), /追ってきている/)
assert.equal(readCastViewModel(scene).retrieve.spooked, false, 'approved HUD must follow the same fish')

focused.spooked = true
scene._tickFishInterest()
assert.deepEqual(observed.sense.at(-1), ['follow', true])
assert.match(observed.hints.at(-1), /動かしすぎた/)
assert.equal(readCastViewModel(scene).retrieve.spooked, true)

focused.state = 'cruise'
other.state = 'cruise'
scene._tickFishInterest()
assert.deepEqual(observed.sense.at(-1), ['cruise', false])
assert.equal(observed.hints.at(-1), '魚影の向きと動きを見る', 'stale fish hint must clear')
const hintCount = observed.hints.length
scene._tickFishInterest()
assert.equal(observed.hints.length, hintCount, 'neutral tick must not overwrite the action hint repeatedly')

const savedStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
try {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => '1', setItem: () => {} },
  })
  assert.equal(readRetrieveTutorialDone(), true)
  assert.equal(writeRetrieveTutorialDone(), true)

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get: () => { throw new Error('storage blocked') },
  })
  assert.equal(readRetrieveTutorialDone(), false, 'blocked storage must not stop scene creation')
  assert.equal(writeRetrieveTutorialDone(), false, 'blocked storage must not stop bite transition')
} finally {
  if (savedStorage) Object.defineProperty(globalThis, 'localStorage', savedStorage)
  else delete globalThis.localStorage
}

console.log('Retrieve feedback: focused fish, stale hint reset and blocked tutorial storage PASS')
