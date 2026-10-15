import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFileSync, mkdirSync, writeFileSync, statSync, realpathSync, existsSync } from 'node:fs'
import { resolve, extname, join, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'

const root=resolve(new URL('..', import.meta.url).pathname)
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'}
const server=createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)
  const file=resolve(root, '.'+pathname)
  if(!file.startsWith(root+'/')){res.writeHead(403).end();return}
  try{
    const contents=readFileSync(file)
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'})
    res.end(contents)
  }catch(e){res.writeHead(404).end('not found')}
})
await new Promise(ok=>server.listen(0,'127.0.0.1',ok))
const port=server.address().port
const binary=process.env.PATH.split(':').map(p=>join(p,'playwright')).find(existsSync)
assert.ok(binary,'Playwright binary unavailable')
const {chromium}=await import(pathToFileURL(join(dirname(realpathSync(binary)),'index.mjs')).href)
const browser=await chromium.launch({headless:true})
const out='artifacts/art-review/harbor-h02-panorama'
mkdirSync(out,{recursive:true})
const report=[]
try{
  const page=await browser.newPage({viewport:{width:1120,height:1050},deviceScaleFactor:1})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(`http://127.0.0.1:${port}/fishing-game/qa/harbor-h02-panorama-review.html`,{waitUntil:'networkidle'})
  await page.waitForFunction(()=>document.querySelector('#info')?.textContent?.includes('World coverage: PASS'))
  assert.deepEqual(errors,[],'Browser module error: '+errors.join(' / '))
  const loaded=await page.evaluate(()=>['far','sea','quay'].every(id=>document.getElementById(id).naturalWidth===2160))
  assert.equal(loaded,true,'H02 atlas image decode failed')
  for(const [size,width,height] of [['portrait',390,844],['landscape',844,390],['wide',932,430]]){
    await page.selectOption('#viewport',`${width},${height}`)
    const pngs=[]
    for(const step of [0,20,40]){
      await page.$eval('#progress',(e,step)=>{e.value=step;e.dispatchEvent(new Event('input',{bubbles:true}))},step)
      const txt=await page.locator('#info').textContent()
      assert.ok(txt.includes('Cast clear: YES')&&txt.includes('World coverage: PASS')&&txt.includes('Wide art approved: NO'),`Invalid H02 state: ${txt}`)
      const dest=`${out}/h02-${size}-flight-${step}.png`
      await page.locator('#screen').screenshot({path:dest})
      assert.ok(statSync(dest).size>5000,'Blank/invalid screenshot: '+dest)
      pngs.push(createHash('sha256').update(readFileSync(dest)).digest('hex'))
    }
    assert.ok(new Set(pngs).size>=2,'Camera scrub did not change rendered panorama at '+size)
    report.push({size,frames:[0,20,40],pixelHashesUnique:new Set(pngs).size,
      source:'independent QA wireframe; NOT production art or gameplay'})
  }
  await page.screenshot({path:`${out}/h02-review-ui.png`,fullPage:true})
  writeFileSync(`${out}/capture-report.json`,JSON.stringify({report,artApproved:false,gameplayTested:false},null,2)+'\n')
  await page.close()
  console.log('H02 separate wide-world browser/screenshot QA passed; art approval remains false')
}finally{await browser.close();await new Promise(ok=>server.close(ok))}
