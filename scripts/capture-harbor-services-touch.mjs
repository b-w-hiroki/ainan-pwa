import assert from 'node:assert/strict'
import { delimiter,join } from 'node:path'
import { existsSync,mkdirSync,writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const bin=process.env.PATH.split(delimiter).find(p=>existsSync(join(p,'playwright'))||existsSync(join(p,'playwright.cmd')))
assert.ok(bin)
const {chromium}=await import(pathToFileURL(join(bin,'..','playwright','index.mjs')).href)
const base=process.env.QA_URL??'http://127.0.0.1:4173'
const out='artifacts/harbor-services-touch'
mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true})
const evidence=[]
const fishIds=['aji','tai','saba','bass','isaki','hirame','buri','kanpachi','kue']
const settle=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))
async function controls(page) {
 return page.evaluate(()=>{
  const scene=window.__game.scene.getScene('HarborServicesScene'),canvas=window.__game.canvas.getBoundingClientRect()
  return scene._serviceButtons.map(b=>{
   const bounds=b.hit.getBounds(),sx=canvas.width/scene.scale.width,sy=canvas.height/scene.scale.height
   return {action:b.container.getData('serviceAction'),disabled:b.container.getData('state')==='disabled',
    label:b.container.list.find(n=>n.type==='Text')?.text,
    x:canvas.x+(bounds.x+bounds.width/2)*sx,y:canvas.y+(bounds.y+bounds.height/2)*sy,
    width:bounds.width*sx,height:bounds.height*sy}
  })
 })
}
async function tap(page,action) {
 const target=(await controls(page)).find(b=>b.action===action)
 assert.ok(target,action)
 await page.mouse.click(target.x,target.y)
 await settle(page)
 return target
}
const state=page=>page.evaluate(()=>({score:Number(localStorage.getItem('ainan_score')),
 stock:JSON.parse(localStorage.getItem('ainan_catch_stock')??'{}'),meal:JSON.parse(localStorage.getItem('ainan_active_meal')??'null')}))
function geometry(items,width,height) {
 for(const a of items) {
  assert.ok(a.width>=44&&a.height>=44,`small target: ${JSON.stringify(a)}`)
  assert.ok(a.x-a.width/2>=0&&a.x+a.width/2<=width&&a.y-a.height/2>=0&&a.y+a.height/2<=height,`offscreen: ${JSON.stringify(a)}`)
  for(const b of items) if(a.action<b.action) {
   assert.ok(Math.abs(a.x-b.x)>=(a.width+b.width)/2||Math.abs(a.y-b.y)>=(a.height+b.height)/2,
    `overlapping targets: ${a.action},${b.action}`)
  }
 }
}
try {
 for(const [width,height] of [[320,568],[390,844],[430,932]]) {
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2})
  const errors=[];page.on('pageerror',e=>{if(e.message!=='service worker disabled in QA')errors.push(e.message)})
  try {
   await page.goto(`${base}/fishing-game/?qa=1&scene=HarborServicesScene`)
   await page.waitForFunction(()=>window.__game?.scene.isActive('HarborServicesScene'))
   await page.evaluate(ids=>{
    localStorage.setItem('ainan_score','1000')
    localStorage.setItem('ainan_catch_stock',JSON.stringify(Object.fromEntries(ids.map(id=>[id,2]))))
    localStorage.removeItem('ainan_active_meal')
    window.__game.scene.getScene('HarborServicesScene').scene.restart()
   },fishIds)
   await settle(page)
   const initial=await state(page),seen=new Set()
   const first=(await controls(page)).find(b=>b.action.startsWith('sell-')&&b.action!=='sell-all')
   await page.mouse.move(first.x,first.y);await page.mouse.down()
   await page.setViewportSize({width:width+20,height:height+20});await settle(page)
   await page.mouse.up();await settle(page)
   await page.setViewportSize({width,height});await settle(page)
   assert.deepEqual(await state(page),initial,'resize while pressed must not transact')
   for(let index=0;index<12;index++) {
    const buttons=await controls(page)
    geometry(buttons,width,height)
    buttons.filter(b=>b.action.startsWith('sell-')&&b.action!=='sell-all').forEach(b=>seen.add(b.action.slice(5)))
    await page.screenshot({path:`${out}/fish-${width}-page${index}.png`})
    const next=buttons.find(b=>b.action==='page-next')
    if(!next||next.disabled)break
    await tap(page,'page-next')
   }
   assert.deepEqual([...seen].sort(),[...fishIds].sort(),'every stocked species must be selectable')
   assert.deepEqual(await state(page),initial,'paging must not change stock/points/meal')
   const sell=(await controls(page)).find(b=>b.action==='sell-kue')
   assert.ok(sell)
   await page.mouse.move(sell.x,sell.y);await page.mouse.down()
   assert.deepEqual(await state(page),initial,'press alone must not sell')
   await page.mouse.move(sell.x-sell.width-20,sell.y);await page.mouse.up();await settle(page)
   assert.deepEqual(await state(page),initial,'release outside must cancel sale')
   await page.mouse.move(sell.x,sell.y);await page.mouse.down()
   await page.evaluate(()=>window.dispatchEvent(new Event('blur')))
   await page.mouse.up();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await settle(page)
   assert.deepEqual(await state(page),initial,'blur must cancel sale')
   const advertised=Number(sell.label.match(/\d+/)[0])
   await tap(page,'sell-kue')
   const sold=await state(page)
   assert.equal(sold.stock.kue,1);assert.equal(sold.score,initial.score+advertised)
   for(const id of fishIds.filter(id=>id!=='kue'))assert.equal(sold.stock[id],2)
   await tap(page,'tab-diner')
   geometry(await controls(page),width,height)
   await page.screenshot({path:`${out}/diner-${width}.png`})
   const meal=(await controls(page)).find(b=>b.action==='meal-harborBowl')
   await page.mouse.move(meal.x,meal.y);await page.mouse.down()
   assert.deepEqual(await state(page),sold,'press alone must not cook')
   await page.mouse.up();await settle(page)
   const cooked=await state(page)
   assert.equal(cooked.score,sold.score-100)
   assert.equal(Object.values(cooked.stock).reduce((a,b)=>a+b,0),Object.values(sold.stock).reduce((a,b)=>a+b,0)-1)
   assert.equal(cooked.meal.id,'harborBowl');assert.equal(cooked.meal.usesLeft,3)
   await page.evaluate(()=>{
    localStorage.setItem('ainan_score','0')
    window.__game.scene.getScene('HarborServicesScene').scene.restart()
   })
   await settle(page)
   assert.ok((await controls(page)).filter(b=>b.action.startsWith('meal-')).every(b=>b.disabled))
   assert.equal(await page.evaluate(()=>window.__game.scene.getScene('HarborServicesScene').children.list.some(n=>n.text?.includes('あと100pt必要'))),true)
   await page.evaluate(()=>{
    localStorage.setItem('ainan_score','0');localStorage.setItem('ainan_catch_stock','{}')
    window.__game.scene.getScene('HarborServicesScene').scene.restart()
   })
   await settle(page)
   const poor=await state(page)
   assert.ok((await controls(page)).filter(b=>b.action.startsWith('meal-')).every(b=>b.disabled))
   await tap(page,'meal-harborBowl')
   assert.deepEqual(await state(page),poor,'disabled order must not spend or grant a meal')
   await page.screenshot({path:`${out}/diner-shortage-${width}.png`})
   await tap(page,'tab-fish')
   assert.equal((await controls(page)).find(b=>b.action==='sell-all').disabled,true)
   await page.screenshot({path:`${out}/empty-${width}.png`})
   await page.evaluate(()=>{
    localStorage.setItem('ainan_catch_stock',JSON.stringify({aji:3,tai:2}))
    window.__game.scene.getScene('HarborServicesScene').scene.restart()
   })
   await settle(page)
   await tap(page,'sell-all')
   const bulk=await state(page)
   assert.equal(Object.values(bulk.stock).reduce((a,b)=>a+b,0),0)
   assert.equal(bulk.score,408,'3 aji + 2 tai must retain the established sale values')
   await tap(page,'sell-all')
   assert.deepEqual(await state(page),bulk,'empty bulk sale must not double-credit')
   // A normal reload must preserve transactions, not rerun the QA fixture.
   await page.evaluate(()=>history.replaceState(null,'','/fishing-game/'))
   await page.reload();await page.waitForFunction(()=>window.__game?.scene.isActive('TitleScene'))
   assert.deepEqual(await state(page),bulk)
   await page.evaluate(()=>{
    localStorage.setItem('ainan_town_facilities',JSON.stringify({market:0,festival:0,pier:0,guide:0}))
    window.__game.scene.getScene('TitleScene').scene.start('HarborServicesScene')
   })
   await page.waitForFunction(()=>window.__game.scene.isActive('HarborServicesScene'))
   await settle(page)
   geometry(await controls(page),width,height)
   assert.ok(!(await controls(page)).some(b=>b.action.startsWith('sell-')))
   await page.screenshot({path:`${out}/locked-${width}.png`})
   await tap(page,'develop')
   await page.waitForFunction(()=>window.__game.scene.isActive('TownScene'))
   assert.deepEqual(await state(page),bulk,'locked shop navigation must not spend')
   assert.deepEqual(errors,[])
   evidence.push({width,height,allSpeciesReachable:[...seen],targets44px:true,pointerCancel:true,exactSale:true,exactMeal:true,disabled:true,bulkIdempotent:true,reload:true})
   console.log('Harbor services real touch/paging/transactions passed',width,height)
  } finally {await page.close()}
 }
 writeFileSync(`${out}/evidence.json`,JSON.stringify(evidence,null,2)+'\n')
} finally {await browser.close()}
