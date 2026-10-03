import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43193/fishing-game/index.html'
const output = path.resolve('qa-artifacts/fishing-journey-v1')
await fs.mkdir(output, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
page.on('requestfailed', request => errors.push(`${request.failure()?.errorText}: ${request.url()}`))

async function waitScene(scene) {
  await page.waitForFunction(key => window.__game?.scene?.getScene?.(key)?.sys?.isActive?.(), scene, { timeout: 12000 })
}

async function clickDesign(x, y, count = 1) {
  const box = await page.locator('canvas').last().boundingBox()
  if (!box) throw new Error('game canvas missing')
  await page.mouse.click(box.x + box.width * x / 390, box.y + box.height * y / 844, { clickCount: count, delay: 12 })
}

async function openCleanTitle() {
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await waitScene('TitleScene')
  await page.evaluate(() => {
    localStorage.clear()
    const now = new Date()
    const key = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
    localStorage.setItem('ainan_daily_bonus_date', key)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await waitScene('TitleScene')
}

async function startFromTitle(expectedJourney) {
  await clickDesign(195, 620)
  await waitScene('HomeScene')
  const journey = await page.evaluate(() => window.__game.scene.getScene('HomeScene')._journey.id)
  if (journey !== expectedJourney) throw new Error(`expected Home journey ${expectedJourney}, got ${journey}`)
}

async function setReturnPlayer({ baitType = 'worm', special = 2, stamina = 5 } = {}) {
  await page.evaluate(({ baitType, special, stamina }) => {
    const now = new Date()
    const day = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
    localStorage.clear()
    localStorage.setItem('ainan_daily_bonus_date', day)
    localStorage.setItem('ainan_catches', JSON.stringify([{ fishId: 'aji', sizeCm: 26, score: 120, point: 'pointA', timestamp: Date.now() - 1000 }]))
    localStorage.setItem('ainan_seen_town', '1')
    localStorage.setItem('ainan_town_facilities', JSON.stringify({ market: 1, pier: 2, guide: 0, festival: 1 }))
    localStorage.setItem('ainan_inventory', JSON.stringify({ rods: { basic: 1, carbon: 1, premium: 1 }, baits: { worm: 12, shrimp: 5, special } }))
    localStorage.setItem('ainan_equipment', JSON.stringify({ rodType: 'carbon', baitType }))
    localStorage.setItem('ainan_stamina', JSON.stringify({ value: stamina, updatedAt: Date.now() }))
    localStorage.setItem('ainan_seen_open_pointB', '1')
    localStorage.setItem('ainan_seen_open_pointC', '1')
  }, { baitType, special, stamina })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await waitScene('TitleScene')
}

async function finish(outcome) {
  await page.evaluate(value => window.__game.scene.getScene('GameScene')._finishBattle(value), outcome)
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'result')
  await page.waitForTimeout(500)
}

// Fresh-player loop, using only visible Title/Home/Map/result/Town controls for navigation.
await openCleanTitle()
await startFromTitle('first-catch')
await clickDesign(195, 679)
await waitScene('MapScene')
await clickDesign(137, 270)
await page.waitForFunction(() => Boolean(window.__game.scene.getScene('MapScene')._detailPanel))
await clickDesign(290, 704)
await waitScene('GameScene')
const beforeCatch = await page.evaluate(() => ({ score: Number(localStorage.getItem('ainan_score') ?? 0), catches: JSON.parse(localStorage.getItem('ainan_catches') ?? '[]').length }))
await finish('caught')
const caughtResult = await page.evaluate(() => {
  const scene = window.__game.scene.getScene('GameScene')
  const nodes = scene._castPresentationHost.nodes
  return {
    score: Number(localStorage.getItem('ainan_score') ?? 0),
    catches: JSON.parse(localStorage.getItem('ainan_catches') ?? '[]').length,
    primary: nodes.resultTownMaskText.text,
    reward: nodes.resultScore.text,
  }
})
if (caughtResult.catches !== beforeCatch.catches + 1 || caughtResult.score <= beforeCatch.score) throw new Error(`catch was not awarded at result time: ${JSON.stringify(caughtResult)}`)
if (!caughtResult.primary.includes('登録済み') || !caughtResult.reward.includes('獲得済み')) throw new Error(`misleading catch delivery copy remains: ${JSON.stringify(caughtResult)}`)
await page.screenshot({ path: path.join(output, '01-caught-recorded-portrait.png') })
await page.setViewportSize({ width: 844, height: 390 })
await page.waitForTimeout(250)
if (await page.evaluate(() => window.__game.scene.getScene('GameScene')?.phase) !== 'result') throw new Error('landscape resize lost result state')
await page.screenshot({ path: path.join(output, '02-caught-recorded-landscape.png') })
await page.setViewportSize({ width: 390, height: 844 })
await page.waitForTimeout(250)
await clickDesign(195, 655)
await waitScene('TownScene')
const townState = await page.evaluate(() => ({
  journey: window.__game.scene.getScene('TownScene')._journey.id,
  score: Number(localStorage.getItem('ainan_score') ?? 0),
  catches: JSON.parse(localStorage.getItem('ainan_catches') ?? '[]').length,
}))
if (townState.journey !== 'grow-town' || townState.score !== caughtResult.score || townState.catches !== caughtResult.catches) throw new Error(`town review duplicated rewards or lost journey: ${JSON.stringify(townState)}`)
await page.screenshot({ path: path.join(output, '03-town-catch-arrival.png') })
await clickDesign(195, 530)
await page.waitForTimeout(300)
await clickDesign(195, 385)
await page.waitForFunction(() => Boolean(window.__game.scene.getScene('TownScene')._modal?.active))
await page.screenshot({ path: path.join(output, '04-town-next-unlock.png') })

// Reload interruption recovery: the next visible Title -> Home CTA remains town growth.
await page.reload({ waitUntil: 'domcontentloaded' })
await waitScene('TitleScene')
await startFromTitle('grow-town')
await clickDesign(195, 679)
await waitScene('TownScene')

// Returning-player path through visible CTAs, including back, escaped result, and double-input retry.
await setReturnPlayer({ stamina: 5 })
await startFromTitle('challenge')
await clickDesign(195, 679)
await waitScene('MapScene')
await clickDesign(148, 591)
await page.waitForFunction(() => Boolean(window.__game.scene.getScene('MapScene')._detailPanel))
await clickDesign(290, 704)
await waitScene('GameScene')
await clickDesign(31, 40)
await waitScene('MapScene')
await clickDesign(148, 591)
await page.waitForFunction(() => Boolean(window.__game.scene.getScene('MapScene')._detailPanel))
await clickDesign(290, 704)
await waitScene('GameScene')
await finish('escaped')
const failureCopy = await page.evaluate(() => {
  const nodes = window.__game.scene.getScene('GameScene')._castPresentationHost.nodes
  return { primary: nodes.resultTownMaskText.text, cause: nodes.resultName.text, advice: nodes.resultSize.text, options: [nodes.resultFailureEquip.text, nodes.resultFailurePort.text] }
})
if (!failureCopy.primary.includes('−1ST') || !failureCopy.cause || !failureCopy.advice || failureCopy.options.some(text => !text)) throw new Error(`failure guidance incomplete: ${JSON.stringify(failureCopy)}`)
await page.screenshot({ path: path.join(output, '05-failure-routes.png') })
const staminaBeforeRetry = await page.evaluate(() => JSON.parse(localStorage.getItem('ainan_stamina')).value)
await clickDesign(195, 655, 2)
await waitScene('GameScene')
await page.waitForTimeout(250)
const retryState = await page.evaluate(() => ({ phase: window.__game.scene.getScene('GameScene').phase, stamina: JSON.parse(localStorage.getItem('ainan_stamina')).value }))
if (retryState.stamina !== staminaBeforeRetry - 1) throw new Error(`double input consumed more than one retry: ${JSON.stringify({ staminaBeforeRetry, retryState })}`)

// Prepare isolated result states after the rapid-input case; its second tap may legitimately begin the next cast.
await page.evaluate(() => {
  window.__game.scene.stop('GameScene')
  window.__game.scene.start('GameScene', { point: 'pointC' })
})
await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'cast')
await finish('escaped')
await clickDesign(101, 746)
await page.waitForTimeout(500)
const equipRoute = await page.evaluate(() => ({
  upgrade: window.__game.scene.getScene('UpgradeScene')?.sys?.isActive?.(),
  game: window.__game.scene.getScene('GameScene')?.sys?.isActive?.(),
  phase: window.__game.scene.getScene('GameScene')?.phase,
  outcome: window.__game.scene.getScene('GameScene')?._castPresentationOutcome,
}))
if (!equipRoute.upgrade) throw new Error(`failure equipment route missed: ${JSON.stringify(equipRoute)}`)

// Alternative port route is an actual result-button click; internal scene start only prepares the case.
await page.evaluate(() => window.__game.scene.start('GameScene', { point: 'pointC' }))
await waitScene('GameScene')
await finish('escaped')
await clickDesign(289, 746)
await waitScene('HomeScene')

// Bait shortage routes the normal Home CTA to preparation, and Map never spends a cast.
await setReturnPlayer({ baitType: 'special', special: 0, stamina: 5 })
await startFromTitle('prepare')
await page.screenshot({ path: path.join(output, '06-bait-shortage-home.png') })
await clickDesign(195, 679)
await waitScene('UpgradeScene')
await page.evaluate(() => window.__game.scene.start('MapScene'))
await waitScene('MapScene')
await clickDesign(148, 591)
await page.waitForFunction(() => Boolean(window.__game.scene.getScene('MapScene')._detailPanel))
const shortageBefore = await page.evaluate(() => localStorage.getItem('ainan_stamina'))
await clickDesign(290, 704)
await waitScene('UpgradeScene')
const shortageAfter = await page.evaluate(() => localStorage.getItem('ainan_stamina'))
if (shortageAfter !== shortageBefore) throw new Error('bait shortage route consumed stamina')

// Zero stamina produces a recovery modal instead of a self-restarting Home CTA.
await setReturnPlayer({ stamina: 0 })
await startFromTitle('prepare')
await clickDesign(195, 679)
await page.waitForFunction(() => Boolean(window.__game.scene.getScene('HomeScene')._staminaModal?.active))
await page.screenshot({ path: path.join(output, '07-stamina-recovery.png') })

await browser.close()
const unexpected = errors.filter(message => !message.includes('ERR_NETWORK_ACCESS_DENIED')
  && message !== 'Failed to load resource: net::ERR_NETWORK_ACCESS_DENIED')
if (unexpected.length) throw new Error(`browser errors: ${unexpected.join('; ')}`)
console.log('PASS: normal CTA first/return loop, recorded reward copy, reload recovery, back, portrait/landscape, failure alternatives, double-input retry, bait/stamina shortage')
