import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43943/fishing-game/index.html'
const output = path.resolve('qa-artifacts/aim-camera-typography')
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })

async function startRecorder(page, filename) {
  await page.evaluate(name => {
    const mimeType = 'video/mp4;codecs=avc1.42E01E'
    if (!MediaRecorder.isTypeSupported(mimeType)) throw new Error('H.264 MediaRecorder unavailable')
    const chunks = []
    const recorder = new MediaRecorder(document.querySelector('canvas').captureStream(30), { mimeType, videoBitsPerSecond: 4_000_000 })
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
    window.__aimRecorder = { recorder, chunks, mimeType, filename: name }
    recorder.start(200)
  }, filename)
}

async function stopRecorder(page, filename) {
  const downloadPromise = page.waitForEvent('download')
  const meta = await page.evaluate(async () => {
    const state = window.__aimRecorder
    await new Promise(resolve => { state.recorder.onstop = resolve; state.recorder.stop() })
    const blob = new Blob(state.chunks, { type: state.mimeType })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = state.filename
    link.click()
    return { mimeType: state.mimeType, bytes: blob.size }
  })
  const download = await downloadPromise
  const target = path.join(output, filename)
  await download.saveAs(target)
  const bytes = await fs.readFile(target)
  const binary = bytes.toString('latin1')
  if (bytes.length < 10000 || !binary.includes('avc1') || !binary.includes('avcC')) throw new Error(`${filename}: invalid H.264 output`)
  return { ...meta, path: target, size: bytes.length, avc1: true, avcC: true }
}

const seed = ({ rod, reduced = false }) => {
  localStorage.setItem('ainan_sound_enabled', '0')
  localStorage.setItem('ainan_reduced_motion', reduced ? '1' : '0')
  localStorage.setItem('ainan_score', '25000')
  localStorage.setItem('ainan_inventory', JSON.stringify({ rods: { basic: 1, carbon: 1, premium: 1 }, baits: { worm: 30, shrimp: 30, special: 30 } }))
  localStorage.setItem('ainan_equipment', JSON.stringify({ rodType: rod, baitType: 'shrimp' }))
  window.__ainanDailyBonusDismissed = true
}

async function open(page, rod, reduced = false) {
  await page.addInitScript(seed, { rod, reduced })
  await page.goto(`${base}?qa=1&scene=GameScene&cameraPan=1&coneLoop=1&castMotion=charged`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => {
    const scene = window.__game?.scene?.getScene?.('GameScene')
    return scene?._coneCastHudNodes && scene?.fishingCamera && scene.phase === 'cast'
  }, null, { timeout: 12000 })
  await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    scene._tickFishInterest = () => {}
    window.__aimScrollSamples = []
    scene.events.on('postupdate', () => {
      window.__aimScrollSamples.push({ x: scene.cameras.main.scrollX, y: scene.cameras.main.scrollY })
      if (window.__aimScrollSamples.length > 240) window.__aimScrollSamples.shift()
    })
  })
  await page.waitForTimeout(250)
}

async function gesture(page, edge) {
  await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    scene.fishingCamera._qaAimFollowOriginal = scene.fishingCamera.updateAimFollow
    scene.fishingCamera.updateAimFollow = () => {}
    Object.assign(scene._coneCastState, { inputMode: 'pull', pullPointerId: 99, pullStartX: 0, pullStartY: 0, pullPointerX: 0, pullPointerY: 112, pullDx: 0, pullDy: 112, pullProgress: 1, pullArmedAt: scene.time.now - 650, distancePx: 780, angleDeg: 0 })
  })
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene')._coneCastPreview?.rangeGeometry?.samples?.length > 2)
  return page.evaluate(edge => {
    const scene = window.__game.scene.getScene('GameScene')
    const camera = scene.cameras.main
    const samples = scene._coneCastPreview.rangeGeometry.samples
    const sample = edge === 'left' ? samples[0] : edge === 'right' ? samples.at(-1) : samples.reduce((best, item) => Math.abs(item.angleDeg) < Math.abs(best.angleDeg) ? item : best)
    scene.fishingCamera.updateAimFollow = scene.fishingCamera._qaAimFollowOriginal
    delete scene.fishingCamera._qaAimFollowOriginal
    Object.assign(scene._coneCastState, { inputMode: 'aim', pullPointerId: null, pullArmedAt: null, pullCharge: 0, pullDx: 0, pullDy: 0, pullProgress: 0 })
    scene.fishingCamera.focusPlayer(true)
    window.__aimScrollSamples = []
    const origin = {
      x: camera.x + (scene.anchorX - camera.worldView.x) * camera.zoom,
      y: camera.y + (scene.anchorY - camera.worldView.y) * camera.zoom,
    }
    const progress = Math.max(0, Math.min(1, (sample.outerDistance - 180) / 600))
    const distance = Math.max(66, progress * 112)
    const angle = sample.angleDeg * Math.PI / 180
    const pull = { dx: -Math.sin(angle) * distance, dy: Math.cos(angle) * distance }
    const end = { x: origin.x + pull.dx, y: origin.y + pull.dy }
    const scrollStart = { x: camera.scrollX, y: camera.scrollY }
    scene._onDown({ id: 7, x: origin.x, y: origin.y })
    scene._onMove({ id: 7, x: end.x, y: end.y })
    return { origin, end, pull, scrollStart, selected: { angleDeg: sample.angleDeg, distancePx: sample.outerDistance } }
  }, edge)
}

async function directPull(page, { dx = 0, dy = 112, id = 7 } = {}) {
  return page.evaluate(({ dx, dy, id }) => {
    const scene = window.__game.scene.getScene('GameScene')
    const camera = scene.cameras.main
    const origin = { x: camera.x + (scene.anchorX - camera.worldView.x) * camera.zoom, y: camera.y + (scene.anchorY - camera.worldView.y) * camera.zoom }
    const end = { x: origin.x + dx, y: origin.y + dy }
    scene._onDown({ id, x: origin.x, y: origin.y })
    scene._onMove({ id, x: end.x, y: end.y })
    return { origin, end, id }
  }, { dx, dy, id })
}

async function snapshot(page) {
  return page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    const camera = scene.cameras.main
    const preview = scene._coneCastPreview
    const safe = scene.fishingCamera._aimSafeZone()
    const screen = { x: preview.x - camera.scrollX, y: preview.y - camera.scrollY }
    const nodes = scene._coneCastHudNodes
    const bounds = object => {
      const value = object.getBounds()
      return { x: value.x, y: value.y, right: value.right, bottom: value.bottom, width: value.width, height: value.height }
    }
    return {
      phase: scene.phase,
      state: { angleDeg: scene._coneCastState.angleDeg, distancePx: scene._coneCastState.distancePx, inputMode: scene._coneCastState.inputMode },
      preview: { x: preview.x, y: preview.y, valid: preview.valid },
      screen,
      safe,
      scroll: { x: camera.scrollX, y: camera.scrollY },
      reduced: scene.game.device.os.desktop && matchMedia('(prefers-reduced-motion: reduce)').matches,
      ui: {
        label: bounds(nodes.label), mode: bounds(nodes.mode), info: { x: nodes.infoX, y: nodes.infoY, right: nodes.infoX + nodes.infoW, bottom: nodes.infoY + nodes.infoH },
        gauge: { x: nodes.gaugeX - 4, y: nodes.gaugeY - 20, right: nodes.gaugeX + nodes.gaugeW + 4, bottom: nodes.gaugeY + nodes.gaugeH + 4 },
      },
      viewport: { width: scene.scale.width, height: scene.scale.height },
    }
  })
}

function assertInside(snapshot, id) {
  const { screen, safe, ui, viewport } = snapshot
  if (!snapshot.preview.valid) throw new Error(`${id}: invalid preview`)
  if (screen.x < safe.left - 1 || screen.x > safe.right + 1 || screen.y < safe.top - 1 || screen.y > safe.bottom + 1) throw new Error(`${id}: landing outside safe area ${JSON.stringify({ screen, safe })}`)
  for (const [name, box] of Object.entries({ label: ui.label, mode: ui.mode })) {
    if (box.x < ui.info.x - 1 || box.right > ui.info.right + 1 || box.y < ui.info.y - 1 || box.bottom > ui.info.bottom + 1) throw new Error(`${id}: ${name} escaped info card ${JSON.stringify({ box, info: ui.info })}`)
    if (box.x < 0 || box.y < 0 || box.right > viewport.width || box.bottom > viewport.height) throw new Error(`${id}: ${name} escaped viewport`)
  }
  if (Math.min(ui.info.right, ui.gauge.right) - Math.max(ui.info.x, ui.gauge.x) > 0 && Math.min(ui.info.bottom, ui.gauge.bottom) - Math.max(ui.info.y, ui.gauge.y) > 3) throw new Error(`${id}: gauge overlaps text card`)
}

async function runCase(viewport, rod, edge) {
  console.log(`RUN ${viewport.width}x${viewport.height} ${rod} ${edge}`)
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await open(page, rod)
  const drag = await gesture(page, edge)
  await page.waitForFunction(selected => {
    const preview = window.__game.scene.getScene('GameScene')._coneCastPreview
    return preview?.valid && Math.abs(preview.angleDeg - selected.angleDeg) < 0.01 && Math.abs(preview.distancePx - selected.distancePx) < 0.1
  }, drag.selected)
  const early = await snapshot(page)
  const frames = []
  for (let index = 0; index < 14; index++) {
    await page.waitForTimeout(45)
    frames.push((await snapshot(page)).scroll)
  }
  const settled = await snapshot(page)
  assertInside(settled, `${viewport.width}x${viewport.height}-${rod}-${edge}`)
  if (viewport.width === 390 && viewport.height === 844 && rod === 'premium' && edge === 'center') await page.screenshot({ path: path.join(output, 'after-390x844.png') })
  if (viewport.width === 844 && viewport.height === 390 && rod === 'premium' && edge === 'center') await page.screenshot({ path: path.join(output, 'after-844x390.png') })
  if (Math.abs(early.state.angleDeg - settled.state.angleDeg) > 0.001 || Math.abs(early.state.distancePx - settled.state.distancePx) > 0.001 || Math.hypot(early.preview.x - settled.preview.x, early.preview.y - settled.preview.y) > 0.001) throw new Error(`camera feedback changed the selected world landing ${JSON.stringify({ early, settled })}`)
  const maxStep = await page.evaluate(() => Math.max(0, ...window.__aimScrollSamples.slice(1).map((point, index) => Math.hypot(point.x - window.__aimScrollSamples[index].x, point.y - window.__aimScrollSamples[index].y))))
  if (maxStep > 42) throw new Error(`${viewport.width}x${viewport.height}-${rod}-${edge}: per-frame camera step ${maxStep.toFixed(2)}px`)
  await page.evaluate(end => {
    const scene = window.__game.scene.getScene('GameScene')
    scene._coneCastState.pullArmedAt = scene.time.now - 650
    scene._onUp({ id: 7, x: end.x, y: end.y })
  }, drag.end)
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'retrieve', null, { timeout: 7000 })
  const landed = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    const equipment = scene._cameraPanHudNodes.equipment.getBounds()
    const distance = scene._cameraPanHudNodes.distance.getBounds()
    return { x: scene.bobber.x, y: scene.bobber.y, rating: scene._coneCastState.lastRelease?.rating, headerGap: distance.x - equipment.right }
  })
  const landingError = Math.hypot(landed.x - settled.preview.x, landed.y - settled.preview.y)
  if (landed.rating !== 'good' || landingError > 0.75 || landed.headerGap < 8 || errors.length) throw new Error(`${viewport.width}x${viewport.height}-${rod}-${edge}: landing/input failure ${JSON.stringify({ landed, landingError, errors })}`)
  await context.close()
  return { viewport, rod, edge, early, settled, maxStep, landingError }
}

const cases = []
const viewports = [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 844, height: 390 }].filter(viewport => !process.env.QA_VIEWPORT || `${viewport.width}x${viewport.height}` === process.env.QA_VIEWPORT)
const rods = ['basic', 'carbon', 'premium'].filter(rod => !process.env.QA_ROD || rod === process.env.QA_ROD)
for (const viewport of viewports) {
  for (const rod of rods) {
    for (const edge of ['left', 'center', 'right']) cases.push(await runCase(viewport, rod, edge))
  }
}

const reducedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
const reducedPage = await reducedContext.newPage()
await open(reducedPage, 'premium', true)
const reducedDrag = await gesture(reducedPage, 'center')
await reducedPage.waitForTimeout(80)
const reduced = await snapshot(reducedPage)
assertInside(reduced, 'reduced-motion')
await reducedPage.evaluate(end => window.__game.scene.getScene('GameScene')._onUp({ id: 7, x: end.x, y: end.y }), reducedDrag.end)
await reducedContext.close()

const nearContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
const nearPage = await nearContext.newPage()
await open(nearPage, 'basic')
const nearStart = await nearPage.evaluate(() => { const camera = window.__game.scene.getScene('GameScene').cameras.main; return { x: camera.scrollX, y: camera.scrollY } })
await directPull(nearPage, { dx: 0, dy: 64, id: 6 })
await nearPage.waitForTimeout(360)
const nearEnd = await nearPage.evaluate(() => { const camera = window.__game.scene.getScene('GameScene').cameras.main; return { x: camera.scrollX, y: camera.scrollY } })
const nearDelta = Math.hypot(nearEnd.x - nearStart.x, nearEnd.y - nearStart.y)
if (nearDelta > 1) throw new Error(`normal-distance dead zone moved camera ${nearDelta.toFixed(2)}px`)
await nearPage.evaluate(() => window.__game.scene.getScene('GameScene').game.canvas.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 6 })))
await nearContext.close()

const resilienceContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
const resiliencePage = await resilienceContext.newPage()
await open(resiliencePage, 'premium')
await gesture(resiliencePage, 'right')
await resiliencePage.waitForTimeout(260)
await resiliencePage.evaluate(() => window.__game.scene.getScene('GameScene').game.canvas.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 7 })))
await resiliencePage.waitForTimeout(380)
const cancelled = await resiliencePage.evaluate(() => { const scene = window.__game.scene.getScene('GameScene'); return { mode: scene._coneCastState.inputMode, state: scene.fishingCamera.state } })
await gesture(resiliencePage, 'left')
await resiliencePage.setViewportSize({ width: 844, height: 390 })
await resiliencePage.waitForTimeout(380)
const rotated = await resiliencePage.evaluate(() => { const scene = window.__game.scene.getScene('GameScene'); return { mode: scene._coneCastState.inputMode, state: scene.fishingCamera.state } })
if (cancelled.mode !== 'aim' || rotated.mode !== 'aim') throw new Error(`cancel/rotate recovery failed ${JSON.stringify({ cancelled, rotated })}`)
await resilienceContext.close()

const continuousContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
const continuousPage = await continuousContext.newPage()
await open(continuousPage, 'premium')
await startRecorder(continuousPage, 'ainan-aim-follow-390x844-h264.mp4')
const first = await directPull(continuousPage)
await continuousPage.waitForTimeout(650)
await continuousPage.evaluate(({ end, id }) => { const scene = window.__game.scene.getScene('GameScene'); scene._coneCastState.pullArmedAt = scene.time.now - 650; scene._onUp({ id, x: end.x, y: end.y }) }, first)
await continuousPage.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'retrieve', null, { timeout: 7000 })
await continuousPage.waitForTimeout(260)
await continuousPage.evaluate(() => window.__game.scene.getScene('GameScene')._enterCast())
await continuousPage.waitForTimeout(420)
const second = await directPull(continuousPage, { dx: -38, dy: 104, id: 8 })
await continuousPage.waitForTimeout(650)
await continuousPage.evaluate(({ end, id }) => { const scene = window.__game.scene.getScene('GameScene'); scene._coneCastState.pullArmedAt = scene.time.now - 650; scene._onUp({ id, x: end.x, y: end.y }) }, second)
await continuousPage.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'retrieve', null, { timeout: 7000 })
await continuousPage.waitForTimeout(320)
const continuous = await continuousPage.evaluate(() => { const scene = window.__game.scene.getScene('GameScene'); return { phase: scene.phase, rating: scene._coneCastState.lastRelease?.rating, bait: scene.env.player.inventory.baits.shrimp } })
const video = await stopRecorder(continuousPage, 'ainan-aim-follow-390x844-h264.mp4')
if (continuous.phase !== 'retrieve' || continuous.rating !== 'good' || continuous.bait !== 28) throw new Error(`continuous cast failed ${JSON.stringify(continuous)}`)
await continuousContext.close()

await fs.writeFile(path.join(output, 'metrics.json'), `${JSON.stringify({ cases, reduced, nearDelta, cancelled, rotated, continuous, video }, null, 2)}\n`)
await browser.close()
console.log(`PASS: ${cases.length} aim-follow casts, ${viewports.length} viewports, ${rods.length} rods, left/center/right max pulls, stable world aim, typography bounds, cancel, rotate, reduced motion, consecutive casts, H.264`)
