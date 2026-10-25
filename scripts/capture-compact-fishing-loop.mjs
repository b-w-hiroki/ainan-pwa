import assert from 'node:assert/strict'
import { delimiter, join } from 'node:path'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const bin = process.env.PATH.split(delimiter).find(dir => existsSync(join(dir, 'playwright')) || existsSync(join(dir, 'playwright.cmd')))
assert.ok(bin, 'Run via npm exec --package=playwright')
const { chromium } = await import(pathToFileURL(join(bin, '..', 'playwright', 'index.mjs')).href)
const base = process.env.QA_URL ?? 'http://127.0.0.1:4173'
const output = 'artifacts/compact-fishing-loop'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true })

try {
  for (const [width, height] of (process.env.QA_SAFE_ONLY === '1' ? [] : [[320, 568], [375, 667], [390, 844], [430, 932]])) {
    for (const phase of ['cast', 'retrieve', 'battle', 'result']) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 })
      const errors = []
      page.on('pageerror', error => { if (error.message !== 'service worker disabled in QA') errors.push(error.message) })
      try {
        await page.goto(`${base}/fishing-game/?qa=1&scene=GameScene&qaMockPhase=${phase}&compactPortrait=1`)
        await page.waitForFunction(expected => {
          const scene = window.__game?.scene?.getScene('GameScene')
          return scene?.phase === expected && scene?._castPresentationHost?.root?.active
        }, phase)
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
        const state = await page.evaluate(() => {
          const scene = window.__game.scene.getScene('GameScene')
          const host = scene._castPresentationHost
          const n = host.nodes
          const canvas = scene.game.canvas.getBoundingClientRect()
          const scale = host.root.scaleX
          const localToScreen = (x, y) => ({ x: canvas.x + x * scale, y: canvas.y + y * scale })
          return {
            phase: scene.phase, scale, canvas: { x: canvas.x, y: canvas.y, width: canvas.width, height: canvas.height },
            dockOffset: host._compactDockOffset ?? 0,
            retrieveDockVisible: n.retrieveDock.visible,
            battleDockVisible: n.battleCompactDock.visible,
            resultBackingVisible: n.resultCompactBacking.visible,
            retrieveButton: localToScreen(318, 746 + (host._compactRetrieveActive ? host._compactDockOffset : 0)),
            battleInstruction: localToScreen(195, n.battleInstruction.y),
            battleButton: localToScreen(195, 746 + (host._compactBattleActive ? host._compactDockOffset : 0)),
            resultPrimary: localToScreen(195, n.resultPrimarySkin?.y ?? n.resultTownMaskText.y),
            resultSecondary: localToScreen(195, n.resultSecondarySkin?.y ?? n.resultRetryText.y),
            resultCard: localToScreen(195, 440 + n.resultCard.y),
            resultCardBottom: localToScreen(195, 572 + n.resultCard.y),
            resultPrimaryTop: localToScreen(195, (n.resultPrimarySkin?.y ?? n.resultTownMaskText.y) - 44),
            resultFish: localToScreen(n.resultFish.x, n.resultFish.y),
            resultFishWidth: n.resultFish.displayWidth,
            battleFish: localToScreen(n.battleFish.x, n.battleFish.y),
            battleActorTop: n.characterMotion?.poseFront?.getBounds()?.y,
            conditionBadge: scene._conditionPresentation?.badge && {
              depth: scene._conditionPresentation.badge.depth,
              y: scene._conditionPresentation.badge.y,
              fontPx: parseFloat(scene._conditionPresentation.badge.style.fontSize),
            },
            battleTextSize: n.battleInstruction.style.fontSize,
            battleTextPx: parseFloat(n.battleInstruction.style.fontSize) * scale,
            resultActionTextPx: parseFloat(n.resultTownMaskText.style.fontSize) * n.resultTownMaskText.scaleX * scale,
          }
        })
        assert.equal(state.phase, phase)
        assert.ok(Math.abs(state.canvas.width - width) <= 1, `${phase}: width not filled`)
        assert.ok(Math.abs(state.scale - width / 390) < 0.01, `${phase}: width scale missing`)
        if (width < 390) {
          assert.ok(state.dockOffset < 0, `${phase}: dock did not move`)
          if (phase === 'cast' || phase === 'retrieve') {
            assert.ok(state.conditionBadge?.depth > 6000 && state.conditionBadge.y >= 90
              && state.conditionBadge.fontPx >= 13, `${phase}: conditions are hidden behind the header`)
          }
          if (phase === 'retrieve') {
            assert.equal(state.retrieveDockVisible, true)
            assert.ok(state.retrieveButton.y < height - 40 && state.retrieveButton.y > height - 160)
          }
          if (phase === 'battle') {
            assert.equal(state.battleDockVisible, true)
            assert.ok(state.battleTextPx >= 12, 'Battle instruction is too small on screen')
            assert.ok(state.battleInstruction.y < height - 30 && state.battleInstruction.y > height - 190)
            assert.ok(state.battleFish.y < state.battleInstruction.y - 80, 'fish and battle instructions overlap')
            assert.ok(state.battleFish.y + 40 < state.battleActorTop,
              'Battle fish did not clear the player on the short screen')
          }
          if (phase === 'result') {
            assert.equal(state.resultBackingVisible, true)
            assert.ok(state.resultActionTextPx >= 16, 'Result action label is too small on screen')
            assert.ok(state.resultFish.y < state.resultCard.y - 40, 'fish and result card overlap')
            assert.ok(state.resultFish.x >= 280 * state.scale,
              'Result fish still covers the fisher')
            assert.ok(state.resultFishWidth <= 205, 'compact Result fish width was not adjusted')
            assert.ok(state.resultCardBottom.y + 8 < state.resultPrimaryTop.y, 'result card and primary action overlap')
            assert.ok(state.resultSecondary.y < height - 35, 'second result action off screen')
          }
        }
        const path = `${output}/${phase}-${width}.png`
        await page.screenshot({ path, animations: 'disabled' })
        assert.ok(statSync(path).size > 15000, `${phase}: blank browser frame`)
        if (phase === 'retrieve' && width < 390) {
          await page.waitForFunction(() => {
            const scene = window.__game.scene.getScene('GameScene')
            return scene.phase === 'retrieve' && scene.time.now >= (scene._retrieveReadyAt ?? 0)
          })
          await page.mouse.move(state.retrieveButton.x, state.retrieveButton.y)
          await page.mouse.down()
          assert.equal(await page.evaluate(() => window.__game.scene.getScene('GameScene').retrieveState?.slowHeld), true,
            'moved Retrieve control did not accept a hold')
          await page.mouse.up()
          assert.equal(await page.evaluate(() => window.__game.scene.getScene('GameScene').retrieveState?.slowHeld), false)
          const back = await page.evaluate(() => {
            const scene = window.__game.scene.getScene('GameScene')
            const host = scene._castPresentationHost
            const rect = scene.game.canvas.getBoundingClientRect()
            return { x: rect.x + (host.root.x + 33 * host.root.scaleX),
              y: rect.y + (host.root.y + 40 * host.root.scaleY) }
          })
          await page.mouse.click(back.x, back.y)
          await page.waitForFunction(() => window.__game.scene.getScenes(true).some(scene => scene.scene.key === 'MapScene'))
        }
        if (phase === 'cast' && width < 390) {
          await page.mouse.click(state.canvas.x + 33 * state.scale, state.canvas.y + 40 * state.scale)
          await page.waitForFunction(() => window.__game.scene.getScenes(true).some(scene => scene.scene.key === 'MapScene'))
        }
        if (phase === 'battle' && width < 390) {
          const before = await page.evaluate(() => {
            const scene = window.__game.scene.getScene('GameScene')
            scene.battleState.isRaging = false
            scene.battleState.nextRageAt = Number.POSITIVE_INFINITY
            scene._battleNextReelInputAt = 0
            return scene.battleState.reel
          })
          await page.mouse.click(state.battleButton.x, state.battleButton.y)
          const after = await page.evaluate(() => window.__game.scene.getScene('GameScene').battleState.reel)
          assert.ok(after > before, 'moved Battle dial did not apply the existing reel action')
        }
        if (phase === 'result' && width < 390) {
          await page.mouse.move(state.resultPrimary.x, state.resultPrimary.y)
          await page.mouse.down()
          await page.mouse.up()
          await page.waitForFunction(() => window.__game?.scene?.getScenes(true)
            .some(scene => scene.scene.key === 'TownScene'))
          const navigation = await page.evaluate(() => {
            const game = window.__game
            const scene = game.scene.getScene('GameScene')
            return { activeScenes: game.scene.getScenes(true).map(item => item.scene.key),
              phase: scene.phase, action: scene._castPresentationHost?._resultPointerAction ?? null }
          })
          assert.ok(navigation.activeScenes.includes('TownScene'), `Result primary action failed: ${JSON.stringify(navigation)}`)
        }
        assert.deepEqual(errors, [], `${phase}: browser errors`)
        console.log(`${phase} ${width}x${height}: geometry, screenshot${phase === 'retrieve' || phase === 'result' ? ', input' : ''} passed`)
      } finally { await page.close() }
    }
  }
  const safeArea = await browser.newPage({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2 })
  try {
    await safeArea.route('**/fishing-game/**', async route => {
      if (route.request().resourceType() !== 'document') return route.continue()
      const response = await route.fetch()
      const body = (await response.text()).replace('</head>',
        '<style>:root { --safe-top: 20px !important; --safe-bottom: 34px !important; }</style></head>')
      await route.fulfill({ response, body })
    })
    for (const phase of ['cast', 'retrieve', 'battle', 'result']) {
      await safeArea.goto(`${base}/fishing-game/?qa=1&scene=GameScene&qaMockPhase=${phase}&compactPortrait=1`)
      await safeArea.waitForFunction(expected => window.__game?.scene?.getScene('GameScene')?.phase === expected, phase)
      const inset = await safeArea.evaluate(() => {
        const scene = window.__game.scene.getScene('GameScene')
        const host = scene._castPresentationHost
        const canvas = scene.game.canvas.getBoundingClientRect()
        const container = document.getElementById('game-container')
        const phase = scene.phase
        const actionY = phase === 'result' ? host.nodes.resultSecondarySkin.y
          : 746 + (host._compactDockOffset ?? 0)
        return { phase, top: canvas.top, bottom: canvas.bottom,
          containerPadding: getComputedStyle(container).padding,
          actionBottom: canvas.top + (actionY + 44) * host.root.scaleY }
      })
      assert.ok(inset.top >= 19 && inset.bottom <= 535,
        `${phase}: canvas ignores simulated safe area: ${JSON.stringify(inset)}`)
      assert.ok(inset.actionBottom < inset.bottom - 20,
        `${phase}: action enters bottom safe area: ${JSON.stringify(inset)}`)
      const path = `${output}/${phase}-safe-area-320.png`
      await safeArea.screenshot({ path, animations: 'disabled' })
      assert.ok(statSync(path).size > 15000, `${phase}: blank safe-area frame`)
      console.log(`320x568 simulated safe area: ${phase} canvas and controls passed`)
    }
  } finally { await safeArea.close() }
  for (const width of [320, 375]) {
    for (const action of (width === 320 ? ['retry', 'prepare', 'port'] : ['capture'])) {
      const page = await browser.newPage({ viewport: { width, height: width === 320 ? 568 : 667 }, deviceScaleFactor: 2 })
      try {
        await page.goto(`${base}/fishing-game/?qa=1&scene=GameScene&qaMockPhase=battle&compactPortrait=1`)
        await page.waitForFunction(() => window.__game?.scene?.getScene('GameScene')?.phase === 'battle')
        await page.evaluate(() => window.__game.scene.getScene('GameScene')._finishBattle('escaped'))
        await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'result')
        await page.waitForFunction(() => !window.__game.scene.getScene('GameScene').cameras.main.flashEffect.isRunning)
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
        const escaped = await page.evaluate(kind => {
          const scene = window.__game.scene.getScene('GameScene')
          const host = scene._castPresentationHost
          const n = host.nodes
          const canvas = scene.game.canvas.getBoundingClientRect()
          const scale = host.root.scaleX
          const local = (x, y) => ({ x: canvas.x + x * scale, y: canvas.y + y * scale })
          return { outcome: scene._castPresentationOutcome, compact: host._compactResultActive,
            title: n.resultGet.text, fishVisible: n.resultFish.visible,
            labels: [n.resultTownMaskText.text, n.resultFailureEquip.text, n.resultFailurePort.text],
            labelPx: [n.resultTownMaskText, n.resultFailureEquip, n.resultFailurePort]
              .map(node => parseFloat(node.style.fontSize) * node.scaleX * scale),
            labelWidths: [n.resultTownMaskText, n.resultFailureEquip, n.resultFailurePort]
              .map(node => node.width * node.scaleX),
            advicePx: parseFloat(n.resultSize.style.fontSize) * n.resultSize.scaleX * scale,
            cardBottom: local(195, 572 + n.resultCard.y).y,
            primaryTop: local(195, n.resultPrimarySkin.y - 44).y,
            button: kind === 'retry' ? local(195, n.resultPrimarySkin.y)
              : kind === 'prepare' ? local(101, n.resultFailureLeftSkin.y)
                : local(289, n.resultFailureRightSkin.y),
            bottom: canvas.bottom }
        }, action)
        assert.equal(escaped.outcome, 'escaped')
        assert.equal(escaped.compact, true)
        assert.equal(escaped.title, 'ESCAPED')
        assert.equal(escaped.fishVisible, false)
        assert.ok(escaped.labels.every(Boolean), `escaped Result labels missing: ${JSON.stringify(escaped)}`)
        assert.ok(escaped.labelPx.every(size => size >= 16), `escaped Result label too small: ${JSON.stringify(escaped)}`)
        assert.ok(escaped.advicePx >= 13, `escaped Result advice too small: ${JSON.stringify(escaped)}`)
        assert.ok(escaped.labelWidths[0] <= 340 && escaped.labelWidths.slice(1).every(size => size <= 160),
          `escaped Result label exceeds its button: ${JSON.stringify(escaped)}`)
        assert.ok(escaped.cardBottom + 8 < escaped.primaryTop, 'escaped Result card and action overlap')
        assert.ok(escaped.button.y < escaped.bottom - 30, 'escaped Result action off screen')
        if (action === 'capture' || (width === 320 && action === 'retry')) {
          const path = `${output}/result-escaped-${width}.png`
          await page.screenshot({ path, animations: 'disabled' })
          assert.ok(statSync(path).size > 15000, 'escaped Result browser frame blank')
        }
        if (action !== 'capture') {
          await page.mouse.click(escaped.button.x, escaped.button.y)
          const expected = action === 'retry' ? 'cast' : action === 'prepare' ? 'UpgradeScene' : 'HomeScene'
          await page.waitForFunction(target => {
            const game = window.__game
            return target === 'cast' ? game.scene.getScene('GameScene').phase === 'cast'
              : game.scene.getScenes(true).some(scene => scene.scene.key === target)
          }, expected)
        }
        console.log(`${width}x${width === 320 ? 568 : 667} escaped Result ${action}: layout and input passed`)
      } finally { await page.close() }
    }
  }
  for (const [width, height] of [[320, 568], [375, 667]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 })
    try {
      await page.goto(`${base}/fishing-game/?qa=1&scene=GameScene&qaMockPhase=battle&compactPortrait=1&qaBoss=harborRunner&qaFreshBoss=1`)
      await page.waitForFunction(() => window.__game?.scene?.getScene('GameScene')?.phase === 'battle')
      await page.evaluate(() => window.__game.scene.getScene('GameScene')._finishBattle('caught'))
      await page.waitForFunction(() => window.__game.scene.getScene('GameScene')._bossRecordBadge?.active)
      await page.waitForFunction(() => !window.__game.scene.getScene('GameScene').cameras.main.flashEffect.isRunning)
      const badge = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('GameScene')
        const host = scene._castPresentationHost
        const notice = scene._bossRecordBadge
        return { compact: host._compactResultActive, x: notice.x,
          badgeBottom: notice.getBounds().bottom,
          cardTop: host.nodes.resultInfoSkin.getBounds().top,
          actionTop: host.nodes.resultPrimarySkin.getBounds().top }
      })
      assert.equal(badge.compact, true)
      assert.ok(badge.x <= 100 && badge.badgeBottom < badge.cardTop,
        `compact boss badge covers the Result card: ${JSON.stringify(badge)}`)
      assert.ok(badge.badgeBottom < badge.actionTop,
        `compact boss badge covers the Result action: ${JSON.stringify(badge)}`)
      const path = `${output}/result-boss-${width}.png`
      await page.screenshot({ path, animations: 'disabled' })
      assert.ok(statSync(path).size > 15000, 'compact boss Result browser frame blank')
      console.log(`${width}x${height} compact boss Result badge: card and action clear`)
    } finally { await page.close() }
  }
  for (const action of ['back', 'retry']) {
    const page = await browser.newPage({ viewport: { width: 320, height: 568 } })
    try {
      await page.goto(`${base}/fishing-game/?qa=1&scene=GameScene&qaMockPhase=result&compactPortrait=1`)
      await page.waitForFunction(() => window.__game?.scene?.getScene('GameScene')?.phase === 'result')
      const point = await page.evaluate(kind => {
        const scene = window.__game.scene.getScene('GameScene')
        const host = scene._castPresentationHost
        const canvas = scene.game.canvas.getBoundingClientRect()
        if (kind === 'retry') {
          const original = host.adapter.resultRetry.bind(host.adapter)
          host.adapter.resultRetry = () => { window.__compactRetryCalled = true; return original() }
        }
        return { x: canvas.x + (kind === 'back' ? 33 : 195) * host.root.scaleX,
          y: canvas.y + (kind === 'back' ? 40 : host.nodes.resultSecondarySkin.y) * host.root.scaleY }
      }, action)
      await page.mouse.click(point.x, point.y)
      if (action === 'back') {
        await page.waitForFunction(() => window.__game.scene.getScenes(true).some(scene => scene.scene.key === 'MapScene'))
      } else {
        await page.waitForFunction(() => window.__compactRetryCalled === true)
      }
      console.log(`320x568 Result ${action}: input passed`)
    } finally { await page.close() }
  }
  const ordinary = await browser.newPage({ viewport: { width: 320, height: 568 } })
  try {
    await ordinary.goto(`${base}/fishing-game/?qa=1&scene=GameScene&qaMockPhase=cast`)
    await ordinary.waitForFunction(() => window.__game?.scene?.getScene('GameScene')?._castPresentationHost?.root?.active)
    const width = await ordinary.evaluate(() => window.__game.canvas.getBoundingClientRect().width)
    assert.ok(width < 280, 'ordinary short-screen play unexpectedly switched to full width')
    console.log('320x568 ordinary Cast: existing FIT layout retained')
  } finally { await ordinary.close() }
} finally { await browser.close() }
