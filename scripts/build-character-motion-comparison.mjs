import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const directory = path.resolve('qa-artifacts/character-motion-v1')
const cards = [
  ['LONG PRESS', 'Wind up', '02-game-cast-windup.png'],
  ['RELEASE', 'Cast', '03-game-cast-release.png'],
  ['DANGER / PULL', 'Resist loop', '05-game-fight-loop.png'],
  ['CAUGHT', 'Joy one-shot', '08-game-caught-joy.png'],
  ['ESCAPED', 'Sad one-shot', '07-game-escaped-sad.png'],
]
const resolved = []
for (const [eyebrow, title, file] of cards) {
  const bytes = await fs.readFile(path.join(directory, file))
  resolved.push([eyebrow, title, `data:image/png;base64,${bytes.toString('base64')}`])
}
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 1020 }, deviceScaleFactor: 1 })
await page.setContent(`<!doctype html><style>
*{box-sizing:border-box}body{margin:0;padding:32px;background:#071d2d;color:#f1f9ff;font:16px Inter,system-ui}h1{margin:0;font-size:34px}p{margin:7px 0 24px;color:#9ac7db}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16px}.card{background:#0b3048;border:1px solid #4c819a;border-radius:18px;padding:12px;box-shadow:0 14px 32px #0005}.card img{width:100%;aspect-ratio:390/844;object-fit:cover;border-radius:12px;display:block}.eye{margin-top:11px;color:#61d6ff;font-size:11px;font-weight:900;letter-spacing:.12em}.title{font-size:19px;font-weight:900;margin-top:3px}.foot{margin-top:22px;padding:14px 18px;border-radius:12px;background:#062438;color:#a8d3e5;display:flex;justify-content:space-between}.ok{color:#73e6a1;font-weight:800}
</style><h1>AINAN — in-game character motion integration</h1><p>Approved character direction preserved · authored in-betweens · separated character / rod / line / fish layers</p><div class="grid">${resolved.map(([eye,title,src])=>`<article class="card"><img src="${src}"><div class="eye">${eye}</div><div class="title">${title}</div></article>`).join('')}</div><div class="foot"><span>390×844 real browser capture · shared foot pivot · event-driven presentation only</span><span class="ok">CAST / FIGHT / CAUGHT / ESCAPED ✓</span></div>`)
await page.screenshot({ path: path.join(directory, 'ainan-game-motion-comparison.png'), fullPage: true })
await browser.close()
console.log('created ainan-game-motion-comparison.png')
