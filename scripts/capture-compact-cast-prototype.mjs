import assert from 'node:assert/strict'
import { delimiter, join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const bin = process.env.PATH.split(delimiter).find(dir => existsSync(join(dir, 'playwright')) || existsSync(join(dir, 'playwright.cmd')))
assert.ok(bin, 'Playwright executable missing from PATH')
const { chromium } = await import(pathToFileURL(join(bin, '..', 'playwright', 'index.mjs')).href)
const base = process.env.QA_URL ?? 'http://127.0.0.1:4173'
const output = 'artifacts/compact-cast-prototype'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true })

try {
  for (const [width, height] of [[320, 568], [375, 667]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 })
    try {
      await page.goto(`${base}/fishing-game/?qa=1&scene=GameScene&qaMockPhase=cast&compactPortrait=1`)
      await page.waitForFunction(() => window.__game?.scene?.getScene('GameScene')?._castPresentationHost?.root?.active)
      const state = await page.evaluate(() => {
        const game = window.__game
        const scene = game.scene.getScene('GameScene')
        const host = scene._castPresentationHost
        const rect = game.canvas.getBoundingClientRect()
        const hit = host.nodes.castHit
        return {
          canvas: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          scale: host.root.scaleX, dockY: host.nodes.castDock.y,
          button: { x: hit.x, y: hit.y },
          phase: scene.phase,
        }
      })
      assert.equal(state.phase, 'cast')
      assert.ok(Math.abs(state.canvas.width - width) <= 1, 'Cast canvas does not fill portrait width')
      assert.ok(Math.abs(state.scale - width / 390) < 0.01, 'Cast field did not use width scale')
      assert.ok(state.dockY < 0, 'Cast dock did not move into the shorter viewport')
      assert.ok((state.button.y + state.dockY) * state.scale < height - 35, 'Cast button fell below viewport')
      await page.screenshot({ path: `${output}/cast-${width}.png`, animations: 'disabled' })
      const x = state.canvas.x + state.button.x * state.scale
      const y = state.canvas.y + (state.button.y + state.dockY) * state.scale
      await page.mouse.move(x, y)
      await page.mouse.down()
      const charging = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('GameScene')
        return scene.isCharging
      })
      assert.equal(charging, true, 'Cast button did not accept pointer down after dock relocation')
      await page.mouse.up()
      await page.waitForFunction(() => !window.__game.scene.getScene('GameScene').isCharging)
      console.log(`Compact Cast ${width}x${height}: field, dock, pointer passed`)
    } finally { await page.close() }
  }
} finally { await browser.close() }
