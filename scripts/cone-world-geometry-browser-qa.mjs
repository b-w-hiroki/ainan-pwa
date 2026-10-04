import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43941/fishing-game/index.html'
const output = path.resolve('qa-artifacts/cone-world-geometry')
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })

const seed = rod => {
  localStorage.setItem('ainan_sound_enabled', '0')
  localStorage.setItem('ainan_score', '25000')
  localStorage.setItem('ainan_inventory', JSON.stringify({ rods: { basic: 1, carbon: 1, premium: 1 }, baits: { worm: 30, shrimp: 30, special: 30 } }))
  localStorage.setItem('ainan_equipment', JSON.stringify({ rodType: rod, baitType: 'shrimp' }))
  window.__ainanDailyBonusDismissed = true
}

async function runCase(viewport, rod, edge) {
  console.log(`RUN ${viewport.width}x${viewport.height} ${rod} ${edge}`)
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(seed, rod)
  await page.goto(`${base}?qa=1&scene=GameScene&cameraPan=1&coneLoop=1&castMotion=charged`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__game?.scene?.getScene?.('GameScene')?._coneCastHudNodes, null, { timeout: 12000 })
  await page.waitForTimeout(450)
  const useZoom = false
  await page.evaluate(useZoom => {
    const scene = window.__game.scene.getScene('GameScene')
    scene._tickFishInterest = () => {}
    const state = scene._coneCastState
    state.inputMode = 'pull'
    state.pullPointerId = 1
    state.pullStartX = scene.anchorX
    state.pullStartY = scene.anchorY
    state.pullPointerX = scene.anchorX - 32
    state.pullPointerY = scene.anchorY + 90
    state.pullDx = -32
    state.pullDy = 90
    state.pullProgress = 1
    state.pullArmedAt = scene.time.now - 650
    state.distancePx = scene.castRangePx
    state.angleDeg = 0
  }, useZoom)
  try {
    await page.waitForFunction(() => window.__game.scene.getScene('GameScene')._coneCastPreview?.rangeGeometry?.samples?.length > 2, null, { timeout: 3000 })
  } catch (error) {
    const debug = await page.evaluate(() => { const scene = window.__game.scene.getScene('GameScene'); return { phase: scene.phase, state: { ...scene._coneCastState }, preview: scene._coneCastPreview } })
    throw new Error(`pull preview disappeared ${JSON.stringify({ viewport, rod, edge, debug })}; ${error.message}`)
  }
  const selected = await page.evaluate(edge => {
    const scene = window.__game.scene.getScene('GameScene')
    const samples = scene._coneCastPreview.rangeGeometry.samples
    const sample = edge === 'left' ? samples[0] : edge === 'right' ? samples.at(-1) : samples.reduce((best, item) => Math.abs(item.angleDeg) < Math.abs(best.angleDeg) ? item : best)
    scene._coneCastState.angleDeg = sample.angleDeg
    scene._coneCastState.distancePx = sample.outerDistance
    return { angleDeg: sample.angleDeg, distancePx: sample.outerDistance }
  }, edge)
  await page.waitForFunction(selected => {
    const preview = window.__game.scene.getScene('GameScene')._coneCastPreview
    return preview && Math.abs(preview.angleDeg - selected.angleDeg) < 0.01 && Math.abs(preview.distancePx - selected.distancePx) < 0.1
  }, selected)
  const gesture = await page.evaluate(selected => {
    const scene = window.__game.scene.getScene('GameScene')
    const camera = scene.cameras.main
    const worldViewX = camera.scrollX + camera.width / 2 - camera.width / (2 * camera.zoom)
    const worldViewY = camera.scrollY + camera.height / 2 - camera.height / (2 * camera.zoom)
    const origin = { x: camera.x + (scene.anchorX - worldViewX) * camera.zoom, y: camera.y + (scene.anchorY - worldViewY) * camera.zoom }
    const progress = Math.max(0, Math.min(1, (selected.distancePx - 180) / (780 - 180)))
    const distance = Math.max(66, progress * 112)
    const angle = selected.angleDeg * Math.PI / 180
    const end = { x: origin.x - Math.sin(angle) * distance, y: origin.y + Math.cos(angle) * distance }
    const state = scene._coneCastState
    Object.assign(state, { inputMode: 'aim', pullPointerId: null, pullArmedAt: null, pullCharge: 0, pullDx: 0, pullDy: 0, pullProgress: 0 })
    scene._onDown({ id: 1, x: origin.x, y: origin.y })
    scene._onMove({ id: 1, x: end.x, y: end.y })
    return { origin, end }
  }, selected)
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene')._coneCastState.pullArmedAt != null)
  if (useZoom) await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    scene.cameras.main.setZoom(1.12)
    scene.fishingCamera?.focusPlayer(true)
  })
  await page.waitForFunction(() => {
    const scene = window.__game.scene.getScene('GameScene')
    return scene.time.now - scene._coneCastState.pullArmedAt >= 650
  })
  try {
    await page.waitForFunction(() => window.__game.scene.getScene('GameScene')._coneCastPreview?.rangeGeometry?.samples?.length > 2, null, { timeout: 3000 })
  } catch (error) {
    const debug = await page.evaluate(() => { const scene = window.__game.scene.getScene('GameScene'); return { phase: scene.phase, state: { ...scene._coneCastState }, preview: scene._coneCastPreview } })
    throw new Error(`gesture preview disappeared ${JSON.stringify({ viewport, rod, edge, debug })}; ${error.message}`)
  }
  const before = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    const preview = scene._coneCastPreview
    const camera = scene.cameras.main
    const worldViewX = camera.scrollX + camera.width / 2 - camera.width / (2 * camera.zoom)
    const worldViewY = camera.scrollY + camera.height / 2 - camera.height / (2 * camera.zoom)
    const screen = point => ({ x: camera.x + (point.x - worldViewX) * camera.zoom, y: camera.y + (point.y - worldViewY) * camera.zoom })
    const projected = screen(preview)
    const roundTrip = camera.getWorldPoint(projected.x, projected.y)
    const pointInPolygon = (point, polygon) => {
      let inside = false
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i], b = polygon[j]
        if (((a.y > point.y) !== (b.y > point.y)) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
      }
      return inside
    }
    const bounds = scene.fishingCamera.world.waterBounds
    const land = scene.fishingCamera.world.castLandPolygons
    const rangePoints = [...preview.rangeGeometry.inner, ...preview.rangeGeometry.outer]
    const invalidRangePoints = rangePoints.filter(point => point.x < bounds.minX - 0.1 || point.x > bounds.maxX + 0.1 || point.y < bounds.minY - 0.1 || point.y > bounds.maxY + 0.1 || land.some(polygon => pointInPolygon(point, polygon)))
    return {
      preview: { x: preview.x, y: preview.y, valid: preview.valid, power: preview.power },
      origin: preview.origin,
      rodTip: preview.rodTip,
      rodTipOffset: preview.rodTip ? Math.hypot(preview.origin.x - preview.rodTip.x, preview.origin.y - preview.rodTip.y) : null,
      zoom: camera.zoom,
      scroll: { x: camera.scrollX, y: camera.scrollY },
      projected,
      transformError: Math.hypot(roundTrip.x - preview.x, roundTrip.y - preview.y),
      invalidRangePoints: invalidRangePoints.length,
      bait: scene.env.player.inventory.baits.shrimp,
      rangePx: scene.castRangePx,
    }
  })
  if (!before.preview.valid || before.invalidRangePoints || before.transformError > 1) throw new Error(`invalid preview geometry ${JSON.stringify({ viewport, rod, edge, before })}`)
  if (edge === 'center') await page.screenshot({ path: path.join(output, `${viewport.width}x${viewport.height}-${rod}-aim.png`) })
  await page.evaluate(end => {
    const scene = window.__game.scene.getScene('GameScene')
    scene._coneCastState.pullArmedAt = scene.time.now - 650
    scene._onUp({ id: 1, x: end.x, y: end.y })
  }, gesture.end)
  try {
    await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'retrieve', null, { timeout: 7000 })
  } catch (error) {
    const debug = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene')
      return { phase: scene.phase, casting: scene._cameraPanCasting, bobber: { x: scene.bobber.x, y: scene.bobber.y, visible: scene.bobber.visible }, timeline: scene._pullCastTimeline, lastRelease: scene._coneCastState.lastRelease, equipment: { rod: scene.env.player.rodType, bait: scene.env.player.baitType }, inventory: scene.env.player.inventory }
    })
    throw new Error(`retrieve timeout ${JSON.stringify({ viewport, rod, edge, debug, errors })}; ${error.message}`)
  }
  const after = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    return {
      phase: scene.phase,
      landing: { x: scene.bobber.x, y: scene.bobber.y },
      bait: scene.env.player.inventory.baits.shrimp,
      rating: scene._coneCastState.lastRelease?.rating,
      camera: { zoom: scene.cameras.main.zoom, scrollX: scene.cameras.main.scrollX, scrollY: scene.cameras.main.scrollY },
    }
  })
  const landingError = Math.hypot(after.landing.x - before.preview.x, after.landing.y - before.preview.y)
  if (landingError > 0.75 || after.rating !== 'good' || after.phase !== 'retrieve' || after.bait !== before.bait - 1) throw new Error(`landing mismatch ${JSON.stringify({ viewport, rod, edge, before, after, landingError })}`)
  if (errors.length) throw new Error(`${viewport.width}x${viewport.height}-${rod}-${edge}: ${errors.join(' | ')}`)
  await context.close()
  return { viewport, rod, edge, selected, before, after, landingError }
}

async function runZoomGeometryCase(viewport) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  await page.addInitScript(seed, 'carbon')
  await page.goto(`${base}?qa=1&scene=GameScene&cameraPan=1&coneLoop=1&castMotion=charged`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__game?.scene?.getScene?.('GameScene')?._coneCastHudNodes, null, { timeout: 12000 })
  await page.waitForTimeout(450)
  await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    const state = scene._coneCastState
    Object.assign(state, { inputMode: 'pull', pullPointerId: 9, pullStartX: 180, pullStartY: 300, pullPointerX: 148, pullPointerY: 390, pullDx: -32, pullDy: 90, pullProgress: 1, pullArmedAt: scene.time.now - 650, distancePx: 780, angleDeg: 0 })
  })
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene')._coneCastPreview?.rangeGeometry?.samples?.length > 2)
  const before = await page.evaluate(() => {
    const preview = window.__game.scene.getScene('GameScene')._coneCastPreview
    return { origin: preview.origin, outer: preview.rangeGeometry.outer }
  })
  await page.evaluate(() => {
    const camera = window.__game.scene.getScene('GameScene').cameras.main
    camera.setZoom(1.12)
    camera.setScroll(camera.scrollX + 14, camera.scrollY - 18)
  })
  await page.waitForTimeout(120)
  const after = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    const preview = scene._coneCastPreview
    const camera = scene.cameras.main
    const worldViewX = camera.scrollX + camera.width / 2 - camera.width / (2 * camera.zoom)
    const worldViewY = camera.scrollY + camera.height / 2 - camera.height / (2 * camera.zoom)
    const projected = { x: camera.x + (preview.x - worldViewX) * camera.zoom, y: camera.y + (preview.y - worldViewY) * camera.zoom }
    const roundTrip = camera.getWorldPoint(projected.x, projected.y)
    return { origin: preview.origin, outer: preview.rangeGeometry.outer, zoom: camera.zoom, scroll: { x: camera.scrollX, y: camera.scrollY }, transformError: Math.hypot(roundTrip.x - preview.x, roundTrip.y - preview.y) }
  })
  const worldDelta = Math.max(
    Math.hypot(before.origin.x - after.origin.x, before.origin.y - after.origin.y),
    ...before.outer.map((point, index) => Math.hypot(point.x - after.outer[index].x, point.y - after.outer[index].y)),
  )
  if (worldDelta > 0.01 || after.transformError > 1 || after.zoom !== 1.12) throw new Error(`zoom geometry drift ${JSON.stringify({ viewport, worldDelta, after })}`)
  await context.close()
  return { viewport, worldDelta, transformError: after.transformError, zoom: after.zoom, scroll: after.scroll }
}

const cases = []
const viewports = [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 844, height: 390 }].filter(viewport => !process.env.QA_VIEWPORT || `${viewport.width}x${viewport.height}` === process.env.QA_VIEWPORT)
const rods = ['basic', 'carbon', 'premium'].filter(rod => !process.env.QA_ROD || rod === process.env.QA_ROD)
const edges = ['left', 'center', 'right'].filter(edge => !process.env.QA_EDGE || edge === process.env.QA_EDGE)
for (const viewport of viewports) {
  for (const rod of rods) {
    for (const edge of edges) cases.push(await runCase(viewport, rod, edge))
  }
}
const maxLandingError = Math.max(...cases.map(item => item.landingError))
const maxTransformError = Math.max(...cases.map(item => item.before.transformError))
const zoomCases = []
for (const viewport of viewports) zoomCases.push(await runZoomGeometryCase(viewport))
await fs.writeFile(path.join(output, 'metrics.json'), `${JSON.stringify({ cases, zoomCases, maxLandingError, maxTransformError }, null, 2)}\n`)
await browser.close()
console.log(`PASS: ${cases.length} world-geometry casts, ${zoomCases.length} zoom checks, water-only fan, max landing error ${maxLandingError.toFixed(3)}px`)
