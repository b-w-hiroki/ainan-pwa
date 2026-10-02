import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43217/fishing-game/index.html'
const output = path.resolve('qa-artifacts/equipment-visual-v2')
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  recordVideo: { dir: output, size: { width: 390, height: 844 } },
})
const page = await context.newPage()

async function route(scene, query = '') {
  await page.goto(`${base}?qa=1&scene=${scene}${query ? `&${query}` : ''}`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(key => window.__game?.scene?.getScene?.(key)?.sys?.isActive?.(), scene, { timeout: 12000 })
  await page.waitForTimeout(450)
}

async function click(x, y, hold = 0) {
  const box = await page.locator('canvas').last().boundingBox()
  if (!box) throw new Error('game canvas missing')
  await page.mouse.move(box.x + box.width * x / 390, box.y + box.height * y / 844)
  await page.mouse.down()
  if (hold) await page.waitForTimeout(hold)
  await page.mouse.up()
}

await page.goto(base, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  localStorage.clear()
  localStorage.setItem('ainan_score', '25000')
  localStorage.setItem('ainan_equipment', JSON.stringify({ rodType: 'carbon', baitType: 'worm' }))
  localStorage.setItem('ainan_inventory', JSON.stringify({ rods: { basic: 1, carbon: 1, premium: 0 }, baits: { worm: 12, shrimp: 5, special: 2 } }))
  localStorage.setItem('ainan_accessories', JSON.stringify({ owned: { cap: false, bag: false }, equipped: { hat: null, bag: null } }))
})

await route('UpgradeScene')
await page.waitForTimeout(900)
await click(278, 498)
await page.waitForTimeout(350)
await click(195, 464)
await page.waitForFunction(() => JSON.parse(localStorage.getItem('ainan_equipment') ?? '{}').rodType === 'premium')
await page.waitForTimeout(900)

await route('WorkshopScene')
await click(105, 561)
await page.waitForFunction(() => JSON.parse(localStorage.getItem('ainan_accessories') ?? '{}').equipped?.hat === 'cap')
await page.waitForTimeout(450)
await click(282, 561)
await page.waitForFunction(() => JSON.parse(localStorage.getItem('ainan_accessories') ?? '{}').equipped?.bag === 'bag')
await page.waitForTimeout(1000)

await route('UpgradeScene')
await page.waitForTimeout(1100)

await route('GameScene', 'qaMockPhase=cast')
await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?._castPresentationHost?.nodes?.characterMotion?.ready)
await click(195, 748, 700)
await page.waitForTimeout(1200)

await route('GameScene', 'qaAction=battle')
await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'battle')
await page.waitForTimeout(1400)
await page.evaluate(() => window.__game.scene.getScene('GameScene')._finishBattle('caught'))
await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'result')
await page.waitForTimeout(1600)

const video = page.video()
await context.close()
const recordedPath = await video.path()
const finalPath = path.join(output, 'ainan-equipment-visual-real-flow.webm')
await fs.copyFile(recordedPath, finalPath)
if (path.resolve(recordedPath) !== path.resolve(finalPath)) await fs.unlink(recordedPath)
await browser.close()
console.log('created ainan-equipment-visual-real-flow.webm')
