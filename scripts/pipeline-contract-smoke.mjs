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
const qaActions = read('fishing-game/js/game/installVerticalSliceQaMode.js')
const staminaActions = read('fishing-game/js/game/installStaminaSessionGate.js')
assert.ok(qaActions.includes("scene.__ainanStaminaSessionGateInstalled && ['battle', 'caught'].includes(action)"),
  'duplicate QA Battle/caught action owners must not compete')
assert.ok(staminaActions.includes("if (action === 'caught')"),
  'StaminaSessionGate must own caught QA fixtures')
for (const slot of owners.slots)
  assert.ok(runtime.includes(slot.owner + '(GameScene)'), 'owner is not installed: ' + slot.id)

const hostSource = read('fishing-game/js/presentation/cast/CastPresentationHost.js')
assert.ok(hostSource.includes("return params.get('castPresentation') === 'legacy'"), 'default presentation host routing missing')
for (const slot of owners.slots.filter(slot => slot.presentationOwner)) {
  assert.equal(slot.presentationOwner, 'CastPresentationHost', 'unsupported final presenter for ' + slot.id)
  assert.equal(slot.presentationFile, 'fishing-game/js/presentation/cast/CastPresentationHost.js')
  assert.ok(hostSource.includes('class CastPresentationHost'), 'presentation owner module missing')
}

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
  const hostArt = id === 'tai' ? 'ui.fishingApprovedMadaiLive' : 'fishHeroes.' + id
  assert.deepEqual(byState['battle-hero'].refs, [hostArt],
    id + ': default host Battle art must match FISH_ART mapping')
  assert.deepEqual(byState['battle-legacy-icon'].refs, ['fish.' + expected.icon],
    id + ': legacy Battle icon mapping mismatch')
  assert.deepEqual(byState['result-hero'].refs, ['fishHeroes.' + id],
    id + ': Result premium fish hero missing')
  assert.deepEqual(byState.collection.refs, ['fish.' + expected.icon],
    id + ': collection icon mismatch')
  if (['aji','saba','kue'].includes(id)) {
    assert.equal(byState['species-specific-jump'].kind, 'asset')
    assert.deepEqual(byState['species-specific-jump'].refs, ['fishJump.' + id])
  } else {
    assert.equal(byState['species-specific-jump'].kind, 'planned',
      id + ': unbuilt Jump art must remain planned')
  }
  assert.ok(battlePresentation.includes(id + ': ASSETS.fish.' + expected.icon + '.key'),
    id + ': legacy Battle fallback mapping drifted from matrix')
  const hostRef = id === 'tai'
    ? 'tai: ASSETS.ui.fishingApprovedMadaiLive'
    : id + ': ASSETS.fishHeroes.' + id
  assert.ok(hostSource.includes(hostRef), id + ': default host art mapping missing')
  assert.ok(resultPresentation.includes(id + ': ASSETS.fishHeroes.' + id + '.key'),
    id + ': Result rendering mapping drifted from matrix')
  if (['bass','saba','isaki','hirame','kanpachi'].includes(id)) {
    assert.ok(hostPresentation.includes(id + ': ASSETS.fishHeroes.' + id),
      id + ': active CastPresentationHost must use premium fish asset')
  }
}
assert.equal(trackedFish.length, FISH_LIST.length, 'all gameplay fish must have verified asset states')
assert.ok(hostPresentation.includes('battleForeground.addAt(battleJumpFx, 2)')
  && hostPresentation.includes('battleForeground.addAt(battleFish, 3)'),
  'real Battle fish and Jump FX must stay in the approved foreground: base → FX → fish → UI')
assert.ok(hostPresentation.includes('battleForeground.addAt(battleLocationOverlay, 1)'),
  'existing location asset must be composed by the Battle owner, beneath fish')
assert.ok(staminaActions.includes('validQaPoint') && staminaActions.includes('point: qaPoint'),
  'location QA must exercise the real scene env and not just an atmosphere overlay')
assert.ok(hostPresentation.includes('resultForeground.addAt(resultFish, 1)'),
  'premium Result hero must render in front of approved result skin')
const uncoveredFish = FISH_LIST.filter(fish => !trackedFish.some(item => item.fishId === fish.id))

const golden = data('golden-screens.json')
assert.equal(golden.schemaVersion, 1)
assert.deepEqual(golden.viewport, { width: 390, height: 844 })
unique(golden.frames.map(x => x.id), 'golden-screen id')
unique(golden.frames.map(x => x.file), 'golden-screen filename')
const workflow = read('.github/workflows/ci.yml')
const namedResultCapture = 'scripts/capture-named-results.mjs'
const namedResultEnabled = workflow.includes('node ' + namedResultCapture)
const namedResultSource = namedResultEnabled ? read(namedResultCapture) : ''
const jumpCaptureScript = 'scripts/capture-species-jumps.mjs'
const jumpCaptureEnabled = workflow.includes('node ' + jumpCaptureScript)
const jumpCaptureSource = jumpCaptureEnabled ? read(jumpCaptureScript) : ''
const townArrivalCapture = 'scripts/capture-town-catch-reactions.mjs'
const townArrivalEnabled = workflow.includes('node ' + townArrivalCapture)
const townArrivalSource = townArrivalEnabled ? read(townArrivalCapture) : ''
const resultPixelGuard = read('scripts/result-screen-pixel-guard.mjs')
assert.ok(resultPixelGuard.includes('export function countGetHeaderPixels(file, dir'),
  'live screenshots must share the same rendered GET-pixel verifier as CI')
assert.ok(resultPixelGuard.includes("resolve(process.argv[1]) === fileURLToPath(import.meta.url)"),
  'importing the pixel verifier must not start standalone CI checks')
assert.ok(namedResultSource.includes("captureVisibleResult(clearance, '57-clearance-result-stable.png'"),
  'late clearance Result must validate rendered pixels, not just DOM flags')
assert.ok(namedResultSource.includes('attempt <= 4') && namedResultSource.includes('seenGold > 450'),
  'late screenshot retries must be bounded and must never bypass real pixel visibility')

assert.ok(namedResultSource.includes("path: join('artifacts/e2e', '39-player-result.png')"),
  'player reward Result must be captured by the state-aware Playwright harness')
assert.ok(namedResultSource.includes("assert.equal(state.rewardBadgePresent, true"),
  'reward Result screenshot must verify its rare feedback layer')
assert.ok(!workflow.split('\n').some(line =>
  line.includes('playwright@1.55.0 screenshot') && line.includes('39-player-result.png')),
  'player Result must not use a delayed CLI screenshot')

for (const frame of golden.frames) {
  assert.ok(frame.file.endsWith('.png') && frame.file.length > 7, 'invalid capture filename: ' + frame.file)
  const capturedDirectly = workflow.includes('artifacts/e2e/' + frame.file)
  const capturedByVerifiedScript = namedResultEnabled && namedResultSource.includes("'" + frame.file + "'")
  const capturedByTownScript = townArrivalEnabled
    && townArrivalSource.includes("'" + frame.file + "'")
  const capturedByJumpScript = jumpCaptureEnabled && jumpCaptureSource.includes("'" + frame.file + "'")
  assert.ok(capturedDirectly || capturedByVerifiedScript || capturedByTownScript || capturedByJumpScript, 'capture missing from CI: ' + frame.file)
}
for (const id of ['cast','retrieve','battle','result'])
  assert.ok(golden.frames.some(x => x.id === id), 'missing canonical screenshot: ' + id)
for (const reference of golden.canonicalReferences) exists(reference)

// The visual remake must stay grounded in AINAN's approved live art and
// canonical interaction composition, not in unrelated generated style guides.
const artDirection = data('art-direction-contract.json')
assert.equal(artDirection.schemaVersion, 1, 'art direction contract version changed')
assert.deepEqual(artDirection.viewport, golden.viewport, 'art direction viewport drift')
assert.equal(artDirection.implementation.presentationOwner, 'CastPresentationHost')
assert.equal(artDirection.implementation.presentationFile,
  'fishing-game/js/presentation/cast/CastPresentationHost.js')
assert.ok(artDirection.referencePolicy.qualityEvidence.includes('not automatically an approved'),
  'CI screenshots must not silently become approved art masters')
const artBible = 'docs/pipeline/ART_DIRECTION_BIBLE.md'
exists(artBible)
assert.ok(read(artBible).includes('390×844') && read(artBible).includes('CastPresentationHost'),
  'art direction must document actual phone composition and owner')
exists(artDirection.referencePolicy.authority)
exists(artDirection.referencePolicy.visualOwnerRegistry)
exists(artDirection.referencePolicy.provenance)
for (const reference of artDirection.referencePolicy.layoutReferences) {
  exists(reference)
  assert.ok(golden.canonicalReferences.includes(reference),
    'unregistered canonical art reference: ' + reference)
}
assert.ok(artDirection.styleGuardrails.preserve.length >= 5, 'missing preserve priorities')
assert.ok(artDirection.styleGuardrails.reject.length >= 4, 'missing regressions to reject')
assert.deepEqual(artDirection.implementation.families.sort(),
  requiredFamilies.slice().sort(), 'asset-family direction does not cover AINAN')
unique(artDirection.anchors.map(x => x.id), 'art direction anchor')
for (const anchor of artDirection.anchors) {
  const [family, name, ...extra] = anchor.ref.split('.')
  assert.ok(!extra.length && family && name, 'invalid art direction manifest ref: ' + anchor.ref)
  const asset = ASSETS[family]?.[name]
  assert.ok(asset?.status === 'ready', 'approved art anchor missing from manifest: ' + anchor.ref)
  const relative = asset.path.startsWith('/') ? asset.path.slice(1) : asset.path
  exists(relative)
  assert.ok(anchor.role.includes('reference') || anchor.role.includes('current production'),
    'anchor must distinguish reference from approved replacement: ' + anchor.id)
}
unique(artDirection.phaseScreens.map(x => x.id), 'art review screen')
for (const frame of artDirection.phaseScreens) {
  assert.ok(golden.frames.some(x => x.file === frame.file && x.id === frame.id),
    'art review screen must exist in current golden capture manifest: ' + frame.file)
  assert.ok(frame.required.length >= 2, 'art review frame needs actual visual checks: ' + frame.id)
}
assert.deepEqual(artDirection.implementation.candidateStates.slice(-3),
  ['browser-reviewed', 'pr-green', 'merged'],
  'asset candidates must pass visual browser review and PR before promotion')
console.log('  approved art anchors:', artDirection.anchors.length,
  '| review frames:', artDirection.phaseScreens.length)
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
  const directWait = command?.includes('--wait-for-selector=')
    && command.includes('data-qa-result-ready')
  const verifiedScriptWait = namedResultEnabled
    && namedResultSource.includes("'" + filename + "'")
    && namedResultSource.includes('page.waitForSelector(')
    && namedResultSource.includes('data-qa-result-ready')
    && namedResultSource.includes('data-qa-result-fish')
    && namedResultSource.includes("assert.equal(state.phase, 'result'")
    && namedResultSource.includes("assert.equal(state.heroTexture,")
  assert.ok(directWait || verifiedScriptWait,
    'Result must wait for settled phase and verify visible fish owner: ' + filename)
}

// Also protect all existing reward/boss caught captures from transient full-screen flashes.
for (const command of workflow.split('\n').filter(line =>
  line.includes('playwright@1.55.0 screenshot') && line.includes('qaAction=caught'))) {
  assert.ok(command.includes("--wait-for-selector=")
    && command.includes('data-qa-result-ready'),
    'caught screenshot is missing stable Result wait: ' + command)
}

assert.ok(workflow.includes('node scripts/result-screen-pixel-guard.mjs'),
  'rendered Result pixel guard must run in mobile E2E')
const screenshotGuard = read('scripts/visual-screenshot-guard.mjs')
for (const id of ['46-mock-cast.png','47-mock-retrieve.png','48-mock-battle.png','49-mock-result.png'])
  assert.ok(screenshotGuard.includes(id), 'missing mock uniqueness guard: ' + id)

const splitBuilder=read('scripts/art/extract-harbor-approved-master.mjs')
const splitCapture=read('scripts/capture-approved-master-split.mjs')
const gameScene=read('fishing-game/js/scenes/GameScene.js')
assert.ok(splitBuilder.includes("recomposed.equals(rgba)"),
  'approved source split must preserve the complete RGBA master')
assert.ok(gameScene.includes("artParams.get('qa') === '1' && artParams.get('castApprovedSplit') === '1'"),
  'new split textures must preload only in QA preview')
assert.ok(hostSource.includes("castApprovedSplitPreviewEnabled()"),
  'new derived layers must be behind an opt-in host preview')
assert.ok(workflow.includes('node scripts/capture-approved-master-split.mjs'),
  'the real browser must compare approved master and derived layers')
for(const file of ['64-approved-cast-original.png','65-approved-cast-split-preview.png'])
  assert.ok(splitCapture.includes(file),'missing approved-master comparison screenshot: '+file)
const foregroundGenerator = read('scripts/art/extract-harbor-approved-master.mjs')
const foregroundScene = read('fishing-game/js/scenes/GameScene.js')
const foregroundCapture = read('scripts/capture-foreground-orientation.mjs')
assert.ok(foregroundGenerator.includes("const player=Buffer.alloc(rgba.length),pier=Buffer.alloc(rgba.length),background=Buffer.alloc(rgba.length)"),
  'approved master needs reproducible independent player, pier and backdrop masks')
assert.ok(foregroundGenerator.includes("recomposed.equals(rgba)"),
  'foreground segmentation must preserve all source pixels')
assert.ok(foregroundScene.includes("artParams.get('qa') === '1' && artParams.get('castApprovedForeground') === '1'"),
  'foreground prototypes must only load in QA')
assert.ok(hostSource.includes("castApprovedForegroundPreviewEnabled()"),
  'normal Cast must not switch to unapproved foreground')
assert.ok(workflow.includes('node scripts/capture-foreground-orientation.mjs'),
  'real browser must capture portrait and landscape')
for (const id of ['66-approved-foreground-preview.png','67-landscape-current.png','68-landscape-foreground-preview.png'])
  assert.ok(foregroundCapture.includes(id), 'missing orientation/foreground evidence: ' + id)
const foregroundQuality = read('docs/pipeline/FOREGROUND_QUALITY_GATES.md')
assert.ok(foregroundQuality.includes('44 CSS-px') && foregroundQuality.includes('Hidden background'),
  'portrait/landscape cutout quality acceptance rules must be documented')
assert.ok(foregroundGenerator.includes('motionReady:false,backgroundInpainted:false'),
  'coarse region masks must not claim inpainting or motion-ready completion')
assert.ok(foregroundGenerator.includes('cutoutEdgeStats:edgeStats'),
  'coarse mask boundary diagnostics must be present')
const townArrivalImplementation = read('fishing-game/js/game/installTownCatchArrival.js')
const townDialogueSource = read('fishing-game/js/game/townCatchReactions.js')
assert.ok(townArrivalImplementation.includes("getTownCatchReaction(catchArrival.fishId) ?? copy.body"),
  'Town species dialogue must fall back to approved rarity copy')
assert.ok(townDialogueSource.includes('TOWN_CATCH_REACTION_IDS'),
  'Town reactions must have a traceable full species registry')
assert.ok(townArrivalEnabled && townArrivalSource.includes('state.fishTexture'),
  'Town capture must verify the actual fish art rather than labels alone')
const jumpSource = read('scripts/art/build-species-jump-pilot.mjs')
const jumpCapture = read('scripts/capture-species-jumps.mjs')
assert.ok(jumpSource.includes("'fish_hero_' + id + '.svg'"), 'Jump generator must reuse each hero master')
assert.ok(hostSource.includes('const FISH_JUMP_ART = Object.freeze(')
  && hostSource.includes('const FISH_JUMP_FX = Object.freeze(')
  && hostSource.includes("battle.isRaging && Object.hasOwn(FISH_JUMP_ART, battle.fishId)"),
  'one host must own fish, FX and genuine Battle rage')
assert.ok(staminaActions.includes("params.get('qaJump') === '1'"), 'Jump QA must be reproducible')
assert.ok(jumpCaptureEnabled && jumpCaptureSource.includes('state.splashTexture'),
  'CI must inspect real Jump and independent splash')
for (const file of ['73-aji-jump.png','74-saba-jump.png','75-kue-jump.png'])
  assert.ok(jumpCapture.includes(file),'missing Jump screenshot ' + file)
const jumpMotion = read('fishing-game/js/presentation/cast/battleJumpMotion.js')
assert.ok(jumpMotion.includes("export function battleJumpFrame(")
  && jumpMotion.includes("phase = 'airborne'") && jumpMotion.includes("phase = 'splash'"),
  'Battle Jump requires a multi-phase deterministic trajectory, not a static tilted pose')
assert.ok(hostSource.includes("battleJumpFrame(battle.fishId")
  && hostSource.includes("isReducedMotion()"),
  'Battle host must use timed motion with reduced-motion fallback')
assert.ok(jumpCapture.includes("airborne.y<takeoff.y-9")
  && jumpCapture.includes("landing.y>airborne.y+12")
  && jumpCapture.includes("landing.splashAlpha>airborne.splashAlpha"),
  'real browser Jump QA must verify lift, landing and stronger splash')
const townSource = read('fishing-game/js/scenes/TownScene.js')
const townReactionSource = read('fishing-game/js/game/townCatchReactions.js')
const townCaptureSource = read('scripts/capture-town-catch-reactions.mjs')
assert.ok(townSource.includes('this._featuredCatch = getTownFeaturedCatch('),
  'Town must choose most recent real catch without changing saves')
assert.ok(townSource.includes('this._drawCatchAtShop(85, y + 12, art)')
  && townSource.includes('this._drawCatchAtShop(W - 85, y + 12, art)'),
  'Both market and diner must visibly respond in the existing Town scene')
assert.ok(townReactionSource.includes('export function getTownFeaturedCatch(catches)'),
  'Town fish identity must be selected through one shared validated registry')
assert.ok(townCaptureSource.includes("88-town-aji-featured.png")
  && townCaptureSource.includes("89-town-kanpachi-featured.png")
  && townCaptureSource.includes("await page.mouse.click(195, 530)"),
  'CI must capture actual post-modal market/diner fish response')
console.log('AINAN pipeline contract QA passed')
console.log('  visual slots:', owners.slots.length)
console.log('  state items:', states.items.length, '| asset refs:', assetRefs,
  '| procedural:', proceduralStates, '| planned:', plannedStates)
console.log('  golden screen captures:', golden.frames.length, '(390x844)')
console.log('  verified premium species:', trackedFish.map(item => item.fishId).join(', '))
console.log('  other species awaiting state audit:', uncoveredFish.map(fish => fish.id).join(', ') || 'none')
