import assert from 'node:assert/strict'
import { delimiter, join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const bin = process.env.PATH.split(delimiter).find(dir => existsSync(join(dir, 'playwright')) || existsSync(join(dir, 'playwright.cmd')))
assert.ok(bin, 'Run via npm exec --package=playwright')
const { chromium } = await import(pathToFileURL(join(bin, '..', 'playwright', 'index.mjs')).href)
const browser = await chromium.launch({ headless: true })
const output = process.env.QA_OUTPUT ?? 'artifacts/title-hierarchy'
mkdirSync(output, { recursive: true })
try {
 for (const [width,height] of [[320,568],[390,844],[1180,757]]) {
  const page = await browser.newPage({ viewport:{width,height} })
  const errors=[]; page.on('pageerror', e=>errors.push(e.message))
  await page.goto(`${process.env.QA_URL ?? 'http://127.0.0.1:4173'}/fishing-game/`)
  await page.waitForFunction(()=>window.__game?.scene.isActive('TitleScene'))
  const bounds=await page.evaluate(()=>{
   const scene=window.__game.scene.getScene('TitleScene')
   const text=scene.children.list.filter(n=>n.type==='Text').map(n=>n.text)
   const button=scene._startButton.container
   const labels=button.list.filter(n=>n.type==='Text').map(n=>n.text)
   const rect=scene.game.canvas.getBoundingClientRect()
   const screen=b=>({x:rect.x+b.x*rect.width/scene.scale.width,y:rect.y+b.y*rect.height/scene.scale.height})
   return {text,labels,start:screen(button),help:screen(scene._helpButton.container)}
  })
  assert.equal(bounds.text.filter(t=>t==='釣って、育てて、港町を元気に。').length,1)
  assert.ok(!bounds.text.includes('釣り × 町おこし  AINAN'))
  assert.ok(!bounds.labels.includes('釣って、育てて、町を元気に'))
  assert.ok(bounds.start.y<bounds.help.y && bounds.help.y<height)
  await page.screenshot({path:`${output}/title-${width}.png`})
  await page.mouse.click(bounds.help.x,bounds.help.y)
  await page.waitForFunction(()=>window.__game?.scene.isActive('HelpScene'))
  await page.reload(); await page.waitForFunction(()=>window.__game?.scene.isActive('TitleScene'))
  await page.mouse.click(bounds.start.x,bounds.start.y)
  await page.waitForFunction(()=>window.__game?.scene.isActive('HomeScene'))
  assert.deepEqual(errors,[])
  await page.close(); console.log(`PASS title hierarchy and Help/Start ${width}x${height}`)
 }
} finally { await browser.close() }
