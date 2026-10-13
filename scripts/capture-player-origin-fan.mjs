import assert from 'node:assert/strict'
import { existsSync, mkdirSync, realpathSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const executable = process.env.PATH.split(':').map(folder => join(folder, 'playwright')).find(existsSync)
assert.ok(executable, 'CI Playwright executable unavailable')
const { chromium } = await import(pathToFileURL(join(dirname(realpathSync(executable)), 'index.mjs')).href)
const folder = 'artifacts/orientation'
mkdirSync(folder, { recursive: true })
const baseUrl = 'http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene&cameraPan=1&coneLoop=1&castMotion=charged'
const browser = await chromium.launch({ headless: true })
try {
  for (const [width, height] of [[390, 844], [844, 390]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => { if (error.message !== 'service worker disabled in QA') errors.push(error.message) })
    try {
      await page.addInitScript(() => {
        localStorage.setItem('ainan_sound_enabled', '0')
        localStorage.setItem('ainan_inventory', JSON.stringify({
          rods: { basic: 1, carbon: 1, premium: 1 },
          baits: { worm: 20, shrimp: 20, special: 12 },
        }))
        localStorage.setItem('ainan_equipment', JSON.stringify({ rodType: 'carbon', baitType: 'shrimp' }))
      })
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const scene = window.__game?.scene?.getScene?.('GameScene')
        return scene?.sys?.isActive?.() && scene.phase === 'cast' && scene._coneCastHudNodes
      }, null, { timeout: 15000 })
      const anchor = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('GameScene')
        const camera = scene.cameras.main
        // Same world-to-browser mapping as Phaser's getWorldPoint inverse.
        const visibleX = camera.scrollX + camera.width / 2 - camera.width / (2 * camera.zoom)
        const visibleY = camera.scrollY + camera.height / 2 - camera.height / (2 * camera.zoom)
        return { x: camera.x + (scene.anchorX - visibleX) * camera.zoom,
          y: camera.y + (scene.anchorY - visibleY) * camera.zoom }
      })
      assert.ok(anchor.x > 50 && anchor.x < width - 60 && anchor.y > 50 && anchor.y < height - 120,
        'Slingshot origin clipped from touchable world: ' + JSON.stringify({ width, height, anchor }))
      const endpoint = { x: anchor.x - 25, y: anchor.y + 73 }
      assert.ok(endpoint.x > 0 && endpoint.y < height - 4, 'real swipe endpoint outside canvas')
      await page.mouse.move(anchor.x, anchor.y)
      await page.mouse.down()
      await page.mouse.move(endpoint.x, endpoint.y, { steps: 14 })
      await page.waitForFunction(() => {
        const scene = window.__game?.scene?.getScene?.('GameScene')
        return scene?._coneCastState?.inputMode === 'pull'
          && scene?._coneCastState?.pullArmedAt != null
          && scene?._coneCastPreview?.rangeGeometry?.playerFanGuides
      }, null, { timeout: 5000 })
      const geometry = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('GameScene')
        const fan = scene._coneCastPreview.rangeGeometry.playerFanGuides
        const { origin, inner, outer } = scene._coneCastPreview.rangeGeometry
        const water = scene.fishingCamera.world.waterBounds
        const withinWater = point => point.x >= water.minX && point.x <= water.maxX
          && point.y >= water.minY && point.y <= water.maxY
        return {
          phase: scene.phase,
          origin, fan, left: { inner: inner[0], outer: outer[0] },
          right: { inner: inner.at(-1), outer: outer.at(-1) },
          valid: scene._coneCastPreview.valid,
          sidesValid: [fan.left, fan.center, fan.right].every(s => withinWater(s.waterStart) && withinWater(s.waterEnd)),
          touchCount: scene._coneCastState.pullPointerId != null ? 1 : 0,
        }
      })
      assert.equal(geometry.phase, 'cast')
      assert.equal(geometry.valid, true)
      assert.equal(geometry.sidesValid, true)
      assert.equal(geometry.touchCount, 1)
      for (const side of ['left', 'center', 'right']) {
        assert.deepEqual(geometry.fan[side].origin, geometry.origin,
          side + ' ray must emanate from player origin')
      }
      assert.deepEqual(geometry.fan.left.waterStart, geometry.left.inner)
      assert.deepEqual(geometry.fan.right.waterEnd, geometry.right.outer)
      const image = join(folder, `player-anchored-fan-${width}x${height}.png`)
      let captured = false
      for (let attempt = 0; attempt < 4; attempt++) {
        await page.screenshot({ path: image, animations: 'disabled' })
        if (statSync(image).size > 15000) { captured = true; break }
        await page.waitForTimeout(160)
      }
      assert.ok(captured, 'blank real Cast fan screenshot rejected')
      await page.mouse.up()
      assert.deepEqual(errors, [])
      console.log('Player-anchored fan and real pointer screenshot PASS', JSON.stringify({ width, height, origin: geometry.origin, rays: [geometry.fan.left.angleDeg, geometry.fan.center.angleDeg, geometry.fan.right.angleDeg] }))
    } finally { await context.close() }
  }
} finally { await browser.close() }
