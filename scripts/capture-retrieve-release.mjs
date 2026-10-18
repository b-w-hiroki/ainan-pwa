import assert from 'node:assert/strict'
import { delimiter, join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const bin = process.env.PATH.split(delimiter).find(dir => existsSync(join(dir, 'playwright')) || existsSync(join(dir, 'playwright.cmd')))
assert.ok(bin, 'Run via npm exec --package=playwright')
const { chromium } = await import(pathToFileURL(join(bin, '..', 'playwright', 'index.mjs')).href)
const base = process.env.RETRIEVE_RELEASE_QA_URL ?? 'http://127.0.0.1:4173'
const output = 'artifacts/e2e/retrieve-release'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } })
  const errors = []
  page.on('pageerror', error => { if (error.message !== 'service worker disabled in QA') errors.push(error.message) })
  await page.goto(`${base}/fishing-game/?qa=1&scene=GameScene&qaMockPhase=retrieve`)
  await page.waitForFunction(() => window.__game?.scene.getScene('GameScene')?.phase === 'retrieve')
  await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    scene._tickFishInterest = () => {} // Keep random bites out of this input fixture.
  })
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene')._castPresentationHost?.nodes?.retrieveInteraction?.visible)
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  async function hold() {
    await page.waitForFunction(() => {
      const scene = window.__game.scene.getScene('GameScene')
      return scene.phase === 'retrieve' && scene.time.now >= (scene._retrieveReadyAt ?? 0)
    })
    const point = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene')
      const host = scene._castPresentationHost
      const canvas = document.querySelector('canvas').getBoundingClientRect()
      return { x: canvas.x + (host.root.x + 318 * host.root.scaleX) / scene.scale.width * canvas.width,
        y: canvas.y + (host.root.y + 746 * host.root.scaleY) / scene.scale.height * canvas.height }
    })
    await page.mouse.move(point.x, point.y)
    await page.mouse.down()
    await page.waitForFunction(() => window.__game.scene.getScene('GameScene').retrieveState?.slowHeld === true, null, { timeout: 5000 }).catch(async error => {
      const state = await page.evaluate(() => { const s = window.__game.scene.getScene('GameScene'); return { phase: s.phase, readyAt: s._retrieveReadyAt, now: s.time.now, action: s.retrieveState?.action, held: s._castPresentationHost._slowPointerHeld, pointer: { x: s.input.activePointer.x, y: s.input.activePointer.y }, root: { x: s._castPresentationHost.root.x, y: s._castPresentationHost.root.y, scale: s._castPresentationHost.root.scaleX } } })
      throw new Error(`${error.message}: ${JSON.stringify(state)}`)
    })
  }
  async function stopped(reason) {
    const state = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene')
      return { slowHeld: scene.retrieveState.slowHeld, action: scene.retrieveState.action, hostHeld: Boolean(scene._castPresentationHost._slowPointerHeld) }
    })
    assert.deepEqual(state, { slowHeld: false, action: 'idle', hostHeld: false }, reason)
  }
  await hold()
  await page.mouse.up()
  await stopped('ordinary pointer release')
  await hold()
  await page.mouse.move(2, 2) // Outside the letterboxed canvas.
  await page.mouse.up()
  await stopped('leaving the canvas must cancel held retrieve')
  await hold()
  await page.evaluate(() => document.querySelector('canvas').dispatchEvent(new Event('pointercancel')))
  await stopped('native pointer cancellation')
  await page.mouse.up()
  await hold()
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await stopped('window blur')
  await page.mouse.up()
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await hold()
  await page.evaluate(() => {
    const previous = Object.getOwnPropertyDescriptor(document, 'hidden')
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
    if (previous) Object.defineProperty(document, 'hidden', previous)
    else delete document.hidden
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await stopped('hidden document')
  await page.mouse.up()
  await hold()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await stopped('viewport resize')
  await page.mouse.up()
  await hold()
  const phaseExit = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    scene.phase = 'wait'
    scene._castPresentationHost.sync()
    const held = scene.retrieveState.slowHeld
    scene.phase = 'retrieve'
    scene._setRetrieveIdle()
    scene._castPresentationHost.sync()
    return held
  })
  assert.equal(phaseExit, false, 'leaving Retrieve must clear the held action')
  await page.mouse.up()
  await page.screenshot({ path: `${output}/released.png` })
  await hold()
  const cleanup = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    const before = scene.input.listenerCount('gameout')
    scene._castPresentationHost.destroy()
    return { before, after: scene.input.listenerCount('gameout'), slowHeld: scene.retrieveState.slowHeld }
  })
  assert.equal(cleanup.after, cleanup.before - 1, 'destroy must remove the cancellation listener')
  assert.equal(cleanup.slowHeld, false, 'destroy must stop an active held retrieve')
  assert.deepEqual(errors, [])
  console.log('PASS held retrieve: release, canvas exit, pointercancel, blur, hidden, resize, phase exit, listener cleanup')
} finally { await browser.close() }
