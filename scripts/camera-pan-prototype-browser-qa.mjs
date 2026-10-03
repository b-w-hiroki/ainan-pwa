import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43411/fishing-game/index.html'
const output = path.resolve('qa-artifacts/camera-pan-v1')
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: 'msedge' })

const seed = reduced => {
  localStorage.setItem('ainan_sound_enabled', '0')
  localStorage.setItem('ainan_reduced_motion', reduced ? '1' : '0')
  localStorage.setItem('ainan_score', '25000')
  localStorage.setItem('ainan_inventory', JSON.stringify({ rods: { basic: 1, carbon: 1, premium: 1 }, baits: { worm: 30, shrimp: 30, special: 30 } }))
  window.__ainanDailyBonusDismissed = true
}

async function open(page, reduced = false) {
  await page.addInitScript(seed, reduced)
  await page.goto(`${base}?qa=1&cameraPan=1&scene=GameScene`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__game?.scene?.getScene?.('GameScene')?.sys?.isActive?.())
  await page.waitForTimeout(900)
}

async function metrics(page) {
  return page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    const camera = scene.cameras.main
    const player = scene._cameraPanPlayer ?? scene._playerSprite
    const bobber = scene.bobber
    return {
      phase: scene.phase,
      cameraState: scene.fishingCamera?.state,
      scroll: { x: camera.scrollX, y: camera.scrollY },
      playerWorld: { x: player?.x, y: player?.y, visible: player?.visible },
      playerScreen: { x: (player?.x ?? 0) - camera.scrollX, y: (player?.y ?? 0) - camera.scrollY },
      lureWorld: { x: bobber?.x, y: bobber?.y, visible: bobber?.visible },
      lureScreen: { x: (bobber?.x ?? 0) - camera.scrollX, y: (bobber?.y ?? 0) - camera.scrollY },
      hudFixed: scene._cameraPanHud?.scrollFactorX === 0 && scene._cameraPanHud?.scrollFactorY === 0,
      worldLayers: scene.bg?._blueprintWaterLayers?.map(layer => ({ key: layer.texture?.key ?? 'graphics', scrollX: layer.scrollFactorX, scrollY: layer.scrollFactorY })) ?? [],
      inputLocked: Boolean(scene._castMotionInputLocked || scene._cameraPanCasting),
    }
  })
}

async function runCast({ id, viewport, power, angle = 24, reduced = false, record = false }) {
  const context = await browser.newContext({
    viewport,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await open(page, reduced)
  } catch (error) {
    throw new Error(`${id}: scene startup failed: ${errors.join(' | ') || error.message}`)
  }
  let recorderMime = null
  if (record) {
    recorderMime = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')
      const mimeType = 'video/mp4;codecs=avc1.42E01E'
      if (!MediaRecorder.isTypeSupported(mimeType)) throw new Error('Browser MediaRecorder has no H.264 MP4 encoder')
      const chunks = []
      const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType, videoBitsPerSecond: 4_000_000 })
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
      window.__cameraPanRecorder = { recorder, chunks, mimeType }
      recorder.start(250)
      return recorder.mimeType
    })
  }
  const frames = path.join(output, id)
  await fs.mkdir(frames, { recursive: true })
  await page.screenshot({ path: path.join(frames, '01-shore-ready.png') })
  const start = await metrics(page)

  await page.mouse.move(viewport.width * 0.78, viewport.height * 0.25)
  await page.mouse.down()
  await page.waitForTimeout(reduced ? 80 : 260)
  await page.screenshot({ path: path.join(frames, '02-windup.png') })
  await page.evaluate(({ castPower, castAngle }) => {
    const scene = window.__game.scene.getScene('GameScene')
    scene.isCharging = false
    scene._fireCast(castAngle, castPower)
  }, { castPower: power, castAngle: angle })
  await page.mouse.up()
  await page.waitForTimeout(reduced ? 70 : 180)
  await page.screenshot({ path: path.join(frames, '03-flight-early.png') })
  const early = await metrics(page)
  await page.waitForTimeout(reduced ? 100 : 330)
  await page.screenshot({ path: path.join(frames, '04-flight-pan.png') })
  const flight = await metrics(page)
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'retrieve', null, { timeout: 5000 })
  await page.waitForTimeout(reduced ? 100 : 360)
  await page.screenshot({ path: path.join(frames, '05-landing-stable.png') })
  const landing = await metrics(page)

  if (!start.hudFixed || !landing.hudFixed) throw new Error(`${id}: HUD is not camera-fixed`)
  if (!landing.worldLayers.length || landing.worldLayers.some(layer => layer.scrollX !== 1 || layer.scrollY !== 1)) throw new Error(`${id}: world layer is viewport-fixed ${JSON.stringify(landing.worldLayers)}`)
  if (landing.phase !== 'retrieve' || !['lureFocus', 'retrieveFollow'].includes(landing.cameraState)) throw new Error(`${id}: landing did not stabilize ${JSON.stringify(landing)}`)
  const cameraTravel = Math.max(
    Math.hypot(flight.scroll.x - start.scroll.x, flight.scroll.y - start.scroll.y),
    Math.hypot(landing.scroll.x - start.scroll.x, landing.scroll.y - start.scroll.y),
  )
  if (power > 0.5 && cameraTravel < (reduced ? 15 : 24)) throw new Error(`${id}: camera did not pan with the cast`)
  if (!landing.playerWorld.visible) throw new Error(`${id}: shore player was hidden instead of remaining in world`)
  if (errors.length) throw new Error(`${id}: ${errors.join(' | ')}`)

  let videoPath = null
  if (record) {
    const downloadPromise = page.waitForEvent('download')
    await page.evaluate(async () => {
      const state = window.__cameraPanRecorder
      await new Promise(resolve => {
        state.recorder.onstop = resolve
        state.recorder.stop()
      })
      const blob = new Blob(state.chunks, { type: state.mimeType })
      const anchor = document.createElement('a')
      anchor.href = URL.createObjectURL(blob)
      anchor.download = 'camera-pan-far-390x844.mp4'
      anchor.click()
    })
    const download = await downloadPromise
    videoPath = path.join(output, 'camera-pan-far-390x844.mp4')
    await download.saveAs(videoPath)
  }
  await context.close()
  return { id, viewport, power, angle, reduced, start, early, flight, landing, recorderMime, videoPath }
}

const normal = await runCast({ id: 'normal-390x844', viewport: { width: 390, height: 844 }, power: 0.30, angle: 8 })
const far = await runCast({ id: 'far-390x844', viewport: { width: 390, height: 844 }, power: 0.95, record: true })
const reduced = await runCast({ id: 'far-reduced-390x844', viewport: { width: 390, height: 844 }, power: 0.95, reduced: true })
const small = await runCast({ id: 'far-375x667', viewport: { width: 375, height: 667 }, power: 0.95 })
const landscape = await runCast({ id: 'far-844x390', viewport: { width: 844, height: 390 }, power: 0.95 })

if (far.landing.playerScreen.y <= normal.landing.playerScreen.y + 80) throw new Error(`far cast did not push shore/player farther out of frame: normal=${normal.landing.playerScreen.y}, far=${far.landing.playerScreen.y}`)
if (far.landing.playerScreen.y < 800) throw new Error(`far cast still frames too much shore/player: ${far.landing.playerScreen.y}`)
if (reduced.flight.inputLocked !== true && reduced.landing.inputLocked !== false) throw new Error('reduced motion input lock state invalid')

const resilienceContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
const resiliencePage = await resilienceContext.newPage()
const resilienceErrors = []
resiliencePage.on('pageerror', error => resilienceErrors.push(error.message))
await open(resiliencePage)
const resilienceStart = await metrics(resiliencePage)
const doubleInput = await resiliencePage.evaluate(() => {
  const scene = window.__game.scene.getScene('GameScene')
  const before = scene.env.player.inventory.baits.worm
  const first = scene._fireCast(24, 0.95)
  const second = scene._fireCast(24, 0.95)
  const after = scene.env.player.inventory.baits.worm
  return { first, second, before, after, casting: scene._cameraPanCasting, bobberVisible: scene.bobber.visible }
})
if (doubleInput.second !== false || !doubleInput.casting || !doubleInput.bobberVisible || doubleInput.after < doubleInput.before - 1) throw new Error(`double cast was not locked: ${JSON.stringify(doubleInput)}`)
await resiliencePage.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'retrieve')
await resiliencePage.evaluate(() => window.__game.scene.getScene('GameScene')._enterCast())
await resiliencePage.waitForTimeout(420)
const reset = await metrics(resiliencePage)
if (reset.phase !== 'cast' || Math.hypot(reset.scroll.x - resilienceStart.scroll.x, reset.scroll.y - resilienceStart.scroll.y) > 6) throw new Error(`camera reset failed: ${JSON.stringify({ start: resilienceStart.scroll, reset: reset.scroll })}`)

await resiliencePage.setViewportSize({ width: 844, height: 390 })
await resiliencePage.waitForTimeout(220)
const rotatedLandscape = await resiliencePage.evaluate(() => {
  const canvas = document.querySelector('canvas').getBoundingClientRect()
  const status = window.__game.scene.getScene('GameScene')._cameraPanHudNodes.status.getBounds()
  return { canvas: { width: canvas.width, height: canvas.height }, statusBottom: status.bottom }
})
if (Math.abs(rotatedLandscape.canvas.width - 844) > 1 || Math.abs(rotatedLandscape.canvas.height - 390) > 1 || rotatedLandscape.statusBottom > 390) throw new Error(`landscape rotation layout failed: ${JSON.stringify(rotatedLandscape)}`)
await resiliencePage.setViewportSize({ width: 375, height: 667 })
await resiliencePage.waitForTimeout(220)
const rotatedPortrait = await resiliencePage.evaluate(() => {
  const canvas = document.querySelector('canvas').getBoundingClientRect()
  const status = window.__game.scene.getScene('GameScene')._cameraPanHudNodes.status.getBounds()
  return { canvas: { width: canvas.width, height: canvas.height }, statusBottom: status.bottom }
})
if (Math.abs(rotatedPortrait.canvas.width - 375) > 1 || Math.abs(rotatedPortrait.canvas.height - 667) > 1 || rotatedPortrait.statusBottom > 667) throw new Error(`portrait rotation layout failed: ${JSON.stringify(rotatedPortrait)}`)
await resilienceContext.close()
if (resilienceErrors.length) throw new Error(`reset/rotation errors: ${resilienceErrors.join(' | ')}`)

const backContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
const backPage = await backContext.newPage()
const backErrors = []
backPage.on('pageerror', error => backErrors.push(error.message))
await open(backPage)
await backPage.evaluate(() => window.__game.scene.getScene('GameScene')._fireCast(24, 0.95))
await backPage.waitForTimeout(180)
await backPage.mouse.click(42, 42)
await backPage.waitForFunction(() => window.__game.scene.getScene('MapScene')?.sys?.isActive?.())
await backContext.close()
if (backErrors.length) throw new Error(`back during flight errors: ${backErrors.join(' | ')}`)

const report = { normal, far, reduced, small, landscape, resilience: { doubleInput, reset, rotatedLandscape, rotatedPortrait }, backDuringFlight: 'passed' }
report.video = far.videoPath
await fs.writeFile(path.join(output, 'metrics.json'), JSON.stringify(report, null, 2))
await browser.close()
console.log('PASS: shore-world cast, distance-sensitive camera pan, landing stability, fixed HUD, reduced motion, reset/double-input/back, portrait/small/landscape rotation')
