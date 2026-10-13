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
      // Dismiss the arrival card through its real tap target. The in-world
      // market/diner should still visibly carry the same recorded species.
      await page.mouse.click(195, 530)
      await page.waitForFunction(() => {
        const town = window.__game?.scene?.getScene('TownScene')
        return town?.sys?.isActive?.()
          && !town.children.list.some(item => item.active && item.depth === 220 && item.type === 'Container')
      }, { timeout: 5000 })
      await page.waitForTimeout(280)
      const feature = await page.evaluate(() => {
        const town = window.__game?.scene?.getScene('TownScene')
        const state = town?._qaTownFeaturedCatch
        const artNodes = town?.children?.list?.filter(node =>
          node.active && node.texture?.key === state?.marketTexture && node.depth === 6) ?? []
        return { ...state, artNodes: artNodes.length }
      })
      assert.equal(feature.fishId,id,filename+': town lost last fish after closing modal')
      assert.equal(feature.marketTexture,texture,filename+': market did not use the caught species')
      assert.equal(feature.dinerTexture,texture,filename+': diner did not use the caught species')
      assert.ok(feature.artNodes >= 2, filename+': fish icons are missing from shops')
      assert.equal(feature.owner,'TownScene')
      const worldFile = id === 'aji' ? '88-town-aji-featured.png' : '89-town-kanpachi-featured.png'
      await captureTownWhenRendered(page, worldFile)
      console.log('Town in-world catch verified:',worldFile,JSON.stringify(feature))

    } finally {
      await page.close()
    }
  }

  // Real 390x844 browser taps: unaffordable Town growth must navigate back
  // to Map without spending; an affordable upgrade must keep buying in Town.
  for (const { score, expected, filename } of [
    { score: 0, expected: 'fish', filename: '96-town-upgrade-shortage.png' },
    { score: 1000, expected: 'upgrade', filename: '97-town-upgrade-affordable.png' },
  ]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
    try {
      await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=TownScene', {
        waitUntil: 'domcontentloaded',
      })
      await page.waitForFunction(() => window.__game?.scene?.getScene('TownScene')?.sys?.isActive?.(), null, {timeout:20000})
      // qaBootstrap intentionally injects 25000pt and Lv5 facilities during
      // startup; init scripts run BEFORE that fixture and get overwritten.
      // Override only after boot, then rebuild the actual Town scene from
      // the underfunded/affordable state being exercised.
      await page.evaluate(points => {
        localStorage.setItem('ainan_score', String(points))
        localStorage.setItem('ainan_town_facilities', JSON.stringify({
          market: 0, pier: 0, guide: 0, festival: 0,
        }))
        localStorage.setItem('ainan_catches', '[]')
        window.__game.scene.getScene('TownScene').scene.restart()
      }, score)
      await page.waitForFunction(() => {
        const town = window.__game?.scene?.getScene('TownScene')
        return town?.sys?.isActive?.() && town?._summary?.facilities?.market === 0
      }, null, {timeout:20000})
      await page.waitForTimeout(320)
      // This is a real pointer click on the upper-left (Market) facility card.
      await page.mouse.click(100, 495)
      await page.waitForFunction(() => window.__game?.scene?.getScene('TownScene')?._modal?.active === true,
        null, {timeout:5000})
      await page.waitForTimeout(240)
      const ui = await page.evaluate(() => {
        const town = window.__game.scene.getScene('TownScene')
        const modal = town._modal
        return {
          labels: modal?.list?.flatMap(node => [
            ...(typeof node.text === 'string' ? [node.text] : []),
            ...(node.list?.filter(child => typeof child.text === 'string').map(child => child.text) ?? []),
          ]) ?? [],
          active: modal?.active === true,
        }
      })
      const wanted = expected === 'fish' ? 'あと180pt・釣りへ' : '180ptで発展'
      assert.equal(ui.active, true, filename + ': market modal not opened from actual tap')
      assert.ok(ui.labels.includes(wanted), filename + ': wrong purchase action '+JSON.stringify(ui.labels))
      await captureTownWhenRendered(page, filename)

      // Tap the actual gold modal CTA: no programmatic call to _upgrade.
      await page.mouse.click(195, 485)
      if (expected === 'fish') {
        await page.waitForFunction(() => window.__game?.scene?.getScene('MapScene')?.sys?.isActive?.(),
          null, {timeout:7000})
      } else {
        await page.waitForFunction(() => {
          const saved = JSON.parse(localStorage.getItem('ainan_town_facilities') ?? '{}')
          return saved.market === 1
        }, null, {timeout:7000})
      }
      const state = await page.evaluate(() => ({
        score: Number(localStorage.getItem('ainan_score')),
        market: JSON.parse(localStorage.getItem('ainan_town_facilities') ?? '{}').market,
        mapActive: window.__game?.scene?.getScene('MapScene')?.sys?.isActive?.() ?? false,
      }))
      if (expected === 'fish') {
        assert.deepEqual(state, {score:0, market:0, mapActive:true},
          filename + ': shortage should return to fishing without spending')
      } else {
        assert.equal(state.score, 820, filename + ': purchase deducted wrong amount')
        assert.equal(state.market, 1, filename + ': purchase did not develop Market')
        assert.equal(state.mapActive, false, filename + ': affordable purchase must remain in Town')
      }
      console.log('Town purchase affordance verified by real tap:', filename, JSON.stringify(state))
    } finally {
      await page.close()
    }
  }
} finally {
  await browser.close()
}
// Decoded pixels, not only two different PNG filenames: the fish signs in
// the existing shop regions must visibly change with the caught species.
const a = readRgbPixels(join('artifacts/e2e', '88-town-aji-featured.png'))
const b = readRgbPixels(join('artifacts/e2e', '89-town-kanpachi-featured.png'))
let changed = 0
for (let y = 330; y < 356; y++) {
  for (const [start, end] of [[68,103],[287,321]]) {
    for (let x = start; x < end; x++) {
      const i = (y * 390 + x) * 3
      const difference = Math.abs(a[i]-b[i]) + Math.abs(a[i+1]-b[i+1]) + Math.abs(a[i+2]-b[i+2])
      if (difference > 30) changed++
    }
  }
}
assert.ok(changed >= 80, 'Town shop fish badges must visibly differ between species ('+changed+' pixels)')
console.log('Town in-world fish differentiation passed:', changed, 'significant shop pixels')

