import assert from 'node:assert/strict'
import { delimiter, join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const bin = process.env.PATH.split(delimiter).find(dir => existsSync(join(dir, 'playwright')) || existsSync(join(dir, 'playwright.cmd')))
assert.ok(bin, 'Run via npm exec --package=playwright')
const { chromium } = await import(pathToFileURL(join(bin, '..', 'playwright', 'index.mjs')).href)
const base = process.env.UI_INTERRUPTION_QA_URL ?? 'http://127.0.0.1:4173'
const output = 'artifacts/e2e/ui-interruption-audit'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = [], failures = []
  page.on('pageerror', e => { if (e.message !== 'service worker disabled in QA') errors.push(e.message) })
  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  async function home() {
    await page.goto(`${base}/fishing-game/?qa=1&scene=HomeScene`)
    await page.bringToFront()
    await page.waitForFunction(() => window.__game?.scene.isActive('HomeScene'))
    await page.evaluate(() => {
      window.dispatchEvent(new Event('focus'))
      history.replaceState(null, '', '/fishing-game/')
      window.__game.scene.getScene('HomeScene')._dismissDailyBonus()
    })
    await frames()
    await page.waitForTimeout(220)
  }
  async function remainsHome(reason) {
    // A simulated blur/focus also triggers Phaser's brief focus pause. Wait
    // for its clock, not only wall time, before checking deferred actions.
    const now = await page.evaluate(() => window.__game.scene.getScene('HomeScene').time.now)
    await page.waitForFunction(now => {
      const s = window.__game.scene.getScene('HomeScene')
      return !s.sys.isActive() || s.time.now >= now + 350
    }, now, { timeout: 5000 })
    if (!await page.evaluate(() => window.__game.scene.isActive('HomeScene'))) failures.push(reason)
  }
  await home()
  // Dispatch through Phaser to put interruption deterministically inside the
  // keyboard feedback delay. Positive navigation below uses real browser keys.
  await page.evaluate(() => {
    window.__game.scene.getScene('HomeScene').input.keyboard.emit('keydown-ENTER', { repeat: false })
    window.dispatchEvent(new Event('blur'))
    window.dispatchEvent(new Event('focus'))
  })
  await remainsHome('keyboard activation survived blur')
  await home()
  const keyboardCleanup = await page.evaluate(() => {
    const s = window.__game.scene.getScene('HomeScene')
    const before = s.input.keyboard.listenerCount('keydown-ENTER')
    const button = new s._mainCta.constructor(s, { x: 0, y: 0, label: 'test', keyboard: true })
    const during = s.input.keyboard.listenerCount('keydown-ENTER')
    button.container.destroy()
    return { before, during, after: s.input.keyboard.listenerCount('keydown-ENTER') }
  })
  assert.equal(keyboardCleanup.during, keyboardCleanup.before + 1)
  if (keyboardCleanup.after !== keyboardCleanup.before) failures.push('destroyed Button retained keyboard handler')
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('HomeScene')
    s._mainCta.setDisabled(true)
    window.__uiAuditActivations = 0
    const button = new s._mainCta.constructor(s, { x: 0, y: 0, label: 'test', keyboard: true,
      onClick: () => window.__uiAuditActivations++ })
    s.input.keyboard.emit('keydown-ENTER', { repeat: false })
    button.container.destroy()
  })
  await remainsHome('destroying a button must cancel its queued keyboard action')
  assert.equal(await page.evaluate(() => window.__uiAuditActivations), 0)
  for (const kind of ['leave', 'blur', 'pointercancel', 'hidden', 'resize', 'queued']) {
    await home()
    const p = await page.evaluate(() => {
      const s = window.__game.scene.getScene('HomeScene')
      const hit = s._footerTabs.find(tab => tab.key === 'equip').hit
      const r = document.querySelector('canvas').getBoundingClientRect()
      return { x: r.x + hit.x / s.scale.width * r.width, y: r.y + hit.y / s.scale.height * r.height }
    })
    await page.mouse.move(p.x, p.y)
    await page.mouse.down()
    if (kind === 'queued') await page.mouse.up()
    if (kind === 'leave') {
      await page.mouse.move(p.x, p.y - 90)
      await page.mouse.move(p.x, p.y)
    } else if (kind === 'resize') {
      await page.setViewportSize({ width: 430, height: 932 })
      await frames()
      await page.setViewportSize({ width: 390, height: 844 })
      await frames()
      await page.mouse.move(p.x, p.y)
    } else await page.evaluate(kind => {
      if (kind === 'pointercancel') document.querySelector('canvas').dispatchEvent(new Event('pointercancel'))
      if (kind === 'blur' || kind === 'queued') {
        window.dispatchEvent(new Event('blur'))
        window.dispatchEvent(new Event('focus'))
      }
      if (kind === 'hidden') {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true })
        document.dispatchEvent(new Event('visibilitychange'))
        delete document.hidden
        document.dispatchEvent(new Event('visibilitychange'))
      }
    }, kind)
    if (kind !== 'queued') await page.mouse.up()
    await remainsHome(`footer activation survived ${kind}`)
  }
  await home()
  for (const [width, height] of [[320,568], [430,932], [390,844]]) {
    await page.setViewportSize({ width, height })
    await frames()
    const targets = await page.evaluate(() => {
      const s = window.__game.scene.getScene('HomeScene')
      const r = document.querySelector('canvas').getBoundingClientRect()
      return s._footerTabs.map(t => ({ width: t.hit.width / s.scale.width * r.width, height: t.hit.height / s.scale.height * r.height }))
    })
    assert.ok(targets.every(t => t.width >= 44 && t.height >= 44), `${width}x${height}: footer CSS targets`)
    await page.screenshot({ path: `${output}/home-${width}x${height}.png` })
  }
  const target = await page.evaluate(() => {
    const s = window.__game.scene.getScene('HomeScene'), r = document.querySelector('canvas').getBoundingClientRect()
    const h = s._footerTabs.find(t => t.key === 'equip').hit
    return { x: r.x + h.x / s.scale.width * r.width, y: r.y + h.y / s.scale.height * r.height }
  })
  await page.mouse.click(target.x, target.y)
  await page.waitForFunction(() => window.__game.scene.isActive('UpgradeScene'))
  await home()
  await page.keyboard.press('ArrowRight')
  await page.waitForFunction(() => window.__game.scene.getScene('HomeScene')._footerKeyboardFocus, null, { timeout: 3000 }).catch(async error => {
    console.log(await page.evaluate(() => { const s = window.__game.scene.getScene('HomeScene'); return { active: s.sys.isActive(), focus: s._footerKeyboardFocus, enabled: s.input.keyboard.enabled, gameFocus: s.game.hasFocus, hidden: document.hidden, listeners: s.input.keyboard.listenerCount('keydown-RIGHT'), scale: [s.scale.width,s.scale.height] } }))
    throw error
  })
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => window.__game.scene.isActive('UpgradeScene'))
  await home()
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => !window.__game.scene.isActive('HomeScene'))
  assert.deepEqual(errors, [])
  assert.deepEqual(failures, [])
  console.log('PASS interrupted keyboard/footer actions, destroyed-button keyboard cleanup, and real keyboard navigation')
} finally { await browser.close() }
