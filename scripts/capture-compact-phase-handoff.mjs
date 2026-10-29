import assert from 'node:assert/strict'
import { delimiter, join } from 'node:path'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const bin = process.env.PATH.split(delimiter).find(dir => existsSync(join(dir, 'playwright')) || existsSync(join(dir, 'playwright.cmd')))
assert.ok(bin, 'Run via npm exec --package=playwright')
const { chromium } = await import(pathToFileURL(join(bin, '..', 'playwright', 'index.mjs')).href)
const output = 'artifacts/compact-fishing-loop/handoff'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true })

try {
  for (const [width, height, safeArea] of [[320, 480, false], [320, 568, false], [375, 667, false], [320, 568, true]]) {
  const sizeKey = safeArea ? '320-safe-area' : height === 480 ? '320x480' : width
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 })
  const errors = []
  page.on('pageerror', error => { if (error.message !== 'service worker disabled in QA') errors.push(error.message) })
  try {
    if (safeArea) {
      await page.route('**/fishing-game/**', async route => {
        if (route.request().resourceType() !== 'document') return route.continue()
        const response = await route.fetch()
        const body = (await response.text()).replace('</head>',
          '<style>:root { --safe-top: 20px !important; --safe-bottom: 34px !important; }</style></head>')
        await route.fulfill({ response, body })
      })
    }
    await page.goto(`${process.env.QA_URL ?? 'http://127.0.0.1:4173'}/fishing-game/?qa=1&scene=GameScene&qaMockPhase=cast&compactPortrait=1`)
    await page.waitForFunction(() => window.__game?.scene?.getScene('GameScene')?._castPresentationHost?.root?.active)
    await page.waitForFunction(() => window.__game?.scene?.getScene('GameScene')?._conditionPresentation?.badge?.depth === 6001)
    const point = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene')
      const host = scene._castPresentationHost
      const rect = scene.game.canvas.getBoundingClientRect()
      return { x: rect.x + 195 * host.root.scaleX,
        y: rect.y + (748 + host.nodes.castDock.y) * host.root.scaleY }
    })
    await page.mouse.move(point.x, point.y)
    await page.mouse.down()
    await page.waitForTimeout(260)
    await page.mouse.up()
    await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'retrieve', null, { timeout: 10000 })
    const retrieve = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene')
      return { phase: scene.phase, compact: scene._castPresentationHost._compactRetrieveActive,
        dock: scene._castPresentationHost.nodes.retrieveDock.y }
    })
    assert.equal(retrieve.compact, true)
    assert.ok(retrieve.dock < 0)
    assert.equal(await page.evaluate(() => window.__game.scene.getScene('GameScene')._conditionPresentation.badge.depth), 6001,
      'Retrieve conditions should remain above the compact presentation')
    await page.screenshot({ path: `${output}/01-retrieve-${sizeKey}.png`, animations: 'disabled' })

    // Exercise the relocated Retrieve controls before a controlled fish-ready
    // event. Fish selection remains a QA fixture; HIT is a real pointer input.
    await page.waitForFunction(() => {
      const scene = window.__game.scene.getScene('GameScene')
      return scene.phase === 'retrieve' && scene.time.now >= (scene._retrieveReadyAt ?? 0)
    })
    const retrievePoint = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene')
      const host = scene._castPresentationHost
      const rect = scene.game.canvas.getBoundingClientRect()
      return { twitchX: rect.x + 195 * host.root.scaleX,
        slowX: rect.x + 318 * host.root.scaleX,
        y: rect.y + (746 + host._compactDockOffset) * host.root.scaleY }
    })
    await page.mouse.click(retrievePoint.twitchX, retrievePoint.y)
    await page.mouse.move(retrievePoint.slowX, retrievePoint.y)
    await page.mouse.down()
    await page.waitForTimeout(280)
    await page.mouse.up()
    const decisions = await page.evaluate(() => window.__game.scene.getScene('GameScene').retrieveState?.decisionCount ?? 0)
    assert.ok(decisions >= 2, 'moved Retrieve controls must record two player decisions')
    const entered = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene')
      const runtime = scene.bg?._fishRuntime?.find(item => item?.fishDef && item.gfx?.active)
      if (!runtime || scene.phase !== 'retrieve') return false
      scene._tickFishInterest = () => {}
      scene._beginRetrieveBite(runtime)
      if (scene.phase !== 'wait') return false
      // Pin only the randomized pre-HIT timing. Keep the real HIT pointer,
      // Battle reel, Result action, and phase ownership under test.
      scene.fish = { ...scene.fish, biteRate: 1 }
      scene._killWaitTimers()
      return scene.phase === 'wait' && !scene.waitTapActive
    })
    assert.equal(entered, true, 'controlled fish-ready event did not enter Wait')
    await page.waitForFunction(() => window.__game.scene.getScene('GameScene')._castPresentationHost?._compactWaitActive)
    assert.equal(await page.evaluate(() => window.__game.scene.getScene('GameScene')._castPresentationHost.nodes.waitPrompt.text),
      '合図を待とう')
    await page.screenshot({ path: `${output}/02-wait-${sizeKey}.png`, animations: 'disabled' })
    const hitOpened = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene')
      scene._openHitWindow(5000)
      return scene.phase === 'wait' && scene.waitTapActive && scene.hitHint.visible
    })
    assert.equal(hitOpened, true, 'controlled HIT window did not open')
    // GameScene opens the window before the presentation's next render tick.
    await page.waitForFunction(() => {
      const host = window.__game.scene.getScene('GameScene')._castPresentationHost
      return host.root.visible && host.nodes.waitDock.visible && host.nodes.waitPrompt.text === '今！タップ'
    })
    const wait = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene')
      const host = scene._castPresentationHost
      const bounds = host.nodes.waitPrompt.getBounds()
      const canvas = scene.game.canvas.getBoundingClientRect()
      return { visible: host.root.visible && host.nodes.retrieveField.visible && host.nodes.waitDock.visible,
        characterVisible: host.nodes.characterMotion?.root?.visible,
        prompt: host.nodes.waitPrompt.text, left: bounds.left, right: bounds.right,
        width: scene.scale.width, dockY: host.nodes.waitDock.y,
        canvasTop: canvas.top, canvasBottom: canvas.bottom,
        cueTop: canvas.top + bounds.top, cueBottom: canvas.top + bounds.bottom,
        textHeight: host.nodes.waitPrompt.displayHeight * host.root.scaleY }
    })
    assert.ok(wait.visible && wait.characterVisible && wait.prompt.includes('タップ'),
      `compact HIT cue or fisher is hidden: ${JSON.stringify(wait)}`)
    assert.ok(wait.left >= 0 && wait.right <= wait.width && wait.dockY < 0,
      `compact HIT cue or dock is outside the screen: ${JSON.stringify(wait)}`)
    assert.ok(wait.textHeight >= 25,
      `compact HIT cue is too small: ${JSON.stringify(wait)}`)
    if (safeArea) {
      assert.ok(wait.canvasTop >= 19 && wait.canvasBottom <= 535,
        `HIT canvas ignores simulated safe area: ${JSON.stringify(wait)}`)
      assert.ok(wait.cueTop >= wait.canvasTop && wait.cueBottom <= wait.canvasBottom,
        `HIT cue crosses the safe-area canvas: ${JSON.stringify(wait)}`)
    }
    await page.screenshot({ path: `${output}/02-hit-${sizeKey}.png`, animations: 'disabled' })
    await page.mouse.click(width / 2, Math.round(height * 0.466))
    await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'battle', null, { timeout: 5000 })
    await page.waitForFunction(() => window.__game.scene.getScene('GameScene')._castPresentationHost?._compactBattleActive)
    assert.equal(await page.evaluate(() => window.__game.scene.getScene('GameScene')._conditionPresentation.badge.depth), 96,
      'Battle should restore the environmental badge below its own HUD')
    const battlePoint = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene')
      const host = scene._castPresentationHost
      scene.battleState.isRaging = false
      scene.battleState.nextRageAt = Number.POSITIVE_INFINITY
      scene.battleState.escape = 0
      scene.battleState.reel = Math.min(scene.battleState.reel, 80)
      scene._battleNextReelInputAt = 0
      window.__compactBeforeReel = scene.battleState.reel
      const rect = scene.game.canvas.getBoundingClientRect()
      return { x: rect.x + 195 * host.root.scaleX,
        y: rect.y + (746 + host._compactDockOffset) * host.root.scaleY }
    })
    await page.mouse.click(battlePoint.x, battlePoint.y)
    const reelInput = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene')
      return { phase: scene.phase, reel: scene.battleState?.reel,
        before: window.__compactBeforeReel, raging: scene.battleState?.isRaging }
    })
    assert.ok(reelInput.phase === 'battle' && reelInput.reel > reelInput.before,
      `Battle dial did not apply reel input after phase handoff: ${JSON.stringify(reelInput)}`)
    await page.screenshot({ path: `${output}/02-battle-${sizeKey}.png`, animations: 'disabled' })

    await page.evaluate(() => window.__game.scene.getScene('GameScene')._finishBattle('caught'))
    await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'result')
    assert.equal(await page.evaluate(() => window.__game.scene.getScene('GameScene')._conditionPresentation.badge.depth), 96,
      'Result should retain the normal environmental badge depth')
    const result = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene')
      const host = scene._castPresentationHost
      const rect = scene.game.canvas.getBoundingClientRect()
      return { compact: host._compactResultActive, x: rect.x + 195 * host.root.scaleX,
        y: rect.y + host.nodes.resultPrimarySkin.y * host.root.scaleY }
    })
    assert.equal(result.compact, true)
    await page.waitForFunction(() => {
      const host = window.__game.scene.getScene('GameScene')._castPresentationHost
      return host?.nodes?.resultPrimarySkin?.visible && host?.nodes?.resultFish?.visible
    })
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    // A phase flip can precede Chromium's canvas compositing by a frame.
    // Require a rendered Result capture; keep the blank-frame gate below.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await page.screenshot({ path: `${output}/03-result-${sizeKey}.png`, animations: 'disabled' })
      if (statSync(`${output}/03-result-${sizeKey}.png`).size > 15000) break
      await page.waitForTimeout(200)
    }
    await page.mouse.click(result.x, result.y)
    await page.waitForFunction(() => window.__game.scene.getScenes(true).some(scene => scene.scene.key === 'TownScene'))
    for (const file of [`01-retrieve-${sizeKey}.png`, `02-battle-${sizeKey}.png`, `03-result-${sizeKey}.png`]) {
      assert.ok(statSync(`${output}/${file}`).size > 15000, `${file}: blank browser frame`)
    }
    assert.deepEqual(errors, [])
    console.log(`Compact ${width}x${height}${safeArea ? ' simulated safe area' : ''} Cast → Retrieve controls → controlled bite → real HIT → Battle reel → controlled Result → Town passed`)
  } finally { await page.close() }
  }
} finally { await browser.close() }
