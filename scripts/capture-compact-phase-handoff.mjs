import assert from 'node:assert/strict'
import { delimiter, join } from 'node:path'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { FISHING_WORLD } from '../fishing-game/js/scenes/components/FishingCameraController.js'

const bin = process.env.PATH.split(delimiter).find(dir => existsSync(join(dir, 'playwright')) || existsSync(join(dir, 'playwright.cmd')))
assert.ok(bin, 'Run via npm exec --package=playwright')
const { chromium } = await import(pathToFileURL(join(bin, '..', 'playwright', 'index.mjs')).href)
const output = process.env.COMPACT_HANDOFF_OUTPUT ?? 'artifacts/compact-fishing-loop/handoff'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true })

async function assertActorClearsLocation(page, phase) {
  const overlap = await page.evaluate(() => {
    const host = window.__game.scene.getScene('GameScene')._castPresentationHost
    const label = host.nodes.location.getBounds()
    const actor = host.nodes.characterMotion
    let count = 0
    // Ignore transparent sprite padding; only visible actor pixels can obscure
    // the location text. The matrix maps texture pixels into the host's world.
    for (const image of [actor.poseFront, actor.hair].filter(node => node?.visible && node.alpha > 0)) {
      const source = image.texture.getSourceImage()
      const canvas = document.createElement('canvas')
      canvas.width = source.width; canvas.height = source.height
      const context = canvas.getContext('2d')
      context.drawImage(source, 0, 0)
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
      const matrix = image.getWorldTransformMatrix()
      for (let y = 0; y < canvas.height; y += 2) for (let x = 0; x < canvas.width; x += 2) {
        if (pixels[(y * canvas.width + x) * 4 + 3] <= 32) continue
        const point = matrix.transformPoint(x - image.displayOriginX, y - image.displayOriginY)
        if (point.x >= label.left && point.x <= label.right && point.y >= label.top && point.y <= label.bottom) count++
      }
    }
    return count
  })
  assert.equal(overlap, 0, `${phase}: opaque actor pixels cover the location label`)
}

async function assertWaitLineOnLure(page, appearance) {
  const state = await page.evaluate(() => {
    const host = window.__game.scene.getScene('GameScene')._castPresentationHost
    const motion = host.nodes.characterMotion, lure = host.nodes.retrieveLure
    const target = motion.root.getData('rodLineTargetWorld')
    const commands = motion.line.commandBuffer
    return { targetError: lure && target ? Math.hypot(target.x - lure.x, target.y - lure.y) : null,
      lineError: lure && commands.length >= 3
        ? Math.hypot(commands.at(-3) + motion.root.x - lure.x, commands.at(-2) + motion.root.y - lure.y) : null }
  })
  assert.ok(state.targetError !== null && state.targetError < 1 && state.lineError !== null && state.lineError < 1,
    `${appearance}: Wait line missed the visible lure: ${JSON.stringify(state)}`)
}

async function assertCompactQuay(page, appearance) {
  const state = await page.evaluate(() => {
    const host = window.__game.scene.getScene('GameScene')._castPresentationHost
    const actor = host.nodes.characterMotion, quay = host.nodes.retrieveQuay
    const children = host.nodes.retrieveField.list
    return { visible: quay?.visible, footY: actor.root.y + actor.poseFront.y,
      quayY: quay?.y, quayOrder: children.indexOf(quay),
      waterOrder: children.indexOf(host.nodes.retrieveFishShadows[0]?.parentContainer),
      lureOrder: children.indexOf(host.nodes.retrieveLure) }
  })
  assert.ok(state.visible && Math.abs(state.footY - state.quayY - 40) < 0.01,
    `${appearance}: compact quay is not aligned to the fisher: ${JSON.stringify(state)}`)
  assert.ok(state.waterOrder < state.quayOrder && state.quayOrder < state.lureOrder,
    `${appearance}: compact quay covers the lure or exposes fish over land: ${JSON.stringify(state)}`)
}

async function assertRetrieveLurePath(page, appearance) {
  const states = await page.evaluate(pxPerMeter => {
    const scene = window.__game.scene.getScene('GameScene')
    const host = scene._castPresentationHost
    const meters = Math.hypot(scene.bobber.x - scene.anchorX, scene.bobber.y - scene.anchorY) / pxPerMeter
    const original = host._retrievePresentation.startMeters
    const states = []
    for (const progress of [0, 0.5, 0.95]) {
      host._retrievePresentation.startMeters = meters / (1 - progress)
      host.sync()
      const lure = host.nodes.retrieveLure
      const quay = host.nodes.retrieveQuay
      const sampleX = Math.floor(lure.x - 24 - quay.x)
      const sampleY = Math.floor(lure.y + 9 - quay.y)
      states.push({ progress, x: lure.x, y: lure.y, dockTop: 620 + host._compactDockOffset,
        quayAlpha: scene.textures.getPixelAlpha(sampleX, sampleY, quay.texture.key),
        target: host.nodes.characterMotion.root.getData('rodLineTargetWorld') })
    }
    host._retrievePresentation.startMeters = original
    host.sync()
    return states
  }, FISHING_WORLD.pxPerMeter)
  for (const state of states) {
    assert.ok(state.y + 12 < state.dockTop, `${appearance}: lure is hidden by controls: ${JSON.stringify(state)}`)
    assert.ok(!state.quayAlpha, `${appearance}: lure overlaps the quay: ${JSON.stringify(state)}`)
    assert.ok(Math.hypot(state.target.x - state.x, state.target.y - state.y) < 1,
      `${appearance}: line misses the lure: ${JSON.stringify(state)}`)
  }
}

async function assertBattleFishClearsActor(page) {
  const state = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('GameScene')
    const host = scene._castPresentationHost
    const actor = host.nodes.characterMotion
    const paint = images => {
      const canvas = document.createElement('canvas')
      canvas.width = scene.scale.width; canvas.height = scene.scale.height
      const context = canvas.getContext('2d')
      for (const image of images.filter(node => node?.visible && node.alpha > 0)) {
        const matrix = image.getWorldTransformMatrix()
        context.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f)
        context.drawImage(image.texture.getSourceImage(), -image.displayOriginX, -image.displayOriginY)
      }
      return context.getImageData(0, 0, canvas.width, canvas.height).data
    }
    const actorPixels = paint([actor.poseFront, actor.hair])
    const fishPixels = paint([host.nodes.battleFish])
    let overlap = 0, actorCount = 0, fishCount = 0
    for (let i = 3; i < actorPixels.length; i += 4) {
      if (actorPixels[i] > 32) actorCount++
      if (fishPixels[i] > 32) fishCount++
      if (actorPixels[i] > 32 && fishPixels[i] > 32) overlap++
    }
    const bounds = host.nodes.battleFish.getBounds()
    return { overlap, actorCount, fishCount, left: bounds.left, right: bounds.right,
      top: bounds.top, bottom: bounds.bottom, width: scene.scale.width, height: scene.scale.height }
  })
  assert.ok(state.actorCount > 100 && state.fishCount > 100, `Battle actor or fish is missing: ${JSON.stringify(state)}`)
  assert.ok(state.overlap <= 3, `Battle fish covers the actor: ${JSON.stringify(state)}`)
  assert.ok(state.left >= 0 && state.right <= state.width && state.top >= 0 && state.bottom <= state.height,
    `Battle fish crosses the viewport: ${JSON.stringify(state)}`)
}

try {
  for (const [width, height, safeArea, appearance] of [[320, 480, false], [320, 568, false], [375, 667, false], [320, 568, true], [320, 480, true], [320, 480, true, 'cute-a-01'], [320, 480, true, 'cute-b-01'], [320, 568, true, 'cute-b-01'], [375, 667, false, 'cute-a-01']]) {
  const sizeKey = `${safeArea ? `${width}x${height}-safe-area` : height === 480 ? '320x480' : width}${appearance ? `-${appearance}` : ''}`
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 })
  if (appearance) await page.addInitScript(id => localStorage.setItem('ainan_character_appearance', id), appearance)
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
    if (appearance) await page.waitForFunction(expected => {
      const actor = window.__game?.scene?.getScene('GameScene')?._castPresentationHost?.nodes?.characterMotion
      return actor?.ready && actor.cute && actor.appearance === expected
    }, appearance)
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
      const actor = scene._castPresentationHost.nodes.characterMotion
      return { phase: scene.phase, compact: scene._castPresentationHost._compactRetrieveActive,
        dock: scene._castPresentationHost.nodes.retrieveDock.y,
        actorWidth: actor.poseFront.displayWidth, actorHeight: actor.poseFront.displayHeight }
    })
    assert.equal(retrieve.compact, true)
    if (appearance) await assertCompactQuay(page, appearance)
    if (appearance) await assertRetrieveLurePath(page, appearance)
    assert.ok(retrieve.dock < 0)
    assert.equal(await page.evaluate(() => window.__game.scene.getScene('GameScene')._conditionPresentation.badge.depth), 6001,
      'Retrieve conditions should remain above the compact presentation')
    if (safeArea && height === 480) await assertActorClearsLocation(page, 'Retrieve')
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
    await page.waitForFunction(() => {
      const host = window.__game.scene.getScene('GameScene')._castPresentationHost
      return host?._compactWaitActive && host.nodes.characterMotion?.layoutPhase === 'wait'
    })
    if (appearance) {
      await assertCompactQuay(page, appearance)
      const distance = await page.evaluate(pxPerMeter => {
        const scene = window.__game.scene.getScene('GameScene')
        return { label: scene._castPresentationHost.nodes.distance.text,
          meters: Math.hypot(scene.bobber.x - scene.anchorX, scene.bobber.y - scene.anchorY) / pxPerMeter }
      }, FISHING_WORLD.pxPerMeter)
      assert.match(distance.label, /^\d+\.\dm$/, `${appearance}: Wait distance is missing`)
      assert.ok(Math.abs(Number.parseFloat(distance.label) - distance.meters) < 0.2,
        `${appearance}: Wait distance does not match the lure: ${JSON.stringify(distance)}`)
      const actorState = await page.evaluate(() => {
        const host = window.__game.scene.getScene('GameScene')._castPresentationHost
        const actor = host.nodes.characterMotion.poseFront
        return { width: actor.displayWidth, height: actor.displayHeight }
      })
      assert.ok(Math.abs(actorState.width - retrieve.actorWidth) < 0.01 && Math.abs(actorState.height - retrieve.actorHeight) < 0.01,
        `${appearance}: actor size changed between Retrieve and Wait`)
      await assertWaitLineOnLure(page, appearance)
      await page.setViewportSize({ width: 390, height: 844 })
      await page.waitForFunction(() => {
        const scene = window.__game.scene.getScene('GameScene')
        return scene.phase === 'wait' && scene.scale.width === 390 && !scene._castPresentationHost?._compactWaitActive
          && !scene._castPresentationHost?.nodes.retrieveQuay?.visible
      })
      await page.setViewportSize({ width, height })
      await page.waitForFunction(expectedWidth => {
        const scene = window.__game.scene.getScene('GameScene')
        return scene.phase === 'wait' && scene.scale.width === expectedWidth && scene._castPresentationHost?._compactWaitActive
      }, width)
      await assertWaitLineOnLure(page, appearance)
      await assertCompactQuay(page, appearance)
    }
    assert.equal(await page.evaluate(() => window.__game.scene.getScene('GameScene')._castPresentationHost.nodes.waitPrompt.text),
      '合図を待とう')
    if (safeArea && height === 480) await assertActorClearsLocation(page, 'Wait')
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
    if (appearance) await assertWaitLineOnLure(page, appearance)
    if (safeArea) {
      assert.ok(wait.canvasTop >= 19 && wait.canvasBottom <= height - 33,
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
    if (safeArea && height === 480) await assertBattleFishClearsActor(page)
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
    console.log(`Compact ${width}x${height}${safeArea ? ' simulated safe area' : ''}${appearance ? ` ${appearance}` : ''} Cast → Retrieve controls → controlled bite → real HIT → Battle reel → controlled Result → Town passed`)
  } finally { await page.close() }
  }

  for (const safeArea of [false, true]) {
    for (const hit of [false, true]) {
      const page = await browser.newPage({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2 })
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
        await page.goto(`${process.env.QA_URL ?? 'http://127.0.0.1:4173'}/fishing-game/?qa=1&scene=GameScene&qaMockPhase=retrieve&compactPortrait=1`)
        await page.waitForFunction(() => window.__game?.scene?.getScene('GameScene')?.phase === 'retrieve')
        const entered = await page.evaluate(hit => {
          const scene = window.__game.scene.getScene('GameScene')
          const fish = scene.bg?._fishRuntime?.find(item => item?.fishDef && item.gfx?.active)
          if (!fish) return false
          scene.retrieveState.decisionCount = 2
          scene._biteReadableReadyAt = scene.time.now - 1
          scene._tickFishInterest = () => {}
          scene._beginRetrieveBite(fish)
          if (scene.phase !== 'wait') return false
          scene.fish = { ...scene.fish, biteRate: 1 }
          scene._killWaitTimers()
          if (hit) scene._openHitWindow(30000)
          return scene.phase === 'wait'
        }, hit)
        assert.ok(entered, 'Could not enter controlled Wait for back-button check')
        await page.waitForFunction(hit => {
          const scene = window.__game.scene.getScene('GameScene')
          const host = scene._castPresentationHost
          return host?._compactWaitActive && host.root.visible && host.nodes.waitDock.visible
            && scene.waitTapActive === hit && host.nodes.waitPrompt.text.includes('タップ') === hit
        }, hit)
        const point = await page.evaluate(() => {
          const scene = window.__game.scene.getScene('GameScene')
          const host = scene._castPresentationHost
          const rect = scene.game.canvas.getBoundingClientRect()
          return { x: rect.x + host.root.x + 33 * host.root.scaleX,
            y: rect.y + host.root.y + 40 * host.root.scaleY }
        })
        await page.mouse.click(point.x, point.y)
        await page.waitForFunction(() => window.__game.scene.getScenes(true)
          .some(scene => scene.scene.key === 'MapScene'), null, { timeout: 5000 })
        assert.deepEqual(errors, [])
        console.log(`Compact ${hit ? 'HIT' : 'Wait'} back to Map${safeArea ? ' with simulated safe area' : ''} passed`)
      } finally { await page.close() }
    }
  }

  for (const fish of ['aji', 'buri', 'kue']) {
    const page = await browser.newPage({ viewport: { width: 320, height: 480 }, deviceScaleFactor: 2 })
    try {
      await page.route('**/fishing-game/**', async route => {
        if (route.request().resourceType() !== 'document') return route.continue()
        const response = await route.fetch()
        const body = (await response.text()).replace('</head>',
          '<style>:root { --safe-top: 20px !important; --safe-bottom: 34px !important; }</style></head>')
        await route.fulfill({ response, body })
      })
      await page.goto(`${process.env.QA_URL ?? 'http://127.0.0.1:4173'}/fishing-game/?qa=1&scene=GameScene&qaAction=battle&qaFish=${fish}&compactPortrait=1`)
      await page.waitForFunction(fish => {
        const scene = window.__game?.scene?.getScene('GameScene')
        const host = scene?._castPresentationHost
        return scene?.phase === 'battle' && host?._compactBattleActive
          && host.nodes.characterMotion?.ready && host.nodes.battleFish.texture.key === `fish_hero_${fish}`
      }, fish)
      await page.evaluate(() => {
        const scene = window.__game.scene.getScene('GameScene')
        scene.battleState.isRaging = false
        scene.battleState.nextRageAt = Number.POSITIVE_INFINITY
        scene._castPresentationHost.sync()
      })
      await assertBattleFishClearsActor(page)
      const path = `${output}/battle-${fish}-320x480-safe-area.png`
      await page.screenshot({ path, animations: 'disabled' })
      assert.ok(statSync(path).size > 15000, `${fish}: blank safe-area Battle frame`)
      console.log(`320x480 simulated safe area Battle ${fish}: fish and actor separation passed`)
    } finally { await page.close() }
  }

  for (const fish of ['aji', 'buri', 'kue']) {
    const page = await browser.newPage({ viewport: { width: 320, height: 480 }, deviceScaleFactor: 2 })
    try {
      await page.route('**/fishing-game/**', async route => {
        if (route.request().resourceType() !== 'document') return route.continue()
        const response = await route.fetch()
        const body = (await response.text()).replace('</head>',
          '<style>:root { --safe-top: 20px !important; --safe-bottom: 34px !important; }</style></head>')
        await route.fulfill({ response, body })
      })
      await page.goto(`${process.env.QA_URL ?? 'http://127.0.0.1:4173'}/fishing-game/?qa=1&scene=GameScene&qaAction=battle&qaJump=1&qaFish=${fish}&compactPortrait=1`)
      await page.waitForFunction(fish => {
        const scene = window.__game?.scene?.getScene('GameScene')
        const host = scene?._castPresentationHost
        return scene?.phase === 'battle' && host?._compactBattleActive && host.nodes.characterMotion?.ready
          && host.nodes.battleFish.texture.key === `fish_jump_${fish}`
      }, fish)
      await page.evaluate(() => window.__game.scene.getScene('GameScene').scene.pause())
      for (const elapsed of [0, 250, 500, 700]) {
        await page.evaluate(({ fish, elapsed }) => {
          const scene = window.__game.scene.getScene('GameScene')
          const host = scene._castPresentationHost
          scene.battleState.isRaging = true
          host._jumpRageFishId = fish
          host._jumpRageStartedAt = scene.time.now - elapsed
          host.sync()
        }, { fish, elapsed })
        await assertBattleFishClearsActor(page)
        if (elapsed === 250) {
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
          const airborne = `${output}/rage-airborne-${fish}-320x480-safe-area.png`
          await page.screenshot({ path: airborne, animations: 'disabled' })
          assert.ok(statSync(airborne).size > 15000, `${fish}: blank safe-area airborne frame`)
        }
      }
      const path = `${output}/rage-${fish}-320x480-safe-area.png`
      await page.screenshot({ path, animations: 'disabled' })
      assert.ok(statSync(path).size > 15000, `${fish}: blank safe-area rage frame`)
      console.log(`320x480 simulated safe area rage ${fish}: four motion offsets passed`)
    } finally { await page.close() }
  }
} finally { await browser.close() }
