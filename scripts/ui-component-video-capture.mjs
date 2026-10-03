import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43317/fishing-game/index.html'
const output = path.resolve('qa-artifacts/ui-component-v1')
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  recordVideo: { dir: output, size: { width: 390, height: 844 } },
})
const page = await context.newPage()
await page.addInitScript(() => {
  localStorage.setItem('ainan_sound_enabled', '0')
  localStorage.setItem('ainan_score', '25000')
  localStorage.setItem('ainan_equipment', JSON.stringify({ rodType: 'premium', baitType: 'worm' }))
  localStorage.setItem('ainan_inventory', JSON.stringify({ rods: { basic: 1, carbon: 1, premium: 1 }, baits: { worm: 12, shrimp: 5, special: 2 } }))
  localStorage.setItem('ainan_accessories', JSON.stringify({ owned: { cap: true, bag: true }, equipped: { hat: 'cap', bag: 'bag' } }))
  window.__ainanDailyBonusDismissed = true
})
async function waitScene(key) {
  await page.waitForFunction(sceneKey => window.__game?.scene?.getScene?.(sceneKey)?.sys?.isActive?.(), key)
}
async function clickDesign(x, y) {
  const box = await page.locator('canvas').last().boundingBox()
  await page.mouse.click(box.x + box.width * x / 390, box.y + box.height * y / 844)
}

await page.goto(`${base}?qa=1&scene=HomeScene`, { waitUntil: 'domcontentloaded' })
await waitScene('HomeScene')
await page.waitForTimeout(1100)
await clickDesign(195, 679)
await waitScene('MapScene')
await page.waitForTimeout(1000)
await clickDesign(50, 35)
await waitScene('HomeScene')
await page.waitForTimeout(700)
await clickDesign(117, 798)
await waitScene('UpgradeScene')
await page.waitForTimeout(1200)
await page.keyboard.press('ArrowRight')
await page.waitForTimeout(500)
await page.keyboard.press('Escape')

await page.goto(`${base}?qa=1&scene=GameScene`, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => window.__game?.scene?.getScene?.('GameScene')?._castPresentationHost?.nodes?.characterMotion?.ready)
await page.waitForTimeout(750)
await page.evaluate(() => window.__game.scene.getScene('GameScene')._finishBattle('caught'))
await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'result')
await page.waitForTimeout(1800)

const video = page.video()
await context.close()
const recordedPath = await video.path()
const finalPath = path.join(output, 'ainan-ui-component-flow.webm')
await fs.copyFile(recordedPath, finalPath)
if (path.resolve(recordedPath) !== path.resolve(finalPath)) await fs.unlink(recordedPath)
await browser.close()
console.log('created ainan-ui-component-flow.webm')
