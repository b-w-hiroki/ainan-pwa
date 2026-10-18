import assert from 'node:assert/strict'
import { delimiter, join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const executableDirectory = process.env.PATH.split(delimiter).find(folder => existsSync(join(folder, 'playwright')) || existsSync(join(folder, 'playwright.cmd')))
assert.ok(executableDirectory, 'Run via npm exec --package=playwright')
const { chromium } = await import(pathToFileURL(join(executableDirectory, '..', 'playwright', 'index.mjs')).href)
const base = process.env.WORKSHOP_QA_BASE_URL ?? 'http://127.0.0.1:4173'
const output = 'artifacts/e2e/workshop'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []
  page.on('pageerror', error => { if (error.message !== 'service worker disabled in QA') errors.push(error.message) })
  await page.goto(`${base}/fishing-game/?qa=1&scene=WorkshopScene`)
  await page.waitForFunction(() => window.__game?.scene.isActive('WorkshopScene'))
  await page.evaluate(() => document.fonts.ready)
  async function seed(score, materials, levels = {}) {
    await page.evaluate(({ score, materials, levels }) => {
      localStorage.setItem('ainan_score', String(score))
      localStorage.setItem('ainan_materials', JSON.stringify(materials))
      localStorage.setItem('ainan_rod_levels', JSON.stringify(levels))
      localStorage.setItem('ainan_inventory', JSON.stringify({ rods: { basic: 1, carbon: 1, premium: 1 } }))
      localStorage.setItem('ainan_accessories', JSON.stringify({ owned: {}, equipped: {} }))
      window.__game.scene.getScene('WorkshopScene').scene.restart()
    }, { score, materials, levels })
    await page.waitForFunction(() => window.__game.scene.getScene('WorkshopScene').children.list.some(o => o.getData?.('rodUpgradeId') === 'basic'))
  }
  async function tap(key, id, clicks = 1) {
    const target = await page.evaluate(({ key, id }) => {
      const scene = window.__game.scene.getScene('WorkshopScene')
      const hit = scene.children.list.find(o => o.getData?.(key) === id)
      const bounds = document.querySelector('canvas').getBoundingClientRect()
      return { x: bounds.x + hit.x / scene.scale.width * bounds.width, y: bounds.y + hit.y / scene.scale.height * bounds.height }
    }, { key, id })
    for (let i = 0; i < clicks; i++) await page.mouse.click(target.x, target.y)
  }
  await seed(0, {})
  const rows = await page.evaluate(() => window.__game.scene.getScene('WorkshopScene').children.list.filter(o => o.getData?.('workshopRecipe') === 'accessory:bag').map(o => o.text))
  assert.deepEqual(rows, ['貝 0/6', '券 0/2'])
  await tap('accessoryId', 'bag')
  await page.waitForFunction(() => window.__game.scene.getScene('WorkshopScene').children.list.some(o => o.getData?.('workshopNotice') && o.text === 'あと 700pt・貝6・券2'))
  assert.equal(await page.evaluate(() => localStorage.getItem('ainan_score')), '0')
  await page.screenshot({ path: `${output}/shortage.png` })

  await seed(2000, { scale: 20, shell: 20, ticket: 10, crystal: 2 }, { basic: 1, premium: 3 })
  for (const [width, height] of [[390,844], [320,568], [430,932], [844,390]]) {
    await page.setViewportSize({ width, height })
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const layout = await page.evaluate(() => {
      const s = window.__game.scene.getScene('WorkshopScene')
      return s.children.list.filter(o => o.getData?.('workshopRecipe') || o.getData?.('rodUpgradeId') || o.getData?.('accessoryId')).map(o => ({ bottom: o.getBounds().bottom, right: o.getBounds().right, left: o.getBounds().left }))
    })
    assert.ok(layout.every(o => o.left >= 16 && o.right <= 374 && o.bottom < 700), JSON.stringify(layout))
    await page.screenshot({ path: `${output}/ready-${width}x${height}.png` })
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await tap('rodUpgradeId', 'basic', 2)
  await page.waitForTimeout(450)
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('ainan_rod_levels')).basic), 2, 'rapid repeated taps must buy only the displayed upgrade')
  assert.equal(await page.evaluate(() => localStorage.getItem('ainan_score')), '1780')
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('ainan_materials')).scale), 18)
  await tap('accessoryId', 'bag')
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('ainan_accessories')).equipped.bag === 'bag')
  const saved = await page.evaluate(() => ['ainan_score', 'ainan_materials', 'ainan_rod_levels', 'ainan_accessories'].map(key => localStorage.getItem(key)))
  // Reload normal play: qa=1 deliberately replenishes the wallet on startup.
  await page.evaluate(() => history.replaceState(null, '', '/fishing-game/'))
  await page.reload()
  await page.waitForFunction(() => window.__game?.scene.isActive('TitleScene'))
  await page.evaluate(() => window.__game.scene.getScene('TitleScene').scene.start('WorkshopScene'))
  await page.waitForFunction(() => window.__game.scene.isActive('WorkshopScene'))
  assert.deepEqual(await page.evaluate(() => ['ainan_score', 'ainan_materials', 'ainan_rod_levels', 'ainan_accessories'].map(key => localStorage.getItem(key))), saved)
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('ainan_accessories')).equipped.bag), 'bag')
  await page.screenshot({ path: `${output}/purchased.png` })
  await page.evaluate(() => {
    localStorage.setItem('ainan_rod_levels', JSON.stringify({ basic: 5 }))
    window.__game.scene.getScene('WorkshopScene').scene.restart()
  })
  await page.waitForFunction(() => window.__game.scene.getScene('WorkshopScene').children.list.some(o => o.text === '最大強化'))
  assert.equal(await page.evaluate(() => window.__game.scene.getScene('WorkshopScene').children.list.some(o => o.getData?.('workshopRecipe') === 'rod:basic' || o.getData?.('rodUpgradeId') === 'basic')), false)
  assert.deepEqual(errors, [])
  console.log('PASS workshop recipe visibility, exact shortages, purchase, double-tap protection, reload, and four viewport captures')
} finally { await browser.close() }
