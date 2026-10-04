import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43961/fishing-game/index.html'
const output = path.resolve('qa-artifacts/retrieve-flow-delivery')
await fs.mkdir(output, { recursive: true })

const viewports = [
  { name: '375x667', width: 375, height: 667 },
  { name: '390x844', width: 390, height: 844 },
  { name: '844x390', width: 844, height: 390 },
]
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const errors = []
const checks = []

const attachErrors = page => {
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
}

async function openLegacy(context) {
  const page = await context.newPage()
  attachErrors(page)
  await page.addInitScript(() => {
    localStorage.setItem('ainan_inventory', JSON.stringify({ rods: { basic: 1, carbon: 1, premium: 1 }, baits: { worm: 30, shrimp: 30, special: 30 } }))
    localStorage.setItem('ainan_equipment', JSON.stringify({ rodType: 'carbon', baitType: 'worm' }))
    localStorage.setItem('ainan_stamina', JSON.stringify({ value: 5, updatedAt: Date.now() }))
  })
  await page.goto(`${base}?qa=1&scene=GameScene&cameraPan=1&coneLoop=1`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__game?.scene?.getScene?.('GameScene')?._coneCastHudNodes, null, { timeout: 12000 })
  await page.waitForTimeout(500)
  return page
}

async function clickCanvas(page, x, y, action = 'click') {
  const box = await page.locator('canvas').last().boundingBox()
  if (!box) throw new Error('canvas missing')
  const px = box.x + x
  const py = box.y + y
  if (action === 'down') { await page.mouse.move(px, py); await page.mouse.down() }
  else if (action === 'up') await page.mouse.up()
  else await page.mouse.click(px, py)
}

async function commitCast(page) {
  const committed = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    scene._tickFishInterest = () => {}
    scene.env.player.baitType = 'worm'
    scene._syncTackle()
    scene._coneCastState.angleDeg = 0
    scene._coneCastState.distancePx = 620
    return { accepted: scene._coneCommitCast(), phase: scene.phase, bait: scene._baitRemaining, state: { ...scene._coneCastState } }
  })
  if (!committed.accepted) throw new Error(`cast rejected: ${JSON.stringify(committed)}`)
  try {
    await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'retrieve', null, { timeout: 12000 })
  } catch (error) {
    const debug = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene')
      return { phase: scene.phase, bobber: { visible: scene.bobber?.visible, x: scene.bobber?.x, y: scene.bobber?.y }, casting: scene._cameraPanCasting, state: { ...scene._coneCastState } }
    })
    throw new Error(`retrieve wait failed ${JSON.stringify({ committed, debug })}: ${error.message}`)
  }
}

async function startRecording(page) {
  return page.evaluate(() => {
    const mimeType = 'video/mp4;codecs=avc1.42E01E'
    if (!MediaRecorder.isTypeSupported(mimeType)) throw new Error('H.264 MP4 unavailable')
    const recorder = new MediaRecorder(document.querySelector('canvas').captureStream(30), { mimeType, videoBitsPerSecond: 4_000_000 })
    const chunks = []
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
    window.__retrieveFlowRecorder = { recorder, chunks, mimeType }
    recorder.start(250)
    return recorder.mimeType
  })
}

async function stopRecording(page, filename) {
  const downloadPromise = page.waitForEvent('download')
  const recording = await page.evaluate(async name => {
    const state = window.__retrieveFlowRecorder
    await new Promise(resolve => { state.recorder.onstop = resolve; state.recorder.stop() })
    const blob = new Blob(state.chunks, { type: state.mimeType })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    return { mimeType: state.mimeType, bytes: blob.size }
  }, filename)
  const download = await downloadPromise
  const target = path.join(output, filename)
  await download.saveAs(target)
  const bytes = await fs.readFile(target)
  const binary = bytes.toString('latin1')
  if (!binary.includes('avc1') || !binary.includes('avcC') || bytes.length < 10000) throw new Error(`invalid H.264: ${JSON.stringify(recording)}`)
  return { ...recording, size: bytes.length, hasAvc1: true, hasAvcC: true }
}

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport })
  const page = await openLegacy(context)
  await commitCast(page)
  const recorderMime = viewport.name === '390x844' ? await startRecording(page) : null
  await page.waitForTimeout(320)

  const landed = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    return {
      phase: scene.phase,
      topDistance: scene._cameraPanHudNodes.distance.text,
      action: scene._coneCastHudNodes.label.text,
      detail: scene._coneCastHudNodes.mode.text,
      playerOnscreen: scene._cameraPanPlayer.getBounds().bottom > scene.cameras.main.worldView.top,
    }
  })
  if (landed.phase !== 'retrieve' || landed.topDistance !== '' || !landed.action.includes('押して') || !landed.detail.includes('残り')) {
    throw new Error(`${viewport.name} landed guidance mismatch: ${JSON.stringify(landed)}`)
  }
  await page.screenshot({ path: path.join(output, `${viewport.name}-01-landed.png`) })

  const reelButton = await page.evaluate(() => {
    const n = window.__game.scene.getScene('GameScene')._coneCastHudNodes
    return { x: n.buttonX, y: n.reelY }
  })
  await clickCanvas(page, reelButton.x, reelButton.y, 'down')
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene').retrieveState?.slowHeld)
  const beforeDistance = await page.evaluate(() => {
    const s = window.__game.scene.getScene('GameScene')
    return Math.hypot(s.bobber.x - s.anchorX, s.bobber.y - s.anchorY)
  })
  await page.waitForTimeout(520)
  const reeling = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    const n = scene._coneCastHudNodes
    return {
      held: scene.retrieveState?.slowHeld,
      action: n.label.text,
      detail: n.mode.text,
      ringVisible: n.reelMotion.visible,
      distance: Math.hypot(scene.bobber.x - scene.anchorX, scene.bobber.y - scene.anchorY),
    }
  })
  if (!reeling.held || !reeling.action.includes('巻いてる') || !reeling.detail.includes('縮んで') || !reeling.ringVisible || reeling.distance >= beforeDistance) {
    throw new Error(`${viewport.name} reel feedback mismatch: ${JSON.stringify({ beforeDistance, reeling })}`)
  }
  await page.screenshot({ path: path.join(output, `${viewport.name}-02-reeling.png`) })
  await clickCanvas(page, reelButton.x, reelButton.y, 'up')

  await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    const runtime = scene.bg._fishRuntime.find(item => item?.gfx?.active)
    scene.retrieveState.decisionCount = 2
    scene._beginRetrieveBite(runtime)
    scene.fish = { ...scene.fish, id: 'aji', name: 'アジ', rarity: 'common' }
  })
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'wait')
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene').waitTapActive, null, { timeout: 10000 })
  const hit = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    const n = scene._coneCastHudNodes
    return { visible: n.hitTitle.visible, title: n.hitTitle.text, infoVisible: n.infoChrome.visible, reelVisible: n.reelChrome.visible }
  })
  if (!hit.visible || !hit.title.includes('チャンス') || hit.infoVisible || hit.reelVisible) throw new Error(`${viewport.name} hit handoff mismatch: ${JSON.stringify(hit)}`)
  await page.screenshot({ path: path.join(output, `${viewport.name}-03-hit.png`) })
  await clickCanvas(page, viewport.width / 2, viewport.height / 2)
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'battle')
  await page.evaluate(() => window.__game.scene.getScene('GameScene')._finishBattle('caught'))
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'result')
  await page.waitForTimeout(450)
  await page.screenshot({ path: path.join(output, `${viewport.name}-04-success.png`) })

  if (viewport.name === '390x844') {
    const verification = await stopRecording(page, 'ainan-retrieve-flow-390x844-h264.mp4')
    checks.push({ viewport: viewport.name, recorderMime, video: verification })
  }
  await page.close()
  await context.close()

  const noHitContext = await browser.newContext({ viewport })
  const noHit = await openLegacy(noHitContext)
  await noHit.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    scene._tickFishInterest = () => {}
    scene.bobber.setPosition(scene.anchorX, scene.anchorY - 100).setVisible(true)
    scene._enterRetrieve(scene.bobber.x, scene.bobber.y)
    scene.bobber.setPosition(scene.anchorX, scene.anchorY - 34)
  })
  await noHit.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'cast', null, { timeout: 4000 })
  const recovered = await noHit.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    return { phase: scene.phase, detail: scene._coneCastHudNodes.mode.text, now: scene.time.now, returnNoticeUntil: scene._coneCastState.returnNoticeUntil }
  })
  if (recovered.phase !== 'cast' || !recovered.detail.includes('もう一投')) throw new Error(`${viewport.name} no-hit recovery mismatch: ${JSON.stringify(recovered)}`)
  await noHit.screenshot({ path: path.join(output, `${viewport.name}-05-no-hit-retry.png`) })

  const cancelState = await noHit.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    const pointer = { id: 77, x: scene.scale.width / 2, y: scene.scale.height / 2 }
    scene._coneCastState.inputMode = 'pull'
    scene._coneCastState.pullPointerId = 77
    scene._coneCastState.pullStartX = pointer.x
    scene._coneCastState.pullStartY = pointer.y
    scene._coneCastState.pullDx = 12
    scene._coneCastState.pullDy = 12
    scene._coneNativePointerCancel()
    return { phase: scene.phase, inputMode: scene._coneCastState.inputMode, pointerId: scene._coneCastState.pullPointerId }
  })
  if (cancelState.phase !== 'cast' || cancelState.inputMode !== 'aim' || cancelState.pointerId != null) throw new Error(`${viewport.name} cancel recovery mismatch: ${JSON.stringify(cancelState)}`)
  await noHit.close()
  await noHitContext.close()
  checks.push({ viewport: viewport.name, landed, reeling, hit, recovered, cancelState })
}

for (const outcome of ['escaped', 'caught']) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  attachErrors(page)
  await page.goto(`${base}?qa=1&scene=GameScene&qaAction=battle&qaFish=tai`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__game?.scene?.getScene?.('GameScene')?.phase === 'battle', null, { timeout: 12000 })
  await page.waitForTimeout(900)
  await page.evaluate(value => window.__game.scene.getScene('GameScene')._finishBattle(value), outcome)
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'result')
  await page.waitForFunction(() => {
    const nodes = window.__game.scene.getScene('GameScene')._castPresentationHost?.nodes
    return nodes?.resultForeground?.visible && nodes?.resultField?.visible && !nodes?.battleField?.visible
  })
  await page.waitForTimeout(1800)
  const result = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    const n = scene._castPresentationHost.nodes
    return { primary: n.resultTownMaskText.text, retry: n.resultRetryText.text, outcome: scene._castPresentationOutcome }
  })
  if (outcome === 'escaped' && !result.primary.includes('再挑戦')) throw new Error(`escaped retry CTA unclear: ${JSON.stringify(result)}`)
  if (outcome === 'caught' && !result.retry.includes('もう一度')) throw new Error(`caught retry CTA unclear: ${JSON.stringify(result)}`)
  await page.screenshot({ path: path.join(output, `390x844-06-${outcome}.png`) })
  await clickCanvas(page, 195, outcome === 'caught' ? 746 : 655)
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'cast', null, { timeout: 5000 })
  const retry = await page.evaluate(() => ({ phase: window.__game.scene.getScene('GameScene').phase, inputMode: window.__game.scene.getScene('GameScene')._coneCastState?.inputMode ?? 'host' }))
  checks.push({ result, retry })
  await context.close()
}

await browser.close()
const unexpected = errors.filter(message => !message.includes('ERR_NETWORK_ACCESS_DENIED') && !message.includes('404'))
if (unexpected.length) throw new Error(`browser errors: ${unexpected.join('; ')}`)
await fs.writeFile(path.join(output, 'metrics.json'), `${JSON.stringify({ checks }, null, 2)}\n`)
console.log('PASS: 3 viewports landed/reel/hit/success/no-hit/cancel, escaped/caught retry CTAs, H.264')
