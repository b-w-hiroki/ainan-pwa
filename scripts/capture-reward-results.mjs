import assert from 'node:assert/strict'
import { existsSync, mkdirSync, realpathSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { countGetHeaderPixels } from './result-screen-pixel-guard.mjs'

// Reward Result screenshots must be from the real, still-active Result phase.
// Chromium occasionally returns a 2742-byte blank WebGL compositor readback
// even though the Result DOM marker is ready. Never accept a blank capture.
const executable = process.env.PATH.split(':')
  .map(folder => join(folder, 'playwright')).find(existsSync)
assert.ok(executable, 'Playwright executable missing from CI PATH')
const { chromium } = await import(pathToFileURL(
  join(dirname(realpathSync(executable)), 'index.mjs')).href)
const cases = [
  ['first', '32-reward-first.png'],
  ['record', '33-reward-record.png'],
  ['rare', '34-reward-rare.png'],
  ['legendary', '35-reward-legendary.png'],
]
mkdirSync('artifacts/e2e', { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  for (const [reward, filename] of cases) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 1,
    })
    try {
      const params = new URLSearchParams({
        qa: '1', scene: 'GameScene', qaAction: 'caught', qaReward: reward,
      })
      await page.goto('http://127.0.0.1:4173/fishing-game/?' + params.toString(),
        { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('body[data-qa-result-ready="caught"]',
        { timeout: 20000 })
      await page.waitForTimeout(450)
      let last = { reason: 'not yet rendered' }
      let accepted = false
      for (let attempt = 1; attempt <= 5; attempt++) {
        // Recheck gameplay on every capture; never restart the catch event.
        const state = await page.evaluate(() => {
          const scene = window.__game?.scene?.getScene('GameScene')
          const host = scene?._castPresentationHost
          const canvas = document.querySelector('#game-container canvas')
          return {
            phase: scene?.phase,
            outcome: scene?._castPresentationOutcome,
            ready: document.body.dataset.qaResultReady,
            fishId: scene?.fish?.id,
            resultVisible: host?.nodes?.resultForeground?.visible,
            battleVisible: host?.nodes?.battleForeground?.visible,
            heroVisible: host?.nodes?.resultFish?.visible,
            canvasReady: Boolean(canvas?.isConnected && canvas.width > 0 && canvas.height > 0),
          }
        })
        assert.equal(state.phase, 'result', filename + ': Result state changed')
        assert.equal(state.outcome, 'caught', filename + ': caught outcome lost')
        assert.equal(state.ready, 'caught', filename + ': readiness marker lost')
        assert.ok(state.fishId, filename + ': fish missing')
        assert.equal(state.resultVisible, true, filename + ': Result owner hidden')
        assert.equal(state.battleVisible, false, filename + ': Battle owner resurrected')
        assert.equal(state.heroVisible, true, filename + ': caught hero hidden')
        assert.equal(state.canvasReady, true, filename + ': canvas missing')
        await page.screenshot({
          path: join('artifacts/e2e', filename), animations: 'disabled',
        })
        const size = statSync(join('artifacts/e2e', filename)).size
        // Count decoded PNG pixels; a large but wrong Battle frame also fails.
        const goldPixels = countGetHeaderPixels(filename)
        last = { attempt, size, goldPixels, state }
        if (size > 15000 && goldPixels > 450) {
          accepted = true
          console.log('Reward Result rendered:', filename, JSON.stringify(last))
          break
        }
        if (attempt < 5) await page.waitForTimeout(300)
      }
      assert.ok(accepted, filename + ': no rendered Result frame after 5 attempts: ' + JSON.stringify(last))
    } finally {
      await page.close()
    }
  }
} finally {
  await browser.close()
}
