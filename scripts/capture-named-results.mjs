import assert from 'node:assert/strict'
import { existsSync, realpathSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

// CI installs Playwright temporarily; keep it out of the production bundle.
const executable = process.env.PATH.split(':').map(folder => join(folder, 'playwright')).find(existsSync)
assert.ok(executable, 'Playwright executable missing from npm exec PATH')
const { chromium } = await import(pathToFileURL(join(dirname(realpathSync(executable)), 'index.mjs')).href)

const cases = [
  ['bass', 'pointB', '50-bass-result.png'],
  ['saba', 'pointA', '51-saba-result.png'],
  ['isaki', 'pointB', '52-isaki-result.png'],
  ['hirame', 'pointB', '53-hirame-result.png'],
  ['kanpachi', 'pointC', '54-kanpachi-result.png'],
]
mkdirSync('artifacts/e2e', { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  for (const [fishId, point, filename] of cases) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
    try {
      const query = new URLSearchParams({
        qa: '1', scene: 'GameScene', qaAction: 'caught',
        qaLocation: point, qaFish: fishId,
      })
      await page.goto('http://127.0.0.1:4173/fishing-game/?' + query.toString(), { waitUntil: 'domcontentloaded' })
      await page.waitForSelector(
        `body[data-qa-result-ready="caught"][data-qa-result-fish="${fishId}"]`,
        { timeout: 20000 },
      )
      // The readiness marker already waits for the catch flash/tween.
      // Long fixed post-marker waits can capture a later, unrelated phase.
      await page.waitForTimeout(850)
      const state = await page.evaluate(() => {
        const scene = window.__game?.scene?.getScene('GameScene')
        const host = scene?._castPresentationHost
        return {
          phase: scene?.phase, outcome: scene?._castPresentationOutcome,
          fish: scene?.fish?.id,
          resultVisible: host?.nodes?.resultForeground?.visible,
          battleVisible: host?.nodes?.battleForeground?.visible,
          heroTexture: host?.nodes?.resultFish?.texture?.key,
          heroVisible: host?.nodes?.resultFish?.visible,
          heroWidth: host?.nodes?.resultFish?.displayWidth,
          heldFishVisible: host?.nodes?.characterMotion?.fish?.visible,
        }
      })
      assert.equal(state.phase, 'result', fishId + ': phase changed before capture')
      assert.equal(state.outcome, 'caught', fishId + ': unexpected outcome')
      assert.equal(state.fish, fishId, fishId + ': wrong Result fish')
      assert.equal(state.resultVisible, true, fishId + ': Result layer not visible')
      assert.equal(state.battleVisible, false, fishId + ': Battle layer still visible')
      assert.equal(state.heroTexture, 'fish_hero_' + fishId, fishId + ': incorrect premium hero texture')
      assert.equal(state.heroVisible, true, fishId + ': premium fish hidden by celebration animation')
      assert.ok(state.heroWidth >= 290, fishId + ': Result premium fish too small')
      assert.equal(state.heldFishVisible, false, fishId + ': duplicate held fish competes with premium hero')
      await page.screenshot({ path: join('artifacts/e2e', filename), animations: 'disabled' })
      // Ensure the settled Result persists, not a transient QA frame.
      // The bass frame also receives a late rendered-pixel regression check.
      if (fishId === 'bass') {
        await page.waitForTimeout(2200)
        const phaseLater = await page.evaluate(() => window.__game?.scene?.getScene('GameScene')?.phase)
        assert.equal(phaseLater, 'result', fishId + ': late phase reverted to Battle')
        await page.screenshot({ path: join('artifacts/e2e', '56-bass-result-stable.png'), animations: 'disabled' })
      }
      console.log('Captured named Result:', filename, JSON.stringify(state))
    } finally {
      await page.close()
    }
  }
} finally {
  await browser.close()
}
