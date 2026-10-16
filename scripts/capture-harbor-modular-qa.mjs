import assert from 'node:assert/strict'
import { existsSync,mkdirSync,realpathSync,statSync } from 'node:fs'
import { dirname,join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildTrajectory } from '../fishing-game/js/game/cast.js'
import { analyzeCastClearZone } from '../fishing-game/js/game/castClearZone.js'
const executable=process.env.PATH.split(':').map(p=>join(p,'playwright')).find(existsSync)
assert.ok(executable,'Playwright binary missing')
const {chromium}=await import(pathToFileURL(join(dirname(realpathSync(executable)),'index.mjs')).href)
const browser=await chromium.launch({headless:true})
const out='artifacts/art-review/harbor-modular'
mkdirSync(out,{recursive:true})
const origin='http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene&cameraPan=1&coneLoop=1&qaHarborPlayable=1&castMotion=charged'
try {
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1})
  const errors=[]
  page.on('pageerror',e=>{if(e.message!=='service worker disabled in QA') errors.push(e.message)})
  await page.addInitScript(()=>{
    localStorage.setItem('ainan_sound_enabled','0')
    localStorage.setItem('ainan_inventory',JSON.stringify({rods:{basic:1,carbon:1,premium:1},baits:{worm:30,shrimp:30,special:30}}))
  })
  await page.goto(origin+'&qaParts=1&qaCap=1&qaBag=1&qaCat=1&qaRod=basic',{waitUntil:'domcontentloaded'})
  await page.waitForFunction(()=>{
    const s=window.__game?.scene?.getScene?.('GameScene')
    return s?._qaHarborPartSnapshot?.cap&&s?._qaHarborPartSnapshot?.bag&&s?._qaHarborPartSnapshot?.cat
  },null,{timeout:18000})
  const state=await page.evaluate(()=>{
    const s=window.__game.scene.getScene('GameScene'),p=s._qaHarborModular
    return {snapshot:s._qaHarborPartSnapshot,anchor:{x:s.anchorX,y:s.anchorY},range:s.castRangePx,
      components:Object.values(p.accents).map(x=>({x:x.x,y:x.y,active:x.active,depth:x.depth,
      artApproved:x.getData('artApproved'),independent:x!==s._cameraPanPlayer})),
      cat:{x:p.cat.x,y:p.cat.y,active:p.cat.active,visible:p.cat.visible,depth:p.cat.depth},
      rodCount:s._cameraPanRod?.active?1:0,rodId:s._cameraPanRod?.getData('rodType')}
  })
  assert.equal(state.snapshot.bodyVariant,'existing-approved-pose')
  assert.equal(state.snapshot.independentBodyVariantsReady,false)
  assert.equal(state.snapshot.independentClothingArtReady,false)
  assert.deepEqual(state.components.map(x=>x.active),[true,true])
  assert.ok(state.components.every(x=>x.independent&&!x.artApproved&&x.depth<42))
  assert.equal(state.cat.visible,true)
  assert.equal(state.rodCount,1,'No duplicated rod graphics')
  assert.equal(state.rodId,'basic','QA basic rod must use existing native rod owner')
  const cast=buildTrajectory(state.anchor.x,state.anchor.y,36,0.95,state.range)
  const clear=analyzeCastClearZone(cast,[{id:'cat',kind:'circle',
    center:{x:state.cat.x,y:state.cat.y-25},radius:19}],{corridorRadius:8})
  assert.equal(clear.clear,true,'Cat blocks the real diagonal cast lane')
  const screenshot=out+'/qa-harbor-cat-cap-bag.png'
  await page.screenshot({path:screenshot})
  assert.ok(statSync(screenshot).size>20000)
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  await page.waitForFunction(()=>{
    const s=window.__game?.scene?.getScene?.('GameScene')
    return s?.phase==='retrieve'||s?._pullCastTimeline?.lureReleasedAt!=null
  },null,{timeout:15000})
  await page.waitForFunction(()=>window.__game?.scene?.getScene?.('GameScene')?._qaHarborPartSnapshot?.pose!==null,null,{timeout:2000})
  const after=await page.evaluate(()=>window.__game.scene.getScene('GameScene')._qaHarborPartSnapshot)
  assert.equal(after.rodGraphicsOwners,1)
  assert.ok(after.cap&&after.bag)
  assert.deepEqual(errors,[])
  await page.screenshot({path:out+'/qa-harbor-modular-cast.png'})
  await page.close()

  const plain=await browser.newPage({viewport:{width:390,height:844}})
  await plain.goto(origin,{waitUntil:'domcontentloaded'})
  await plain.waitForFunction(()=>window.__game?.scene?.getScene?.('GameScene')?.sys?.isActive?.(),null,{timeout:16000})
  const inactive=await plain.evaluate(()=>{
    const s=window.__game.scene.getScene('GameScene')
    return {modular:!!s._qaHarborModular,portraitApproved:s._qaHarborPlayable}
  })
  assert.equal(inactive.modular,false,'Accessory QA must be opt-in')
  assert.equal(inactive.portraitApproved,true,'World QA remains independently selectable')
  await plain.close()
  console.log('H03 real browser actor slots: cap/bag + independent safe cat + native rod PASS; gender/clothing art still blocked')
}finally{await browser.close()}
