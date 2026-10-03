import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const root = path.resolve('qa-artifacts/ui-component-v1')
const panels = [
  ['before/home-portrait.png', 'BEFORE', 'Footer and page-specific primary action'],
  ['after/home-portrait.png', 'AFTER', 'Shared footer states and live primary action'],
  ['after/upgrade-portrait.png', 'EQUIPMENT', 'Selected / owned / unowned card states'],
  ['after/result-portrait.png', 'RESULT', 'Live reward and next-action labels'],
  ['after/failure-portrait.png', 'FAILURE', 'Primary retry plus two secondary exits'],
  ['after/home-landscape.png', 'LANDSCAPE', 'Full portrait contract remains reachable'],
]
const images = []
for (const [file, label, note] of panels) {
  const bytes = await fs.readFile(path.join(root, file))
  images.push({ label, note, src: `data:image/png;base64,${bytes.toString('base64')}` })
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1320, height: 1980 } })
await page.setContent(`<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;padding:28px;background:#071d2d;color:#f4fbff;font:16px system-ui}h1{margin:0;font-size:31px}p{margin:7px 0 20px;color:#b4d8e6}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.card{background:#0a3048;border:1px solid #4c819a;border-radius:18px;padding:10px}.image{height:844px;display:flex;align-items:center;justify-content:center;background:#04131d;border-radius:10px;overflow:hidden}.image img{display:block;max-width:100%;max-height:100%;object-fit:contain}.label{margin-top:9px;font-weight:900;color:#ffdc5e}.note{margin-top:3px;font-size:13px;color:#b4d8e6}.footer{margin-top:18px;padding:13px 16px;background:#062438;border-radius:12px;display:flex;justify-content:space-between}.ok{color:#7af0a6;font-weight:900}</style>
<h1>AINAN UI component polish — actual screens</h1>
<p>Live Phaser components at 390×844 plus the 844×390 fit check. No prices, ownership, or gameplay rules changed.</p>
<div class="grid">${images.map(item => `<section class="card"><div class="image"><img src="${item.src}"></div><div class="label">${item.label}</div><div class="note">${item.note}</div></section>`).join('')}</div>
<div class="footer"><span>Footer · button/back · meter · equipment cards · result/failure actions</span><span class="ok">COMPONENTIZED</span></div>`)
await page.screenshot({ path: path.join(root, 'ainan-ui-component-comparison.png'), fullPage: true })
await browser.close()
console.log('created ainan-ui-component-comparison.png')
