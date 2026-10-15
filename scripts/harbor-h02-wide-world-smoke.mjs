import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { HARBOR_WIDE_H02, previewWorldCameraPath } from '../fishing-game/js/presentation/harborWideWorldH02.js'
import { FISHING_WORLD } from '../fishing-game/js/scenes/components/FishingCameraController.js'
import { analyzeCastClearZone } from '../fishing-game/js/game/castClearZone.js'

const base = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
assert.equal(FISHING_WORLD.width, 900, 'Do not silently promote QA art into the shipping world')
assert.equal(FISHING_WORLD.height, 1400, 'Do not change production camera bounds')
assert.equal(HARBOR_WIDE_H02.status, 'qa-layout-only')
assert.equal(HARBOR_WIDE_H02.readyForProduction, false)
assert.equal(HARBOR_WIDE_H02.requiresExplicitVisualApproval, true)
assert.ok(HARBOR_WIDE_H02.size.width >= 2160 && HARBOR_WIDE_H02.size.height >= 1800)
assert.deepEqual(HARBOR_WIDE_H02.layers.map(x => x.id), ['far', 'sea', 'quay'])
assert.deepEqual(HARBOR_WIDE_H02.layers.map(x => x.depth), [0, 1, 6])
assert.ok(HARBOR_WIDE_H02.layers.every(x => x.parallax === 1), 'World blocks must not drift separately until a proper parallax contract exists')

for(const layer of HARBOR_WIDE_H02.layers){
  const svg=base('fishing-game/assets/qa/'+layer.file)
  assert.match(svg, /<svg [^>]*xmlns="http:\/\/www.w3.org\/2000\/svg"/)
  assert.match(svg, /width="2160" height="1800" viewBox="0 0 2160 1800"/)
  assert.ok(svg.includes('QA'), 'No sampled world asset may be accidentally marked approved')
  assert.doesNotMatch(svg, /<image\b|data:image|<script\b|<foreignObject\b/, 'No embedded actor, screenshots or unsafe SVG content')
}
const distant=base('fishing-game/assets/qa/harbor-h02-far-qa.svg')
const water=base('fishing-game/assets/qa/harbor-h02-sea-qa.svg')
const quay=base('fishing-game/assets/qa/harbor-h02-quay-qa.svg')
assert.match(distant, /M0 0h2160v1800H0z/, 'Sky should be full coverage for all camera positions')
assert.match(water, /M0 476H2160V1800H0Z/, 'Sea needs uninterrupted width beyond initial viewport')
assert.match(quay, /M0 1508L368 1414 655 1800H0z/, 'Pier must be only a small foothold, not intrude into diagonal casting')
assert.doesNotMatch(quay, /<image\b/, 'The scene must not bake a player into the quay')

const viewports=[...HARBOR_WIDE_H02.viewports,{width:320,height:568},{width:1024,height:390}]
for(const viewport of viewports){
  const p=previewWorldCameraPath(HARBOR_WIDE_H02,viewport)
  assert.equal(p.castLane.clear,true, `Cast lane blocked at ${viewport.width}x${viewport.height}`)
  assert.equal(p.coversEveryFrame,true, 'World art does not cover viewport')
  assert.equal(p.realWorldCameraTravel,true, 'No substantial camera movement toward sea')
  assert.equal(p.flight.length,41,'Original cast arc must stay 40 samples')
  assert.equal(p.artApproved,false)
  assert.ok(p.flight.every(({lure,camera})=>Number.isFinite(lure.x+lure.y+camera.x+camera.y)))
  assert.ok(p.splash.camera.x >= 0 && p.splash.camera.y >= 0)
  assert.ok(p.splash.camera.x + viewport.width <= HARBOR_WIDE_H02.size.width)
  assert.ok(p.splash.camera.y + viewport.height <= HARBOR_WIDE_H02.size.height)
}
// Regression: an obstruction in the path is not merely a valid landing spot.
const portrait=previewWorldCameraPath()
const mid=portrait.flight[20].lure
const unsafe=analyzeCastClearZone(portrait.flight.map(x=>x.lure),
  [...HARBOR_WIDE_H02.reviewObstacles,{id:'new-jetty',kind:'circle',center:mid,radius:32}],
  {corridorRadius:20})
assert.equal(unsafe.clear,false)
assert.deepEqual(unsafe.blockedIds,['new-jetty'])
assert.throws(()=>previewWorldCameraPath(HARBOR_WIDE_H02,{width:2500,height:390}),/exceeds/)
console.log('H02 QA panorama: full camera coverage, nonstretched layer contract and clear cast lane passed')
console.log('Visual approval and game integration are still blocked by missing production-quality master')
