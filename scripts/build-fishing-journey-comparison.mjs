import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const root = path.resolve('qa-artifacts/fishing-journey-v1')
const panels = [
  { file: '01-caught-recorded-portrait.png', label: '1. RESULT', note: 'score + catch are already recorded' },
  { file: '03-town-catch-arrival.png', label: '2. TOWN REVIEW', note: 'visible town reaction, no duplicate reward' },
  { file: '05-failure-routes.png', label: '3. FAILURE', note: 'cause, advice, −1ST retry, two exits' },
  { file: '06-bait-shortage-home.png', label: '4. PREPARATION', note: 'unlock and readiness are separate' },
]
for (const panel of panels) {
  const bytes = await fs.readFile(path.join(root, panel.file))
  panel.src = `data:image/png;base64,${bytes.toString('base64')}`
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 930, height: 1110 } })
await page.setContent(`<!doctype html><style>
*{box-sizing:border-box}body{margin:0;padding:26px;background:#071d2d;color:#f2faff;font:16px system-ui}h1{margin:0;font-size:30px}p{margin:7px 0 18px;color:#acd3e2}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.card{background:#0b3048;border:1px solid #4c819a;border-radius:16px;padding:8px}.card img{display:block;width:100%;height:870px;object-fit:contain;border-radius:10px;background:#04121c}.label{padding:9px 3px 2px;font-weight:900;color:#ffdf5a}.note{padding:0 3px 5px;font-size:11px;color:#acd3e2;min-height:34px}.footer{margin-top:14px;padding:12px 16px;border-radius:12px;background:#062438;display:flex;justify-content:space-between;color:#aed7e7}.ok{color:#76eca4;font-weight:900}</style>
<h1>AINAN fishing journey — shared state model</h1><p>One vocabulary from first catch through town growth, return preparation, and retry recovery.</p><div class="grid">${panels.map(panel => `<section class="card"><img src="${panel.src}"><div class="label">${panel.label}</div><div class="note">${panel.note}</div></section>`).join('')}</div><div class="footer"><span>Normal CTA navigation · reload recovery · portrait/landscape · back · rapid input</span><span class="ok">QA PASS</span></div>`)
await page.screenshot({ path: path.join(root, 'ainan-fishing-journey-comparison.png'), fullPage: true })

const approvedResult = (await fs.readFile(path.resolve('qa-artifacts/approved-source/result-approved-panel.png'))).toString('base64')
const actualCaught = (await fs.readFile(path.join(root, '01-caught-recorded-portrait.png'))).toString('base64')
const actualFailure = (await fs.readFile(path.join(root, '05-failure-routes.png'))).toString('base64')
await page.setViewportSize({ width: 1040, height: 1020 })
await page.setContent(`<!doctype html><style>
*{box-sizing:border-box}body{margin:0;padding:26px;background:#071d2d;color:#f2faff;font:16px system-ui}h1{margin:0;font-size:30px}p{margin:7px 0 18px;color:#acd3e2}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.card{background:#0b3048;border:1px solid #4c819a;border-radius:16px;padding:10px}.frame{height:820px;background:#04121c;border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden}.frame img{display:block;width:100%;height:100%;object-fit:contain}.label{padding:10px 3px 2px;font-weight:900;color:#ffdf5a}.note{padding:0 3px 5px;font-size:12px;color:#acd3e2}.footer{margin-top:14px;padding:12px 16px;border-radius:12px;background:#062438;color:#aed7e7}</style>
<h1>Approved Result mock / 390×844 implementation</h1><p>The approved fish-first composition is retained; the production states add explicit saved-reward and recovery language.</p><div class="grid"><section class="card"><div class="frame"><img src="data:image/png;base64,${approvedResult}"></div><div class="label">APPROVED MOCK</div><div class="note">391×783 supplied result panel</div></section><section class="card"><div class="frame"><img src="data:image/png;base64,${actualCaught}"></div><div class="label">ACTUAL · CAUGHT</div><div class="note">390×844 viewport · reward already recorded</div></section><section class="card"><div class="frame"><img src="data:image/png;base64,${actualFailure}"></div><div class="label">ACTUAL · ESCAPED</div><div class="note">390×844 viewport · cause, retry cost, alternatives</div></section></div><div class="footer">Same central fish/result hierarchy · same full-width primary CTA · extra recovery row only on failure</div>`)
await page.screenshot({ path: path.join(root, 'ainan-result-approved-vs-actual.png'), fullPage: true })
await browser.close()
console.log('created journey comparison and approved-result comparison')
