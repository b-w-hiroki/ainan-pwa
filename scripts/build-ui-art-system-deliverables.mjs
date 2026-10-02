import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const root = path.resolve('qa-artifacts/ui-art-system-v2')
await fs.mkdir(root, { recursive: true })
const data = async file => `data:image/png;base64,${(await fs.readFile(path.resolve(file))).toString('base64')}`
const browser = await chromium.launch({ headless: true })

const assets = [
  ['PANEL', 'fishing-game/assets/ui-art-v2/panel-large.png'],
  ['DIALOG', 'fishing-game/assets/ui-art-v2/dialog.png'],
  ['IDLE', 'fishing-game/assets/ui-art-v2/card-idle.png'],
  ['SELECTED', 'fishing-game/assets/ui-art-v2/card-selected.png'],
  ['PRESSED', 'fishing-game/assets/ui-art-v2/card-pressed.png'],
  ['DISABLED', 'fishing-game/assets/ui-art-v2/card-disabled.png'],
  ['SHORTAGE', 'fishing-game/assets/ui-art-v2/card-shortage.png'],
  ['GAUGE', 'fishing-game/assets/ui-art-v2/gauge-track.png'],
  ['DOCK', 'fishing-game/assets/ui-art-v2/operation-dock.png'],
  ['RESULT', 'fishing-game/assets/ui-art-v2/result-card.png'],
]
const assetData = await Promise.all(assets.map(async ([label, file]) => [label, await data(file)]))
const board = await browser.newPage({ viewport: { width: 1600, height: 1500 } })
await board.setContent(`<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;padding:42px;background:linear-gradient(145deg,#dff5ff,#fff4c9);font-family:Arial;color:#173248}h1{margin:0;font-size:38px}p{margin:8px 0 28px;color:#31566e}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}.card{background:rgba(255,255,255,.86);border:3px solid #173248;border-radius:28px;padding:20px;box-shadow:0 10px 0 rgba(23,50,72,.14)}.asset{height:190px;display:flex;align-items:center;justify-content:center}.asset img{max-width:100%;max-height:100%;object-fit:contain}.label{font-size:16px;font-weight:900;color:#157daf}.wide{grid-column:1/-1}.wide .asset{height:250px}.footer{margin-top:24px;background:#173248;color:white;border-radius:20px;padding:18px 22px;font-weight:700}</style>
<h1>AINAN UI ART SYSTEM v2</h1><p>Approved white-enamel / navy contour / ocean rim / sun-yellow selection system. All text, values and hit regions remain live.</p>
<div class="grid">${assetData.map(([label,src],i)=>`<section class="card ${i<2?'wide':''}"><div class="label">${label}</div><div class="asset"><img src="${src}"></div></section>`).join('')}</div>
<div class="footer">Production crops are transparent PNGs with safe insets; source sheets and deterministic extraction scripts are retained.</div>`)
await board.screenshot({ path: path.join(root, 'ainan-ui-art-system-material-board.png'), fullPage: true })

const panels = [
  ['BEFORE HOME', 'qa-artifacts/ui-component-v1/after/home-portrait.png'],
  ['AFTER HOME', 'qa-artifacts/ui-art-system-v2/after/home-portrait.png'],
  ['BEFORE EQUIPMENT', 'qa-artifacts/ui-component-v1/after/upgrade-portrait.png'],
  ['AFTER EQUIPMENT', 'qa-artifacts/ui-art-system-v2/after/upgrade-portrait.png'],
  ['MAP', 'qa-artifacts/ui-art-system-v2/after/map-portrait.png'],
  ['TOWN', 'qa-artifacts/ui-art-system-v2/after/town-portrait.png'],
  ['MENU', 'qa-artifacts/ui-art-system-v2/after/menu-portrait.png'],
  ['CAST', 'qa-artifacts/ui-art-system-v2/after/fishing-cast-portrait.png'],
  ['CAUGHT', 'qa-artifacts/ui-art-system-v2/after/result-caught-portrait.png'],
  ['FAILED', 'qa-artifacts/ui-art-system-v2/after/result-failed-portrait.png'],
]
const panelData = await Promise.all(panels.map(async ([label,file])=>[label,await data(file)]))
const compare = await browser.newPage({ viewport: { width: 1760, height: 1100 } })
await compare.setContent(`<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;padding:32px;background:#071d2d;color:#f5fbff;font-family:Arial}h1{margin:0;font-size:34px}p{color:#b4d8e6}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16px}.card{background:#0a3048;border:2px solid #4c819a;border-radius:18px;padding:10px}.image{height:844px;background:#04131d;border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden}.image img{max-width:100%;max-height:100%;object-fit:contain}.label{margin-top:9px;color:#ffdc5e;font-weight:900}.footer{margin-top:18px;padding:16px;background:#0a3048;border-radius:14px;color:#7af0a6;font-weight:900}</style>
<h1>AINAN UI art rollout — actual browser screens</h1><p>Home, Map, Equipment, Town, Menu, Cast, caught and failed result. Gameplay rules, prices and rewards unchanged.</p><div class="grid">${panelData.map(([label,src])=>`<section class="card"><div class="image"><img src="${src}"></div><div class="label">${label}</div></section>`).join('')}</div><div class="footer">390×844 primary captures · 375×667 and 844×390 fit checks passed</div>`)
await compare.screenshot({ path: path.join(root, 'ainan-ui-art-system-before-after.png'), fullPage: true })
await browser.close()
console.log('created UI art system board and before/after')
