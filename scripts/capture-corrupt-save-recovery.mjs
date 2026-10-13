import assert from 'node:assert/strict'
import { existsSync, mkdirSync, realpathSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const executable = process.env.PATH.split(':').map(folder => join(folder, 'playwright')).find(existsSync)
assert.ok(executable, 'Playwright executable missing from CI PATH')
const { chromium } = await import(pathToFileURL(join(dirname(realpathSync(executable)), 'index.mjs')).href)
const browser = await chromium.launch({ headless: true })
mkdirSync('artifacts/e2e', { recursive: true })
const output = 'artifacts/e2e/98-corrupt-save-fishing-recovered.png'
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  try {
    await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene&qaMockPhase=cast',
      { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.__game?.scene?.getScene('GameScene')?.sys?.isActive?.(), null,
      { timeout: 20000 })
    // Stop first: shutdown hooks must finish before injecting a corrupt save,
    // otherwise a previous GameScene might legitimately persist its own state.
    for (const [i, history] of ['{invalid-json', '{"fishId":"aji"}', '[null,42,{}]'].entries()) {
      const score = i === 0 ? 'NaN' : i === 1 ? '-99' : 'Infinity'
      await page.evaluate(({ history, score }) => {
        window.__game.scene.stop('GameScene')
        localStorage.setItem('ainan_catches', history)
        localStorage.setItem('ainan_score', score)
        window.__game.scene.start('GameScene')
      }, { history, score })
      await page.waitForFunction(() => {
        const scene = window.__game?.scene?.getScene('GameScene')
        return scene?.sys?.isActive?.() && scene.phase === 'cast'
          && Array.isArray(scene.catches) && scene.catches.length === 0
          && scene.totalScore === 0
      }, null, { timeout: 15000 })
      const values = await page.evaluate(() => ({
        catches: localStorage.getItem('ainan_catches'),
        score: localStorage.getItem('ainan_score'),
        phase: window.__game.scene.getScene('GameScene').phase,
      }))
      assert.deepEqual(values, { catches: history, score, phase: 'cast' },
        'Do not overwrite damaged save records during recovery')
      await page.evaluate(() => window.__game.scene.getScene('GameScene')._beforeUnloadHandler())
      const afterIdleUnload = await page.evaluate(() => ({
        catches: localStorage.getItem('ainan_catches'),
        score: localStorage.getItem('ainan_score'),
      }))
      assert.deepEqual(afterIdleUnload, {catches: history, score},
        'Leaving Fishing without earning a catch must preserve raw recovery bytes')
    }
    // The entire real Fishing scene must still render after re-entry.
    // Retry screenshot capture only to allow the WebGL compositor to settle.
    for (let attempt = 0; attempt < 4; attempt++) {
      await page.waitForTimeout(350)
      await page.screenshot({ path: output, animations: 'disabled' })
      if (statSync(output).size > 15000) break
    }
    assert.ok(statSync(output).size > 15000,
      'Recovered Fishing screen must contain rendered content, not a blank canvas')
    // When gameplay legitimately earns a new catch, the same unload safety
    // hook must persist it; do not accidentally suppress valid progress.
    const saved = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene')
      scene.catches.push({fishId: 'aji', score: 120, sizeCm: 23, timestamp: Date.now()})
      scene.totalScore += 120
      scene._beforeUnloadHandler()
      return {score: localStorage.getItem('ainan_score'),
        catches: JSON.parse(localStorage.getItem('ainan_catches'))}
    })
    assert.equal(saved.score, '120')
    assert.equal(saved.catches.length, 1)
    assert.equal(saved.catches[0].fishId, 'aji')
    console.log('Fishing recovered from 3 malformed histories; idle unload preserved bytes and earned catch persisted')
  } finally {
    await page.close()
  }
} finally {
  await browser.close()
}
