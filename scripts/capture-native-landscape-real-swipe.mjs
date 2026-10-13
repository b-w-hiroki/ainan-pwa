import assert from 'node:assert/strict'
import { existsSync, realpathSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

// Use browser-originated pointer events, NOT GameScene._onDown/_onMove/_onUp.
const executable = process.env.PATH.split(':').map(folder => join(folder, 'playwright')).find(existsSync)
assert.ok(executable, 'Playwright executable missing from CI PATH')
const { chromium } = await import(pathToFileURL(join(dirname(realpathSync(executable)), 'index.mjs')).href)
const folder = 'artifacts/orientation'
mkdirSync(folder, { recursive: true })
const pageUrl = 'http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene&cameraPan=1&coneLoop=1&castMotion=charged'
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 })
  try {
    const errors = []
    page.on('pageerror', error => {
      if (error.message !== 'service worker disabled in QA') errors.push(error.message)
    })
    await page.addInitScript(() => {
      localStorage.setItem('ainan_sound_enabled', '0')
      // Worm is the free/default bait by design. Use a stocked, consumable
      // shrimp to ensure this test can detect single vs duplicate spending.
      localStorage.setItem('ainan_inventory', JSON.stringify({
        rods: { basic: 1, carbon: 1, premium: 1 },
        baits: { worm: 12, shrimp: 15, special: 10 },
      }))
      localStorage.setItem('ainan_equipment', JSON.stringify({
        rodType: 'carbon', baitType: 'shrimp',
      }))
    })
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => {
      const game = window.__game?.scene?.getScene('GameScene')
      return game?.sys?.isActive?.() && game.phase === 'cast' && game._coneCastHudNodes && game._cameraPanPlayer
    }, null, { timeout: 20000 })

    const before = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene')
      const camera = scene.cameras.main
      // Keep the player's slingshot anchor inside the viewport for a genuine
      // downward drag; does not change world-space cast rules.
      camera.setScroll(camera.scrollX, Math.max(0, camera.scrollY - 70))
      const origin = {
        x: (scene.anchorX - camera.scrollX) * camera.zoom + camera.x - (camera.zoom - 1) * camera.width / 2,
        y: (scene.anchorY - camera.scrollY) * camera.zoom + camera.y - (camera.zoom - 1) * camera.height / 2,
      }
      const rect = document.querySelector('#game-container canvas')?.getBoundingClientRect()
      window.__ainanRealSwipeProbe = { armed: 0, released: 0 }
      scene.events.on('ainan-pull-cast-armed', () => window.__ainanRealSwipeProbe.armed++)
      scene.events.on('ainan-pull-cast-release-grade', () => window.__ainanRealSwipeProbe.released++)
      const bait = scene.env?.player?.baitType
      return {
        origin, phase: scene.phase, score: scene.totalScore,
        bait, count: scene.env.player.inventory.baits[bait],
        canvas: rect ? { width: rect.width, height: rect.height, x: rect.x, y: rect.y } : null,
      }
    })
    assert.ok(before.canvas?.width > 830 && before.canvas?.height > 380,
      'Landscape must have a native full-width canvas, not scaled portrait letterboxing')
    assert.ok(before.origin.x > 65 && before.origin.x < 740 &&
      before.origin.y > 70 && before.origin.y < 292,
      'Slingshot origin must be reachable on the real canvas: ' + JSON.stringify(before.origin))
    assert.equal(before.bait, 'shrimp', 'Single-consumption QA must use paid shrimp, not free worm')
    assert.ok(before.count > 0, 'QA must begin with usable bait')
    const endpoint = { x: before.origin.x - 25, y: before.origin.y + 73 }
    assert.ok(endpoint.x > 0 && endpoint.y < 386, 'Drag endpoint clipped')

    await page.mouse.move(before.origin.x, before.origin.y)
    await page.mouse.down()
    await page.mouse.move(endpoint.x, endpoint.y, { steps: 14 })
    await page.waitForFunction(() => {
      const state = window.__game?.scene?.getScene('GameScene')?._coneCastState
      return state?.inputMode === 'pull' && state.pullArmedAt != null
    }, null, { timeout: 4500 })
    const aim = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene')
      return {
        phase: scene.phase, inputMode: scene._coneCastState.inputMode,
        armed: window.__ainanRealSwipeProbe.armed,
        previewValid: scene._coneCastPreview?.valid === true,
        pullDistance: Math.hypot(scene._coneCastState.pullDx, scene._coneCastState.pullDy),
      }
    })
    assert.equal(aim.armed, 1, 'One browser pointer should arm exactly one Cast')
    assert.equal(aim.previewValid, true, 'Real swipe must create valid water landing preview')
    assert.ok(aim.pullDistance >= 45, 'Real drag distance did not reach Cast threshold')

    const aimingImage = join(folder, 'real-swipe-844x390-aim.png')
    await page.screenshot({ path: aimingImage, animations: 'disabled' })
    assert.ok(statSync(aimingImage).size > 15000, 'Aiming screenshot missing rendered pixels')
    // Let the real game timer advance before the browser releases the pointer.
    await page.waitForTimeout(700)
    await page.mouse.up()
    await page.waitForFunction(() => {
      const scene = window.__game?.scene?.getScene('GameScene')
      return scene?.phase === 'retrieve' && scene._coneCastState?.lastRelease
    }, null, { timeout: 9000 })
    const after = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene')
      return {
        phase: scene.phase,
        count: scene.env.player.inventory.baits[scene.env.player.baitType],
        released: window.__ainanRealSwipeProbe.released,
        armed: window.__ainanRealSwipeProbe.armed,
        lastRelease: scene._coneCastState.lastRelease,
        scrollY: window.scrollY,
        documentWidth: document.body.scrollWidth,
        viewportWidth: innerWidth,
      }
    })
    assert.equal(after.released, 1, 'Real pointer release must commit exactly one Cast')
    assert.equal(after.armed, 1, 'No duplicate pointer subscriptions')
    assert.equal(after.count, before.count - 1, 'One actual cast must use exactly one bait')
    assert.equal(after.scrollY, 0, 'Swipe must not scroll the page')
    assert.ok(after.documentWidth <= after.viewportWidth + 1, 'Landscape must not horizontally scroll')
    const retrieveImage = join(folder, 'real-swipe-844x390-retrieve.png')
    await page.waitForTimeout(300)
    await page.screenshot({ path: retrieveImage, animations: 'disabled' })
    assert.ok(statSync(retrieveImage).size > 15000, 'Retrieve screenshot missing rendered pixels')
    assert.deepEqual(errors, [], 'Unexpected real-input browser errors')
    console.log('Native landscape browser pointer swipe reached Retrieve:', JSON.stringify({ before, aim, after }))
  } finally {
    await page.close()
  }
} finally {
  await browser.close()
}
