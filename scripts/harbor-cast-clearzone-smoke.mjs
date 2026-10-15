import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildTrajectory } from '../fishing-game/js/game/cast.js'
import { analyzeCastClearZone } from '../fishing-game/js/game/castClearZone.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const runtime = read('fishing-game/js/game/installFishingRuntime.js')
const main = read('fishing-game/js/main.js')
const pan = read('fishing-game/js/game/installCastCameraPanPrototype.js')
const cone = read('fishing-game/js/game/installConeCastRetrievePrototype.js')
const camera = read('fishing-game/js/scenes/components/FishingCameraController.js')

assert.match(main, /installFishingRuntime\(GameScene\)/, 'GameScene runtime owner missing')
assert.ok(runtime.indexOf('installCastCameraPanPrototype(GameScene)') < runtime.indexOf('installConeCastRetrievePrototype(GameScene)'), 'camera must be installed before cone input wrapper')
assert.match(camera, /updateCastFollow\(x, y\)/, 'existing flight follow owner must be reused')
assert.match(camera, /updateRetrieveFollow\(lureX, lureY\)/, 'existing retrieve follow owner must be reused')
assert.match(camera, /Math\.max\(0, worldSize - cameraSize\)/, 'rotation safety clamp must remain')
assert.match(cone, /isValidCastLanding\(raw\)/, 'landing-only collision gate has changed; review corridor integration separately')
assert.match(pan, /scene\._cameraPanRodTip = tip/, 'rod tip world/socket source missing')
assert.match(pan, /if \(!enabled\(\)\) return/, 'camera test scene must stay opt-in')

const path = [{ x: 0, y: 0 }, { x: 120, y: 0 }]
const block = { id: 'pier-post', kind: 'polygon', points: [
  { x: 50, y: -8 }, { x: 65, y: -8 }, { x: 65, y: 8 }, { x: 50, y: 8 },
] }
const box = analyzeCastClearZone(path, [block])
assert.equal(box.clear, false, 'a straight cast must be blocked by a pier post')
assert.deepEqual(box.blockedIds, ['pier-post'])
assert.equal(box.artApprovalRequired, true, 'geometry must never approve art')
assert.equal(analyzeCastClearZone(path, []).checkedObstacles, 0)
assert.equal(analyzeCastClearZone(path, []).clear, true)
const circle = { id: 'cat', kind: 'circle', center: { x: 55, y: 6 }, radius: 4 }
assert.equal(analyzeCastClearZone(path, [circle]).clear, true, 'cat beyond line radius is clear')
assert.equal(analyzeCastClearZone(path, [circle], { corridorRadius: 3 }).clear, false, 'clearance margin must count')
assert.equal(analyzeCastClearZone([{ x: 0, y: 0 }, { x: 50, y: 0 }], [block]).clear, false, 'endpoint on pier edge blocks')
assert.equal(analyzeCastClearZone([{ x: 0, y: 25 }, { x: 120, y: 25 }], [block]).clear, true, 'obstacle outside corridor is fine')
assert.throws(() => analyzeCastClearZone([{ x: NaN, y: 0 }, { x: 1, y: 1 }]), /finite/)
assert.throws(() => analyzeCastClearZone(path, [{ kind: 'polygon', points: [] }]), /Invalid authored/)
assert.throws(() => analyzeCastClearZone(path, [block], { corridorRadius: -1 }), /Invalid obstacles/)

const trajectory = buildTrajectory(138, 1160, 28, 0.8, 620)
const midpoint = trajectory[Math.floor(trajectory.length / 2)]
assert.equal(analyzeCastClearZone(trajectory, [{ id: 'boat', kind: 'circle', center: midpoint, radius: 12 }]).clear, false,
  'curve cannot pass through boat')
assert.equal(analyzeCastClearZone(trajectory, [{ id: 'rear-prop', kind: 'circle', center: { x: 0, y: 1250 }, radius: 12 }]).clear, true,
  'a rear-side prop remains outside diagonal cast')

console.log('AINAN Harbor H01/clear-zone geometry smoke passed (QA only; not visual approval)')
