import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43581/fishing-game/index.html'
const output = path.resolve('qa-artifacts/cone-loop-v1/390x844')
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true })
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })

const url = `${base}?qa=1&scene=GameScene&cameraPan=1&coneLoop=1`
await page.goto(url, { waitUntil: 'domcontentloaded' })
try {
  await page.waitForFunction(() => window.__game?.scene?.getScene?.('GameScene')?._coneCastState, null, { timeout: 12000 })
} catch (error) {
  const debug = await page.evaluate(() => ({ game: Boolean(window.__game), scenes: window.__game?.scene?.getScenes?.(true)?.map(scene => scene.sys.settings.key) }))
  throw new Error(`prototype startup failed ${JSON.stringify({ debug, errors })}; ${error.message}`)
}
await page.waitForTimeout(500)
const recorderMime = await page.evaluate(() => {
  const mimeType = 'video/mp4;codecs=avc1.42E01E'
  if (!MediaRecorder.isTypeSupported(mimeType)) throw new Error('Browser MediaRecorder has no H.264 MP4 encoder')
  const recorder = new MediaRecorder(document.querySelector('canvas').captureStream(30), { mimeType, videoBitsPerSecond: 4_000_000 })
  const chunks = []
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
  window.__coneQaRecorder = { recorder, chunks, mimeType }
  recorder.start(250)
  return recorder.mimeType
})

const point = async (x, y, action = 'click') => {
  const box = await page.locator('canvas').last().boundingBox()
  const px = box.x + box.width * x / 390
  const py = box.y + box.height * y / 844
  if (action === 'down') { await page.mouse.move(px, py); await page.mouse.down() }
  else if (action === 'up') await page.mouse.up()
  else await page.mouse.click(px, py)
}

await page.screenshot({ path: path.join(output, '01-aim-default.png') })
await point(170, 470, 'down')
await page.mouse.move(292, 272, { steps: 10 })
await point(292, 272, 'up')
const selected = await page.evaluate(() => window.__game.scene.getScene('GameScene')._coneCastPreview)
if (!selected?.valid || Math.abs(selected.angleDeg) < 8) throw new Error(`drag aim did not select a valid side target: ${JSON.stringify(selected)}`)
await page.screenshot({ path: path.join(output, '02-aim-right.png') })

// Isolate the no-hit completion path without altering production state logic.
await page.evaluate(() => { window.__game.scene.getScene('GameScene')._tickFishInterest = () => {} })
await point(320, 666, 'down')
{
  const box = await page.locator('canvas').last().boundingBox()
  await page.mouse.move(box.x + box.width * 324 / 390, box.y + box.height * 794 / 844, { steps: 10 })
}
await page.waitForTimeout(650)
await point(324, 794, 'up')
await page.waitForFunction(() => window.__game.scene.getScene('GameScene')._cameraPanCasting)
await page.waitForTimeout(260)
await page.screenshot({ path: path.join(output, '03-cast-flight.png') })
await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'retrieve', null, { timeout: 5000 })
await page.screenshot({ path: path.join(output, '04-landed.png') })
await page.evaluate(() => window.__game.scene.getScene('GameScene').input.once('pointerdown', pointer => { window.__coneQaPointer = { x: pointer.x, y: pointer.y } }))
await point(314, 762, 'down')
try {
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene').retrieveState?.slowHeld, null, { timeout: 3000 })
} catch (error) {
  const debug = await page.evaluate(() => { const scene = window.__game.scene.getScene('GameScene'); return { phase: scene.phase, pointer: window.__coneQaPointer, nodes: scene._coneCastHudNodes, retrieve: scene.retrieveState } })
  throw new Error(`reel pointer failed ${JSON.stringify(debug)}; ${error.message}`)
}
await page.waitForTimeout(1600)
await page.screenshot({ path: path.join(output, '05-retrieving.png') })
await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'cast', null, { timeout: 16000 })
await point(314, 762, 'up')
await page.screenshot({ path: path.join(output, '06-nohit-recovered.png') })
const downloadPromise = page.waitForEvent('download')
const recording = await page.evaluate(async () => {
  const state = window.__coneQaRecorder
  await new Promise(resolve => { state.recorder.onstop = resolve; state.recorder.stop() })
  const blob = new Blob(state.chunks, { type: state.mimeType })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'cone-cast-retrieve-390x844-h264.mp4'
  a.click()
  return { mimeType: state.mimeType, bytes: blob.size }
})
const download = await downloadPromise
const videoPath = path.resolve('qa-artifacts/cone-loop-v1/cone-cast-retrieve-390x844-h264.mp4')
await download.saveAs(videoPath)

// Hit path: cast once, begin one real retrieve bite, and ensure a duplicate is rejected.
await page.evaluate(() => {
  const scene = window.__game.scene.getScene('GameScene')
  scene._coneCastState.angleDeg = 0
  scene._coneCastState.distancePx = 460
  scene._coneCommitCast()
})
await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'retrieve', null, { timeout: 5000 })
const hitGuard = await page.evaluate(() => {
  const scene = window.__game.scene.getScene('GameScene')
  const runtime = scene.bg._fishRuntime.find(item => item?.gfx?.active)
  scene.retrieveState.decisionCount = 2
  const first = scene._beginRetrieveBite(runtime)
  const second = scene._beginRetrieveBite(runtime)
  return { first, second, committed: scene._coneCastState.hitCommitted, phase: scene.phase }
})
if (!hitGuard.committed || hitGuard.phase !== 'wait' || hitGuard.second !== false) throw new Error(`hit transition guard failed: ${JSON.stringify(hitGuard)}`)
// Keep the walkthrough focused on the base loop; boss cut-ins have a separate
// QA suite and would obscure the cone/cast/retrieve transition in this video.
await page.evaluate(() => {
  const scene = window.__game.scene.getScene('GameScene')
  scene.fish = { ...scene.fish, id: 'aji', name: 'アジ', rarity: 'common' }
})
await page.waitForFunction(() => window.__game.scene.getScene('GameScene').waitTapActive, null, { timeout: 10000 })
await point(195, 420)
await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'battle')
await page.waitForTimeout(1800)
await page.screenshot({ path: path.join(output, '07-hit-battle-clean.png') })

const runtimeState = await page.evaluate(() => {
  const scene = window.__game.scene.getScene('GameScene')
  return { phase: scene.phase, player: { x: scene._cameraPanPlayer.x, y: scene._cameraPanPlayer.y }, expectedPlayer: window.__game.scene.getScene('GameScene').fishingCamera.world.player }
})
if (runtimeState.player.x !== runtimeState.expectedPlayer.x || runtimeState.player.y !== runtimeState.expectedPlayer.y) throw new Error(`player moved into sea: ${JSON.stringify(runtimeState)}`)
await context.close()
await browser.close()
const unexpected = errors.filter(message => !message.includes('ERR_NETWORK_ACCESS_DENIED') && !message.includes('404'))
if (unexpected.length) throw new Error(`browser errors: ${unexpected.join('; ')}`)
const video = await fs.readFile(videoPath)
const binary = video.toString('latin1')
const videoVerification = { ...recording, recorderMime, size: video.length, hasAvc1: binary.includes('avc1'), hasAvcC: binary.includes('avcC') }
if (!videoVerification.hasAvc1 || !videoVerification.hasAvcC || video.length < 10000) throw new Error(`H.264 video verification failed: ${JSON.stringify(videoVerification)}`)
await fs.writeFile(`${videoPath}.verification.json`, `${JSON.stringify(videoVerification, null, 2)}\n`)
console.log(`PASS: cone aim, separated cast, no-hit reel recovery, single hit transition, fixed world player, H.264 capture (${JSON.stringify(selected)})`)
