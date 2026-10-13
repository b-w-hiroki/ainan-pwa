import assert from 'node:assert/strict'

class MemoryStorage {
  constructor() { this.map = new Map() }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null }
  setItem(key, value) { this.map.set(key, String(value)) }
  removeItem(key) { this.map.delete(key) }
  clear() { this.map.clear() }
  snapshot() { return JSON.stringify([...this.map.entries()].sort(([a], [b]) => a.localeCompare(b))) }
}

globalThis.localStorage = new MemoryStorage()

const { getFishingJourney, getFishingPreparation, getRetryJourneyCopy } = await import('../fishing-game/js/game/fishingJourney.js')
const { getCatches, getScore } = await import('../fishing-game/js/game/progress.js')


function setReturnPlayer(overrides = {}) {
  localStorage.clear()
  localStorage.setItem('ainan_catches', JSON.stringify([
    { fishId: 'aji', sizeCm: 24, score: 100, point: 'pointA', timestamp: Date.now() - 1000 },
  ]))
  localStorage.setItem('ainan_seen_town', '1')
  localStorage.setItem('ainan_town_facilities', JSON.stringify({ market: 1, pier: 2, guide: 0, festival: 1 }))
  localStorage.setItem('ainan_inventory', JSON.stringify({
    rods: { basic: 1, carbon: 1, premium: 1 },
    baits: { worm: 12, shrimp: 5, special: 2 },
    ...overrides.inventory,
  }))
  localStorage.setItem('ainan_equipment', JSON.stringify({ rodType: 'carbon', baitType: 'worm', ...overrides.equipment }))
  if (overrides.stamina != null) {
    localStorage.setItem('ainan_stamina', JSON.stringify({ value: overrides.stamina, updatedAt: Date.now() }))
  }
}

localStorage.clear()
assert.equal(getFishingJourney().id, 'first-catch', 'fresh player should be guided to a first catch')

localStorage.setItem('ainan_catches', JSON.stringify([{ fishId: 'aji', sizeCm: 24, score: 100, timestamp: Date.now() }]))
assert.equal(getFishingJourney().id, 'review-catch', 'first catch should lead to the already-recorded town review')

localStorage.setItem('ainan_seen_town', '1')
const grow = getFishingJourney()
assert.equal(grow.id, 'grow-town', 'reviewed first catch should lead to a town unlock choice')
assert.equal(grow.scene, 'TownScene')

setReturnPlayer()
const beforeRead = localStorage.snapshot()
const challenge = getFishingJourney()
assert.equal(challenge.id, 'challenge')
assert.equal(challenge.preparation.ready, true)
assert.equal(challenge.preparation.pointId, 'pointC', 'returning player should target the furthest unlocked point')
assert.equal(localStorage.snapshot(), beforeRead, 'journey reads must never mutate economy or save state')

setReturnPlayer({ equipment: { baitType: 'special' }, inventory: { rods: { basic: 1, carbon: 1, premium: 1 }, baits: { worm: 12, shrimp: 5, special: 0 } } })
const emptyBait = getFishingPreparation('pointC')
assert.equal(emptyBait.ready, false)
assert.equal(emptyBait.primaryBlocker.id, 'baitStock')
assert.equal(emptyBait.primaryBlocker.scene, 'UpgradeScene')
assert.equal(getFishingJourney().id, 'prepare')
assert.equal(getRetryJourneyCopy('pointC').canRetry, false)

setReturnPlayer({ stamina: 0 })
const noStamina = getFishingPreparation('pointC')
assert.equal(noStamina.primaryBlocker.id, 'stamina')
assert.equal(noStamina.primaryBlocker.scene, 'HomeScene')
assert.equal(getRetryJourneyCopy('pointC').canRetry, false)

setReturnPlayer()
const retry = getRetryJourneyCopy('pointC')
assert.equal(retry.canRetry, true)
assert.match(retry.primary, /−1ST/, 'retry copy must state its stamina cost')

// A damaged save/import must not prevent GameScene from reaching Cast.
// Reads must not overwrite the original bytes: the backup/restore UI can
// still recover the user's original history.
for (const raw of ['{broken-json', 'null', '{}', '42', '"not-an-array"']) {
  localStorage.clear()
  localStorage.setItem('ainan_catches', raw)
  localStorage.setItem('ainan_score', 'not-a-number')
  const before = localStorage.snapshot()
  assert.deepEqual(getCatches(), [], 'bad catch storage must not crash or look like successful catches')
  assert.equal(getScore(), 0, 'bad score must not become NaN in Fishing')
  assert.equal(getFishingJourney().id, 'first-catch', 'bad catches must recover to first-catch flow')
  assert.equal(localStorage.snapshot(), before, 'corrupt data remains intact for user backup/restore')
}
// A corrupted entry must not erase the valid records or their extra metadata.
localStorage.clear()
const legacy = {fishId:'aji',score:100,sizeCm:22,point:'pointA',timestamp:3,customFlag:'preserve'}
localStorage.setItem('ainan_catches', JSON.stringify([null, legacy, 7, [], {wrong:'shape'}]))
assert.deepEqual(getCatches(), [legacy])
assert.equal(getFishingJourney().id, 'review-catch')
assert.deepEqual(JSON.parse(localStorage.getItem('ainan_catches')), [null,legacy,7,[],{wrong:'shape'}],
  'read-only recovery must never rewrite stored catches')
for (const invalid of ['Infinity', 'NaN', '-100', '100000000000000000000']) {
  localStorage.setItem('ainan_score', invalid)
  assert.equal(getScore(), 0, 'invalid balance must be safely clamped')
}
const source = (await import('node:fs')).readFileSync(
  new URL('../fishing-game/js/scenes/GameScene.js', import.meta.url), 'utf8')
assert.ok(source.includes('this.totalScore = getScore()') && source.includes('this.catches = getCatches()'),
  'GameScene must use validated save readers, not raw JSON.parse/parseInt')
assert.ok(source.includes('this.totalScore !== this._initialSavedScore')
  && source.includes('this.catches.length !== this._initialCatchCount'),
  'Unchanged Fishing scenes must not overwrite damaged save bytes during unload')

console.log('Fishing journey smoke QA passed')
console.log('  first catch -> recorded town review -> town growth -> next challenge: OK')
console.log('  unlock vs preparation, bait shortage, stamina shortage, retry cost: OK')
console.log('  read-only journey model does not mutate save/economy: OK')
