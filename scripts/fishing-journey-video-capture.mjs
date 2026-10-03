import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43193/fishing-game/index.html'
const output = path.resolve('qa-artifacts/fishing-journey-v1')
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, recordVideo: { dir: output, size: { width: 390, height: 844 } } })
const page = await context.newPage()

async function waitScene(scene) {
  await page.waitForFunction(key => window.__game?.scene?.getScene?.(key)?.sys?.isActive?.(), scene, { timeout: 12000 })
}
async function click(x, y) {
  const box = await page.locator('canvas').last().boundingBox()
  await page.mouse.click(box.x + box.width * x / 390, box.y + box.height * y / 844)
}

await page.goto(base, { waitUntil: 'domcontentloaded' })
await waitScene('TitleScene')
await page.evaluate(() => {
  localStorage.clear()
  const now = new Date()
  localStorage.setItem('ainan_daily_bonus_date', [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-'))
})
await page.reload({ waitUntil: 'domcontentloaded' })
await waitScene('TitleScene')
await page.waitForTimeout(500)
await click(195, 620)
await waitScene('HomeScene')
await page.waitForTimeout(1200)
await click(195, 679)
await waitScene('MapScene')
await page.waitForTimeout(700)
await click(137, 270)
await page.waitForTimeout(700)
await click(290, 704)
await waitScene('GameScene')
await page.waitForTimeout(900)
await page.evaluate(() => window.__game.scene.getScene('GameScene')._finishBattle('caught'))
await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'result')
await page.waitForTimeout(1700)
await click(195, 655)
await waitScene('TownScene')
await page.waitForTimeout(1700)
await click(195, 530)
await page.waitForTimeout(500)
await click(195, 385)
await page.waitForTimeout(1700)

const video = page.video()
await context.close()
await fs.copyFile(await video.path(), path.join(output, 'ainan-fishing-journey-real-cta.webm'))
await browser.close()
console.log('created ainan-fishing-journey-real-cta.webm')
