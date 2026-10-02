import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const root = path.resolve('qa-artifacts/equipment-visual-v2')
const panels = [
  ['01-premium-before-accessories.png', 'BEFORE', 'Premium rod; no accessory accents'],
  ['03-premium-cap-bag-preview.png', 'LOADOUT', 'Cap and bag visible in equipment preview'],
  ['04-premium-cap-bag-cast.png', 'FISHING', 'Same loadout in the cast pose'],
  ['05-premium-cap-bag-result.png', 'RESULT', 'Same loadout in the catch result pose'],
]
const images = []
for (const [file, label, note] of panels) {
  const bytes = await fs.readFile(path.join(root, file))
  images.push({ label, note, src: `data:image/png;base64,${bytes.toString('base64')}` })
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 920, height: 1970 } })
await page.setContent(`<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;padding:26px;background:#071d2d;color:#f4fbff;font:16px system-ui}h1{margin:0;font-size:30px}p{margin:7px 0 18px;color:#b4d8e6}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px}.card{background:#0a3048;border:1px solid #4c819a;border-radius:18px;padding:12px}.card img{display:block;width:100%;height:844px;object-fit:contain;border-radius:10px;background:#04131d}.label{margin-top:9px;font-weight:900;color:#ffdc5e}.note{margin-top:3px;font-size:13px;color:#b4d8e6}.footer{margin-top:18px;padding:13px 16px;background:#062438;border-radius:12px;display:flex;justify-content:space-between}.ok{color:#7af0a6;font-weight:900}</style>
<h1>AINAN equipment visuals — actual mobile screens</h1>
<p>Real purchase/equip actions at 390×844. Only existing slots are shown: rod, cap, and tackle bag.</p>
<div class="grid">${images.map(item => `<section class="card"><img src="${item.src}"><div class="label">${item.label}</div><div class="note">${item.note}</div></section>`).join('')}</div>
<div class="footer"><span>Preview → fishing → result; save/reload and safe fallback tested separately</span><span class="ok">SYNCED</span></div>`)
await page.screenshot({ path: path.join(root, 'ainan-equipment-visual-comparison.png'), fullPage: true })
await browser.close()
console.log('created ainan-equipment-visual-comparison.png')
