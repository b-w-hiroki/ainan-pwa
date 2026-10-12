import assert from 'node:assert/strict'
import { existsSync, realpathSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const executable = process.env.PATH.split(':').map(folder => join(folder, 'playwright')).find(existsSync)
assert.ok(executable, 'Playwright executable missing from CI PATH')
const { chromium } = await import(pathToFileURL(join(dirname(realpathSync(executable)), 'index.mjs')).href)
mkdirSync('artifacts/e2e', { recursive: true })
const cases = [
  ['aji', 'fish_aji_icon', '71-town-aji-arrival.png'],
  ['kanpachi', 'fish_kanpachi_icon', '72-town-kanpachi-arrival.png'],
]
const browser = await chromium.launch({ headless: true })
try {
  for (const [id, texture, filename] of cases) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
    try {
      const params = new URLSearchParams({ qa: '1', scene: 'TownScene', qaCatchArrival: id })
      await page.goto('http://127.0.0.1:4173/fishing-game/?' + params.toString(), { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(fishId => {
        const town = window.__game?.scene?.getScene('TownScene')
        return town?.sys?.isActive?.() && town?._qaCatchArrivalSnapshot?.fishId === fishId
      }, id, { timeout: 20000 })
      await page.waitForTimeout(750)
      const state = await page.evaluate(() => {
        const town = window.__game?.scene?.getScene('TownScene')
        return {
          ...town?._qaCatchArrivalSnapshot,
          sceneActive: town?.sys?.isActive?.(),
          canvasPresent: Boolean(document.querySelector('#game-container canvas')?.isConnected),
        }
      })
      assert.equal(state.fishId, id, filename + ': wrong catch')
      assert.equal(state.fishTexture, texture, filename + ': species art fallback')
      assert.equal(state.speciesReaction, true, filename + ': generic rarity copy used')
      assert.ok(state.reaction?.length > 15, filename + ': reaction missing')
      assert.equal(state.sceneActive, true, filename + ': Town scene not active')
      assert.equal(state.canvasPresent, true, filename + ': canvas not visible')
      await page.screenshot({ path: join('artifacts/e2e', filename), animations: 'disabled' })
      console.log('Town species arrival verified:', filename, JSON.stringify(state))
    } finally {
      await page.close()
    }
  }
} finally {
  await browser.close()
}
