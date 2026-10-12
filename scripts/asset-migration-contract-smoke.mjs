import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ASSETS } from '../fishing-game/js/config/assetManifest.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const file = name => path.join(root, name)
const inventory = JSON.parse(readFileSync(file('docs/pipeline/asset-migration-inventory.json'), 'utf8'))
const art = JSON.parse(readFileSync(file('docs/pipeline/art-direction-contract.json'), 'utf8'))
const referenceRefs = new Set(art.anchors.filter(entry => entry.role.includes('reference')).map(entry => entry.ref))

assert.equal(inventory.schemaVersion, 1)
assert.equal(inventory.sourceOfPaths, 'fishing-game/js/config/assetManifest.js')
assert.equal(inventory.styleContract, 'docs/pipeline/art-direction-contract.json')
assert.ok(inventory.policy.includes('remain production'),
  'migration inventory must not silently convert source assets to finished candidates')

const knownFamilies = ['world', 'player', 'fish', 'ui', 'fx', 'town']
assert.deepEqual([...inventory.families].sort(), knownFamilies.sort())
const allowedDecisions = new Set(inventory.decisionTypes)
const stages = inventory.candidateStages
assert.deepEqual(stages, [
  'not-started','master','normalized','manifested','integrated',
  'browser-reviewed','pr-green','merged',
])
const production = new Map()
for (const [group, assets] of Object.entries(ASSETS)) {
  for (const [name, asset] of Object.entries(assets)) {
    if (asset?.status !== 'ready') continue
    production.set(group + '.' + name, asset)
  }
}
const entries = new Map()
for (const entry of inventory.items) {
  assert.ok(entry.ref && !entries.has(entry.ref), 'duplicated migration entry: ' + entry.ref)
  entries.set(entry.ref, entry)
  assert.ok(production.has(entry.ref), 'stale migration entry: ' + entry.ref)
  assert.ok(allowedDecisions.has(entry.treatment), 'unknown treatment: ' + entry.ref)
  assert.ok(inventory.families.includes(entry.family), 'unknown art family: ' + entry.ref)
  assert.ok(stages.includes(entry.candidateStage), 'unknown candidate stage: ' + entry.ref)
  const asset = production.get(entry.ref)
  assert.ok(asset.path && asset.key, 'missing production asset metadata: ' + entry.ref)
  const relative = asset.path.startsWith('/') ? asset.path.slice(1) : asset.path
  assert.ok(existsSync(file(relative)), 'missing production asset: ' + entry.ref)
  if (referenceRefs.has(entry.ref)) {
    assert.equal(entry.treatment, 'reference-protected',
      'approved quality anchor must be protected until an explicit visual migration: ' + entry.ref)
  }
  if (entry.treatment === 'reference-protected') {
    assert.ok(!entry.replacementRef && entry.candidateStage === 'not-started',
      'protected art must not be replaced without separate review: ' + entry.ref)
  }
  if (entry.candidateStage !== 'not-started') {
    assert.ok(entry.sourceMaster || entry.replacementRef,
      'candidate has no source master or replacement: ' + entry.ref)
  }
  if (stages.indexOf(entry.candidateStage) >= stages.indexOf('manifested')) {
    const [assetGroup, assetId, extra] = String(entry.replacementRef ?? '').split('.')
    assert.ok(assetGroup && assetId && !extra && ASSETS[assetGroup]?.[assetId]?.status === 'ready',
      'integrated candidate must exist in production manifest: ' + entry.ref)
  }
  if (stages.indexOf(entry.candidateStage) >= stages.indexOf('browser-reviewed')) {
    assert.ok(entry.reviewEvidence,
      'candidate cannot claim browser review/CI/merge without evidence: ' + entry.ref)
  }
  if (entry.treatment === 'superseded') {
    assert.equal(entry.candidateStage, 'merged',
      'legacy asset cannot be retired until reviewed replacement is merged: ' + entry.ref)
    assert.ok(entry.replacementRef && entry.reviewEvidence,
      'supersession needs replacement and browser evidence: ' + entry.ref)
  }
  if (entry.treatment === 'reuse-verified') {
    assert.ok(entry.reviewEvidence,
      'reuse decision requires review evidence: ' + entry.ref)
  }
}
const actual = [...production.keys()].sort()
const tracked = [...entries.keys()].sort()
assert.deepEqual(tracked, actual, 'every production asset must be in the migration inventory (no omissions)')

for (const family of inventory.families) {
  assert.ok(inventory.items.some(item => item.family === family),
    'no migration entries in family ' + family)
}
for (const group of Object.keys(ASSETS)) {
  assert.ok(inventory.items.some(item => item.ref.startsWith(group + '.')),
    'no migration entries from manifest group ' + group)
}
const counts = {}
for (const item of inventory.items) counts[item.treatment] = (counts[item.treatment] ?? 0) + 1
console.log('AINAN asset migration inventory QA passed')
console.log('  ready production assets tracked:', entries.size, '/ manifest:', production.size)
console.log('  decisions:', JSON.stringify(counts))
console.log('  note: pending candidates are not installed, visually approved or merged')
