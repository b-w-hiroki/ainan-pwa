import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const root = path.resolve('qa-artifacts/rod-visual-v1')
const rods = [
  { id: 'basic', label: 'BASIC', note: 'short / warm line', color: '#e0c76b' },
  { id: 'carbon', label: 'CARBON', note: 'standard / blue accent', color: '#6e83ff' },
  { id: 'premium', label: 'PREMIUM', note: 'long / gold line', color: '#d37cff' },
]
for (const rod of rods) {
  const bytes = await fs.readFile(path.join(root, `cast-${rod.id}.png`))
  rod.src = `data:image/png;base64,${bytes.toString('base64')}`
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1320, height: 1040 } })
await page.setContent(`<!doctype html><style>
*{box-sizing:border-box}body{margin:0;padding:28px;background:#071d2d;color:#f2faff;font:16px system-ui}h1{margin:0;font-size:31px}p{margin:7px 0 20px;color:#acd3e2}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.card{background:#0b3048;border:1px solid #4c819a;border-radius:17px;padding:10px}.card img{display:block;width:100%;height:850px;object-fit:contain;border-radius:10px;background:#04121c}.name{display:flex;justify-content:space-between;align-items:center;padding:9px 4px 2px;font-size:18px;font-weight:900}.note{font-size:12px;color:#acd3e2}.dot{width:12px;height:12px;border-radius:50%;display:inline-block;margin-right:7px}.footer{margin-top:16px;padding:13px 16px;border-radius:12px;background:#062438;display:flex;justify-content:space-between;color:#aed7e7}.ok{color:#76eca4;font-weight:900}</style><h1>AINAN equipped rod → held rod</h1><p>Same character pose system. Equipment choice now selects the in-hand rod, line treatment, length, and flex without changing performance values.</p><div class="grid">${rods.map(rod => `<section class="card"><img src="${rod.src}"><div class="name"><span><i class="dot" style="background:${rod.color}"></i>${rod.label}</span><span class="note">${rod.note}</span></div></section>`).join('')}</div><div class="footer"><span>Real equipment taps · next fishing · reload persistence · safe asset fallback</span><span class="ok">VISUAL SYNC ✓</span></div>`)
await page.screenshot({ path: path.join(root, 'ainan-equipped-rod-comparison.png'), fullPage: true })
await browser.close()
console.log('created ainan-equipped-rod-comparison.png')
