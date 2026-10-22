import assert from 'node:assert/strict'
import { delimiter, join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const bin = process.env.PATH.split(delimiter).find(dir => existsSync(join(dir, 'playwright')) || existsSync(join(dir, 'playwright.cmd')))
assert.ok(bin, 'Playwright executable missing from PATH')
const { chromium } = await import(pathToFileURL(join(bin, '..', 'playwright', 'index.mjs')).href)
const base = process.env.QA_URL ?? 'http://127.0.0.1:4173'
const output = 'artifacts/compact-entry-map'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true })

async function frame(page) {
  const measurement = await page.evaluate(() => {
    const canvas = window.__game.canvas
    const rect = canvas.getBoundingClientRect()
    const container = canvas.parentElement
    const bounds = container.getBoundingClientRect()
    const style = getComputedStyle(container)
    const leftGap = rect.left - bounds.left - Number.parseFloat(style.paddingLeft)
    const rightGap = bounds.right - Number.parseFloat(style.paddingRight) - rect.right
    return { x: rect.x, y: rect.y, scale: rect.width / window.__game.scale.width, leftGap, rightGap }
  })
  assert.ok(Math.abs(measurement.leftGap - measurement.rightGap) <= 1,
    `Portrait canvas is off-center: ${JSON.stringify(measurement)}`)
  return measurement
}

try {
  for (const [width, height] of [[320, 568], [375, 667], [390, 844]]) {
    if (width === 320) {
      const root = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 })
      try {
        await root.goto(`${base}/`)
        await root.waitForFunction(() => window.__game?.scene?.getScene('TitleScene')?.sys?.isActive?.())
        await frame(root)
        await root.screenshot({ path: `${output}/root-title-${width}.png`, animations: 'disabled' })
      } finally { await root.close() }
    }
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 })
    try {
      await page.goto(`${base}/fishing-game/`)
      await page.waitForFunction(() => window.__game?.scene?.getScene('TitleScene')?.sys?.isActive?.())
      await page.waitForTimeout(400)
      const title = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('TitleScene')
        const button = scene.children.list.find(node => node.getData?.('uiRole') === 'button' && node.list.some(child => child.text === '遊び方'))
        const copy = scene.children.list.find(node => node.text === '愛南の海から、物語をはじめよう')
        return { x: button.x, y: button.y, hitHeight: button.list.find(child => child.type === 'Rectangle' && child.input).height,
          copyFont: Number.parseFloat(copy.style.fontSize), copyWidth: copy.width }
      })
      const canvas = await frame(page)
      assert.ok(title.hitHeight * canvas.scale >= 44, 'Title help touch area shrank below 44 CSS px')
      assert.ok((title.hitHeight - 8) * canvas.scale >= 43.5, 'Title help visual is smaller than its tap target')
      assert.ok(title.copyWidth <= 312, 'Title story copy overflows its card')
      if (canvas.scale < 0.75) {
        assert.ok(title.copyFont * canvas.scale >= 10, 'Title story copy is too small on compact screens')
      }
      await page.screenshot({ path: `${output}/title-${width}.png`, animations: 'disabled' })
      await page.mouse.click(canvas.x + title.x * canvas.scale, canvas.y + title.y * canvas.scale)
      await page.waitForFunction(() => window.__game?.scene?.getScene('HelpScene')?.sys?.isActive?.())
      console.log('Compact Title help passed:', width)
    } finally { await page.close() }

    const map = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 })
    try {
      await map.goto(`${base}/fishing-game/?qa=1&scene=MapScene`)
      await map.waitForFunction(() => window.__game?.scene?.getScene('MapScene')?.sys?.isActive?.())
      await map.waitForTimeout(400)
      const canvas = await frame(map)
      const back = await map.evaluate(() => {
        const scene = window.__game.scene.getScene('MapScene')
        const button = scene._backButton
        const footerLabels = scene.children.list.filter(node => node.type === 'Text' && ['ホーム', '装備', 'まち', '交換', 'メニュー'].includes(node.text))
        return { x: button.container.x, y: button.container.y, hitHeight: button.hit.height,
          footerFonts: footerLabels.map(node => Number.parseFloat(node.style.fontSize)) }
      })
      assert.ok(back.hitHeight * canvas.scale >= 44, 'Map back touch area shrank below 44 CSS px')
      assert.ok((back.hitHeight - 8) * canvas.scale >= 43.5, 'Map back visual is smaller than its tap target')
      assert.equal(back.footerFonts.length, 5, 'Map footer labels missing')
      if (canvas.scale < 0.9) {
        assert.ok(Math.min(...back.footerFonts) * canvas.scale >= 9.5, 'Map footer labels are too small on compact screens')
      }
      await map.screenshot({ path: `${output}/map-${width}.png`, animations: 'disabled' })
      await map.mouse.click(canvas.x + back.x * canvas.scale, canvas.y + back.y * canvas.scale)
      await map.waitForFunction(() => window.__game?.scene?.getScene('HomeScene')?.sys?.isActive?.())
      console.log('Compact Map back passed:', width)
    } finally { await map.close() }

    const detail = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 })
    try {
      await detail.goto(`${base}/fishing-game/?qa=1&scene=MapScene`)
      await detail.waitForFunction(() => window.__game?.scene?.getScene('MapScene')?._pointMarkers?.pointA)
      await detail.waitForTimeout(400)
      const canvas = await frame(detail)
      const marker = await detail.evaluate(() => {
        const point = window.__game.scene.getScene('MapScene')._pointMarkers.pointA
        return { x: point.x, y: point.y }
      })
      await detail.mouse.click(canvas.x + marker.x * canvas.scale, canvas.y + marker.y * canvas.scale)
      await detail.waitForFunction(() => window.__game?.scene?.getScene('MapScene')?._detailPanel?.active === true)
      await detail.waitForTimeout(240)
      const action = await detail.evaluate(() => {
        const panel = window.__game.scene.getScene('MapScene')._detailPanel
        const hit = panel.list.find(node => node.type === 'Rectangle' && node.input)
        const prep = panel.list.find(node => typeof node.text === 'string' && (node.text.startsWith('準備') || node.text.startsWith('釣り場 ')))
        const fish = panel.list.filter(node => node.type === 'Image' && node.displayWidth === 38)
        return { x: hit.x, y: hit.y + panel.y, hitHeight: hit.height,
          prepBottom: prep.getBounds().bottom, fishTop: Math.min(...fish.map(node => node.y - 21)),
          prepFont: Number.parseFloat(prep.style.fontSize) }
      })
      assert.ok(action.hitHeight * canvas.scale >= 44, 'Map fishing action shrank below 44 CSS px')
      assert.ok((action.hitHeight - 8) * canvas.scale >= 43.5, 'Map action visual is smaller than its tap target')
      assert.ok(action.prepBottom + 6 <= action.fishTop, 'Map preparation text overlaps fish icons')
      if (canvas.scale < 0.75) {
        assert.ok(action.prepFont * canvas.scale >= 9, 'Map preparation text is too small on compact screens')
      }
      await detail.screenshot({ path: `${output}/map-detail-${width}.png`, animations: 'disabled' })
      await detail.mouse.click(canvas.x + action.x * canvas.scale, canvas.y + action.y * canvas.scale)
      await detail.waitForFunction(() => !window.__game?.scene?.getScene('MapScene')?.sys?.isActive?.())
      console.log('Compact Map fishing action passed:', width)
    } finally { await detail.close() }

    if (width === 320 || width === 375 || width === 390) {
      const battle = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 })
      try {
        await battle.goto(`${base}/fishing-game/?qa=1&scene=GameScene&qaAction=battle`)
        await battle.waitForFunction(() => window.__game?.scene?.getScene('GameScene')?.phase === 'battle'
          && window.__game?.scene?.getScene('GameScene')?._castPresentationHost?.root?.active)
        const canvas = await frame(battle)
        const cues = await battle.evaluate(() => {
          const { battlePhase, battleReel, battleRage, battleInstruction } = window.__game.scene.getScene('GameScene')._castPresentationHost.nodes
          return Object.fromEntries(Object.entries({ battlePhase, battleReel, battleRage, battleInstruction })
            .map(([name, node]) => [name, { font: Number.parseFloat(node.style.fontSize), width: node.width, visible: node.visible }]))
        })
        assert.ok(cues.battleInstruction.width <= 350, 'Battle instruction overflows its backing')
        assert.equal(cues.battlePhase.visible, canvas.scale >= 0.75, 'Battle header threshold changed')
        for (const name of ['battleReel', 'battleRage', 'battleInstruction']) {
          assert.ok(cues[name].font * canvas.scale >= 10, `${name} is too small on portrait screens`)
        }
        if (canvas.scale >= 0.9) {
          assert.equal(cues.battleInstruction.font, 12, 'Normal portrait Battle instruction changed')
        }
        await battle.screenshot({ path: `${output}/battle-${width}.png`, animations: 'disabled' })
        console.log('Compact Battle cues passed:', width)
      } finally { await battle.close() }
    }
  }
} finally { await browser.close() }
