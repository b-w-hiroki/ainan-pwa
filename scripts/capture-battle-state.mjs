import assert from 'node:assert/strict'
import { mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { existsSync, realpathSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

// Real Phaser WebGL captures can be blank during one compositor readback.
// Never accept that frame or relax the existing global visual screenshot guard.
const executable=process.env.PATH.split(':').map(folder=>join(folder,'playwright')).find(existsSync)
assert.ok(executable,'Playwright executable missing')
const {chromium}=await import(pathToFileURL(join(dirname(realpathSync(executable)),'index.mjs')).href)
const destination='artifacts/e2e/03-battle.png'
mkdirSync('artifacts/e2e',{recursive:true})
const browser=await chromium.launch({headless:true})
try {
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1})
  try {
    await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene&qaAction=battle',
      {waitUntil:'domcontentloaded'})
    await page.waitForFunction(()=>{
      const scene=window.__game?.scene?.getScene('GameScene')
      return scene?.phase==='battle' && !!scene?._castPresentationHost?.root?.active
    },null,{timeout:20000})
    let accepted=false
    for(let attempt=1;attempt<=5;attempt++){
      const state=await page.evaluate(()=>{
        const scene=window.__game?.scene?.getScene('GameScene')
        return {phase:scene?.phase,hostActive:!!scene?._castPresentationHost?.root?.active}
      })
      assert.equal(state.phase,'battle','Battle phase changed before screenshot')
      assert.equal(state.hostActive,true,'Battle presentation host missing')
      await page.screenshot({path:destination,animations:'disabled'})
      const bytes=statSync(destination).size
      if(bytes>15000){
        console.log('Verified rendered Battle PNG',JSON.stringify({attempt,bytes,state}))
        accepted=true
        break
      }
      console.warn('Rejecting blank Battle WebGL capture',JSON.stringify({attempt,bytes}))
      await page.waitForTimeout(180)
    }
    assert.ok(accepted,'Battle screenshot did not render after five verified attempts')
  } finally { await page.close() }
} finally { await browser.close() }
