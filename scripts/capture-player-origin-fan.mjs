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
  // Cover small and large portraits as well as native narrow/wide landscape.
  for (const [width, height] of [[320, 568], [390, 844], [430, 932], [844, 390], [932, 430]]) {
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
        const grip = scene._cameraPanRodGrip
        if (!grip) throw new Error('real character grip unavailable')
        return { x: camera.x + (grip.x - visibleX) * camera.zoom,
          y: camera.y + (grip.y - visibleY) * camera.zoom }
      })
      assert.ok(anchor.x > 50 && anchor.x < width - 60 && anchor.y > 50 && anchor.y < height - 120,
        'Character hand clipped from touchable world: ' + JSON.stringify({ width, height, anchor }))
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
        const hud = scene._coneCastHudNodes
        return {
          phase: scene.phase,
          hud: { x: hud.infoX, y: hud.infoY, width: hud.infoW, height: hud.infoH,
            gaugeX: hud.gaugeX, right: hud.infoX + hud.infoW,
            messageWidth: hud.label.width, modeWidth: hud.mode.width },
          origin, fan, playerGrip: scene._cameraPanRodGrip,
          visualFan: scene._coneCastPreview.visualFanGuides,
          left: { inner: inner[0], outer: outer[0] },
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
      if (width > height) {
        assert.ok(geometry.hud.x >= width * 0.35,
          'landscape action card obstructs player and rod: ' + JSON.stringify(geometry.hud))
        assert.ok(geometry.hud.width >= 184 &&
          geometry.hud.right <= geometry.hud.gaugeX - 12,
          'landscape information panel overlaps action rail: ' + JSON.stringify(geometry.hud))
        assert.ok(geometry.hud.y >= 0 &&
          geometry.hud.y + geometry.hud.height <= height,
          'landscape information panel clipped from viewport')
      } else {
        assert.equal(geometry.hud.x, 16, 'portrait card placement must not change')
      }
      for (const side of ['left', 'center', 'right']) {
        assert.deepEqual(geometry.fan[side].origin, geometry.origin,
          side + ' ray must emanate from player origin')
      }
      assert.deepEqual(geometry.fan.left.waterStart, geometry.left.inner)
      assert.deepEqual(geometry.fan.right.waterEnd, geometry.right.outer)
      assert.ok(geometry.playerGrip && geometry.visualFan, 'animated rod grip and visual cone missing')
      assert.deepEqual(geometry.visualFan.origin, geometry.playerGrip,
        'painted fan must open from the character hand, not detached world input origin')
      assert.ok(Math.hypot(geometry.visualFan.origin.x - geometry.origin.x,
        geometry.visualFan.origin.y - geometry.origin.y) > 8,
        'visual review must distinguish the physical hand from the world cast anchor')
      assert.deepEqual(geometry.visualFan.left.waterStart, geometry.left.inner)
      assert.deepEqual(geometry.visualFan.right.waterEnd, geometry.right.outer)
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
