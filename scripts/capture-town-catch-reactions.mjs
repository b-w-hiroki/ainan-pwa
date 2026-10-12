import assert from 'node:assert/strict'
import { existsSync, realpathSync, mkdirSync, statSync } from 'node:fs'
import { readRgbPixels } from './field-pixel-diff-guard.mjs'
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
function inspectRenderedTown(filename) {
  if (statSync(join('artifacts/e2e', filename)).size <= 15000) {
    return { rendered: false, reason: 'PNG frame is tiny/blank' }
  }
  const rgb = readRgbPixels(join('artifacts/e2e', filename))
  const colorBins = new Set()
  let saturated = 0
  for (let y = 140; y < 680; y += 9) {
    for (let x = 25; x < 365; x += 9) {
      const at = (y * 390 + x) * 3
      const r = rgb[at], g = rgb[at + 1], b = rgb[at + 2]
      colorBins.add(`${r >> 5}-${g >> 5}-${b >> 5}`)
      if (Math.max(r, g, b) - Math.min(r, g, b) >= 24) saturated++
    }
  }
  return {
    rendered: colorBins.size >= 35 && saturated >= 80,
    distinctQuantizedColors: colorBins.size,
    saturatedSamples: saturated,
  }
}
async function captureTownWhenRendered(page, filename) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    await page.screenshot({
      path: join('artifacts/e2e', filename), animations: 'disabled',
    })
    const pixels = inspectRenderedTown(filename)
    if (pixels.rendered) {
      console.log('Verified rendered Town pixels', JSON.stringify({ filename, attempt, ...pixels }))
      return
    }
    if (attempt < 4) await page.waitForTimeout(350)
  }
  assert.fail(filename + ': Town screenshot missing meaningful rendered pixels after 4 captures')
}

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
      await captureTownWhenRendered(page, filename)
      console.log('Town species arrival verified:', filename, JSON.stringify(state))
    } finally {
      await page.close()
    }
  }
} finally {
  await browser.close()
}
