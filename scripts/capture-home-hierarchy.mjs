import assert from 'node:assert/strict'
import { delimiter, join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const bin = process.env.PATH.split(delimiter).find(dir => existsSync(join(dir, 'playwright')) || existsSync(join(dir, 'playwright.cmd')))
assert.ok(bin, 'Run via npm exec --package=playwright')
const { chromium } = await import(pathToFileURL(join(bin, '..', 'playwright', 'index.mjs')).href)
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) })
const output = process.env.QA_OUTPUT ?? 'artifacts/home-hierarchy'
mkdirSync(output, { recursive: true })
try {
  for (const [width, height] of [[320,568], [390,844], [1180,757]]) {
    const page = await browser.newPage({ viewport: { width, height } })
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(`${process.env.QA_URL ?? 'http://127.0.0.1:4173'}/fishing-game/`)
    await page.waitForFunction(() => window.__game?.scene.isActive('TitleScene'))
    async function clickButton(sceneKey, key) {
      const p = await page.evaluate(({sceneKey,key}) => {
        const scene = window.__game.scene.getScene(sceneKey)
        const b = scene[key].container, r = scene.game.canvas.getBoundingClientRect()
        return { x: r.x+b.x*r.width/scene.scale.width, y:r.y+b.y*r.height/scene.scale.height }
      }, {sceneKey,key})
      await page.mouse.click(p.x,p.y)
    }
    await clickButton('TitleScene','_startButton')
    await page.waitForFunction(() => window.__game.scene.isActive('HomeScene'))
    await page.evaluate(() => window.__game.scene.getScene('HomeScene')._dismissDailyBonus())
    const info = await page.evaluate(() => {
      const s = window.__game.scene.getScene('HomeScene')
      const texts = []
      function walk(n) { if(n.type==='Text' && n.visible) texts.push(n.text); if(n.list) n.list.forEach(walk) }
      s.children.list.forEach(walk)
      return { texts, progress:s._journey.progress, destination:s._journey.scene }
    })
    assert.equal(info.texts.filter(t=>t==='まず1匹釣ろう').length,1)
    assert.equal(info.texts.filter(t=>t===info.progress).length,1)
    assert.equal(info.texts.filter(t=>t==='どんな魚に会えるかな？').length,1)
    assert.ok(info.texts.includes('釣りに行く'))
    await page.screenshot({ path:`${output}/home-${width}.png` })
    await clickButton('HomeScene','_mainCta')
    await page.waitForFunction(key => window.__game.scene.isActive(key),info.destination)
    assert.equal(info.destination,'MapScene')
    assert.deepEqual(errors,[])
    await page.close()
    console.log(`PASS home hierarchy and Title→Home→Map ${width}x${height}`)
  }
} finally { await browser.close() }
