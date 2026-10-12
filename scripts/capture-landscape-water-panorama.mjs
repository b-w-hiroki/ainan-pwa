import assert from 'node:assert/strict'
import { existsSync, realpathSync, statSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const executable=process.env.PATH.split(':').map(folder=>join(folder,'playwright')).find(existsSync)
assert.ok(executable,'Playwright CLI not found in CI')
const { chromium }=await import(pathToFileURL(join(dirname(realpathSync(executable)),'index.mjs')).href)
const root=fileURLToPath(new URL('../',import.meta.url))
const preview=resolve(root,'artifacts/orientation/landscape-approved-water-candidate.svg')
const capture=resolve(root,'artifacts/orientation/79-landscape-water-material-review.png')
assert.ok(existsSync(preview),'expected approved-derived SVG generator output')
const browser=await chromium.launch({headless:true})
try{
  const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1})
  try{
    await page.goto(pathToFileURL(preview).href,{waitUntil:'load'})
    await page.waitForFunction(()=>Boolean(document.querySelector('svg')))
    const dims=await page.evaluate(()=>{
      const svg=document.querySelector('svg')
      return {width:svg?.getAttribute('width'),height:svg?.getAttribute('height'),
        uses:document.querySelectorAll('use').length,
        externalImages:document.querySelectorAll('image:not([href^="data:image/png;base64,"])').length}
    })
    assert.deepEqual(dims,{width:'844',height:'390',uses:3,externalImages:0})
    await page.screenshot({path:capture,animations:'disabled'})
    assert.ok(statSync(capture).size>=40000,'landscape material screenshot suspiciously blank')
    console.log('Verified approved-source material candidate, NOT a gameplay layout:',dims)
  }finally{await page.close()}
}finally{await browser.close()}
