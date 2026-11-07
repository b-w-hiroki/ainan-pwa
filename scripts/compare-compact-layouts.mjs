import assert from 'node:assert/strict'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { delimiter, join } from 'node:path'
import { pathToFileURL } from 'node:url'
const bin = process.env.PATH.split(delimiter).find(p => existsSync(join(p, 'playwright')))
assert.ok(bin)
const { chromium } = await import(pathToFileURL(join(bin, '..', 'playwright', 'index.mjs')).href)
const browser = await chromium.launch({ headless: true })
const out = 'artifacts/compact-migration-comparison'
mkdirSync(out, { recursive: true })
const records = []
try {
  for (const [width, height] of [[320,480],[320,568],[375,667],[390,844]]) {
    for (const compact of [false, true]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' })
      const page = await context.newPage()
      try {
        for (const phase of ['cast','retrieve','wait','battle','result']) {
          await page.goto(`${process.env.QA_URL ?? 'http://127.0.0.1:4173'}/fishing-game/?qa=1&scene=GameScene&qaMockPhase=${phase === 'wait' ? 'retrieve' : phase}${compact ? '&compactPortrait=1' : ''}`)
          await page.waitForFunction(p => window.__game?.scene.getScene('GameScene')?.phase === p && window.__game.scene.getScene('GameScene')._castPresentationHost?.root?.active, phase === 'wait' ? 'retrieve' : phase)
          if (phase === 'wait') await page.evaluate(() => {
            const s = window.__game.scene.getScene('GameScene')
            s._tickFishInterest = () => {}
            s.retrieveState.decisionCount = 2 // isolate Wait geometry; journey input is tested separately
            s._beginRetrieveBite(s.bg._fishRuntime.find(f => f.fishDef && f.gfx?.active))
            s._killWaitTimers()
          })
          await page.waitForFunction(p => window.__game.scene.getScene('GameScene').phase === p, phase)
          await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
          const read = () => page.evaluate(() => {
            const s = window.__game.scene.getScene('GameScene'), h = s._castPresentationHost, n = h.nodes
            const r = s.game.canvas.getBoundingClientRect(), css = r.height / s.scale.height
            return { phase: s.phase, canvas: [r.width,r.height], logical: [s.scale.width,s.scale.height],
              hostVisible: h.root.visible, rootScale: h.root.scaleX, dockOffset: h._compactDockOffset,
              compact: ['Cast','Retrieve','Wait','Battle','Result'].filter(k => h[`_compact${k}Active`]),
              resultActionCssHeight: 86 * h.root.scaleY * css,
              battleInstructionCssPx: parseFloat(n.battleInstruction.style.fontSize) * h.root.scaleY * css,
              quayVisible: Boolean(n.retrieveQuay?.visible), cleanRetrieve: Boolean(n.cleanRetrieveBase?.visible),
              castGrounded: Boolean(n.compactCastBase?.visible && n.compactCastQuay?.visible),
              castPaintedRodVisible: n.paintedCastRod.visible,
              castQuayY: n.compactCastQuay?.y ?? null,
              actorFeetY: n.characterMotion?.root.y + n.characterMotion?.poseFront.y,
              catches: localStorage.getItem('ainan_catches'), equipment: localStorage.getItem('ainan_equipment') }
          })
          const before = await read()
          const grounded = compact && width < 390 && phase === 'cast'
          assert.equal(before.castGrounded, grounded, 'QA classic Cast must use a clean grounded stage only in compact Cast')
          assert.equal(before.castPaintedRodVisible, !grounded, 'Painted rod must not duplicate the moving compact actor rod')
          if (grounded) assert.ok(Math.abs(before.castQuayY + 40 - before.actorFeetY) < 1, 'Quay must follow the actual actor feet')
          await page.screenshot({ path: `${out}/${compact ? 'qa' : 'ordinary-layout'}-${width}x${height}-${phase}.png` })
          await page.setViewportSize({ width: height, height: width })
          await page.evaluate(() => new Promise(r => setTimeout(r, 150)))
          const landscape = await read()
          await page.setViewportSize({ width, height })
          await page.evaluate(() => new Promise(r => setTimeout(r, 150)))
          const after = await read()
          assert.equal(after.phase, before.phase)
          assert.equal(after.catches, before.catches)
          assert.equal(after.equipment, before.equipment)
          assert.deepEqual(after.compact, before.compact)
          assert.equal(after.castGrounded, before.castGrounded)
          assert.equal(after.castPaintedRodVisible, before.castPaintedRodVisible)
          assert.ok(Math.abs(after.rootScale-before.rootScale)<0.01)
          records.push({ width,height,mode: compact?'compact-qa':'ordinary-layout-with-qa-fixture',phase,before,landscape,after })
          console.log(`${width}x${height} ${compact?'qa':'ordinary-layout'} ${phase}: geometry, rotation round trip, no extra save writes`)
        }
      } finally { await context.close() }
    }
  }
} finally { writeFileSync(`${out}/results.json`, JSON.stringify(records,null,2)); await browser.close() }
