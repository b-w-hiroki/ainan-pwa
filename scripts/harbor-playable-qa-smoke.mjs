import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isHarborPlayableQaEnabled } from '../fishing-game/js/game/installHarborPlayableQa.js'
import { FISHING_WORLD } from '../fishing-game/js/scenes/components/FishingCameraController.js'
import { HARBOR_WIDE_H02 } from '../fishing-game/js/presentation/harborWideWorldH02.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
assert.equal(isHarborPlayableQaEnabled('?qa=1&qaHarborPlayable=1&cameraPan=1&coneLoop=1'),true)
for(const query of [
  '', '?qaHarborPlayable=1', '?qa=1&cameraPan=1&coneLoop=1',
  '?qa=1&qaHarborPlayable=1&coneLoop=1',
  '?qa=1&qaHarborPlayable=1&cameraPan=1',
]){
  assert.equal(isHarborPlayableQaEnabled(query),false,'Unapproved Harbor must never appear without full QA flags: '+query)
}
assert.deepEqual([FISHING_WORLD.width,FISHING_WORLD.height],[900,1400],
  'Do not resize canonical gameplay world outside QA flag')
assert.deepEqual([HARBOR_WIDE_H02.size.width,HARBOR_WIDE_H02.size.height],[2160,1800])
const wrapper=read('fishing-game/js/game/installHarborPlayableQa.js')
const runtime=read('fishing-game/js/game/installFishingRuntime.js')
const camera=read('fishing-game/js/scenes/components/FishingCameraController.js')
const manifest=read('fishing-game/js/config/assetManifest.js')
assert.ok(runtime.indexOf('installHarborPlayableQa(GameScene)') > runtime.indexOf('installConeCastRetrievePrototype(GameScene)'),
  'QA panorama must augment existing player/rod, never overwrite its ownership')
assert.match(wrapper,/previousCreate\.apply\(this, args\)/)
assert.match(wrapper,/this\.fishingCamera\.world =/)
assert.match(wrapper,/this\.cameras\.main\.setBounds\(0, 0, HARBOR_WIDE_H02\.size\.width/)
assert.match(wrapper,/\.setScrollFactor\(1\)/)
assert.match(wrapper,/\.setDepth\(HARBOR_PLAYABLE_DEPTHS\[layer\.id\]\)/)
assert.match(wrapper,/far: 19, sea: 20, quay: 25/,'QA atlas must cover legacy effects and preserve actors')
assert.match(wrapper,/this\._qaHarborWorldLayers\?\.forEach\(layer => layer\?\.destroy\?\.\(\)\)/)
assert.match(wrapper,/this\.scale\?\.off\?\.\('resize', this\._qaHarborPlayableOnResize\)/)
assert.match(camera,/this\.scene\?\._qaHarborPlayable \? 0\.92 : 0\.78/)
assert.doesNotMatch(manifest,/qa_harbor_playable_|harbor-h02-far-qa\.svg/,
  'H02 QA panorama must not enter the production asset manifest')
assert.doesNotMatch(wrapper,/localStorage|saveState|addCatch|consumeStamina|selectFish|award|Math\.random/,
  'QA scenery must never own saves, catches, RNG or stamina')
console.log('Harbor playable GameScene QA activation/cleanup, world dimensions, and production isolation PASS')
