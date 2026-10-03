import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43341/fishing-game/index.html'
const output = path.resolve('qa-artifacts/ui-art-system-v2/after')
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })

const seed = () => {
  localStorage.setItem('ainan_sound_enabled', '0')
  localStorage.setItem('ainan_reduced_motion', '1')
  localStorage.setItem('ainan_score', '25000')
  localStorage.setItem('ainan_equipment', JSON.stringify({ rodType: 'premium', baitType: 'worm' }))
  localStorage.setItem('ainan_inventory', JSON.stringify({ rods: { basic: 1, carbon: 1, premium: 1 }, baits: { worm: 12, shrimp: 0, special: 0 } }))
  localStorage.setItem('ainan_accessories', JSON.stringify({ owned: { cap: true, bag: true }, equipped: { hat: 'cap', bag: 'bag' } }))
  window.__ainanDailyBonusDismissed = true
}

async function openScene(page, scene, suffix = '') {
  await page.goto(`${base}?qa=1&scene=${scene}${suffix}`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(key => window.__game?.scene?.getScene?.(key)?.sys?.isActive?.(), scene)
  await page.waitForTimeout(650)
}

for (const viewport of [{ id: 'portrait', width: 390, height: 844 }, { id: 'small', width: 375, height: 667 }, { id: 'landscape', width: 844, height: 390 }]) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text()) })
  await page.addInitScript(seed)
  await openScene(page, 'HomeScene')
  const canvas = await page.locator('canvas').last().boundingBox()
  if (!canvas || canvas.x < -0.5 || canvas.y < -0.5 || canvas.x + canvas.width > viewport.width + 0.5 || canvas.y + canvas.height > viewport.height + 0.5) throw new Error(`${viewport.id}: canvas outside viewport ${JSON.stringify(canvas)}`)
  await page.screenshot({ path: path.join(output, `home-${viewport.id}.png`) })
  const metrics = await page.evaluate(() => window.__game.scene.getScene('HomeScene')._footerMetrics)
  if (metrics.hitHeight < 44 || metrics.bottomInset < 6) throw new Error(`${viewport.id}: unsafe footer ${JSON.stringify(metrics)}`)
  if (viewport.id === 'portrait') {
    await page.mouse.click(canvas.x + canvas.width * .5, canvas.y + canvas.height * .805)
    await page.waitForFunction(() => window.__game.scene.getScene('MapScene')?.sys?.isActive?.())
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(output, 'map-portrait.png') })
    await page.mouse.click(canvas.x + canvas.width * 50 / 390, canvas.y + canvas.height * 35 / 844)
    await page.waitForFunction(() => window.__game.scene.getScene('HomeScene')?.sys?.isActive?.())
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => window.__game.scene.getScene('UpgradeScene')?.sys?.isActive?.())
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(output, 'upgrade-portrait.png') })
    await page.mouse.click(canvas.x + canvas.width * 64 / 390, canvas.y + canvas.height * 500 / 844)
    await page.waitForTimeout(250)
    await page.screenshot({ path: path.join(output, 'upgrade-dialog-portrait.png') })
    await openScene(page, 'TownScene')
    await page.screenshot({ path: path.join(output, 'town-portrait.png') })
    await openScene(page, 'MenuScene')
    await page.screenshot({ path: path.join(output, 'menu-portrait.png') })
  }
  if (errors.length) throw new Error(`${viewport.id}: ${errors.join(' | ')}`)
  await context.close()
}

const gameContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
const gamePage = await gameContext.newPage()
await gamePage.addInitScript(seed)
const gameErrors = []
gamePage.on('pageerror', error => gameErrors.push(error.message))
await openScene(gamePage, 'GameScene')
await gamePage.waitForFunction(() => window.__game.scene.getScene('GameScene')?._castPresentationHost?.nodes?.characterMotion?.ready)
await gamePage.screenshot({ path: path.join(output, 'fishing-cast-portrait.png') })
await openScene(gamePage, 'GameScene', '&qaAction=battle')
await gamePage.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'battle')
await gamePage.waitForTimeout(900)
await gamePage.screenshot({ path: path.join(output, 'fishing-battle-portrait.png') })
await gamePage.evaluate(() => window.__game.scene.getScene('GameScene')._finishBattle('caught'))
await gamePage.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'result')
await gamePage.waitForTimeout(650)
await gamePage.screenshot({ path: path.join(output, 'result-caught-portrait.png') })
await openScene(gamePage, 'GameScene', '&qaAction=battle')
await gamePage.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'battle')
await gamePage.waitForTimeout(1100)
await gamePage.evaluate(() => window.__game.scene.getScene('GameScene')._finishBattle('escaped'))
await gamePage.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'result')
await gamePage.waitForTimeout(650)
await gamePage.screenshot({ path: path.join(output, 'result-failed-portrait.png') })
if (gameErrors.length) throw new Error(`game: ${gameErrors.join(' | ')}`)
await gameContext.close()
await browser.close()
console.log('PASS: full UI art browser QA across Home/Map/Upgrade/Town/Menu/Fishing/Result and 3 viewports')
