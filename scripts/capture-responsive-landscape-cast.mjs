import assert from 'node:assert/strict'
import { mkdirSync, existsSync, realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const executable = process.env.PATH.split(':')
  .map(directory => join(directory, 'playwright')).find(existsSync)
assert.ok(executable, 'Playwright executable absent from CI')
const { chromium } = await import(pathToFileURL(join(dirname(realpathSync(executable)), 'index.mjs')).href)
mkdirSync('artifacts/orientation', { recursive: true })
const browser = await chromium.launch({ headless: true })
const cases = [
  { width: 844, height: 390, name: '76-landscape-cast-layout.png', land: true },
  { width: 390, height: 844, name: '77-portrait-cast-regression.png', land: true },
]
try {
  for (const testcase of cases) {
    const page = await browser.newPage({
      viewport: { width: testcase.width, height: testcase.height }, deviceScaleFactor: 1,
    })
    try {
      const q = new URLSearchParams({
        qa: '1', scene: 'GameScene', qaMockPhase: 'cast', landscapePrototype: '1',
      })
      await page.goto('http://127.0.0.1:4173/fishing-game/?' + q.toString(),
        { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const scene = window.__game?.scene?.getScene('GameScene')
        return scene?.phase === 'cast' && scene?._castPresentationHost?.nodes?.castHit?.input?.enabled
      }, { timeout: 20000 })
      await page.waitForTimeout(1150)
      const state = await page.evaluate(() => {
        const scene = window.__game.scene.getScene('GameScene')
        const host = scene._castPresentationHost
        const layout = host.root.getData('landscapeCastLayout')
        const canvas = document.querySelector('#game-container canvas')
        const canvasRect = canvas.getBoundingClientRect()
        const castHit = host.nodes.castHit
        const scale = layout?.panelScale ?? host.root.scaleX
        const cx = layout ? layout.panelX + castHit.x * scale
          : host.root.x + castHit.x * host.root.scaleX
        const cy = layout ? layout.panelY + castHit.y * scale
          : host.root.y + castHit.y * host.root.scaleY
        return {
          sceneWidth: scene.scale.width, sceneHeight: scene.scale.height,
          canvas: { x: canvasRect.x, y: canvasRect.y,
            width: canvasRect.width, height: canvasRect.height },
          viewport: { width: innerWidth, height: innerHeight },
          isLandscapeLayout: Boolean(layout),
          landscapeBackdropVisible: Boolean(host.nodes.landscapeBackdrop?.visible),
          landscapeBackdropTexture: host.nodes.landscapeBackdrop?.texture?.key ?? null,
          playerWorldOffset: {
            x: host.nodes.characterMotion?.root?.x ?? null,
            y: host.nodes.characterMotion?.root?.y ?? null,
          },
          owner: host.root.name, phase: scene.phase,
          actionCenter: { x: cx, y: cy },
          actionDiameterCss: castHit.radius * 2 * scale *
            (canvasRect.width / scene.scale.width),
          canvasScroll: document.body.scrollWidth > innerWidth,
          castInputEnabled: Boolean(castHit.input?.enabled),
        }
      })
      assert.equal(state.owner, 'cast-presentation-host')
      assert.equal(state.phase, 'cast')
      assert.ok(!state.canvasScroll, testcase.name + ': horizontal scroll')
      assert.ok(state.castInputEnabled, testcase.name + ': input disabled')
      assert.equal(state.sceneWidth, testcase.width)
      assert.equal(state.sceneHeight, testcase.height)
      assert.ok(state.canvas.width > 0 && state.canvas.height > 0)
      assert.ok(state.canvas.x >= -1 && state.canvas.y >= -1
        && state.canvas.x + state.canvas.width <= testcase.width + 1
        && state.canvas.y + state.canvas.height <= testcase.height + 1,
      testcase.name + ': clipped canvas')
      if (testcase.width > testcase.height) {
        assert.equal(state.isLandscapeLayout, true, 'landscape Cast reflow missing')
        assert.equal(state.landscapeBackdropVisible, true, 'world extension hidden')
        assert.equal(state.landscapeBackdropTexture, 'ui_fishing_approved_clean_harbor',
          'world extension must use accepted high-quality Harbor water art')
        assert.deepEqual(state.playerWorldOffset, { x: 18, y: -195 },
          'the actual Cast character must travel with its world slice')
        assert.ok(state.actionDiameterCss >= 44,
          'Cast input must be >=44 physical CSS pixels, got ' + state.actionDiameterCss)
        assert.ok(state.actionCenter.x >= 40 && state.actionCenter.x <= testcase.width - 40
          && state.actionCenter.y >= 40 && state.actionCenter.y <= testcase.height - 40,
        'Cast target clipped by landscape safe margin')
      } else {
        assert.equal(state.isLandscapeLayout, false, 'portrait should not use side dock')
        assert.equal(state.landscapeBackdropVisible, false)
      }
      await page.screenshot({
        path: join('artifacts/orientation', testcase.name), animations: 'disabled',
      })
      // Real browser input, not an inert measurement. Pointerdown must start
      // charge, release must end the charging state.
      await page.mouse.move(state.actionCenter.x, state.actionCenter.y)
      await page.mouse.down()
      await page.waitForFunction(() =>
        window.__game?.scene?.getScene('GameScene')?.isCharging === true, { timeout: 3500 })
      await page.mouse.up()
      await page.waitForFunction(() =>
        window.__game?.scene?.getScene('GameScene')?.isCharging === false, { timeout: 3500 })
      console.log('Landscape Cast layout + physical swipe input verified:',
        testcase.name, JSON.stringify(state))
    } finally {
      await page.close()
    }
  }
} finally {
  await browser.close()
}
