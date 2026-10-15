// H02: QA-only authoring dimensions, NOT approved production world geometry.
// Pixel coordinates refer to a continuous world: camera pan reveals MORE sea,
// never a stretched portrait composite or a mirrored shoreline.
import { buildTrajectory } from '../game/cast.js'
import { analyzeCastClearZone } from '../game/castClearZone.js'

const freezePoint = (x, y) => Object.freeze({ x, y })
export const HARBOR_WIDE_H02 = Object.freeze({
  status: 'qa-layout-only',
  readyForProduction: false,
  requiresExplicitVisualApproval: true,
  size: Object.freeze({ width: 2160, height: 1800 }),
  playerFeet: freezePoint(320, 1490),
  castOrigin: freezePoint(365, 1330),
  // Keep the game engine's existing distance/odds untouched. This is
  // only a visual composition study for an independent image production.
  castTest: Object.freeze({ angleDeg: 36, power01: 0.95, rangePx: 780 }),
  waterPolygon: Object.freeze([
    freezePoint(0, 470), freezePoint(2160, 470),
    freezePoint(2160, 1800), freezePoint(650, 1800),
    freezePoint(370, 1420), freezePoint(0, 1510),
  ]),
  // The accessible launch quay is not an obstacle. Only protruding props
  // count here: keep them physically behind the character and cast line.
  reviewObstacles: Object.freeze([
    Object.freeze({ id: 'back-left-bollard', kind: 'circle', center: freezePoint(74, 1570), radius: 27 }),
    Object.freeze({ id: 'rear-rope', kind: 'polygon', points: Object.freeze([
      freezePoint(42, 1630), freezePoint(158, 1660),
      freezePoint(158, 1675), freezePoint(42, 1643),
    ]) }),
  ]),
  // All layers share the same world-space atlas; a transparent front layer
  // must NOT be tiled, stretched, or scroll independently from the rod.
  layers: Object.freeze([
    Object.freeze({ id: 'far', file: 'harbor-h02-far-qa.svg', depth: 0, coverage: 'full', parallax: 1 }),
    Object.freeze({ id: 'sea', file: 'harbor-h02-sea-qa.svg', depth: 1, coverage: 'water', parallax: 1 }),
    Object.freeze({ id: 'quay', file: 'harbor-h02-quay-qa.svg', depth: 6, coverage: 'foreground', parallax: 1 }),
  ]),
  viewports: Object.freeze([
    Object.freeze({ width: 390, height: 844 }),
    Object.freeze({ width: 844, height: 390 }),
    Object.freeze({ width: 932, height: 430 }),
  ]),
})

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
export function previewWorldCameraPath(contract = HARBOR_WIDE_H02, viewport = contract.viewports[0]) {
  if (viewport.width <= 0 || viewport.height <= 0
    || viewport.width > contract.size.width || viewport.height > contract.size.height) {
    throw new RangeError('Viewport exceeds the independent Harbor world')
  }
  const path = buildTrajectory(contract.castOrigin.x, contract.castOrigin.y,
    contract.castTest.angleDeg, contract.castTest.power01, contract.castTest.rangePx)
  const castResult = analyzeCastClearZone(path, contract.reviewObstacles, { corridorRadius: 20 })
  const maxScrollX = contract.size.width - viewport.width
  const maxScrollY = contract.size.height - viewport.height
  const scroll = (x, y) => Object.freeze({
    x: clamp(x, 0, maxScrollX), y: clamp(y, 0, maxScrollY),
  })
  const playerScroll = scroll(
    contract.playerFeet.x - viewport.width * .30,
    contract.playerFeet.y - viewport.height * .78,
  )
  // A representative camera tracking the rod tip, then the lure along its
  // actual world trajectory, then settling on the real splash position.
  // This intentionally does not modify the existing Phaser controller.
  const flight = path.map((point, index) => {
    const target = scroll(point.x - viewport.width * .52, point.y - viewport.height * .68)
    const blend = Math.min(1, index / (path.length * .24))
    const x = playerScroll.x + (target.x - playerScroll.x) * blend
    const y = playerScroll.y + (target.y - playerScroll.y) * blend
    return Object.freeze({ lure: Object.freeze(point), camera: scroll(x, y) })
  })
  const splash = flight[flight.length - 1]
  const coversEveryFrame = flight.every(({ camera }) =>
    camera.x >= 0 && camera.y >= 0
    && camera.x + viewport.width <= contract.size.width + .001
    && camera.y + viewport.height <= contract.size.height + .001)
  return Object.freeze({
    viewport, playerScroll,
    rodTip: contract.castOrigin,
    flight: Object.freeze(flight),
    splash,
    castLane: castResult,
    coversEveryFrame,
    realWorldCameraTravel: flight.some(({ camera }) =>
      Math.hypot(camera.x - playerScroll.x, camera.y - playerScroll.y) > 100),
    artApproved: false,
  })
}
