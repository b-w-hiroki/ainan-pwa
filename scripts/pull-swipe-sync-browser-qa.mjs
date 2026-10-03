import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43741/fishing-game/index.html'
const output = path.resolve('qa-artifacts/pull-swipe-sync-v2')
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })

const seed = () => {
  localStorage.setItem('ainan_sound_enabled', '0')
  localStorage.setItem('ainan_score', '25000')
  localStorage.setItem('ainan_inventory', JSON.stringify({ rods: { basic: 1, carbon: 1, premium: 1 }, baits: { worm: 30, shrimp: 30, special: 30 } }))
  localStorage.setItem('ainan_equipment', JSON.stringify({ rodType: 'carbon', baitType: 'shrimp' }))
  window.__ainanDailyBonusDismissed = true
}

async function canvasPoint(page, x, y, action) {
  const canvas = page.locator('canvas').last()
  const box = await canvas.boundingBox()
  const size = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }))
  const px = box.x + box.width * x / size.width
  const py = box.y + box.height * y / size.height
  if (action === 'down') { await page.mouse.move(px, py); await page.mouse.down() }
  if (action === 'move') await page.mouse.move(px, py)
  if (action === 'up') { await page.mouse.move(px, py); await page.mouse.up() }
}

async function startRecorder(page, filename) {
  await page.evaluate(name => {
    const mimeType = 'video/mp4;codecs=avc1.42E01E'
    if (!MediaRecorder.isTypeSupported(mimeType)) throw new Error('H.264 MediaRecorder unavailable')
    const chunks = []
    const recorder = new MediaRecorder(document.querySelector('canvas').captureStream(30), { mimeType, videoBitsPerSecond: 4_000_000 })
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
    window.__syncRecorder = { recorder, chunks, mimeType, filename: name }
    recorder.start(200)
  }, filename)
}

async function stopRecorder(page, filename) {
  const downloadPromise = page.waitForEvent('download')
  const meta = await page.evaluate(async () => {
    const state = window.__syncRecorder
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

async function recordRun({ qa, filename }) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(seed)
  await page.goto(`${base}?qa=1&scene=GameScene&cameraPan=1&coneLoop=1&castMotion=charged${qa ? '&pullQa=1' : ''}`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__game?.scene?.getScene?.('GameScene')?._coneCastHudNodes?.castY, null, { timeout: 12000 })
  await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    scene._tickFishInterest = () => {}
    window.__syncEvents = []
    for (const name of ['ainan-cast-motion-phase', 'ainan-pull-cast-armed', 'ainan-pull-cast-release-grade', 'ainan-cast-release', 'ainan-cast-camera-pan']) {
      scene.events.on(name, payload => window.__syncEvents.push({
        name, payload, atSceneMs: scene.time.now,
        pose: scene._pullCastTimeline?.visualPose ?? scene._cameraPanPose,
        rodTip: scene._cameraPanRodTip ? { ...scene._cameraPanRodTip } : null,
        bobber: scene.bobber ? { x: scene.bobber.x, y: scene.bobber.y, visible: scene.bobber.visible } : null,
      }))
    }
  })
  await page.waitForTimeout(250)
  await startRecorder(page, filename)

  const size = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }))
  await canvasPoint(page, size.width * 0.42, size.height * 0.58, 'down')
  await canvasPoint(page, size.width * 0.70, size.height * 0.31, 'move')
  await canvasPoint(page, size.width * 0.70, size.height * 0.31, 'up')
  await page.waitForTimeout(220)
  const control = await page.evaluate(() => {
    const nodes = window.__game.scene.getScene('GameScene')._coneCastHudNodes
    return { x: nodes.buttonX, y: nodes.castY, endY: nodes.pullEndY }
  })
  await canvasPoint(page, control.x, control.y, 'down')
  for (let step = 1; step <= 10; step += 1) {
    const progress = step / 10
    await canvasPoint(page, control.x + progress * 3, control.y + (control.endY - control.y) * progress, 'move')
    await page.waitForTimeout(28)
  }
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene')._coneCastState.pullArmedAt != null)
  const armedElapsed = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    return scene.time.now - scene._coneCastState.pullArmedAt
  })
  await page.waitForTimeout(Math.max(0, (qa ? 500 : 680) - armedElapsed))
  if (qa) await page.screenshot({ path: path.join(output, 'pull-swipe-sync-qa-charge.png') })
  const pointerReleaseAt = await page.evaluate(() => window.__game.scene.getScene('GameScene').time.now)
  await canvasPoint(page, control.x + 3, control.endY, 'up')
  await page.waitForFunction(() => window.__syncEvents.some(event => event.name === 'ainan-cast-camera-pan'))
  if (qa) await page.screenshot({ path: path.join(output, 'pull-swipe-sync-qa-release.png') })
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'retrieve', null, { timeout: 5000 })
  await page.waitForTimeout(350)
  const video = await stopRecorder(page, filename)
  const result = await page.evaluate(releaseAt => {
    const scene = window.__game.scene.getScene('GameScene')
    return {
      pointerReleaseAt: releaseAt,
      events: window.__syncEvents,
      lastTimeline: scene._pullCastTimeline ?? scene._pullCastLastTimeline,
      release: scene._coneCastState.lastRelease,
      bait: scene.env.player.inventory.baits.shrimp,
      phase: scene.phase,
    }
  }, pointerReleaseAt)
  if (errors.length) throw new Error(`${filename}: ${errors.join(' | ')}`)
  await context.close()
  return { qa, video, ...result }
}

const normal = await recordRun({ qa: false, filename: 'pull-swipe-sync-normal-390x844-h264.mp4' })
const annotated = await recordRun({ qa: true, filename: 'pull-swipe-sync-qa-390x844-h264.mp4' })

for (const run of [normal, annotated]) {
  const phases = run.events.filter(event => event.name === 'ainan-cast-motion-phase').map(event => event.payload.phase)
  const lure = run.events.find(event => event.name === 'ainan-cast-release')
  const camera = run.events.find(event => event.name === 'ainan-cast-camera-pan')
  const grade = run.events.find(event => event.name === 'ainan-pull-cast-release-grade')
  if (!grade || grade.payload.rating !== 'good') throw new Error(`GOOD result changed during sync QA: ${JSON.stringify(grade?.payload)}`)
  for (const phase of ['ready', 'drawBack', 'charge', 'swing', 'followThrough', 'recover']) {
    if (!phases.includes(phase)) throw new Error(`missing visual phase ${phase}: ${phases.join(',')}`)
  }
  if (!lure || !camera || lure.atSceneMs <= run.pointerReleaseAt || camera.atSceneMs <= lure.atSceneMs) throw new Error(`release order failed: ${JSON.stringify({ pointer: run.pointerReleaseAt, lure, camera })}`)
  if (lure.bobber && lure.rodTip && Math.hypot(lure.bobber.x - lure.rodTip.x, lure.bobber.y - lure.rodTip.y) > 1) throw new Error('lure did not detach from rod tip')
  if (run.bait !== 29 || run.phase !== 'retrieve') throw new Error('one-shot cast invariant changed')
}

const report = { normal, annotated }
await fs.writeFile(path.join(output, 'pull-swipe-sync-timeline.json'), `${JSON.stringify(report, null, 2)}\n`)
await browser.close()
console.log('PASS: pull/hold/gauge/pose sync; release -> lure tip detach -> camera order; normal + annotated H.264 videos')
