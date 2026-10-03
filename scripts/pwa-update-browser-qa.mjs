import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_PREVIEW_URL ?? 'http://127.0.0.1:43580/fishing-game/index.html'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' })
const page = await context.newPage()
const errors = []
let mainNavigations = 0
page.on('pageerror', error => errors.push(error.message))
page.on('framenavigated', frame => { if (frame === page.mainFrame()) mainNavigations += 1 })

await page.goto(base, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => Boolean(window.__game), null, { timeout: 12000 })
await page.evaluate(() => {
  localStorage.setItem('ainan_score', '321')
  window.__game.scene.stop('TitleScene')
  window.__game.scene.start('GameScene', { point: 'pointA' })
})
await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.sys?.isActive?.())
await page.evaluate(() => navigator.serviceWorker.ready)
await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 12000 })
await page.waitForTimeout(700)
if (mainNavigations !== 1) throw new Error(`fresh service-worker control reloaded active gameplay (${mainNavigations} navigations)`)

// Reload once so the document begins under an existing controller.
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => Boolean(window.__game && navigator.serviceWorker.controller), null, { timeout: 12000 })
await page.evaluate(() => {
  window.__game.scene.stop('TitleScene')
  window.__game.scene.start('GameScene', { point: 'pointA' })
})
await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.sys?.isActive?.())
const beforeUpdateNavigation = mainNavigations
await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new Event('controllerchange')))
await page.waitForTimeout(700)
if (mainNavigations !== beforeUpdateNavigation) throw new Error('existing-controller update reloaded during gameplay')
if (!await page.evaluate(() => window.__game.scene.getScene('GameScene')?.sys?.isActive?.())) throw new Error('gameplay state was lost while update was pending')

const safeReload = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 12000 })
await page.evaluate(() => {
  window.__game.scene.stop('GameScene')
  window.__game.scene.start('HomeScene')
})
await safeReload
await page.waitForFunction(() => Boolean(window.__game), null, { timeout: 12000 })
await page.waitForTimeout(500)
if (mainNavigations !== beforeUpdateNavigation + 1) throw new Error(`safe-boundary update did not reload exactly once (${mainNavigations - beforeUpdateNavigation})`)
const backup = await page.evaluate(() => JSON.parse(localStorage.getItem('ainan_save_backup_1') ?? 'null'))
if (backup?.data?.ainan_score !== '321') throw new Error('safe-boundary reload did not back up progress')

await context.setOffline(true)
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => Boolean(window.__game), null, { timeout: 12000 })
if (!await page.evaluate(() => window.__game.scene.getScene('TitleScene')?.sys?.isActive?.())) throw new Error('precache did not restore the app shell offline')
await context.setOffline(false)

await context.close()
await browser.close()
const unexpected = errors.filter(message => !message.includes('ERR_NETWORK_ACCESS_DENIED') && !message.includes('404'))
if (unexpected.length) throw new Error(`browser errors: ${unexpected.join('; ')}`)
console.log('PASS: production SW fresh control keeps gameplay; existing-controller update defers through gameplay, backs up, reloads once at Home, and restores the app shell offline')
