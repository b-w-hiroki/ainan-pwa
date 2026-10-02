import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43317/fishing-game/index.html'
const phase = process.env.UI_QA_PHASE ?? 'after'
const output = path.resolve(`qa-artifacts/ui-component-v1/${phase}`)
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })

const cases = [
  { id: 'portrait', width: 390, height: 844 },
  { id: 'small', width: 375, height: 667 },
  { id: 'landscape', width: 844, height: 390 },
]

for (const item of cases) {
  const context = await browser.newContext({ viewport: { width: item.width, height: item.height }, reducedMotion: phase === 'after' ? 'reduce' : 'no-preference' })
  const page = await context.newPage()
  await page.addInitScript(() => {
    localStorage.setItem('ainan_sound_enabled', '0')
    localStorage.setItem('ainan_reduced_motion', '1')
    localStorage.setItem('ainan_score', '25000')
    localStorage.setItem('ainan_equipment', JSON.stringify({ rodType: 'premium', baitType: 'worm' }))
    localStorage.setItem('ainan_inventory', JSON.stringify({ rods: { basic: 1, carbon: 1, premium: 1 }, baits: { worm: 12, shrimp: 5, special: 2 } }))
    localStorage.setItem('ainan_accessories', JSON.stringify({ owned: { cap: true, bag: true }, equipped: { hat: 'cap', bag: 'bag' } }))
    window.__ainanDailyBonusDismissed = true
  })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text()) })
  await page.goto(`${base}?qa=1&scene=HomeScene`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__game?.scene?.getScene?.('HomeScene')?.sys?.isActive?.())
  await page.waitForTimeout(400)
  const canvas = await page.locator('canvas').last().boundingBox()
  if (!canvas || canvas.x < -0.5 || canvas.y < -0.5 || canvas.x + canvas.width > item.width + 0.5 || canvas.y + canvas.height > item.height + 0.5) {
    throw new Error(`${item.id}: canvas outside viewport: ${JSON.stringify(canvas)}`)
  }
  await page.screenshot({ path: path.join(output, `home-${item.id}.png`) })

  if (phase === 'after') {
    const metrics = await page.evaluate(() => window.__game.scene.getScene('HomeScene')._footerMetrics)
    if (!metrics || metrics.hitHeight < 44 || metrics.bottomInset < 6) throw new Error(`${item.id}: footer metrics unsafe: ${JSON.stringify(metrics)}`)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => window.__game.scene.getScene('UpgradeScene')?.sys?.isActive?.())
    await page.waitForTimeout(250)
    await page.screenshot({ path: path.join(output, `upgrade-${item.id}.png`) })
    if (item.id === 'portrait') {
      await page.goto(`${base}?qa=1&scene=HomeScene`, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => window.__game?.scene?.getScene?.('HomeScene')?.sys?.isActive?.())
      const box = await page.locator('canvas').last().boundingBox()
      await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.805)
      await page.waitForFunction(() => window.__game.scene.getScene('MapScene')?.sys?.isActive?.())
      await page.mouse.click(box.x + box.width * 50 / 390, box.y + box.height * 35 / 844)
      await page.waitForFunction(() => window.__game.scene.getScene('HomeScene')?.sys?.isActive?.())
    }
  }
  if (errors.length) throw new Error(`${item.id}: ${errors.join(' | ')}`)
  await context.close()
}

if (phase === 'after') {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' })
  const page = await context.newPage()
  const resultErrors = []
  page.on('pageerror', error => resultErrors.push(error.message))
  await page.addInitScript(() => {
    localStorage.setItem('ainan_sound_enabled', '0')
    localStorage.setItem('ainan_reduced_motion', '1')
    localStorage.setItem('ainan_score', '25000')
  })
  await page.goto(`${base}?qa=1&scene=GameScene`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__game?.scene?.getScene?.('GameScene')?._castPresentationHost?.nodes?.characterMotion?.ready)
  await page.waitForTimeout(700)
  await page.evaluate(() => window.__game.scene.getScene('GameScene')._finishBattle('caught'))
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'result')
  await page.waitForTimeout(700)
  await page.screenshot({ path: path.join(output, 'result-portrait.png') })
  await page.goto(`${base}?qa=1&scene=GameScene&qaAction=battle`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__game?.scene?.getScene?.('GameScene')?.phase === 'battle')
  await page.waitForTimeout(1100)
  await page.evaluate(() => window.__game.scene.getScene('GameScene')._finishBattle('escaped'))
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'result')
  await page.waitForTimeout(700)
  await page.screenshot({ path: path.join(output, 'failure-portrait.png') })
  if (resultErrors.length) throw new Error(`result: ${resultErrors.join(' | ')}`)
  await context.close()
}

await browser.close()
console.log(`PASS: UI component browser QA (${phase}) at 390x844, 375x667, and 844x390`)
