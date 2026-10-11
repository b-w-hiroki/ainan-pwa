import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ASSETS } from '../fishing-game/js/config/assetManifest.js'
import { FISH_LIST } from '../fishing-game/js/game/fish.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const read = (name) => readFileSync(path.join(root, name), 'utf8')
const data = (name) => JSON.parse(read('docs/pipeline/' + name))
const unique = (values, label) =>
  assert.equal(new Set(values).size, values.length, label + ': duplicated identity')
const exists = (name) => assert.ok(existsSync(path.join(root, name)), 'missing file: ' + name)

const owners = data('visual-owners.json')
assert.equal(owners.schemaVersion, 1)
assert.ok(owners.slots.length >= 6)
unique(owners.slots.map(x => x.id), 'visual slot')
for (const slot of owners.slots) {
  assert.ok(slot.id && slot.owner && slot.file && slot.symbol, 'invalid visual slot')
  assert.ok(Array.isArray(slot.phases) && slot.phases.length, 'missing phases: ' + slot.id)
  exists(slot.file)
  assert.ok(read(slot.file).includes(slot.symbol), 'owner symbol missing: ' + slot.id)
  assert.ok(!slot.supports.includes(slot.owner), 'owner cannot also be support: ' + slot.id)
}
const runtime = read('fishing-game/js/game/installFishingRuntime.js')
assert.ok(runtime.includes('installFishingPresentationGuard(GameScene)'), 'final Fishing guard not installed')
assert.ok(runtime.includes('installVerticalSliceQaMode(GameScene)'), 'QA mode not installed')
for (const slot of owners.slots)
  assert.ok(runtime.includes(slot.owner + '(GameScene)'), 'owner is not installed: ' + slot.id)

const states = data('asset-states.json')
assert.equal(states.schemaVersion, 1)
unique(states.items.map(x => x.id), 'asset-state item')
const requiredFamilies = ['world', 'player', 'fish', 'ui', 'fx', 'town']
for (const family of requiredFamilies)
  assert.ok(states.items.some(x => x.family === family), 'missing family: ' + family)

let assetRefs = 0
let proceduralStates = 0
let plannedStates = 0
for (const item of states.items) {
  assert.ok(item.id && Array.isArray(item.states) && item.states.length, 'invalid item: ' + item.id)
  unique(item.states.map(x => x.id), 'states for ' + item.id)
  for (const state of item.states) {
    const context = item.id + '.' + state.id
    if (state.kind === 'asset') {
      assert.ok(Array.isArray(state.refs) && state.refs.length, 'no refs: ' + context)
      for (const ref of state.refs) {
        const parts = ref.split('.')
        assert.equal(parts.length, 2, 'invalid manifest ref: ' + ref)
        const asset = ASSETS[parts[0]]?.[parts[1]]
        assert.ok(asset && asset.status === 'ready', 'asset not ready in manifest: ' + ref)
        assert.ok(asset.path && asset.key, 'asset missing key/path: ' + ref)
        const relative = asset.path.startsWith('/') ? asset.path.slice(1) : asset.path
        assert.ok(relative.startsWith('fishing-game/assets/'), 'unexpected asset root: ' + ref)
        exists(relative)
        assetRefs++
      }
    } else if (state.kind === 'procedural') {
      assert.ok(state.source, 'missing procedural source: ' + context)
      exists(state.source)
      proceduralStates++
    } else if (state.kind === 'planned') {
      assert.ok(state.note, 'planned state needs explicit note: ' + context)
      assert.ok(!state.refs?.length, 'planned state cannot pretend to have an asset: ' + context)
      plannedStates++
    } else {
      assert.fail('unknown state kind: ' + context)
    }
  }
}
for (const id of ['location.harbor','location.bay','location.cape','player','fish.aji'])
  assert.ok(states.items.some(x => x.id === id), 'missing baseline vertical slice: ' + id)


const trackedFish = states.items.filter(item => item.family === 'fish')
const fishLookup = new Map(FISH_LIST.map(fish => [fish.id, fish]))
unique(FISH_LIST.map(fish => fish.id), 'gameplay fish IDs')
unique(trackedFish.map(item => item.fishId), 'tracked fish IDs')
const expectedPremiumFish = {
  aji: { icon: 'ajiIcon', shadow: 'fishShadowSmallIdle' },
  tai: { icon: 'madaiIcon', shadow: 'fishShadowMediumIdle' },
  buri: { icon: 'buriIcon', shadow: 'fishShadowLargeIdle' },
  kue: { icon: 'kueIcon', shadow: 'fishShadowLargeIdle' },
  bass: { icon: 'blackBassIcon', shadow: 'fishShadowMediumIdle' },
  saba: { icon: 'sabaIcon', shadow: 'fishShadowMediumIdle' },
  isaki: { icon: 'isakiIcon', shadow: 'fishShadowMediumIdle' },
  hirame: { icon: 'hirameIcon', shadow: 'fishShadowMediumIdle' },
  kanpachi: { icon: 'kanpachiIcon', shadow: 'fishShadowLargeIdle' },
}
const battlePresentation = read('fishing-game/js/game/installFishingBattlePresentation.js')
const hostPresentation = read('fishing-game/js/presentation/cast/CastPresentationHost.js')
const resultPresentation = read('fishing-game/js/game/installFishingResultPresentation.js')
for (const [id, expected] of Object.entries(expectedPremiumFish)) {
  const item = trackedFish.find(value => value.fishId === id)
  assert.ok(item, 'premium fish state missing: ' + id)
  assert.equal(item.id, 'fish.' + id)
  const fish = fishLookup.get(id)
  assert.ok(fish, 'tracked species missing from gameplay FISH_LIST: ' + id)
  assert.ok(fish.rarity && fish.habitat?.length && fish.castZones?.length,
    'invalid gameplay habitat/rarity/cast zone for ' + id)
  assert.ok(fish.retrieve?.prefer && fish.feel?.hitPrompt,
    'missing real retrieve/battle personality for ' + id)
  const byState = Object.fromEntries(item.states.map(state => [state.id, state]))
  for (const required of ['shadow','interest','bite','battle-hero','result-hero','collection','species-specific-jump'])
    assert.ok(byState[required], id + ': missing state ' + required)
  assert.deepEqual(byState.shadow.refs, ['fishingField.' + expected.shadow],
    id + ': shadow size class differs from approved matrix')
  assert.deepEqual(byState['battle-hero'].refs, ['fish.' + expected.icon],
    id + ': Battle must use actual fish icon rather than Result-only hero')
  assert.deepEqual(byState['result-hero'].refs, ['fishHeroes.' + id],
    id + ': Result premium fish hero missing')
  assert.deepEqual(byState.collection.refs, ['fish.' + expected.icon],
    id + ': collection icon mismatch')
  assert.equal(byState['species-specific-jump'].kind, 'planned',
    id + ': dedicated jump art must not be marked implemented until integrated')
  assert.ok(battlePresentation.includes(id + ': ASSETS.fish.' + expected.icon + '.key'),
    id + ': Battle rendering mapping drifted from matrix')
  assert.ok(resultPresentation.includes(id + ': ASSETS.fishHeroes.' + id + '.key'),
    id + ': Result rendering mapping drifted from matrix')
  if (['bass','saba','isaki','hirame','kanpachi'].includes(id)) {
    assert.ok(hostPresentation.includes(id + ': ASSETS.fishHeroes.' + id),
      id + ': active CastPresentationHost must use premium fish asset')
  }
}
assert.equal(trackedFish.length, FISH_LIST.length, 'all gameplay fish must have verified asset states')
assert.ok(hostPresentation.includes('resultForeground.addAt(resultFish, 1)'),
  'premium Result hero must render in front of approved result skin')
const uncoveredFish = FISH_LIST.filter(fish => !trackedFish.some(item => item.fishId === fish.id))

const golden = data('golden-screens.json')
assert.equal(golden.schemaVersion, 1)
assert.deepEqual(golden.viewport, { width: 390, height: 844 })
unique(golden.frames.map(x => x.id), 'golden-screen id')
unique(golden.frames.map(x => x.file), 'golden-screen filename')
const workflow = read('.github/workflows/ci.yml')
for (const frame of golden.frames) {
  assert.ok(frame.file.endsWith('.png') && frame.file.length > 7, 'invalid capture filename: ' + frame.file)
  assert.ok(workflow.includes('artifacts/e2e/' + frame.file), 'capture missing from CI: ' + frame.file)
}
for (const id of ['cast','retrieve','battle','result'])
  assert.ok(golden.frames.some(x => x.id === id), 'missing canonical screenshot: ' + id)
for (const reference of golden.canonicalReferences) exists(reference)
// Captures must wait for the *actual* caught Result with camera flash settled;
// screenshot size/hash alone cannot distinguish Battle or overexposed frames.
const qaSource = read('fishing-game/js/game/installVerticalSliceQaMode.js')
assert.ok(qaSource.includes("function syncQaCaughtCaptureReady(scene)"),
  'caught Result QA readiness signal missing')
assert.ok(qaSource.includes("flashEffect?.isRunning"),
  'camera flash must finish before capture readiness')
for (const filename of [
  '04-result.png', '22-boss-kue-result.png', '27-kue-first-trophy.png',
  '39-player-result.png', '45-clearance-result.png',
  '50-bass-result.png', '51-saba-result.png', '52-isaki-result.png',
  '53-hirame-result.png', '54-kanpachi-result.png',
]) {
  const command = workflow.split('\n').find(line => line.includes('artifacts/e2e/' + filename))
  assert.ok(command?.includes('--wait-for-selector=')
    && command.includes('data-qa-result-ready'),
    'Result must wait for settled phase, not a fixed timeout: ' + filename)
}

// Also protect all existing reward/boss caught captures from transient full-screen flashes.
for (const command of workflow.split('\n').filter(line =>
  line.includes('playwright@1.55.0 screenshot') && line.includes('qaAction=caught'))) {
  assert.ok(command.includes("--wait-for-selector=")
    && command.includes('data-qa-result-ready'),
    'caught screenshot is missing stable Result wait: ' + command)
}

const screenshotGuard = read('scripts/visual-screenshot-guard.mjs')
for (const id of ['46-mock-cast.png','47-mock-retrieve.png','48-mock-battle.png','49-mock-result.png'])
  assert.ok(screenshotGuard.includes(id), 'missing mock uniqueness guard: ' + id)

console.log('AINAN pipeline contract QA passed')
console.log('  visual slots:', owners.slots.length)
console.log('  state items:', states.items.length, '| asset refs:', assetRefs,
  '| procedural:', proceduralStates, '| planned:', plannedStates)
console.log('  golden screen captures:', golden.frames.length, '(390x844)')
console.log('  verified premium species:', trackedFish.map(item => item.fishId).join(', '))
console.log('  other species awaiting state audit:', uncoveredFish.map(fish => fish.id).join(', ') || 'none')
