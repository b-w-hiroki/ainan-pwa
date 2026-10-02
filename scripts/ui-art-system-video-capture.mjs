import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43341/fishing-game/index.html'
const output = path.resolve('qa-artifacts/ui-art-system-v2')
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, recordVideo: { dir: output, size: { width: 390, height: 844 } } })
const page = await context.newPage()
await page.addInitScript(() => {
  localStorage.setItem('ainan_sound_enabled', '0'); localStorage.setItem('ainan_reduced_motion', '1'); localStorage.setItem('ainan_score', '25000')
  localStorage.setItem('ainan_equipment', JSON.stringify({ rodType: 'premium', baitType: 'worm' }))
  localStorage.setItem('ainan_inventory', JSON.stringify({ rods: { basic: 1, carbon: 1, premium: 1 }, baits: { worm: 12, shrimp: 0, special: 0 } }))
  window.__ainanDailyBonusDismissed = true
})
const waitScene = key => page.waitForFunction(k => window.__game?.scene?.getScene?.(k)?.sys?.isActive?.(), key)
const click = async (x,y) => { const b=await page.locator('canvas').last().boundingBox(); await page.mouse.click(b.x+b.width*x/390,b.y+b.height*y/844) }
const go = async (scene,suffix='') => { await page.goto(`${base}?qa=1&scene=${scene}${suffix}`,{waitUntil:'domcontentloaded'}); await waitScene(scene); await page.waitForTimeout(900) }

await go('HomeScene'); await click(195,679); await waitScene('MapScene'); await page.waitForTimeout(900)
await click(50,35); await waitScene('HomeScene'); await click(117,798); await waitScene('UpgradeScene'); await page.waitForTimeout(900)
await click(64,500); await page.waitForTimeout(900); await go('TownScene'); await go('MenuScene')
await go('GameScene'); await page.waitForFunction(()=>window.__game.scene.getScene('GameScene')?._castPresentationHost?.nodes?.characterMotion?.ready); await page.waitForTimeout(900)
await go('GameScene','&qaAction=battle'); await page.waitForTimeout(1000); await page.evaluate(()=>window.__game.scene.getScene('GameScene')._finishBattle('caught')); await page.waitForFunction(()=>window.__game.scene.getScene('GameScene')?.phase==='result'); await page.waitForTimeout(1500)
await go('GameScene','&qaAction=battle'); await page.waitForTimeout(1000); await page.evaluate(()=>window.__game.scene.getScene('GameScene')._finishBattle('escaped')); await page.waitForFunction(()=>window.__game.scene.getScene('GameScene')?.phase==='result'); await page.waitForTimeout(1500)
const video=page.video(); await context.close(); const recorded=await video.path(); const target=path.join(output,'ainan-ui-art-system-flow.webm'); await fs.copyFile(recorded,target); if(path.resolve(recorded)!==path.resolve(target)) await fs.unlink(recorded); await browser.close(); console.log(target)
