import assert from 'node:assert/strict'
import { installPwaUpdateGuard, shouldApplyPwaUpdate } from '../fishing-game/js/game/pwaUpdateGuard.js'

function serviceWorkerHarness(controlled) {
  let controller = controlled ? {} : null
  let listener = null
  return {
    get controller() { return controller },
    addEventListener(type, callback) { if (type === 'controllerchange') listener = callback },
    changeController() { controller = {}; listener?.() },
  }
}

const freshWorker = serviceWorkerHarness(false)
const fresh = installPwaUpdateGuard(freshWorker)
freshWorker.changeController()
assert.equal(fresh.pending, false, 'first service-worker control must not interrupt gameplay')
freshWorker.changeController()
assert.equal(fresh.pending, true, 'a later worker replacement in the same session is an update')

const existingWorker = serviceWorkerHarness(true)
const existing = installPwaUpdateGuard(existingWorker)
existingWorker.changeController()
assert.equal(existing.pending, true, 'replacement of an existing controller must be deferred')
assert.equal(shouldApplyPwaUpdate(['GameScene']), false, 'active gameplay must never reload')
assert.equal(shouldApplyPwaUpdate(['MapScene']), false, 'journey navigation must never reload')
assert.equal(shouldApplyPwaUpdate(['HomeScene', 'GameScene']), false, 'a safe scene must not mask concurrent gameplay')
assert.equal(shouldApplyPwaUpdate(['HomeScene']), true, 'Home is a safe update boundary')
assert.equal(shouldApplyPwaUpdate(['TitleScene']), true, 'Title is a safe update boundary')

console.log('PWA update guard smoke QA passed')
console.log('  fresh control: uninterrupted; existing update: deferred to Title/Home')
