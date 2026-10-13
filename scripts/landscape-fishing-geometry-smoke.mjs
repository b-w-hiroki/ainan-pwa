import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import {
  layoutLandscapeFishing, pointerInWorld, rectanglesOverlap, landscapeActionAt,
} from '../fishing-game/js/presentation/layouts/landscapeFishingGeometry.js'

const inside = (container, child) =>
  child.x >= container.x && child.y >= container.y
  && child.x + child.width <= container.x + container.width
  && child.y + child.height <= container.y + container.height

const tested = [[667,375,{}],[844,390,{}],[932,430,{left:24,right:24,top:0,bottom:8}]]
for (const [width,height,insets] of tested) {
  const l = layoutLandscapeFishing(width,height,insets)
  assert.ok(l, 'landscape layout missing at '+width+'x'+height)
  for (const r of [l.rail,l.world,l.dock,l.back,l.status,l.gauge,...l.retrieve,...l.resultActions]) {
    assert.ok(inside(l.viewport,r), 'element outside viewport: '+JSON.stringify(r))
  }
  assert.equal(rectanglesOverlap(l.world,l.dock),false,'world overlaps right-side controls')
  assert.equal(rectanglesOverlap(l.world,l.rail),false,'world overlaps left-side status')
  assert.equal(rectanglesOverlap(l.gauge,l.resultActions[0]),false,'gauge obscured by result CTA')
  // The geometry is reused for phase switches; it must be safe at native
  // landscape pixel sizes, never inheriting portrait's scaled hit boxes.
  const castBounds = {
    x: l.castCenter.x - l.castCenter.radius,
    y: l.castCenter.y - l.castCenter.radius,
    width: l.castCenter.radius * 2,
    height: l.castCenter.radius * 2,
  }
  assert.ok(inside(l.dock, castBounds), 'Cast hit area outside dock/safe area')
  assert.equal(rectanglesOverlap(l.gauge, castBounds), false, 'gauge overlaps Cast')
  for (const [index, target] of l.retrieve.entries()) {
    assert.equal(rectanglesOverlap(l.gauge, target), false, 'gauge overlaps reel '+index)
    assert.equal(rectanglesOverlap(castBounds, target), false, 'Cast overlaps reel '+index)
    for (const other of l.retrieve.slice(index + 1)) {
      assert.equal(rectanglesOverlap(target, other), false, 'reel controls overlap')
    }
  }
  assert.ok(l.world.width >= 330 && l.world.height >= 280,'world too small')
  for (const r of [l.back,...l.retrieve,...l.resultActions]) {
    assert.ok(r.width>=44&&r.height>=44,'touch target smaller than 44 CSS pixels')
    assert.ok(inside(l.dock,r)||r===l.back,'control outside assigned dock')
  }
  const c=l.castCenter
  assert.ok(c.radius*2>=44&&c.x-c.radius>=l.dock.x&&c.x+c.radius<=l.dock.x+l.dock.width,'Cast hit target clipped')
  const center=pointerInWorld(l.world.x+l.world.width/2,l.world.y+l.world.height/2,l)
  assert.ok(Math.abs(center.x-.5)<1e-8&&Math.abs(center.y-.5)<1e-8)
  assert.equal(pointerInWorld(l.dock.x+12,l.dock.y+12,l),null,'dock press interpreted as cast world input')
  assert.equal(pointerInWorld(-5,0,l),null)
}
// Adversarial rotation/safe-area measurements must fail closed, never
// allocate buttons into unsafe insets or return NaN hit-testing coordinates.
for (const [w,h,safe] of [
  [844,390,{left:844}], [844,390,{top:390}],
  [844,390,{right:Infinity}], [844,390,{bottom:-1}],
  [844,390,{left:NaN}], [844,390,{top:200,bottom:200}],
]) assert.equal(layoutLandscapeFishing(w,h,safe),null,'invalid safe area accepted')
for (const [w,h,safe] of [
  [844,390,{left:0,right:0}], [932,430,{left:24,right:24,top:0,bottom:8}],
]) {
  const l=layoutLandscapeFishing(w,h,safe)
  assert.ok(l)
  for (const edge of [
    [l.world.x,l.world.y,0,0],
    [l.world.x+l.world.width,l.world.y+l.world.height,1,1],
  ]) {
    const p=pointerInWorld(edge[0],edge[1],l)
    assert.ok(p&&Math.abs(p.x-edge[2])<1e-8&&Math.abs(p.y-edge[3])<1e-8)
  }
  assert.equal(pointerInWorld(l.rail.x+4,l.rail.y+4,l),null)
  assert.equal(pointerInWorld(l.dock.x+4,l.dock.y+4,l),null)
  assert.equal(pointerInWorld(Number.NaN,l.world.y,l),null)
}
assert.equal(layoutLandscapeFishing(390,844),null,'portrait must not use landscape geometry')
assert.equal(layoutLandscapeFishing(540,320),null,'unsupported size must not silently shrink input')
assert.equal(layoutLandscapeFishing(844,355),null,'too-short landscape must not overlap controls')
assert.ok(layoutLandscapeFishing(844,356),'minimum usable dock height must still fit 44px targets')


const hit=(x,y,phase,l=layoutLandscapeFishing(844,390))=>landscapeActionAt(x,y,l,phase)
const probe=(rect,phase)=>hit(rect.x+rect.width/2,rect.y+rect.height/2,phase)
const native=layoutLandscapeFishing(844,390)
assert.deepEqual(hit(native.castCenter.x,native.castCenter.y,'cast'),{type:'cast'})
assert.equal(hit(native.castCenter.x,native.castCenter.y,'retrieve'),null,'Cast may never reel')
assert.equal(hit(native.castCenter.x,native.castCenter.y,'result'),null,'Cast may never confirm Result')
for(const [index,target] of native.retrieve.entries()){
  assert.deepEqual(probe(target,'retrieve'),{type:'reel',index})
  assert.equal(probe(target,'cast'),null,'Reel must not fire a Cast')
}
for(const [index,target] of native.resultActions.entries()){
  assert.deepEqual(probe(target,'result'),{type:'result',index})
  // Result and reel rectangles intentionally reuse side-dock space in
  // different phases; only the active phase may own the resulting action.
}
assert.deepEqual(probe(native.back,'cast'),{type:'back'})
assert.deepEqual(probe(native.back,'retrieve'),{type:'back'})
assert.equal(probe(native.gauge,'cast'),null,'Gauge must not start Cast')
assert.equal(hit(native.world.x+10,native.world.y+10,'cast'),null,'World pointer must not be a dock action')
assert.equal(hit(native.castCenter.x,native.castCenter.y,'battle'),null,'Unimplemented battle routing must fail closed')
for(const point of [[NaN,10],[10,Infinity],[-1,10],[844,390]]) {
  assert.equal(hit(point[0],point[1],'retrieve'),null)
}
assert.equal(landscapeActionAt(0,0,null,'cast'),null)

const l=layoutLandscapeFishing(844,390)
const box=(r,fill,label)=>`<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="${fill}" rx="9"/><text x="${r.x+10}" y="${r.y+22}" font-size="13" fill="#f5f6f2">${label}</text>`
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 844 390" width="844" height="390">
<rect width="844" height="390" fill="#0a2533"/>
${box(l.rail,'#315766','status rail')}${box(l.world,'#146e87','world / camera')}${box(l.dock,'#37485d','actions')}
${box(l.back,'#3c8493','back 52')}${box(l.gauge,'#9c865d','gauge')}
${l.retrieve.map((r,i)=>box(r,'#49695e','reel '+(i+1))).join('')}
<circle cx="${l.castCenter.x}" cy="${l.castCenter.y}" r="${l.castCenter.radius}" fill="#e3bd51"/>
<text x="${l.castCenter.x-27}" y="${l.castCenter.y+5}" font-size="15" fill="#171d24">Cast</text>
</svg>`
mkdirSync('artifacts/orientation',{recursive:true})
writeFileSync('artifacts/orientation/landscape-contract-wireframe.svg',svg)
console.log('AINAN opt-in landscape layout geometry: 3 screen sizes + safe-area + input ownership passed')
console.log('Layout wireframe is a geometric proposal, NOT an implemented responsive Phaser screen')
