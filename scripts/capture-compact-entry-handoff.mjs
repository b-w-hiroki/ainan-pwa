import assert from 'node:assert/strict'
import { delimiter, join } from 'node:path'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const bin = process.env.PATH.split(delimiter).find(dir => existsSync(join(dir, 'playwright')) || existsSync(join(dir, 'playwright.cmd')))
assert.ok(bin, 'Run via npm exec --package=playwright')
const { chromium } = await import(pathToFileURL(join(bin, '..', 'playwright', 'index.mjs')).href)
const output = 'artifacts/compact-fishing-loop/entry'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true })

try {
  for (const [width, height, safeArea] of [[320, 480, false], [320, 568, false], [320, 568, true], [375, 667, false], [390, 844, false], [430, 932, false]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 })
    const label = safeArea ? `${width}-safe` : height === 480 ? '320x480' : String(width)
    const errors = []
    page.on('pageerror', error => { if (error.message !== 'service worker disabled in QA') errors.push(error.message) })
    try {
      await page.addInitScript(() => {
        window.__compactScreenPoint = (scene, x, y) => {
          const rect = scene.game.canvas.getBoundingClientRect()
          return { x: rect.x + x * rect.width / scene.scale.width,
            y: rect.y + y * rect.height / scene.scale.height }
        }
      })
      if (safeArea) {
        await page.route('**/fishing-game/**', async route => {
          if (route.request().resourceType() !== 'document') return route.continue()
          const response = await route.fetch()
          const body = (await response.text()).replace('</head>',
            '<style>:root { --safe-top: 20px !important; --safe-bottom: 34px !important; }</style></head>')
          await route.fulfill({ response, body })
        })
      }
      await page.goto(`${process.env.QA_URL ?? 'http://127.0.0.1:4173'}/fishing-game/?qa=1&compactPortrait=1`)
      await page.waitForFunction(() => window.__game?.scene?.getScene('TitleScene')?.sys?.isActive?.())
      if (safeArea) {
        const canvas = await page.evaluate(() => window.__game.canvas.getBoundingClientRect().toJSON())
        assert.ok(canvas.top >= 19 && canvas.bottom <= 535, `Title ignores safe area: ${JSON.stringify(canvas)}`)
      }
      await page.screenshot({ path: `${output}/title-${label}.png`, animations: 'disabled' })
      if (height === 480) {
        const buttons = await page.evaluate(() => {
          const scene = window.__game.scene.getScene('TitleScene')
          return { startBottom: scene._startButton.container.y + 35 + 8,
            helpTop: scene._helpButton.container.y - 23 - 8 }
        })
        assert.ok(buttons.startBottom < buttons.helpTop, `short Title actions overlap: ${JSON.stringify(buttons)}`)
      }
      if (width < 390 && height <= 667 && !safeArea) {
        const help = await page.evaluate(() => {
          const scene = window.__game.scene.getScene('TitleScene')
          return window.__compactScreenPoint(scene, scene._helpButton.container.x, scene._helpButton.container.y)
        })
        await page.mouse.click(help.x, help.y)
        await page.waitForFunction(() => window.__game?.scene?.getScene('HelpScene')?.sys?.isActive?.())
        await page.screenshot({ path: `${output}/help-top-${label}.png`, animations: 'disabled' })
        await page.mouse.move(width / 2, height - 115)
        await page.mouse.down()
        await page.mouse.move(width / 2, 135, { steps: 12 })
        await page.mouse.up()
        const dragged = await page.evaluate(() => window.__game.scene.getScene('HelpScene')._helpScroll)
        assert.ok(dragged > 100, `short Help did not respond to drag: ${dragged}`)
        await page.mouse.wheel(0, 800)
        await page.waitForFunction(() => window.__game.scene.getScene('HelpScene')._helpScroll > 300)
        await page.screenshot({ path: `${output}/help-bottom-${label}.png`, animations: 'disabled' })
        for (const position of ['top', 'bottom']) {
          assert.ok(statSync(`${output}/help-${position}-${label}.png`).size > 15000,
            `Help ${position} browser frame blank`)
        }
        await page.mouse.click(width * 0.1, height - 40)
        await page.waitForFunction(() => window.__game?.scene?.getScene('HomeScene')?.sys?.isActive?.())
        await page.goto(`${process.env.QA_URL ?? 'http://127.0.0.1:4173'}/fishing-game/?qa=1&compactPortrait=1`)
        await page.waitForFunction(() => window.__game?.scene?.getScene('TitleScene')?.sys?.isActive?.())
      }
      const start = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('TitleScene')
        return window.__compactScreenPoint(scene, scene._startButton.container.x, scene._startButton.container.y)
      })
      await page.mouse.click(start.x, start.y)
      await page.waitForFunction(() => window.__game?.scene?.getScene('HomeScene')?.sys?.isActive?.())
      await page.waitForTimeout(500)
      const home = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('HomeScene')
        return { next: scene._journey?.scene, point: window.__compactScreenPoint(scene, scene._mainCta.container.x, scene._mainCta.container.y) }
      })
      assert.equal(home.next, 'MapScene', `fresh Home journey does not lead to Map: ${JSON.stringify(home)}`)
      if (height === 480) {
        const action = await page.evaluate(() => {
          const scene = window.__game.scene.getScene('HomeScene')
          return { bottom: scene._mainCta.container.y + 42, footerTop: scene.scale.height - 86 }
        })
        assert.ok(action.bottom < action.footerTop, `short Home action overlaps footer: ${JSON.stringify(action)}`)
      }
      await page.screenshot({ path: `${output}/home-${label}.png`, animations: 'disabled' })
      await page.mouse.click(home.point.x, home.point.y)
      await page.waitForFunction(() => window.__game?.scene?.getScene('MapScene')?.sys?.isActive?.())
      await page.waitForFunction(() => window.__game.scene.getScene('MapScene')._pointMarkers?.pointA)
      const marker = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MapScene')
        const point = scene._pointMarkers.pointA
        return window.__compactScreenPoint(scene, point.x, point.y)
      })
      await page.screenshot({ path: `${output}/map-${label}.png`, animations: 'disabled' })
      if (height === 480) {
        const markers = await page.evaluate(() => {
          const scene = window.__game.scene.getScene('MapScene')
          return { aBottom: scene._pointMarkers.pointA.y + 59,
            bBadgeTop: scene._pointMarkers.pointB.y - 24,
            bBottom: scene._pointMarkers.pointB.y + 59,
            cBadgeTop: scene._pointMarkers.pointC.y - 24,
            cBottom: scene._pointMarkers.pointC.y + 59,
            footerTop: scene.scale.height - 86 }
        })
        assert.ok(markers.aBottom < markers.bBadgeTop && markers.bBottom < markers.cBadgeTop
          && markers.cBottom < markers.footerTop, `short Map marker labels overlap: ${JSON.stringify(markers)}`)
      }
      await page.mouse.click(marker.x, marker.y)
      await page.waitForFunction(() => window.__game.scene.getScene('MapScene')._detailPanel?.active)
      await page.waitForTimeout(220)
      const detail = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('MapScene')
        const nodes = scene._detailPanel.list
        const hit = nodes.find(node => node.type === 'Rectangle' && node.input)
        const prep = nodes.find(node => node.type === 'Text' && node.text.includes('準備OK'))
        const fish = nodes.filter(node => node.type === 'Image' && node.displayWidth === 38)
        return { point: window.__compactScreenPoint(scene, hit.x, hit.y + scene._detailPanel.y),
          prepBottom: prep?.y + prep?.height,
          fishTop: Math.min(...fish.map(node => node.y - 21)),
          fishBottom: Math.max(...fish.map(node => node.y + 21)),
          actionTop: hit.y - hit.height / 2 }
      })
      if (width < 390) {
        assert.ok(detail.prepBottom + 8 < detail.fishTop, `Map preparation overlaps fish: ${JSON.stringify(detail)}`)
        assert.ok(detail.fishBottom + 3 < detail.actionTop, `Map fish overlaps fishing action: ${JSON.stringify(detail)}`)
      }
      await page.screenshot({ path: `${output}/detail-${label}.png`, animations: 'disabled' })
      await page.mouse.click(detail.point.x, detail.point.y)
      await page.waitForFunction(() => window.__game?.scene?.getScene('GameScene')?.phase === 'cast')
      const state = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('GameScene')
        const host = scene._castPresentationHost
        return { phase: scene.phase, hostActive: host?.root?.active,
          compact: host?._compactCastActive,
          canvasWidth: scene.game.canvas.getBoundingClientRect().width }
      })
      assert.equal(state.hostActive, true)
      assert.ok(Math.abs(state.canvasWidth - width) <= 1)
      assert.equal(state.compact, width < 390)
      await page.screenshot({ path: `${output}/cast-${label}.png`, animations: 'disabled' })
      for (const scene of ['title', 'home', 'map', 'detail', 'cast']) {
        assert.ok(statSync(`${output}/${scene}-${label}.png`).size > 15000, `${scene}: blank browser frame`)
      }
      assert.deepEqual(errors, [])
      console.log(`${width}x${height}${safeArea ? ' simulated safe area' : ''} Title → Home → Map → Cast physical taps passed`)
    } finally { await page.close() }
  }
} finally { await browser.close() }
