import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43691/fishing-game/index.html'
const output = path.resolve('qa-artifacts/pull-swipe-cast-v1')
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
  await page.waitForFunction(() => window.__game?.scene?.getScene?.('GameScene')?._coneCastHudNodes?.castY, null, { timeout: 12000 })
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

async function canvasPoint(page, x, y, action = 'click') {
  const canvas = page.locator('canvas').last()
  const box = await canvas.boundingBox()
  const size = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }))
  const px = box.x + box.width * x / size.width
  const py = box.y + box.height * y / size.height
  if (action === 'down') { await page.mouse.move(px, py); await page.mouse.down() }
  else if (action === 'move') await page.mouse.move(px, py, { steps: 8 })
  else if (action === 'up') { await page.mouse.move(px, py); await page.mouse.up() }
  else await page.mouse.click(px, py)
}

async function aim(page, xRatio = 0.70, yRatio = 0.31) {
  const size = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }))
  await canvasPoint(page, size.width * 0.42, size.height * 0.58, 'down')
  await canvasPoint(page, size.width * xRatio, size.height * yRatio, 'move')
  await canvasPoint(page, size.width * xRatio, size.height * yRatio, 'up')
}

async function pull(page, holdMs, { releaseOutside = false } = {}) {
  const control = await page.evaluate(() => {
    const nodes = window.__game.scene.getScene('GameScene')._coneCastHudNodes
    return { x: nodes.buttonX, y: nodes.castY, endY: nodes.pullEndY }
  })
  await canvasPoint(page, control.x, control.y, 'down')
  await canvasPoint(page, control.x + 4, control.endY - 2, 'move')
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene')._coneCastState.pullArmedAt != null)
  await page.waitForTimeout(holdMs)
  await canvasPoint(page, releaseOutside ? control.x + 100 : control.x + 4, releaseOutside ? control.endY + 40 : control.endY - 2, 'up')
}

async function startRecorder(page, filename) {
  return page.evaluate(name => {
    const mimeType = 'video/mp4;codecs=avc1.42E01E'
    if (!MediaRecorder.isTypeSupported(mimeType)) throw new Error('H.264 MediaRecorder unavailable')
    const chunks = []
    const recorder = new MediaRecorder(document.querySelector('canvas').captureStream(30), { mimeType, videoBitsPerSecond: 4_000_000 })
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
    window.__pullRecorder = { recorder, chunks, mimeType, filename: name }
    recorder.start(200)
    return mimeType
  }, filename)
}

async function stopRecorder(page, filename) {
  const downloadPromise = page.waitForEvent('download')
  const meta = await page.evaluate(async () => {
    const state = window.__pullRecorder
    await new Promise(resolve => { state.recorder.onstop = resolve; state.recorder.stop() })
    const blob = new Blob(state.chunks, { type: state.mimeType })
    const anchor = document.createElement('a')
    anchor.href = URL.createObjectURL(blob)
    anchor.download = state.filename
    anchor.click()
    return { mimeType: state.mimeType, bytes: blob.size }
  })
  const download = await downloadPromise
  const target = path.join(output, filename)
  await download.saveAs(target)
  const bytes = await fs.readFile(target)
  const binary = bytes.toString('latin1')
  if (bytes.length < 10000 || !binary.includes('avc1') || !binary.includes('avcC')) throw new Error('invalid H.264 output')
  return { ...meta, path: target, size: bytes.length, avc1: true, avcC: true }
}

async function runCase({ id, viewport = { width: 390, height: 844 }, holdMs, rod = 'carbon', bait = 30, reduced = false, aimRatio = [0.70, 0.31], forceDistance = 500, forceAngle = 8, record = false, releaseOutside = false }) {
  const context = await browser.newContext({ viewport, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await open(page, { rod, bait, reduced })
  const frames = path.join(output, id)
  await fs.mkdir(frames, { recursive: true })
  if (record) await startRecorder(page, `${id}.mp4`)
  await page.screenshot({ path: path.join(frames, '01-aim-ui.png') })
  await aim(page, ...aimRatio)
  if (forceDistance != null) {
    await page.evaluate(({ distance, angle }) => {
      const state = window.__game.scene.getScene('GameScene')._coneCastState
      state.distancePx = distance
      state.angleDeg = angle
    }, { distance: forceDistance, angle: forceAngle })
    await page.waitForTimeout(80)
  }
  const target = await page.evaluate(() => window.__game.scene.getScene('GameScene')._coneCastPreview)
  await page.screenshot({ path: path.join(frames, '02-target-selected.png') })
  const before = await page.evaluate(() => window.__game.scene.getScene('GameScene').env.player.inventory.baits.shrimp)
  const control = await page.evaluate(() => { const n = window.__game.scene.getScene('GameScene')._coneCastHudNodes; return { x: n.buttonX, y: n.castY, endY: n.pullEndY } })
  await canvasPoint(page, control.x, control.y, 'down')
  await canvasPoint(page, control.x + 4, control.endY - 2, 'move')
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene')._coneCastState.pullArmedAt != null)
  await page.waitForTimeout(Math.min(holdMs, 650))
  await page.screenshot({ path: path.join(frames, '03-pull-charge.png') })
  if (holdMs > 650) await page.waitForTimeout(holdMs - 650)
  await canvasPoint(page, releaseOutside ? control.x + 100 : control.x + 4, releaseOutside ? control.endY + 40 : control.endY - 2, 'up')
  await page.waitForFunction(() => window.__pullQaEvents.some(event => event.name === 'ainan-pull-cast-release-grade'))
  await page.waitForTimeout(45)
  await page.screenshot({ path: path.join(frames, '04-release-feedback.png') })
  if (bait > 0) {
    await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'retrieve', null, { timeout: 5000 })
    await page.waitForTimeout(160)
    await page.screenshot({ path: path.join(frames, '05-touchdown.png') })
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
      inputMode: scene._coneCastState.inputMode,
      timeline: scene._pullCastTimeline ?? scene._pullCastLastTimeline,
    }
  })
  const gradeEvents = final.events.filter(event => event.name === 'ainan-pull-cast-release-grade')
  const releaseEvents = final.events.filter(event => event.name === 'ainan-cast-release')
  if (gradeEvents.length !== 1) throw new Error(`${id}: grade count ${gradeEvents.length}`)
  if (bait > 0 && (releaseEvents.length !== 1 || final.bait !== before - 1 || final.phase !== 'retrieve')) throw new Error(`${id}: one-shot cast invariant ${JSON.stringify({ before, final })}`)
  if (errors.length) throw new Error(`${id}: ${errors.join(' | ')}`)
  const video = record ? await stopRecorder(page, `${id}-390x844-h264.mp4`) : null
  await context.close()
  return { id, viewport, holdMs, rod, reduced, target, before, final, video }
}

const success = await runCase({ id: 'good-carbon', holdMs: 350, record: true })
const early = await runCase({ id: 'early-carbon', holdMs: 0 })
const late = await runCase({ id: 'late-carbon', holdMs: 940, releaseOutside: true })
const limited = await runCase({ id: 'range-limited-basic', holdMs: 350, rod: 'basic', aimRatio: [0.84, 0.18], forceDistance: 760, forceAngle: 20 })
if (success.final.release.rating !== 'good' || early.final.release.rating !== 'early' || late.final.release.rating !== 'late') throw new Error(`release grades do not match hold timing: ${JSON.stringify({ good: success.final.release, early: early.final.release, late: late.final.release })}`)
for (const run of [success, early, late]) {
  if (run.final.timeline?.releaseContext?.rating !== run.final.release.rating) throw new Error(`${run.id}: visual timeline/result mismatch`)
  if (!(run.final.timeline?.lureReleasedAt > run.final.timeline?.releasedAt && run.final.timeline?.cameraStartedAt > run.final.timeline?.lureReleasedAt)) throw new Error(`${run.id}: release/lure/camera order mismatch`)
}
if (!limited.target.abilityLimited) throw new Error(`basic range limit was not visible: ${JSON.stringify(limited.target)}`)
if (Math.hypot(success.final.bobber.x - success.target.clampedX, success.final.bobber.y - success.target.clampedY) > 8) throw new Error('GOOD landing missed selected target tolerance')
if (!(early.final.release.adjustedPower < success.final.release.adjustedPower && late.final.release.angleOffsetDeg !== 0)) throw new Error('early/late errors are not directional and progressive')

const viewportRuns = []
for (const viewport of [{ width: 375, height: 667 }, { width: 844, height: 390 }]) {
  viewportRuns.push(await runCase({ id: `good-${viewport.width}x${viewport.height}`, viewport, holdMs: 350 }))
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
const control = await resilience.evaluate(() => { const n = window.__game.scene.getScene('GameScene')._coneCastHudNodes; return { x: n.buttonX, y: n.castY, endY: n.pullEndY } })
await canvasPoint(resilience, control.x, control.y, 'down')
await canvasPoint(resilience, control.x, control.y + 8, 'up')
const shortTap = await resilience.evaluate(() => { const s = window.__game.scene.getScene('GameScene'); return { mode: s._coneCastState.inputMode, bobber: s.bobber.visible, bait: s.env.player.inventory.baits.shrimp } })
await resilience.evaluate(({ x, y, endY }) => {
  const scene = window.__game.scene.getScene('GameScene')
  scene._onDown({ id: 11, x, y })
  scene._onMove({ id: 11, x, y: endY })
  scene._onDown({ id: 12, x, y })
}, control)
const multi = await resilience.evaluate(() => { const s = window.__game.scene.getScene('GameScene')._coneCastState; return { pointer: s.pullPointerId, mode: s.inputMode } })
await resilience.evaluate(() => window.__game.scene.getScene('GameScene').game.canvas.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 11 })))
await resilience.waitForTimeout(80)
const cancelled = await resilience.evaluate(() => { const s = window.__game.scene.getScene('GameScene'); return { mode: s._coneCastState.inputMode, bobber: s.bobber.visible } })
await canvasPoint(resilience, control.x, control.y, 'down')
await canvasPoint(resilience, control.x, control.endY, 'move')
await resilience.setViewportSize({ width: 844, height: 390 })
await resilience.waitForTimeout(200)
const rotated = await resilience.evaluate(() => { const s = window.__game.scene.getScene('GameScene'); return { mode: s._coneCastState.inputMode, canvas: document.querySelector('canvas').getBoundingClientRect().toJSON() } })
if (shortTap.bobber || shortTap.mode !== 'aim' || multi.pointer !== 11 || cancelled.bobber || cancelled.mode !== 'aim' || rotated.mode !== 'aim') throw new Error(`resilience failed ${JSON.stringify({ shortTap, multi, cancelled, rotated })}`)
await resilienceContext.close()

const shortageContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
const shortagePage = await shortageContext.newPage()
await open(shortagePage, { bait: 0 })
await aim(shortagePage)
await pull(shortagePage, 650)
await shortagePage.waitForTimeout(250)
const shortage = await shortagePage.evaluate(() => { const s = window.__game.scene.getScene('GameScene'); return { bait: s.env.player.inventory.baits.shrimp, bobber: s.bobber.visible, casting: s._cameraPanCasting, locked: s._coneCastState.castLocked } })
if (shortage.bait !== 0 || shortage.bobber || shortage.casting || shortage.locked) throw new Error(`bait shortage stuck ${JSON.stringify(shortage)}`)
await shortageContext.close()

const boardPage = await browser.newPage({ viewport: { width: 1200, height: 820 } })
const toData = async file => `data:image/png;base64,${(await fs.readFile(file)).toString('base64')}`
const cards = [
  ['狙い＋能力範囲', path.join(output, 'range-limited-basic/02-target-selected.png')],
  ['引き方向＋GOOD帯', path.join(output, 'good-carbon/03-pull-charge.png')],
  ['EARLY', path.join(output, 'early-carbon/04-release-feedback.png')],
  ['GOOD→着水', path.join(output, 'good-carbon/05-touchdown.png')],
  ['LATE', path.join(output, 'late-carbon/04-release-feedback.png')],
]
const cardHtml = (await Promise.all(cards.map(async ([label, file]) => `<article><img src="${await toData(file)}"><b>${label}</b></article>`))).join('')
await boardPage.setContent(`<style>body{margin:0;background:#eef9ff;color:#173248;font-family:Arial,sans-serif}.head{height:92px;background:#fffdf7;border-bottom:8px solid #173248;display:flex;align-items:center;padding:0 34px;gap:24px}h1{font-size:30px;margin-right:auto}.sw{width:42px;height:42px;border:3px solid #173248;border-radius:12px}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:18px;padding:24px}article{background:#fffdf7;border:4px solid #173248;border-radius:20px;padding:10px;text-align:center;box-shadow:0 7px 0 #9bcfe5}img{width:100%;height:610px;object-fit:cover;object-position:center;border-radius:12px}b{display:block;padding:10px;font-size:16px}</style><div class="head"><h1>AINAN AIM → PULL → RELEASE UI PARTS</h1><i class="sw" style="background:#fffdf7"></i><i class="sw" style="background:#173248"></i><i class="sw" style="background:#5bc8e8"></i><i class="sw" style="background:#ffd95a"></i><i class="sw" style="background:#ff765a"></i></div><div class="grid">${cardHtml}</div>`)
await boardPage.screenshot({ path: path.join(output, 'pull-cast-ui-asset-board.png') })
const comparisonCards = [
  ['EARLY — 短く＋横ずれ', path.join(output, 'early-carbon/04-release-feedback.png')],
  ['GOOD — 狙点へ', path.join(output, 'good-carbon/04-release-feedback.png')],
  ['LATE — 遅いほど横ずれ', path.join(output, 'late-carbon/04-release-feedback.png')],
]
const comparisonHtml = (await Promise.all(comparisonCards.map(async ([label, file]) => `<article><img src="${await toData(file)}"><b>${label}</b></article>`))).join('')
await boardPage.setViewportSize({ width: 1000, height: 790 })
await boardPage.setContent(`<style>body{margin:0;background:#eef9ff;color:#173248;font-family:Arial,sans-serif}.head{height:82px;background:#fffdf7;border-bottom:8px solid #173248;display:flex;align-items:center;padding:0 30px}h1{font-size:28px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;padding:24px}article{background:#fffdf7;border:4px solid #173248;border-radius:20px;padding:12px;text-align:center;box-shadow:0 7px 0 #9bcfe5}img{width:100%;height:590px;object-fit:cover;border-radius:12px}b{display:block;padding:13px;font-size:18px}</style><div class="head"><h1>RELEASE TIMING COMPARISON — same target / same rod</h1></div><div class="grid">${comparisonHtml}</div>`)
await boardPage.screenshot({ path: path.join(output, 'pull-cast-release-comparison.png') })
await boardPage.close()

const report = { success, early, late, limited, viewportRuns, rodRanges, resilience: { shortTap, multi, cancelled, rotated }, shortage }
await fs.writeFile(path.join(output, 'metrics.json'), `${JSON.stringify(report, null, 2)}\n`)
await browser.close()
console.log('PASS: aim/pull/charge/release/touchdown, good/early/late/range limit, 3 viewports, 3 rods, reduced motion, cancel/multi/rotate/shortage, H.264 and UI board')
