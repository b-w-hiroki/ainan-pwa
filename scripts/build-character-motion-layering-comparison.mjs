import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const root = path.resolve('qa-artifacts/character-motion-layering-v2')
const states = [
  ['FIGHT', '05-game-fight-loop.png'],
  ['CAUGHT', '08-game-caught-joy.png'],
  ['ESCAPED', '07-game-escaped-sad.png'],
]
const images = []
for (const [label, file] of states) {
  for (const version of ['before', 'after']) {
    const bytes = await fs.readFile(path.join(root, version, file))
    images.push({ label, version, src: `data:image/png;base64,${bytes.toString('base64')}` })
  }
}
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1500, height: 1050 } })
await page.setContent(`<!doctype html><style>
*{box-sizing:border-box}body{margin:0;padding:30px;background:#071d2d;color:#f2faff;font:16px Inter,system-ui}h1{margin:0;font-size:32px}p{margin:7px 0 21px;color:#9dc9db}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#0b3048;border:1px solid #4c819a;border-radius:17px;padding:10px}.shot{position:relative}.shot img{width:100%;display:block;border-radius:10px}.tag{position:absolute;left:7px;top:7px;border-radius:999px;padding:5px 9px;background:#061c2bcc;font-size:10px;font-weight:900;letter-spacing:.1em}.after .tag{background:#19734ee6}.name{grid-column:1/-1;padding:5px 3px 1px;font-size:18px;font-weight:900}.notes{margin-top:20px;background:#062438;border-radius:13px;padding:15px 18px;display:flex;justify-content:space-between;color:#aed7e7}.ok{color:#76eca4;font-weight:900}
</style><h1>AINAN character / UI layering — before & after</h1><p>Same approved motion direction. Character remains in the fishing stage; information and actions render in a dedicated foreground.</p><div class="grid">${states.map(([label,file])=>{const pair=images.filter(item=>item.label===label);return `<section class="pair">${pair.map(item=>`<div class="shot ${item.version}"><img src="${item.src}"><span class="tag">${item.version.toUpperCase()}</span></div>`).join('')}<div class="name">${label}</div></section>`}).join('')}</div><div class="notes"><span>Per-phase actor bounds · Battle/Result foreground UI · Retrieve returns to approved composition</span><span class="ok">NO UI OBSTRUCTION ✓</span></div>`)
await page.screenshot({ path: path.join(root, 'ainan-character-ui-layering-before-after.png'), fullPage: true })
await browser.close()
console.log('created ainan-character-ui-layering-before-after.png')
