import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43193/fishing-game/index.html'
const output = path.resolve('qa-artifacts/rod-visual-v1')
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, recordVideo: { dir: output, size: { width: 390, height: 844 } } })
const page = await context.newPage()

async function route(scene, query = '') {
  await page.goto(`${base}?qa=1&scene=${scene}${query ? `&${query}` : ''}`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(key => window.__game?.scene?.getScene?.(key)?.sys?.isActive?.(), scene, { timeout: 12000 })
}
async function click(x, y, hold = 0) {
  const box = await page.locator('canvas').last().boundingBox()
  await page.mouse.move(box.x + box.width * x / 390, box.y + box.height * y / 844)
  await page.mouse.down()
  if (hold) await page.waitForTimeout(hold)
  await page.mouse.up()
}
async function equip(id) {
  const tileX = { basic: 78, carbon: 178, premium: 278 }[id]
  await route('UpgradeScene')
  await page.waitForTimeout(450)
  await click(tileX, 498)
  await page.waitForTimeout(450)
  await click(195, 464)
  await page.waitForFunction(expected => JSON.parse(localStorage.getItem('ainan_equipment') ?? '{}').rodType === expected, id, { timeout: 4000 })
  await page.waitForTimeout(550)
}
async function showCast(id) {
  await route('GameScene', 'qaMockPhase=cast')
  await page.waitForFunction(expected => window.__game.scene.getScene('GameScene')?._castPresentationHost?.nodes?.characterMotion?.root?.getData('rodType') === expected, id)
  await page.waitForTimeout(350)
  await click(195, 748, 700)
  await page.waitForTimeout(900)
}

for (const id of ['basic', 'carbon', 'premium']) {
  await equip(id)
  await showCast(id)
}
await route('GameScene', 'qaAction=battle')
await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'battle', null, { timeout: 6000 })
await page.waitForTimeout(1800)

const video = page.video()
await context.close()
await fs.copyFile(await video.path(), path.join(output, 'ainan-equipped-rod-real-flow.webm'))
await browser.close()
console.log('created ainan-equipped-rod-real-flow.webm')
