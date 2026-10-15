import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildTrajectory } from '../fishing-game/js/game/cast.js'
import { HARBOR_WIDE_H02 } from '../fishing-game/js/presentation/harborWideWorldH02.js'
import { H02_QA_CAST_SAMPLES, auditHarborH02Fan, isInsideH02Water } from '../fishing-game/js/presentation/harborH02CastFanAudit.js'

assert.equal(HARBOR_WIDE_H02.readyForProduction, false)
const audit = auditHarborH02Fan()
assert.equal(audit.checked, 90, '6 diagonal angles × 3 powers × 5 visual rod-tip shifts')
assert.equal(audit.allClear, true, 'An authored Harbor obstacle blocks the diagonal cast fan')
assert.deepEqual(audit.failed, [])
assert.ok(audit.samples.every(s=>s.waterLanding&&s.flightClear&&s.retrieveClear))
assert.equal(audit.geometryOnly, true)
assert.equal(audit.gameInputChanged, false)
assert.equal(audit.artApproved, false)

// The longer rod or displaced player must NOT make the old QA guarantee false.
assert.ok(audit.samples.some(s=>s.tipOffsetId==='short-rod'))
assert.ok(audit.samples.some(s=>s.tipOffsetId==='long-rod'))
assert.ok(audit.samples.some(s=>s.tipOffsetId==='left'))
assert.ok(audit.samples.some(s=>s.tipOffsetId==='right'))
assert.deepEqual(H02_QA_CAST_SAMPLES.angles,[34,36,40,44,48,52])
assert.ok(isInsideH02Water({x:950,y:800}))
assert.equal(isInsideH02Water({x:150,y:1200}), false, 'The concrete launch foothold must not be water')
assert.equal(isInsideH02Water({x:150,y:1000}), true, 'The area in front of the quay must stay castable sea')
assert.equal(isInsideH02Water({x:500,y:400}),false,'Above the coastline is not a catchable sea landing')

// A near-center angle can be geometrically clear of objects, but the splash
// would be on the mountains. Audit must explicitly reject it.
const invalidSea = auditHarborH02Fan(HARBOR_WIDE_H02,{
  angles:[0],powers:[0.95],tipOffsets:[{id:'center',x:0,y:0}],
})
assert.equal(invalidSea.checked,1)
assert.equal(invalidSea.allClear,false)
assert.equal(invalidSea.failed[0].waterLanding,false)

// Protruding pier/boat over the arc must fail despite a valid final landing.
const arc=buildTrajectory(HARBOR_WIDE_H02.castOrigin.x,HARBOR_WIDE_H02.castOrigin.y,52,0.95,HARBOR_WIDE_H02.castTest.rangePx)
const middle=arc[20]
const airborne= auditHarborH02Fan(HARBOR_WIDE_H02,{
  angles:[52],powers:[0.95],tipOffsets:[{id:'center',x:0,y:0}],
  obstacles:[{id:'mast',kind:'circle',center:middle,radius:8}],corridorRadius:3,
})
assert.equal(airborne.allClear,false)
assert.equal(airborne.failed[0].flightClear,false)
assert.deepEqual(airborne.failed[0].blockedIds,['mast'])

// A post below the parabola but on the taut retrieval line is dangerous.
const end=arc.at(-1)
const retrMid={x:(arc[0].x+end.x)/2,y:(arc[0].y+end.y)/2}
const returnHazard=auditHarborH02Fan(HARBOR_WIDE_H02,{
  angles:[52],powers:[0.95],tipOffsets:[{id:'center',x:0,y:0}],
  obstacles:[{id:'return-post',kind:'circle',center:retrMid,radius:4}],
  corridorRadius:2,
})
assert.equal(returnHazard.allClear,false)
assert.equal(returnHazard.failed[0].flightClear,true,'The obstruction was meant to be below flight')
assert.equal(returnHazard.failed[0].retrieveClear,false,'Taut line must catch a post below the arc')
assert.deepEqual(returnHazard.failed[0].blockedIds,['return-post'])

// A cat placed to the left/rear does not block the diagonal sweep; one on the
// projected line blocks it even if the foot-placement image looks attractive.
const catBehind=auditHarborH02Fan(HARBOR_WIDE_H02,{
  obstacles:[{id:'cat',kind:'circle',center:{x:155,y:1190},radius:24}],
})
assert.equal(catBehind.allClear,true)
const catInLine=auditHarborH02Fan(HARBOR_WIDE_H02,{
  obstacles:[{id:'cat',kind:'circle',center:middle,radius:18}],
})
assert.equal(catInLine.allClear,false)
assert.ok(catInLine.failed.some(s=>s.blockedIds.includes('cat')))

assert.throws(()=>auditHarborH02Fan(HARBOR_WIDE_H02,{angles:[NaN]}),/Invalid H02/)
assert.throws(()=>auditHarborH02Fan(HARBOR_WIDE_H02,{powers:[1.2]}),/Invalid H02/)
assert.throws(()=>isInsideH02Water({x:Infinity,y:0}),/finite/)
const main=readFileSync(new URL('../fishing-game/js/main.js',import.meta.url),'utf8')
assert.doesNotMatch(main,/harborH02CastFanAudit|H02_QA_CAST_SAMPLES/,'H02 fan test must not install gameplay changes')
console.log('H02 entire QA cast fan: 90 placements × curved flight and straight retrieve, water landings, negative controls OK')
