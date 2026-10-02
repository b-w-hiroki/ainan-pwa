import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43369/fishing-game/index.html'
const output = path.resolve('qa-artifacts/fish-size-uiux-v1/after')
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const fishIds = ['aji', 'tai', 'bass', 'buri', 'saba', 'isaki', 'hirame', 'kanpachi', 'kue']
const names = { aji: 'アジ', tai: 'マダイ', bass: 'ブラックバス', buri: 'ブリ', saba: 'サバ', isaki: 'イサキ', hirame: 'ヒラメ', kanpachi: 'カンパチ', kue: 'クエ' }

const seed = () => {
  localStorage.setItem('ainan_sound_enabled', '0')
  localStorage.setItem('ainan_reduced_motion', '0')
  localStorage.setItem('ainan_score', '25000')
  window.__ainanDailyBonusDismissed = true
}

async function openBattle(page) {
  await page.goto(`${base}?qa=1&scene=GameScene&qaAction=battle`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__game?.scene?.getScene?.('GameScene')?.phase === 'battle')
  await page.waitForTimeout(900)
}

async function forceFish(page, id) {
  await page.evaluate(({ id, name }) => {
    const scene = window.__game.scene.getScene('GameScene')
    scene.fish = { ...scene.fish, id, name }
    scene._castPresentationHost.sync()
  }, { id, name: names[id] })
}

const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await context.newPage()
await page.addInitScript(seed)
const errors = []
page.on('pageerror', error => errors.push(error.message))

const measurements = []
for (const id of fishIds) {
  await openBattle(page)
  await forceFish(page, id)
  await page.evaluate(() => window.__game.scene.getScene('GameScene')._finishBattle('caught'))
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'result')
  await page.waitForTimeout(220)
  const held = await page.evaluate(() => {
    const fish = window.__game.scene.getScene('GameScene')._castPresentationHost.nodes.characterMotion.fish
    return { visible: fish.visible, width: fish.displayWidth, height: fish.displayHeight, x: fish.x, y: fish.y }
  })
  if (held.height < 78 || held.width > 152) throw new Error(`${id}: unsafe held fish ${JSON.stringify(held)}`)
  if (id === 'kanpachi') {
    await page.evaluate(() => window.__game.scene.getScene('GameScene')._castPresentationHost.nodes.characterMotion._applyPose('joyHold', true))
    await page.screenshot({ path: path.join(output, 'kanpachi-held-portrait.png') })
  }
  await page.waitForTimeout(1800)
  await page.evaluate(() => {
    const host = window.__game.scene.getScene('GameScene')._castPresentationHost
    if (host.nodes.characterMotion.currentAction) host.nodes.characterMotion._cancel({ idle: true })
    host.sync()
    host.nodes.resultFish.setVisible(true)
  })
  const result = await page.evaluate(() => {
    const fish = window.__game.scene.getScene('GameScene')._castPresentationHost.nodes.resultFish
    return { visible: fish.visible, width: fish.displayWidth, height: fish.displayHeight, x: fish.x, y: fish.y }
  })
  if (!result.visible || result.height < 180 || result.width > 352 || result.y - result.height / 2 < 188 || result.y + result.height / 2 > 414) throw new Error(`${id}: unsafe result fish ${JSON.stringify(result)}`)
  measurements.push({ id, held: [Math.round(held.width), Math.round(held.height)], result: [Math.round(result.width), Math.round(result.height)] })
  if (id === 'kanpachi') await page.screenshot({ path: path.join(output, 'kanpachi-result-portrait.png') })
}
if (errors.length) throw new Error(errors.join(' | '))
await context.close()

for (const viewport of [{ id: 'small', width: 375, height: 667 }, { id: 'landscape', width: 844, height: 390 }]) {
  const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' })
  const p = await ctx.newPage(); await p.addInitScript(seed); await openBattle(p); await forceFish(p, 'kue')
  await p.evaluate(() => window.__game.scene.getScene('GameScene')._finishBattle('caught'))
  await p.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'result')
  await p.waitForTimeout(1800)
  const canvas = await p.locator('canvas').last().boundingBox()
  if (!canvas || canvas.x < -0.5 || canvas.y < -0.5 || canvas.x + canvas.width > viewport.width + 0.5 || canvas.y + canvas.height > viewport.height + 0.5) throw new Error(`${viewport.id}: canvas outside viewport`)
  await p.screenshot({ path: path.join(output, `kue-result-${viewport.id}.png`) })
  await ctx.close()
}

await browser.close()
await fs.writeFile(path.join(output, 'fish-size-measurements.json'), JSON.stringify(measurements, null, 2) + '\n')
console.log('PASS: 9 fish held/result sizing uses natural aspect ratios; 3 viewports fit')
