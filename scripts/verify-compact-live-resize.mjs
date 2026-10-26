import assert from 'node:assert/strict'
import { delimiter, join } from 'node:path'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const bin = process.env.PATH.split(delimiter).find(dir =>
  existsSync(join(dir, 'playwright')) || existsSync(join(dir, 'playwright.cmd')))
assert.ok(bin, 'Run via npm exec --package=playwright')
const { chromium } = await import(pathToFileURL(join(bin, '..', 'playwright', 'index.mjs')).href)
const base = process.env.QA_URL ?? 'http://127.0.0.1:4173'
const output = 'artifacts/compact-live-resize'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true })

try {
  for (const phase of ['cast', 'retrieve', 'battle', 'result']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
    const errors = []
    page.on('pageerror', error => { if (error.message !== 'service worker disabled in QA') errors.push(error.message) })
    try {
      await page.goto(`${base}/fishing-game/?qa=1&scene=GameScene&qaMockPhase=${phase}&compactPortrait=1`)
      await page.waitForFunction(expected => {
        const scene = window.__game?.scene?.getScene('GameScene')
        return scene?.phase === expected && scene?._castPresentationHost?.root?.active
      }, phase)
      for (const [width, height, compact] of [[320, 568, true], [390, 844, false], [320, 568, true]]) {
        await page.setViewportSize({ width, height })
        await page.waitForFunction(({ expected, width, compact }) => {
          const scene = window.__game.scene.getScene('GameScene')
          const host = scene._castPresentationHost
          const flag = `_compact${expected[0].toUpperCase()}${expected.slice(1)}Active`
          return scene.scale.width === width && host?.[flag] === compact
        }, { expected: phase, width, compact })
        const state = await page.evaluate(expected => {
          const scene = window.__game.scene.getScene('GameScene')
          const host = scene._castPresentationHost
          const nodes = host.nodes
          const canvas = scene.game.canvas.getBoundingClientRect()
          const scale = host.root.scaleX
          const motion = nodes.characterMotion
          const commands = motion?.line?.commandBuffer ?? []
          const target = motion?.root?.getData('rodLineTargetWorld')
          const localY = expected === 'cast' ? 748 + nodes.castDock.y
            : expected === 'retrieve' ? 746 + nodes.retrieveDock.y
              : expected === 'battle' ? 746 + host._compactDockOffset
                : nodes.resultPrimarySkin.y
          return { canvasWidth: canvas.width, scale,
            battleLabelVisible: nodes.battlePhase.visible,
            lineTargetError: target && commands.length >= 3
              ? Math.hypot(commands.at(-3) + motion.root.x - target.x,
                commands.at(-2) + motion.root.y - target.y)
              : null,
            point: { x: canvas.x + 195 * scale, y: canvas.y + localY * scale } }
        }, phase)
        assert.ok(Math.abs(state.canvasWidth - width) <= 1, `${phase}: canvas width after resize`)
        assert.ok(Math.abs(state.scale - (compact ? 320 / 390 : 1)) < 0.01,
          `${phase}: wrong scale after resize`)
        if (phase === 'battle') assert.equal(state.battleLabelVisible, !compact,
          'decorative BATTLE label did not follow compact resize')
        if (phase !== 'result') assert.ok(state.lineTargetError !== null && state.lineTargetError < 1,
          `${phase}: rendered rod line missed its target after resize (${state.lineTargetError})`)
        if (compact) assert.ok(state.point.y > 380 && state.point.y < height - 40,
          `${phase}: action outside the short viewport`)
      }
      const path = `${output}/${phase}-320.png`
      await page.screenshot({ path, animations: 'disabled' })
      assert.ok(statSync(path).size > 15000, `${phase}: blank browser frame after resize`)
      const point = await page.evaluate(expected => {
        const scene = window.__game.scene.getScene('GameScene')
        const host = scene._castPresentationHost
        const nodes = host.nodes
        const canvas = scene.game.canvas.getBoundingClientRect()
        const scale = host.root.scaleX
        const localX = expected === 'retrieve' ? 318 : 195
        const localY = expected === 'cast' ? 748 + nodes.castDock.y
          : expected === 'retrieve' ? 746 + nodes.retrieveDock.y
            : expected === 'battle' ? 746 + host._compactDockOffset
              : nodes.resultPrimarySkin.y
        return { x: canvas.x + localX * scale, y: canvas.y + localY * scale }
      }, phase)
      if (phase === 'cast') {
        await page.mouse.move(point.x, point.y)
        await page.mouse.down()
        await page.waitForTimeout(260)
        await page.mouse.up()
        await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'retrieve')
      } else if (phase === 'retrieve') {
        await page.waitForFunction(() => {
          const scene = window.__game.scene.getScene('GameScene')
          return scene.time.now >= (scene._retrieveReadyAt ?? 0)
        })
        await page.mouse.move(point.x, point.y)
        await page.mouse.down()
        await page.waitForFunction(() => window.__game.scene.getScene('GameScene').retrieveState?.slowHeld)
        await page.mouse.up()
        assert.equal(await page.evaluate(() => window.__game.scene.getScene('GameScene').retrieveState?.slowHeld), false)
      } else if (phase === 'battle') {
        await page.evaluate(() => {
          const scene = window.__game.scene.getScene('GameScene')
          scene.battleState.isRaging = false
          scene.battleState.nextRageAt = Number.POSITIVE_INFINITY
          scene.battleState.escape = 0
          scene.battleState.reel = Math.min(scene.battleState.reel, 80)
          scene._battleNextReelInputAt = 0
          window.__beforeResizeReel = scene.battleState.reel
        })
        await page.mouse.click(point.x, point.y)
        assert.ok(await page.evaluate(() => {
          const scene = window.__game.scene.getScene('GameScene')
          return scene.phase === 'battle' && scene.battleState.reel > window.__beforeResizeReel
        }), 'Battle reel input missed after resize')
      } else {
        await page.mouse.click(point.x, point.y)
        await page.waitForFunction(() => window.__game.scene.getScenes(true)
          .some(scene => scene.scene.key === 'TownScene'))
      }
      assert.deepEqual(errors, [], `${phase}: browser errors after resize`)
      console.log(`${phase}: 390→320→390→320 layout, screenshot, and real input passed`)
    } finally { await page.close() }
  }

  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  const errors = []
  page.on('pageerror', error => { if (error.message !== 'service worker disabled in QA') errors.push(error.message) })
  try {
    await page.goto(`${base}/fishing-game/?qa=1&scene=GameScene&qaMockPhase=retrieve&compactPortrait=1`)
    await page.waitForFunction(() => window.__game?.scene?.getScene('GameScene')?.phase === 'retrieve')
    const entered = await page.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene')
      const runtime = scene.bg?._fishRuntime?.find(item => item?.fishDef && item.gfx?.active)
      if (!runtime) return false
      scene.retrieveState.decisionCount = 2
      scene._biteReadableReadyAt = scene.time.now - 1
      scene._tickFishInterest = () => {}
      scene._beginRetrieveBite(runtime)
      if (scene.phase !== 'wait') return false
      scene._killWaitTimers()
      return true
    })
    assert.ok(entered, 'Could not enter Wait for resize verification')
    for (const hit of [false, true]) {
      if (hit) await page.evaluate(() => window.__game.scene.getScene('GameScene')._openHitWindow(30000))
      for (const [width, height, compact] of [[390, 844, false], [320, 568, true], [390, 844, false], [320, 568, true]]) {
        await page.setViewportSize({ width, height })
        await page.waitForFunction(({ width, compact }) => {
          const scene = window.__game.scene.getScene('GameScene')
          return scene.scale.width === width && scene._castPresentationHost?._compactWaitActive === compact
        }, { width, compact })
        const state = await page.evaluate(() => {
          const scene = window.__game.scene.getScene('GameScene')
          const host = scene._castPresentationHost
          const cue = host.nodes.waitPrompt
          const bounds = cue.getBounds()
          return { phase: scene.phase, hit: scene.waitTapActive,
            dock: host.root.visible && host.nodes.waitDock.visible,
            fisher: host.nodes.characterMotion?.root?.visible,
            cue: cue.text, cueLeft: bounds.left, cueRight: bounds.right,
            cueHeight: cue.displayHeight * host.root.scaleY }
        })
        assert.equal(state.phase, 'wait')
        assert.equal(state.hit, hit, 'HIT state changed during resize')
        assert.equal(state.dock, compact, `Wait/HIT dock at ${width}x${height}`)
        if (compact) {
          assert.ok(state.fisher, 'Compact Wait/HIT fisher hidden after resize')
          assert.ok(state.cueLeft >= 0 && state.cueRight <= width && state.cueHeight >= 25,
            `Wait/HIT cue outside short screen after resize: ${JSON.stringify(state)}`)
        }
        assert.equal(state.cue.includes('タップ'), hit, 'Wait/HIT cue failed to follow the phase')
      }
    }
    await page.mouse.click(160, 265)
    await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'battle')
    assert.deepEqual(errors, [], 'Wait/HIT browser errors after resize')
    console.log('wait/HIT: 390→320→390→320 layout, cue, and real HIT input passed')
  } finally { await page.close() }
} finally { await browser.close() }
