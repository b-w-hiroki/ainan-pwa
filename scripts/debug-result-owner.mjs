import { existsSync, realpathSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

// This script is run through npm exec --package=playwright@1.55.0.
// Locate that temporary package without adding a production dependency.
const executable = process.env.PATH.split(':').map(folder => join(folder, 'playwright')).find(existsSync)
if (!executable) throw new Error('Playwright executable not found in npm exec PATH')
const pkgDir = dirname(realpathSync(executable))
const { chromium } = await import(pathToFileURL(join(pkgDir, 'index.mjs')).href)
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', error => errors.push(String(error.stack ?? error.message)))
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()) })
  const url = 'http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene&qaAction=caught&qaLocation=pointB&qaFish=bass'
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  try { await page.waitForSelector("body[data-qa-result-ready='caught']", { timeout: 17000 }) }
  catch (error) { console.error('QA marker did not settle:', String(error.message)) }
  await page.waitForTimeout(850)
  const state = await page.evaluate(() => {
    const scene = window.__game?.scene?.getScene('GameScene')
    const host = scene?._castPresentationHost
    const n = host?.nodes
    const node = item => ({ active: Boolean(item?.active), visible: Boolean(item?.visible), alpha: item?.alpha ?? null, parent: item?.parentContainer?.name ?? null })
    return {
      phase: scene?.phase, mode: scene?._castPresentationMode,
      outcome: scene?._castPresentationOutcome,
      qa: { ready: document.body.dataset.qaResultReady, fish: document.body.dataset.qaResultFish },
      host: { root: node(host?.root), battleField: node(n?.battleField), resultField: node(n?.resultField), battleForeground: node(n?.battleForeground), resultForeground: node(n?.resultForeground), getText: n?.resultGet?.text ?? null, fishTexture: n?.resultFish?.texture?.key ?? null, currentAction: n?.characterMotion?.currentAction ?? null },
      legacy: { resultOverlay: node(scene?.resultOverlay), battlePanel: node(scene?.battlePanel) },
      renderer: { type: window.__game?.renderer?.type, isPaused: scene?.sys?.isPaused?.(), active: scene?.sys?.isActive?.() },
    }
  })
  console.log('QA caught state after screenshot-ready marker:', JSON.stringify(state, null, 2))
  console.log('Browser errors:', JSON.stringify(errors.slice(0, 12), null, 2))
  mkdirSync('artifacts/e2e', { recursive: true })
  await page.screenshot({ path: 'artifacts/e2e/55-debug-caught-result.png' })
  await page.close()
} finally { await browser.close() }
