import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43329/fishing-game/index.html'
const origin = new URL(base).origin
const output = path.resolve('qa-artifacts/ui-art-sample-v1')
await fs.mkdir(output, { recursive: true })

const browser = await chromium.launch({ headless: true })
const cases = [
  { id: 'portrait', width: 390, height: 844 },
  { id: 'small', width: 375, height: 667 },
  { id: 'landscape', width: 844, height: 390 },
]

for (const item of cases) {
  const context = await browser.newContext({ viewport: { width: item.width, height: item.height }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text()) })
  await page.addInitScript(() => {
    localStorage.setItem('ainan_sound_enabled', '0')
    localStorage.setItem('ainan_reduced_motion', '1')
    localStorage.setItem('ainan_score', '25000')
    localStorage.setItem('ainan_equipment', JSON.stringify({ rodType: 'premium', baitType: 'worm' }))
    localStorage.setItem('ainan_inventory', JSON.stringify({ rods: { basic: 1, carbon: 1, premium: 1 }, baits: { worm: 12, shrimp: 5, special: 2 } }))
    window.__ainanDailyBonusDismissed = true
  })
  await page.goto(`${base}?qa=1&scene=HomeScene`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__game?.scene?.getScene?.('HomeScene')?.sys?.isActive?.())
  await page.waitForTimeout(700)
  const result = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('HomeScene')
    return {
      metrics: scene._footerMetrics,
      textures: ['ui_art_footer_shell', 'ui_art_tab_selected', 'ui_art_icon_home', 'ui_art_button_primary'].map(key => [key, scene.textures.exists(key)]),
    }
  })
  if (result.metrics?.hitHeight < 44 || result.metrics?.bottomInset < 6) throw new Error(`${item.id}: unsafe footer ${JSON.stringify(result.metrics)}`)
  if (result.textures.some(([, loaded]) => !loaded)) throw new Error(`${item.id}: missing art texture ${JSON.stringify(result.textures)}`)
  const canvas = await page.locator('canvas').last().boundingBox()
  if (!canvas || canvas.x < -0.5 || canvas.y < -0.5 || canvas.x + canvas.width > item.width + 0.5 || canvas.y + canvas.height > item.height + 0.5) {
    throw new Error(`${item.id}: canvas outside viewport ${JSON.stringify(canvas)}`)
  }
  await page.screenshot({ path: path.join(output, `home-art-${item.id}.png`) })
  if (errors.length) throw new Error(`${item.id}: ${errors.join(' | ')}`)
  await context.close()
}

const boardContext = await browser.newContext({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 1 })
const boardPage = await boardContext.newPage()
await boardPage.setContent(`<!doctype html><html><head><style>
  *{box-sizing:border-box}body{margin:0;background:linear-gradient(145deg,#e9f9ff,#c9efff 55%,#fff2c7);font-family:Arial,sans-serif;color:#173248}
  main{padding:44px 52px}h1{margin:0 0 8px;font-size:34px}p{margin:0 0 28px;font-size:17px;color:#31566e}
  .panel{background:rgba(255,255,255,.82);border:3px solid #173248;border-radius:28px;padding:26px;box-shadow:0 12px 0 rgba(23,50,72,.14);margin-bottom:24px}
  .title{font-weight:900;font-size:20px;margin-bottom:16px}.footer{width:100%;height:130px;object-fit:fill}.row{display:grid;grid-template-columns:1.1fr 1fr;gap:26px;align-items:center}.icons{display:grid;grid-template-columns:repeat(6,1fr);align-items:end;gap:18px}.icons img{width:100%;height:130px;object-fit:contain}.buttons{display:grid;grid-template-columns:1fr 1fr;gap:20px}.buttons img{width:100%;height:126px;object-fit:fill}.note{font-size:14px;margin-top:14px;color:#476a7e}
</style></head><body><main><h1>AINAN UI ART SAMPLE v1</h1><p>Approved-mock material study · live text and 44px interaction regions remain code-native</p>
<section class="panel"><div class="title">Footer shell / selected tab / purpose-specific icons</div><img class="footer" src="${origin}/fishing-game/assets/ui-art-v1/footer-shell.png"><div class="icons"><img src="${origin}/fishing-game/assets/ui-art-v1/icon-home.png"><img src="${origin}/fishing-game/assets/ui-art-v1/icon-equip.png"><img src="${origin}/fishing-game/assets/ui-art-v1/icon-town.png"><img src="${origin}/fishing-game/assets/ui-art-v1/icon-exchange.png"><img src="${origin}/fishing-game/assets/ui-art-v1/icon-menu.png"><img src="${origin}/fishing-game/assets/ui-art-v1/tab-selected.png"></div><div class="note">Cream enamel · ocean-blue rim · navy contour · sunny-yellow selected accent</div></section>
<section class="panel"><div class="title">Button material states</div><div class="buttons"><img src="${origin}/fishing-game/assets/ui-art-v1/button-primary.png"><img src="${origin}/fishing-game/assets/ui-art-v1/button-secondary.png"><img src="${origin}/fishing-game/assets/ui-art-v1/button-primary-pressed.png"><img src="${origin}/fishing-game/assets/ui-art-v1/button-disabled.png"></div><div class="note">Primary / secondary / pressed / disabled · empty safe center reserved for live text</div></section>
</main></body></html>`, { waitUntil: 'load' })
await boardPage.waitForTimeout(500)
await boardPage.screenshot({ path: path.join(output, 'ainan-ui-art-material-board.png'), fullPage: true })

const before = `data:image/png;base64,${(await fs.readFile(path.resolve('qa-artifacts/ui-component-v1/after/home-portrait.png'))).toString('base64')}`
const after = `data:image/png;base64,${(await fs.readFile(path.join(output, 'home-art-portrait.png'))).toString('base64')}`
const comparePage = await boardContext.newPage()
await comparePage.setContent(`<!doctype html><html><head><style>
  *{box-sizing:border-box}body{margin:0;background:#dff5ff;font-family:Arial,sans-serif;color:#173248}main{padding:34px}h1{margin:0 0 24px;text-align:center}
  .grid{display:flex;justify-content:center;gap:34px}.card{background:white;border:3px solid #173248;border-radius:24px;padding:18px;box-shadow:0 10px 0 rgba(23,50,72,.16)}
  h2{margin:0 0 14px;text-align:center;font-size:22px}.card img{display:block;width:390px;height:844px;object-fit:contain;background:#edf7fb;border-radius:12px}
  .after{border-color:#198dc6}.after h2{color:#157daf}.caption{text-align:center;margin:22px 0 0;font-weight:700;color:#31566e}
</style></head><body><main><h1>Home UI — current / art-applied sample</h1><div class="grid"><section class="card"><h2>Current component pass</h2><img src="${before}"></section><section class="card after"><h2>Material art applied</h2><img src="${after}"></section></div><p class="caption">Scope checkpoint: Home primary CTA + footer only. Cards, gauges and result panel are intentionally not expanded yet.</p></main></body></html>`, { waitUntil: 'load' })
await comparePage.waitForTimeout(500)
await comparePage.screenshot({ path: path.join(output, 'ainan-home-current-vs-art-sample.png'), fullPage: true })

await boardContext.close()
await browser.close()
console.log('PASS: UI art sample at 390x844, 375x667, and 844x390; material board and comparison captured')
