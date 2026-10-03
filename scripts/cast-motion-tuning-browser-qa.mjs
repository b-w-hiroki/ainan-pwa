import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43673/fishing-game/index.html'
const output = path.resolve('qa-artifacts/cast-motion-tuning-v1')
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })

const seed = ({ reduced = false, rod = 'carbon' } = {}) => {
  localStorage.setItem('ainan_sound_enabled', '0')
  localStorage.setItem('ainan_reduced_motion', reduced ? '1' : '0')
  localStorage.setItem('ainan_score', '25000')
  localStorage.setItem('ainan_inventory', JSON.stringify({ rods: { basic: 1, carbon: 1, premium: 1 }, baits: { worm: 30, shrimp: 30, special: 30 } }))
  localStorage.setItem('ainan_equipment', JSON.stringify({ rodType: rod, baitType: 'shrimp' }))
  window.__ainanDailyBonusDismissed = true
}

async function open(page, profile, options = {}) {
  await page.addInitScript(seed, options)
  await page.goto(`${base}?qa=1&scene=GameScene&cameraPan=1&coneLoop=1&castMotion=${profile}`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__game?.scene?.getScene?.('GameScene')?._coneCastState, null, { timeout: 12000 })
  await page.waitForTimeout(500)
}

async function startRecorder(page, name) {
  return page.evaluate(recordingName => {
    const mimeType = 'video/mp4;codecs=avc1.42E01E'
    if (!MediaRecorder.isTypeSupported(mimeType)) throw new Error('H.264 MediaRecorder unavailable')
    const chunks = []
    const recorder = new MediaRecorder(document.querySelector('canvas').captureStream(30), { mimeType, videoBitsPerSecond: 4_000_000 })
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
    window.__castMotionRecorder = { chunks, recorder, mimeType, recordingName }
    recorder.start(200)
    return recorder.mimeType
  }, name)
}

async function stopRecorder(page, filename) {
  const downloadPromise = page.waitForEvent('download')
  const recording = await page.evaluate(async () => {
    const state = window.__castMotionRecorder
    await new Promise(resolve => { state.recorder.onstop = resolve; state.recorder.stop() })
    const blob = new Blob(state.chunks, { type: state.mimeType })
    const anchor = document.createElement('a')
    anchor.href = URL.createObjectURL(blob)
    anchor.download = state.recordingName
    anchor.click()
    return { mimeType: state.mimeType, bytes: blob.size }
  })
  const download = await downloadPromise
  const target = path.join(output, filename)
  await download.saveAs(target)
  const bytes = await fs.readFile(target)
  const binary = bytes.toString('latin1')
  if (bytes.length < 10000 || !binary.includes('avc1') || !binary.includes('avcC')) throw new Error(`${filename}: invalid H.264 MP4`)
  return { ...recording, path: target, size: bytes.length, hasAvc1: true, hasAvcC: true }
}

async function runProfile(profile) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await open(page, profile)
  const frames = path.join(output, `${profile}-390x844`)
  await fs.mkdir(frames, { recursive: true })
  await startRecorder(page, `${profile}-cast-motion-h264.mp4`)
  await page.screenshot({ path: path.join(frames, '01-ready.png') })
  const started = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    scene._tickFishInterest = () => {}
    window.__castQaEvents = []
    const startedAt = performance.now()
    scene.events.on('ainan-cast-motion-phase', event => window.__castQaEvents.push({ type: 'phase', ...event, elapsed: performance.now() - startedAt }))
    scene.events.on('ainan-cast-camera-pan', event => window.__castQaEvents.push({ type: 'camera', ...event, elapsed: performance.now() - startedAt }))
    scene.events.on('ainan-cast-release', event => window.__castQaEvents.push({ type: 'release', ...event, elapsed: performance.now() - startedAt }))
    const beforeBait = scene.env.player.inventory.baits.shrimp
    const first = scene._fireCast(24, 0.95)
    const second = scene._fireCast(24, 0.95)
    return { beforeBait, first, second, profile: scene._castMotionProfile }
  })
  await page.waitForTimeout(profile === 'charged' ? 120 : 90)
  await page.screenshot({ path: path.join(frames, '02-draw-back.png') })
  await page.waitForTimeout(profile === 'charged' ? 170 : 120)
  await page.screenshot({ path: path.join(frames, '03-charge.png') })
  await page.waitForFunction(() => window.__castQaEvents.some(event => event.type === 'camera'))
  const anticipation = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    return { state: scene.fishingCamera.state, event: window.__castQaEvents.find(item => item.type === 'camera'), pose: scene._cameraPanPose }
  })
  await page.screenshot({ path: path.join(frames, '04-camera-before-release.png') })
  await page.waitForFunction(() => window.__castQaEvents.some(event => event.type === 'release'))
  await page.waitForTimeout(35)
  await page.screenshot({ path: path.join(frames, '05-swing-release.png') })
  await page.waitForTimeout(130)
  await page.screenshot({ path: path.join(frames, '06-follow-through.png') })
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'retrieve', null, { timeout: 5000 })
  await page.waitForTimeout(180)
  await page.screenshot({ path: path.join(frames, '07-landed.png') })
  const final = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    const tip = scene._cameraPanRodTip
    return {
      events: window.__castQaEvents,
      phase: scene.phase,
      bait: scene.env.player.inventory.baits.shrimp,
      pose: scene._cameraPanPose,
      player: { x: scene._cameraPanPlayer.x, y: scene._cameraPanPlayer.y },
      rod: { type: scene._cameraPanRod.getData('rodType'), visible: scene._cameraPanRod.visible, tip },
      lineVisible: scene._cameraPanRodLine.visible,
    }
  })
  const video = await stopRecorder(page, `${profile}-cast-motion-390x844-h264.mp4`)
  const phases = final.events.filter(event => event.type === 'phase').map(event => event.phase)
  const releases = final.events.filter(event => event.type === 'release')
  if (started.second !== false || releases.length !== 1) throw new Error(`${profile}: double/release guard ${JSON.stringify({ started, releases })}`)
  if (JSON.stringify(phases) !== JSON.stringify(['ready', 'drawBack', 'charge', 'swing', 'followThrough'])) throw new Error(`${profile}: phase sequence ${JSON.stringify(phases)}`)
  if (anticipation.event.bobberVisible || anticipation.event.elapsed >= releases[0].elapsed) throw new Error(`${profile}: camera pan did not precede release`)
  if (final.bait !== started.beforeBait - 1) throw new Error(`${profile}: bait changed by more than the gameplay release ${started.beforeBait} -> ${final.bait}`)
  if (final.phase !== 'retrieve' || !final.rod.visible || !final.lineVisible || !Number.isFinite(final.rod.tip?.x)) throw new Error(`${profile}: landing/rod line invalid ${JSON.stringify(final)}`)
  if (errors.filter(message => !message.includes('ERR_NETWORK_ACCESS_DENIED') && !message.includes('404')).length) throw new Error(`${profile}: browser errors ${errors.join(' | ')}`)
  await context.close()
  return { started, anticipation, final, video }
}

const standard = await runProfile('standard')
const charged = await runProfile('charged')
const standardRelease = standard.final.events.find(event => event.type === 'release').elapsed
const chargedRelease = charged.final.events.find(event => event.type === 'release').elapsed
if (chargedRelease - standardRelease < 120) throw new Error(`charged profile is not visibly slower: ${standardRelease} / ${chargedRelease}`)

const resilienceContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
const resiliencePage = await resilienceContext.newPage()
await open(resiliencePage, 'charged', { reduced: true, rod: 'premium' })
const reduced = await resiliencePage.evaluate(async () => {
  const scene = window.__game.scene.getScene('GameScene')
  const before = scene.env.player.inventory.baits.shrimp
  scene._fireCast(24, 0.95)
  const profile = scene._castMotionProfile
  await new Promise(resolve => setTimeout(resolve, 90))
  const bodyAngle = scene._cameraPanPlayer.angle
  scene._enterCast()
  await new Promise(resolve => setTimeout(resolve, 360))
  return { before, after: scene.env.player.inventory.baits.shrimp, profile, bodyAngle, casting: scene._cameraPanCasting, bobber: scene.bobber.visible, rod: scene._cameraPanRod.getData('rodType') }
})
if (reduced.profile.totalMs >= charged.started.profile.totalMs || reduced.bodyAngle !== 0 || reduced.before !== reduced.after || reduced.casting || reduced.bobber) throw new Error(`reduced/interruption failed ${JSON.stringify(reduced)}`)
if (reduced.rod !== 'premium') throw new Error(`premium rod not applied: ${reduced.rod}`)

await resiliencePage.setViewportSize({ width: 844, height: 390 })
await resiliencePage.waitForTimeout(180)
const landscape = await resiliencePage.evaluate(() => ({ canvas: document.querySelector('canvas').getBoundingClientRect().toJSON(), status: window.__game.scene.getScene('GameScene')._cameraPanHudNodes.status.getBounds() }))
await resiliencePage.setViewportSize({ width: 375, height: 667 })
await resiliencePage.waitForTimeout(180)
const portrait = await resiliencePage.evaluate(() => ({ canvas: document.querySelector('canvas').getBoundingClientRect().toJSON(), status: window.__game.scene.getScene('GameScene')._cameraPanHudNodes.status.getBounds() }))
if (Math.abs(landscape.canvas.width - 844) > 1 || landscape.status.bottom > 390 || Math.abs(portrait.canvas.width - 375) > 1 || portrait.status.bottom > 667) throw new Error('rotation layout failed')
await resilienceContext.close()

const rodTextures = {}
for (const rod of ['basic', 'carbon']) {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } })
  const page = await context.newPage()
  await open(page, 'standard', { rod })
  rodTextures[rod] = await page.evaluate(() => window.__game.scene.getScene('GameScene')._cameraPanRod.getData('rodType'))
  await context.close()
  if (rodTextures[rod] !== rod) throw new Error(`${rod} rod not applied: ${rodTextures[rod]}`)
}
rodTextures.premium = reduced.rod

const report = { standard, charged, releaseDeltaMs: chargedRelease - standardRelease, reduced, rodTextures, rotation: { landscape, portrait } }
await fs.writeFile(path.join(output, 'metrics.json'), `${JSON.stringify(report, null, 2)}\n`)
await browser.close()
console.log(`PASS: five-stage casts, independent pan/release, ${Math.round(standardRelease)}ms vs ${Math.round(chargedRelease)}ms, interruption/reduced motion, three rods, rotation, H.264 videos`)
