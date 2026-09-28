import assert from 'node:assert/strict'

class MemoryStorage {
  constructor() { this.map = new Map() }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null }
  setItem(k,v) { this.map.set(k,String(v)) }
  removeItem(k) { this.map.delete(k) }
}
globalThis.localStorage = new MemoryStorage()

const d = await import('../fishing-game/js/game/diagnostics.js')
assert.equal(d.diagRecord('startup', { ok: true }), true)
d.diagCount('window_error')
d.diagCount('window_error')
d.diagRecord('fishing_battle', { fish: 'aji', point: 'pointA' })

const snapshot = d.getDiagnosticsSnapshot()
assert.equal(snapshot.version, 1)
assert.equal(snapshot.counters.window_error, 2)
assert.ok(snapshot.events.some(e => e.type === 'startup'))
assert.ok(snapshot.events.some(e => e.type === 'fishing_battle'))
assert.ok(d.exportDiagnostics().includes('ainan-diagnostics'))

for (let i = 0; i < 180; i++) d.diagRecord('spam', { i })
assert.ok(d.getDiagnosticsSnapshot().events.length <= 120)

assert.equal(d.clearDiagnostics(), true)
assert.equal(d.getDiagnosticsSnapshot().events.length, 0)

console.log('Diagnostics smoke QA passed')
console.log('  capped ring buffer: OK')
console.log('  counters / export / clear: OK')
