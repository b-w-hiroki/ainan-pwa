import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43771/fishing-game/index.html'
const output = path.resolve('qa-artifacts/slingshot-cast-v2')
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })

const seed = ({ rod = 'carbon', bait = 30, reduced = false } = {}) => {
  localStorage.setItem('ainan_sound_enabled', '0')
  localStorage.setItem('ainan_reduced_motion', reduced ? '1' : '0')
  localStorage.setItem('ainan_score', '25000')
  localStorage.setItem('ainan_inventory', JSON.stringify({ rods: { basic: 1, carbon: 1, premium: 1 }, baits: { worm: 30, shrimp: bait, special: 30 } }))
  localStorage.setItem('ainan_equipment', JSON.stringify({ rodType: rod, baitType: 'shrimp' }))
  window.__ainanDailyBonusDismissed = true
}

async function open(page, options = {}) {
  await page.addInitScript(seed, options)
  await page.goto(`${base}?qa=1&scene=GameScene&cameraPan=1&coneLoop=1&castMotion=charged`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => {
    const scene = window.__game?.scene?.getScene?.('GameScene')
    return scene?._coneCastHudNodes && scene?.anchorX && scene?.phase === 'cast'
  }, null, { timeout: 12000 })
  await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    scene._tickFishInterest = () => {}
    window.__pullQaEvents = []
    for (const name of ['ainan-pull-cast-armed', 'ainan-pull-cast-release-grade', 'ainan-pull-cast-cancelled', 'ainan-cast-release']) {
      scene.events.on(name, payload => window.__pullQaEvents.push({ name, payload, at: performance.now() }))
    }
  })
  await page.waitForTimeout(350)
}

async function slingshotOrigin(page) {
  return page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    const camera = scene.cameras.main
    return {
      x: camera.x + (scene.anchorX - camera.worldView.x) * camera.zoom,
      y: camera.y + (scene.anchorY - camera.worldView.y) * camera.zoom,
      width: scene.scale.width,
      height: scene.scale.height,
    }
  })
}

async function canvasPoint(page, x, y, action) {
  const canvas = page.locator('canvas').last()
  const box = await canvas.boundingBox()
  const size = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    return { width: scene.scale.width, height: scene.scale.height }
  })
  const px = box.x + box.width * x / size.width
  const py = box.y + box.height * y / size.height
  if (action === 'down') { await page.mouse.move(px, py); await page.mouse.down() }
  else if (action === 'move') await page.mouse.move(px, py, { steps: 10 })
  else if (action === 'up') { await page.mouse.move(px, py); await page.mouse.up() }
  else await page.mouse.click(px, py)
}

async function beginPull(page, { dx = -32, dy = 90 } = {}) {
  const origin = await slingshotOrigin(page)
  const end = { x: origin.x + dx, y: origin.y + dy }
  await canvasPoint(page, origin.x, origin.y, 'down')
  await canvasPoint(page, end.x, end.y, 'move')
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene')._coneCastState.pullArmedAt != null)
  return { origin, end }
}

async function releasePull(page, end) {
  await canvasPoint(page, end.x, end.y, 'up')
  await page.waitForFunction(() => window.__pullQaEvents.some(event => event.name === 'ainan-pull-cast-release-grade'))
}

async function runCase({ id, viewport = { width: 390, height: 844 }, holdMs, rod = 'carbon', bait = 30, reduced = false, pull = { dx: -32, dy: 90 } }) {
  const context = await browser.newContext({ viewport, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await open(page, { rod, bait, reduced })
  const frames = path.join(output, id)
  await fs.mkdir(frames, { recursive: true })
  await page.screenshot({ path: path.join(frames, '01-origin-ready.png') })
  const before = await page.evaluate(() => window.__game.scene.getScene('GameScene').env.player.inventory.baits.shrimp)
  const drag = await beginPull(page, pull)
  const selection = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    return { preview: scene._coneCastPreview, state: { ...scene._coneCastState } }
  })
  await page.waitForTimeout(Math.max(0, Math.min(holdMs, 650)))
  await page.screenshot({ path: path.join(frames, '02-pull-charge.png') })
  if (holdMs > 650) await page.waitForTimeout(holdMs - 650)
  await releasePull(page, drag.end)
  await page.waitForTimeout(45)
  await page.screenshot({ path: path.join(frames, '03-release.png') })
  if (bait > 0) {
    await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'retrieve', null, { timeout: 5000 })
    await page.waitForTimeout(160)
    await page.screenshot({ path: path.join(frames, '04-touchdown.png') })
  }
  const final = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    return {
      events: window.__pullQaEvents,
      release: scene._coneCastState.lastRelease,
      phase: scene.phase,
      bait: scene.env.player.inventory.baits.shrimp,
      bobber: { x: scene.bobber.x, y: scene.bobber.y, visible: scene.bobber.visible },
      casting: scene._cameraPanCasting,
      range: scene.castRangePx,
      timeline: scene._pullCastTimeline ?? scene._pullCastLastTimeline,
    }
  })
  if (final.events.filter(event => event.name === 'ainan-pull-cast-release-grade').length !== 1) throw new Error(`${id}: release grade count mismatch`)
  if (bait > 0 && (final.events.filter(event => event.name === 'ainan-cast-release').length !== 1 || final.bait !== before - 1 || final.phase !== 'retrieve')) throw new Error(`${id}: one-shot cast invariant failed`)
  if (errors.length) throw new Error(`${id}: ${errors.join(' | ')}`)
  await context.close()
  return { id, viewport, holdMs, rod, pull, selection, before, final }
}

const good = await runCase({ id: 'good-left-pull', holdMs: 400 })
const mirrored = await runCase({ id: 'good-right-pull', holdMs: 400, pull: { dx: 10, dy: 70 } })
const early = await runCase({ id: 'early', holdMs: 0 })
const late = await runCase({ id: 'late', holdMs: 800 })
const limited = await runCase({ id: 'range-limited-basic', holdMs: 400, rod: 'basic', pull: { dx: -28, dy: 112 } })

if (good.final.release.rating !== 'good' || mirrored.final.release.rating !== 'good' || early.final.release.rating !== 'early' || late.final.release.rating !== 'late') throw new Error(`early/good/late timing mismatch ${JSON.stringify({ good: good.final.release, mirrored: mirrored.final.release, early: early.final.release, late: late.final.release })}`)
if (!(good.selection.state.angleDeg > 0 && mirrored.selection.state.angleDeg < 0)) throw new Error('pull/cast direction inversion failed')
if (!limited.selection.preview.abilityLimited) throw new Error('basic rod range clamp not visible')
if (Math.hypot(good.final.bobber.x - good.selection.preview.clampedX, good.final.bobber.y - good.selection.preview.clampedY) > 8) throw new Error('GOOD landing missed selected target tolerance')
for (const run of [good, mirrored, early, late]) {
  if (run.final.timeline?.releaseContext?.rating !== run.final.release.rating) throw new Error(`${run.id}: motion/result mismatch`)
  if (!(run.final.timeline?.lureReleasedAt > run.final.timeline?.releasedAt && run.final.timeline?.cameraStartedAt > run.final.timeline?.lureReleasedAt)) throw new Error(`${run.id}: lure/camera order mismatch`)
}

const viewportRuns = []
for (const viewport of [{ width: 375, height: 667 }, { width: 844, height: 390 }]) {
  viewportRuns.push(await runCase({ id: `good-${viewport.width}x${viewport.height}`, viewport, holdMs: 400 }))
}

const rodRanges = {}
for (const rod of ['basic', 'carbon', 'premium']) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await open(page, { rod })
  rodRanges[rod] = await page.evaluate(() => window.__game.scene.getScene('GameScene').castRangePx)
  await context.close()
}
if (!(rodRanges.basic < rodRanges.carbon && rodRanges.carbon <= rodRanges.premium)) throw new Error(`rod range ordering failed ${JSON.stringify(rodRanges)}`)

const resilienceContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
const resilience = await resilienceContext.newPage()
await open(resilience, { reduced: true })
let origin = await slingshotOrigin(resilience)
await canvasPoint(resilience, origin.x, origin.y, 'down')
await canvasPoint(resilience, origin.x - 5, origin.y + 7, 'up')
const shortTap = await resilience.evaluate(() => { const s = window.__game.scene.getScene('GameScene'); return { mode: s._coneCastState.inputMode, bobber: s.bobber.visible } })

await canvasPoint(resilience, origin.x + 130, origin.y - 120, 'down')
await canvasPoint(resilience, origin.x + 50, origin.y - 20, 'move')
await canvasPoint(resilience, origin.x + 50, origin.y - 20, 'up')
const unrelated = await resilience.evaluate(() => { const s = window.__game.scene.getScene('GameScene'); return { mode: s._coneCastState.inputMode, bobber: s.bobber.visible } })

await resilience.evaluate(({ x, y }) => {
  const scene = window.__game.scene.getScene('GameScene')
  scene._onDown({ id: 11, x, y })
  scene._onMove({ id: 11, x: x - 32, y: y + 90 })
  scene._onDown({ id: 12, x, y })
}, origin)
const multi = await resilience.evaluate(() => { const s = window.__game.scene.getScene('GameScene')._coneCastState; return { pointer: s.pullPointerId, mode: s.inputMode } })
await resilience.evaluate(() => window.__game.scene.getScene('GameScene').game.canvas.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 11 })))
await resilience.waitForTimeout(80)
const cancelled = await resilience.evaluate(() => { const s = window.__game.scene.getScene('GameScene'); return { mode: s._coneCastState.inputMode, bobber: s.bobber.visible } })

origin = await slingshotOrigin(resilience)
await canvasPoint(resilience, origin.x, origin.y, 'down')
await canvasPoint(resilience, origin.x - 32, origin.y + 90, 'move')
await resilience.setViewportSize({ width: 844, height: 390 })
await resilience.waitForTimeout(200)
const rotated = await resilience.evaluate(() => ({ mode: window.__game.scene.getScene('GameScene')._coneCastState.inputMode }))
if (shortTap.bobber || shortTap.mode !== 'aim' || unrelated.bobber || unrelated.mode !== 'aim' || multi.pointer !== 11 || cancelled.bobber || cancelled.mode !== 'aim' || rotated.mode !== 'aim') throw new Error(`resilience failed ${JSON.stringify({ shortTap, unrelated, multi, cancelled, rotated })}`)
await resilienceContext.close()

const shortageContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
const shortagePage = await shortageContext.newPage()
await open(shortagePage, { bait: 0 })
const shortageDrag = await beginPull(shortagePage)
await shortagePage.waitForTimeout(650)
await releasePull(shortagePage, shortageDrag.end)
await shortagePage.waitForTimeout(300)
const shortage = await shortagePage.evaluate(() => { const s = window.__game.scene.getScene('GameScene'); return { bait: s.env.player.inventory.baits.shrimp, bobber: s.bobber.visible, casting: s._cameraPanCasting, locked: s._coneCastState.castLocked } })
if (shortage.bait !== 0 || shortage.bobber || shortage.casting || shortage.locked) throw new Error(`bait shortage stuck ${JSON.stringify(shortage)}`)
await shortageContext.close()

const report = { good, mirrored, early, late, limited, viewportRuns, rodRanges, resilience: { shortTap, unrelated, multi, cancelled, rotated }, shortage }
await fs.writeFile(path.join(output, 'metrics.json'), `${JSON.stringify(report, null, 2)}\n`)
await browser.close()
console.log('PASS: one-gesture slingshot, inverse left/right aim, pull range, early/good/late, 3 viewports, 3 rods, unrelated drag, short tap, multi-touch, cancel, rotate, reduced motion, and bait shortage')
