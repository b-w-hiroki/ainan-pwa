import assert from 'node:assert/strict'
import { delimiter, join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const bin = process.env.PATH.split(delimiter).find(dir => existsSync(join(dir, 'playwright')) || existsSync(join(dir, 'playwright.cmd')))
assert.ok(bin, 'Run via npm exec --package=playwright')
const { chromium } = await import(pathToFileURL(join(bin, '..', 'playwright', 'index.mjs')).href)
const base = process.env.HOME_TAP_QA_URL ?? 'http://127.0.0.1:4173'
const output = 'artifacts/e2e/home-deliberate-tap'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []
  page.on('pageerror', e => { if (e.message !== 'service worker disabled in QA') errors.push(e.message) })
  await page.goto(`${base}/fishing-game/?qa=1&scene=HomeScene`)
  await page.waitForFunction(() => window.__game?.scene.isActive('HomeScene'))
  await page.evaluate(() => {
    history.replaceState(null, '', '/fishing-game/')
    const scene = window.__game.scene.getScene('HomeScene')
    scene._dismissDailyBonus()
    // Exercise normal Home controls without an unrelated first-visit reward modal.
  })
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const point = await page.evaluate(() => {
    const s = window.__game.scene.getScene('HomeScene')
    const r = document.querySelector('canvas').getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height * 0.805, outsideY: r.y + r.height * 0.73,
      destination: s._journey.scene }
  })
  async function stillHome(reason) {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    assert.equal(await page.evaluate(() => window.__game.scene.isActive('HomeScene')), true, reason)
  }
  await page.mouse.move(point.x, point.outsideY)
  await page.mouse.down()
  await page.mouse.move(point.x, point.y)
  await page.mouse.up()
  await stillHome('Dragging onto the CTA must not navigate on release')
  await page.mouse.down()
  await page.mouse.move(point.x, point.outsideY)
  await page.mouse.move(point.x, point.y)
  await page.mouse.up()
  await stillHome('Leaving a pressed CTA must cancel that tap')
  await page.mouse.down()
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await page.mouse.up()
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await stillHome('Focus loss must cancel a pressed CTA')
  for (const kind of ['pointercancel', 'hidden', 'disabled']) {
    await page.mouse.down()
    await page.evaluate(kind => {
      if (kind === 'pointercancel') document.querySelector('canvas').dispatchEvent(new Event('pointercancel'))
      if (kind === 'disabled') {
        const button = window.__game.scene.getScene('HomeScene')._mainCta
        button.setDisabled(true)
        button.setDisabled(false)
      }
      if (kind === 'hidden') {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true })
        document.dispatchEvent(new Event('visibilitychange'))
        delete document.hidden
        document.dispatchEvent(new Event('visibilitychange'))
      }
    }, kind)
    await page.mouse.up()
    await stillHome(`${kind} must cancel the pending tap`)
  }
  await page.mouse.down()
  await page.setViewportSize({ width: 430, height: 932 })
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await page.mouse.move(point.x, point.y)
  await page.mouse.up()
  await stillHome('Resizing while pressed must cancel the pending tap')
  const listeners = await page.evaluate(() => {
    const s = window.__game.scene.getScene('HomeScene')
    const before = s.input.listenerCount('gameout')
    const button = new s._mainCta.constructor(s, { x: 0, y: 0, label: 'test' })
    const during = s.input.listenerCount('gameout')
    button.container.destroy()
    return { before, during, after: s.input.listenerCount('gameout') }
  })
  assert.equal(listeners.during, listeners.before + 1)
  assert.equal(listeners.after, listeners.before, 'destroyed buttons must remove input listeners')
  await page.screenshot({ path: `${output}/home.png` })
  await page.mouse.click(point.x, point.y)
  await page.waitForFunction(key => window.__game.scene.isActive(key), point.destination)
  await page.evaluate(key => window.__game.scene.getScene(key).scene.start('HomeScene'), point.destination)
  await page.waitForFunction(() => window.__game.scene.isActive('HomeScene'))
  await page.evaluate(() => window.__game.scene.getScene('HomeScene')._dismissDailyBonus())
  await page.keyboard.press('Enter')
  await page.waitForFunction(key => window.__game.scene.isActive(key), point.destination)
  assert.deepEqual(errors, [])
  console.log('PASS normal Home: drag cancellation, blur, pointercancel, hidden, resize, disable/re-enable, cleanup, deliberate tap and keyboard navigation')
} finally { await browser.close() }
