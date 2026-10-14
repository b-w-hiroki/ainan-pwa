import assert from 'node:assert/strict'
import { getNativeHomeLayout } from '../fishing-game/js/presentation/landscape/homeLandscapePrototype.js'
import { getNativeMapLayout } from '../fishing-game/js/presentation/landscape/mapLandscapePrototype.js'
import { getNativeTownLayout } from '../fishing-game/js/presentation/landscape/townLandscapePrototype.js'
import { getNativeCollectionLayout } from '../fishing-game/js/presentation/landscape/collectionLandscapePrototype.js'
import { getNativeMenuLayout } from '../fishing-game/js/presentation/landscape/menuLandscapePrototype.js'
import { getNativeSettingsLayout } from '../fishing-game/js/presentation/landscape/settingsLandscapePrototype.js'
import { makeFishingLandscapeLayout, landscapePointerToWorld, LANDSCAPE_MIN_TOUCH } from '../fishing-game/js/presentation/cast/landscapeLayout.js'

function inside(a,b) {
  return a.x>=b.x && a.y>=b.y && a.x+a.width<=b.x+b.width
    && a.y+a.height<=b.y+b.height
}
function overlaps(a,b) {
  return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y
}
for(const [width,height,safe] of [
  [844,390,{}],
  [844,390,{top:12,bottom:16,left:28,right:32}],
  [932,430,{left:40,right:40,top:8,bottom:8}],
  [667,375,{left:16,right:16}],
]) {
  const a=makeFishingLandscapeLayout(width,height,safe)
  assert.equal(a.orientation,'landscape')
  assert.equal(a.supported,true,JSON.stringify({width,height,safe,reason:a.reason}))
  assert.ok(inside(a.world,a.viewport)&&inside(a.sideDock,a.viewport))
  assert.ok(!overlaps(a.world,a.sideDock),'camera world and controls must not overlap')
  assert.ok(inside(a.hud,a.world)&&inside(a.back,a.world),'HUD/back must stay inside the world')
  assert.ok(inside(a.cast,a.sideDock),'Cast control is not in the side dock')
  assert.ok(a.cast.width>=LANDSCAPE_MIN_TOUCH)
  for(const [i,action] of a.actions.entries()){
    assert.ok(inside(action,a.sideDock),i+': action outside side dock')
    assert.ok(action.width>=LANDSCAPE_MIN_TOUCH && action.height>=LANDSCAPE_MIN_TOUCH)
    for(const other of a.actions.slice(i+1))assert.ok(!overlaps(action,other),'Retrieve controls overlap')
  }
  const pointer=landscapePointerToWorld({x:a.world.x+120,y:a.world.y+160},a.world)
  assert.deepEqual(pointer,{x:120,y:160},'pointer must be mapped to world-local coordinate')
  console.log('Landscape interaction proposal OK:',width,height,JSON.stringify({
    world:a.world,sideDock:a.sideDock,actionSize:a.actions[0].width,
  }))
}
// Browser safe-area/rotation APIs may transiently return invalid values.
// Never reinterpret NaN, negative, strings or oversized readings as zero.
for (const safe of [
  {left: NaN}, {top: Infinity}, {right: -1}, {bottom: '12'},
  {left: 81}, {top: 220, bottom: 220},
]) {
  const candidate = makeFishingLandscapeLayout(844,390,safe)
  assert.equal(candidate.orientation,'landscape')
  assert.equal(candidate.supported,false,'invalid safe area must not activate native controls: '+JSON.stringify(safe))
}
assert.equal(makeFishingLandscapeLayout(844,390,{left:80,right:80}).supported,true,
  'valid maximum safe insets remain supported')

const portrait=makeFishingLandscapeLayout(390,844)
assert.equal(portrait.orientation,'portrait')
assert.equal(portrait.supported,false,'portrait is still owned by the approved layout')
assert.equal(makeFishingLandscapeLayout(568,320).supported,false,
  'do not pretend the smallest landscape viewport fits 44px controls and large world')
for(const [w,h] of [[0,390],[844,0],[NaN,390]])assert.throws(()=>makeFishingLandscapeLayout(w,h))
console.log('AINAN landscape geometric readiness QA passed; runtime reflow is still pending')

// Native Home is a separate opt-in layout and may not silently fall back to
// tiny portrait controls when explicitly staged for a wide QA viewport.
for (const [width,height] of [[844,390],[932,430],[1024,430]]) {
  const layout=getNativeHomeLayout(width,height)
  assert.ok(layout,'native Home candidate missing for '+width+'x'+height)
  assert.equal(Object.keys(layout.actions).length,4)
  for(const button of Object.values(layout.actions)) {
    assert.ok(button.width>=44&&button.height>=44,'native Home has undersized action')
    assert.ok(button.x-button.width/2>=layout.panel.x+12)
    assert.ok(button.x+button.width/2<=layout.panel.x+layout.panel.width-12)
  }
}
for (const [width,height] of [[390,844],[568,320],[0,390],[844,0],[NaN,390]]) {
  assert.equal(getNativeHomeLayout(width,height),null,'unsupported native Home must opt out')
}
console.log('QA-only native Home horizontal layout geometry passed; no production activation')

// Map native-width staging must preserve three distinct, independently
// hit-testable point choices with no overlap, plus a real 44px back action.
for(const [w,h] of [[844,390],[932,430],[1024,430]]) {
  const layout=getNativeMapLayout(w,h)
  assert.ok(layout,'wide Map layout missing')
  assert.deepEqual(layout.cards.map(card=>card.point),['pointA','pointB','pointC'])
  for(const item of [...layout.cards,layout.back]) {
    assert.ok(item.width>=44&&item.height>=44)
    assert.ok(item.x-item.width/2>=0&&item.y-item.height/2>=0)
    assert.ok(item.x+item.width/2<=w&&item.y+item.height/2<=h)
  }
  for(let i=0;i<layout.cards.length;i++) for(let j=i+1;j<layout.cards.length;j++) {
    const a=layout.cards[i],b=layout.cards[j]
    assert.ok(a.x+a.width/2<=b.x-b.width/2,'Map point hit areas overlap')
  }
}
for(const [w,h] of [[390,844],[568,320],[0,390]])assert.equal(getNativeMapLayout(w,h),null)
console.log('QA-only native Map geometry checks passed')

for(const [w,h] of [[844,390],[932,430],[1024,430]]) {
  const layout=getNativeTownLayout(w,h)
  assert.ok(layout,'native Town layout missing')
  assert.deepEqual(layout.cards.map(x=>x.id),['market','pier','guide','festival'])
  for(const item of [...layout.cards,...Object.values(layout.navigation)]) {
    assert.ok(item.width>=44 && item.height>=44,'native Town target below 44px')
    assert.ok(item.x-item.width/2>=0 && item.y-item.height/2>=0)
    assert.ok(item.x+item.width/2<=w && item.y+item.height/2<=h)
  }
  for(let i=0;i<layout.cards.length-1;i++) {
    const a=layout.cards[i],b=layout.cards[i+1]
    assert.ok(a.x+a.width/2<=b.x-b.width/2,'Town facility cards overlap')
  }
}
for(const [w,h] of [[390,844],[568,320],[0,390]])assert.equal(getNativeTownLayout(w,h),null)
console.log('Native Town QA-only layout geometry passed')

for(const [w,h] of [[844,390],[932,430],[1024,430]]){
  const layout=getNativeCollectionLayout(w,h)
  assert.ok(layout,'wide Collection layout missing')
  assert.equal(layout.cards.length,9,'Collection must display all nine species')
  const r=layout.back
  assert.ok(r.width>=44&&r.height>=44)
  for(const card of layout.cards){
    assert.ok(card.width>=44&&card.height>=44)
    assert.ok(card.x-card.width/2>=0&&card.x+card.width/2<=w)
    assert.ok(card.y-card.height/2>=0&&card.y+card.height/2<=h)
  }
  for(let i=0;i<layout.cards.length;i++) for(let j=i+1;j<layout.cards.length;j++){
    const a=layout.cards[i],b=layout.cards[j]
    assert.ok(a.x+a.width/2<=b.x-b.width/2||
      b.x+b.width/2<=a.x-a.width/2||
      a.y+a.height/2<=b.y-b.height/2||
      b.y+b.height/2<=a.y-a.height/2,'Gallery hit areas overlap')
  }
}
for(const [w,h] of [[390,844],[568,320],[0,390]]) assert.equal(getNativeCollectionLayout(w,h),null)
console.log('QA-only native Collection grid and touch layout passed')

for(const [w,h] of [[844,390],[932,430],[1024,430]]){
  const layout=getNativeMenuLayout(w,h)
  assert.ok(layout,'QA wide Menu layout missing')
  assert.equal(layout.cards.length,8)
  for(const c of [...layout.cards,layout.back]){
    assert.ok(c.width>=44&&c.height>=44)
    assert.ok(c.x-c.width/2>=0&&c.x+c.width/2<=w)
    assert.ok(c.y-c.height/2>=0&&c.y+c.height/2<=h)
  }
  for(let i=0;i<layout.cards.length;i++)for(let j=i+1;j<layout.cards.length;j++){
    const a=layout.cards[i],b=layout.cards[j]
    assert.ok(a.x+a.width/2<=b.x-b.width/2||
      b.x+b.width/2<=a.x-a.width/2||
      a.y+a.height/2<=b.y-b.height/2||
      b.y+b.height/2<=a.y-a.height/2,'Menu cards overlap')
  }
}
for(const [w,h] of [[390,844],[568,320],[0,390]])assert.equal(getNativeMenuLayout(w,h),null)
console.log('QA-only native Menu 8-action geometry passed')

for(const [w,h] of [[844,390],[932,430],[1024,430]]){
  const layout=getNativeSettingsLayout(w,h)
  assert.ok(layout,'wide Settings layout missing')
  assert.equal(layout.cards.length,8)
  for(const c of [...layout.cards,layout.back]){
    assert.ok(c.width>=44&&c.height>=44)
    assert.ok(c.x-c.width/2>=0&&c.x+c.width/2<=w)
    assert.ok(c.y-c.height/2>=0&&c.y+c.height/2<=h)
  }
  for(let i=0;i<layout.cards.length;i++)for(let j=i+1;j<layout.cards.length;j++){
    const a=layout.cards[i],b=layout.cards[j]
    assert.ok(a.x+a.width/2<=b.x-b.width/2||
      b.x+b.width/2<=a.x-a.width/2||
      a.y+a.height/2<=b.y-b.height/2||
      b.y+b.height/2<=a.y-a.height/2,'Settings cards overlap')
  }
}
for(const [w,h] of [[390,844],[568,320],[0,390]])assert.equal(getNativeSettingsLayout(w,h),null)
console.log('QA-only native Settings eight action rectangles passed')
