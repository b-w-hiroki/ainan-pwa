import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43581/fishing-game/index.html'
const root = path.resolve('qa-artifacts/cone-loop-v1')
const url = `${base}?qa=1&scene=GameScene&cameraPan=1&coneLoop=1`
await fs.mkdir(root, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const failures = []

async function open(viewport, id, reduced = false) {
  const context = await browser.newContext({ viewport, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  const page = await context.newPage()
  page.on('pageerror', error => failures.push(`${id}: ${error.message}`))
  page.on('console', message => { if (message.type() === 'error') failures.push(`${id}: ${message.text()}`) })
  await page.addInitScript(value => {
    localStorage.setItem('ainan_sound_enabled', '0')
    localStorage.setItem('ainan_reduced_motion', value ? '1' : '0')
    localStorage.setItem('ainan_inventory', JSON.stringify({ rods: { basic: 1, carbon: 1 }, baits: { worm: 30, shrimp: 8, special: 3 } }))
  }, reduced)
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__game?.scene?.getScene?.('GameScene')?._coneCastPreview, null, { timeout: 12000 })
  await page.waitForTimeout(350)
  return { context, page }
}

async function snapshot(page, id) {
  const folder = path.join(root, id)
  await fs.mkdir(folder, { recursive: true })
  await page.screenshot({ path: path.join(folder, 'aim.png') })
  return page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    const n = scene._coneCastHudNodes
    return {
      phase: scene.phase, preview: scene._coneCastPreview,
      button: { x: n.buttonX, y: n.buttonY, r: n.radius },
      size: { width: scene.scale.width, height: scene.scale.height },
      overlayVisible: scene._coneCastOverlay.visible,
    }
  })
}

// Keyboard aim/cast/reel, held input, duplicate cast, and bait-shortage recovery.
const primary = await open({ width: 390, height: 844 }, 'keyboard')
const { page } = primary
await page.evaluate(() => {
  const scene = window.__game.scene.getScene('GameScene')
  scene._tickFishInterest = () => {}
  scene.env.player.baitType = 'shrimp'
  scene.env.player.inventory.baits.shrimp = 5
})
const initialAim = await page.evaluate(() => ({ ...window.__game.scene.getScene('GameScene')._coneCastState }))
await page.keyboard.press('ArrowRight')
await page.keyboard.press('ArrowRight')
await page.keyboard.press('ArrowUp')
const aimed = await page.evaluate(() => ({ ...window.__game.scene.getScene('GameScene')._coneCastState }))
if (aimed.angleDeg <= initialAim.angleDeg || aimed.angleDeg > 52 || aimed.distancePx <= initialAim.distancePx) throw new Error(`keyboard aim failed: ${JSON.stringify({ initialAim, aimed })}`)
const beforeBait = await page.evaluate(() => window.__game.scene.getScene('GameScene').env.player.inventory.baits.shrimp)
await page.keyboard.press('Enter')
await page.keyboard.press('Enter')
await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'retrieve', null, { timeout: 6000 })
const afterBait = await page.evaluate(() => window.__game.scene.getScene('GameScene').env.player.inventory.baits.shrimp)
if (beforeBait - afterBait !== 1) throw new Error(`double cast consumed ${beforeBait - afterBait} bait`)
const beforeReel = await page.evaluate(() => { const s = window.__game.scene.getScene('GameScene'); return Math.hypot(s.bobber.x - s.anchorX, s.bobber.y - s.anchorY) })
await page.keyboard.down('KeyR')
await page.waitForTimeout(900)
await page.keyboard.up('KeyR')
const afterReel = await page.evaluate(() => { const s = window.__game.scene.getScene('GameScene'); return Math.hypot(s.bobber.x - s.anchorX, s.bobber.y - s.anchorY) })
if (!(afterReel < beforeReel - 12)) throw new Error(`keyboard reel did not move lure: ${beforeReel} -> ${afterReel}`)
const shortage = await page.evaluate(() => {
  const scene = window.__game.scene.getScene('GameScene')
  scene._enterCast()
  scene.env.player.baitType = 'shrimp'
  scene.env.player.inventory.baits.shrimp = 0
  const inventoryBefore = JSON.stringify(scene.env.player.inventory)
  const result = scene._coneCommitCast()
  return { result, inventoryBefore, inventoryAfter: JSON.stringify(scene.env.player.inventory), cameraLocked: scene._cameraPanCasting, castLocked: scene._coneCastState.castLocked, bobber: scene.bobber.visible, phase: scene.phase }
})
if (shortage.result !== false || shortage.inventoryBefore !== shortage.inventoryAfter || shortage.cameraLocked || shortage.bobber || shortage.phase !== 'cast') throw new Error(`bait-shortage recovery failed: ${JSON.stringify(shortage)}`)

// Pointer extremes are clamped to the authored cone/range and never auto-cast.
const canvas = page.locator('canvas').last()
const box = await canvas.boundingBox()
await page.mouse.move(box.x + 4, box.y + 80)
await page.mouse.down()
await page.mouse.move(box.x - 600, box.y - 600, { steps: 4 })
await page.mouse.up()
const leftEdge = await page.evaluate(() => ({ state: { ...window.__game.scene.getScene('GameScene')._coneCastState }, phase: window.__game.scene.getScene('GameScene').phase }))
if (leftEdge.state.angleDeg < -52 || leftEdge.state.distancePx > 780 || leftEdge.phase !== 'cast') throw new Error(`left/out-of-range clamp failed: ${JSON.stringify(leftEdge)}`)
await page.mouse.move(box.x + box.width - 4, box.y + 80)
await page.mouse.down()
await page.mouse.move(box.x + box.width + 600, box.y - 600, { steps: 4 })
await page.mouse.up()
const rightEdge = await page.evaluate(() => ({ state: { ...window.__game.scene.getScene('GameScene')._coneCastState }, phase: window.__game.scene.getScene('GameScene').phase }))
if (rightEdge.state.angleDeg > 52 || rightEdge.state.distancePx > 780 || rightEdge.phase !== 'cast') throw new Error(`right/out-of-range clamp failed: ${JSON.stringify(rightEdge)}`)
await primary.context.close()

const viewports = [
  ['375x667', { width: 375, height: 667 }, false],
  ['844x390', { width: 844, height: 390 }, false],
  ['390x844-reduced', { width: 390, height: 844 }, true],
]
const layouts = {}
for (const [id, viewport, reduced] of viewports) {
  const run = await open(viewport, id, reduced)
  layouts[id] = await snapshot(run.page, id)
  const { button, size, preview } = layouts[id]
  if (!preview.valid || button.x + button.r > size.width + 1 || button.y + button.r > size.height + 1 || !layouts[id].overlayVisible) throw new Error(`${id} layout failed: ${JSON.stringify(layouts[id])}`)
  await run.context.close()
}

// Live portrait -> landscape -> portrait resize keeps controls inside the viewport.
const rotation = await open({ width: 390, height: 844 }, 'rotation')
await rotation.page.setViewportSize({ width: 844, height: 390 })
await rotation.page.waitForTimeout(300)
const landscape = await snapshot(rotation.page, 'rotation-landscape')
await rotation.page.setViewportSize({ width: 375, height: 667 })
await rotation.page.waitForTimeout(300)
const portrait = await snapshot(rotation.page, 'rotation-portrait')
for (const [id, state] of [['rotation-landscape', landscape], ['rotation-portrait', portrait]]) {
  if (state.button.x + state.button.r > state.size.width + 1 || state.button.y + state.button.r > state.size.height + 1) throw new Error(`${id} button clipped: ${JSON.stringify(state)}`)
}
await rotation.context.close()

// Back remains available from the prototype aim state.
const back = await open({ width: 390, height: 844 }, 'back')
await back.page.mouse.click(42, 42)
await back.page.waitForFunction(() => window.__game.scene.getScene('MapScene')?.sys?.isActive?.(), null, { timeout: 4000 })
await back.context.close()

const unexpected = failures.filter(message => !message.includes('ERR_NETWORK_ACCESS_DENIED') && !message.includes('404'))
if (unexpected.length) throw new Error(`browser errors: ${unexpected.join('; ')}`)
await fs.writeFile(path.join(root, 'matrix-report.json'), `${JSON.stringify({ initialAim, aimed, beforeBait, afterBait, beforeReel, afterReel, shortage, leftEdge, rightEdge, layouts, landscape, portrait }, null, 2)}\n`)
await browser.close()
console.log('PASS: keyboard, cone endpoints/range clamp, double input, shortage/equipment preservation, 3 viewports, rotation, reduced motion, back')
