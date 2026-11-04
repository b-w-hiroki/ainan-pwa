import assert from 'node:assert/strict'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { delimiter, join } from 'node:path'
import { pathToFileURL } from 'node:url'
const bin = process.env.PATH.split(delimiter).find(p => existsSync(join(p, 'playwright')))
assert.ok(bin, 'Run via npm exec --package=playwright@1.55.0')
const engines = await import(pathToFileURL(join(bin, '..', 'playwright', 'index.mjs')).href)
const engine = process.env.QA_BROWSER ?? 'chromium'
const browser = await engines[engine].launch({ headless: true })
const base = process.env.QA_URL ?? 'http://127.0.0.1:4173'
const output = `artifacts/result-input-migration/${engine}`
mkdirSync(output, { recursive: true })
const records = []
const snapshot = page => page.evaluate(() => Object.fromEntries(Object.entries(localStorage)
  .filter(([key]) => ['ainan_catches', 'ainan_score', 'ainan_inventory', 'ainan_equipment', 'ainan_town_facilities', 'ainan_catch_stock'].includes(key))))
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
async function point(page) {
  return page.evaluate(() => {
    const s = window.__game.scene.getScene('GameScene'), h = s._castPresentationHost
    const r = s.game.canvas.getBoundingClientRect()
    const p = h.root.getWorldTransformMatrix().transformPoint(195, h.nodes.resultPrimarySkin.y)
    return { x: r.x + p.x * r.width / s.scale.width, y: r.y + p.y * r.height / s.scale.height }
  })
}
try {
  for (const [width, height] of [[320, 480], [320, 568], [375, 667], [390, 844]]) {
    for (const mode of ['ordinary', 'compact-qa']) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', serviceWorkers: 'block' })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', e => { if (!['service worker disabled in QA', 'Error: service worker disabled in QA'].includes(e.message)) errors.push(e.message) })
      try {
        const query = mode === 'ordinary' ? '' : '?qa=1&compactPortrait=1&scene=GameScene&qaMockPhase=result'
        await page.goto(`${base}/fishing-game/${query}`)
        if (mode === 'ordinary') {
          await page.waitForFunction(() => window.__game?.scene.getScenes(true).some(s => s.scene.key === 'TitleScene'))
          // Controlled scene entry/outcome; the ordinary URL, scale mode, input,
          // save owner and Result -> Town navigation are production code.
          await page.evaluate(() => window.__game.scene.getScene('TitleScene').scene.start('GameScene', { point: 'pointA' }))
          await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?._castPresentationHost?.root?.active)
          const designPoint = (x, y) => page.evaluate(({ x, y }) => {
            const s = window.__game.scene.getScene('GameScene'), h = s._castPresentationHost
            const r = s.game.canvas.getBoundingClientRect()
            const p = h.root.getWorldTransformMatrix().transformPoint(x, y)
            return { x: r.x + p.x * r.width / s.scale.width, y: r.y + p.y * r.height / s.scale.height }
          }, { x, y })
          const cast = await designPoint(195, 748)
          await page.mouse.move(cast.x, cast.y); await page.mouse.down()
          await page.waitForFunction(() => window.__game.scene.getScene('GameScene').isCharging)
          await page.waitForTimeout(260); await page.mouse.up()
          await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'retrieve')
          await page.waitForFunction(() => {
            const s = window.__game.scene.getScene('GameScene')
            return s.time.now >= (s._retrieveReadyAt ?? 0)
          })
          const twitch = await designPoint(195, 746)
          await page.mouse.click(twitch.x, twitch.y)
          await page.waitForTimeout(350)
          const slow = await designPoint(318, 746)
          await page.mouse.move(slow.x, slow.y); await page.mouse.down()
          await page.waitForFunction(() => window.__game.scene.getScene('GameScene').retrieveState?.slowHeld)
          await page.mouse.up()
          await page.evaluate(() => {
            const s = window.__game.scene.getScene('GameScene')
            s._tickFishInterest = () => {}
            s._beginRetrieveBite(s.bg._fishRuntime.find(f => f.fishDef && f.gfx?.active))
            s.fish = { ...s.fish, biteRate: 1 }
            s._killWaitTimers()
            s._openHitWindow(10000)
          })
          await page.waitForFunction(() => window.__game.scene.getScene('GameScene').waitTapActive)
          const hit = await designPoint(195, 380)
          await page.mouse.click(hit.x, hit.y)
          await page.waitForFunction(() => window.__game.scene.getScene('GameScene').phase === 'battle')
          await page.evaluate(() => window.__game.scene.getScene('GameScene')._finishBattle('caught'))
        }
        await page.waitForFunction(() => {
          const s = window.__game?.scene.getScene('GameScene'), h = s?._castPresentationHost
          return s?.phase === 'result' && h?.root?.visible && h.nodes.resultPrimarySkin?.visible
        })
        await frames(page)
        const geometry = await page.evaluate(() => {
          const s = window.__game.scene.getScene('GameScene'), h = s._castPresentationHost
          const r = s.game.canvas.getBoundingClientRect()
          return { logical: [s.scale.width, s.scale.height], canvas: [r.width, r.height],
            compact: h._compactResultActive, resultButtonCssHeight: 86 * h.root.scaleY * r.height / s.scale.height,
            quay: Boolean(h.nodes.retrieveQuay?.visible) }
        })
        assert.equal(geometry.compact, mode === 'compact-qa' && width < 390)
        const saved = await snapshot(page)
        for (const interruption of ['blur', 'pointercancel', 'hidden', 'rotation']) {
          let p = await point(page)
          await page.mouse.move(p.x, p.y); await page.mouse.down()
          await page.waitForFunction(() => Boolean(window.__game.scene.getScene('GameScene')._castPresentationHost._resultPointerAction))
          if (interruption === 'rotation') {
            await page.setViewportSize({ width: height, height: width })
            await frames(page)
          } else await page.evaluate(kind => {
            if (kind === 'blur') window.dispatchEvent(new Event('blur'))
            if (kind === 'pointercancel') window.__game.canvas.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 }))
            if (kind === 'hidden') {
              Object.defineProperty(document, 'hidden', { configurable: true, value: true })
              document.dispatchEvent(new Event('visibilitychange')); delete document.hidden
            }
          }, interruption)
          await page.waitForFunction(() => !window.__game.scene.getScene('GameScene')._castPresentationHost._resultPointerAction, null, { timeout: 5000 })
          assert.equal(await page.evaluate(() => window.__game.scene.getScene('GameScene')._castPresentationHost.nodes.resultPrimarySkin.alpha), 1)
          await page.mouse.up(); await frames(page)
          assert.equal(await page.evaluate(() => window.__game.scene.getScene('GameScene').scene.isActive()), true)
          if (interruption === 'rotation') { await page.setViewportSize({ width, height }); await frames(page) }
          assert.deepEqual(await snapshot(page), saved, `${mode}: ${interruption} changed saved progress`)
        }
        await page.screenshot({ path: `${output}/${mode}-${width}x${height}.png` })
        const p = await point(page)
        await page.mouse.click(p.x, p.y)
        await page.waitForFunction(() => window.__game.scene.getScenes(true).some(s => s.scene.key === 'TownScene'))
        assert.deepEqual(await snapshot(page), saved, 'Town navigation awarded the catch again')
        if (mode === 'ordinary') {
          await page.reload()
          await page.waitForFunction(() => window.__game?.scene.getScenes(true).length)
          assert.deepEqual(await snapshot(page), saved, 'reload lost saved catch/equipment/town')
        } // QA bootstrap deliberately reseeds saves on reload; it is not a persistence test.
        assert.deepEqual(errors, [])
        records.push({ width, height, mode, geometry, interruptions: 4, town: true, persistence: mode === 'ordinary' })
        console.log(`${engine} ${mode} ${width}x${height}: four cancellations, fresh Town input and saved progress passed`)
      } finally { await context.close() }
    }
  }
} finally {
  writeFileSync(`${output}/results.json`, JSON.stringify(records, null, 2))
  await browser.close()
}
