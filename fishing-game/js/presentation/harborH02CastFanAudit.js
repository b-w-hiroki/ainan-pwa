// QA-only H02 clearance audit: all authored diagonal casts, not a single
// screenshot-friendly example. Runtime fishing odds and cast physics unchanged.
import { buildTrajectory } from '../game/cast.js'
import { analyzeCastClearZone } from '../game/castClearZone.js'
import { HARBOR_WIDE_H02 } from './harborWideWorldH02.js'

// Deliberately right-of-center, because the left side contains the harbor.
// This is NOT an approved replacement for the existing ±52° gameplay fan.
export const H02_QA_CAST_SAMPLES = Object.freeze({
  angles: Object.freeze([34, 36, 40, 44, 48, 52]),
  powers: Object.freeze([0.4, 0.65, 0.95]),
  // Temporary socket displacement probes, not finished equipment geometry.
  tipOffsets: Object.freeze([
    Object.freeze({ id: 'left', x: -18, y: 0 }),
    Object.freeze({ id: 'center', x: 0, y: 0 }),
    Object.freeze({ id: 'right', x: 18, y: 0 }),
    Object.freeze({ id: 'short-rod', x: 0, y: 12 }),
    Object.freeze({ id: 'long-rod', x: 0, y: -12 }),
  ]),
})
const validPoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y)
const finiteArray = values => Array.isArray(values) && values.length > 0
  && values.every(Number.isFinite)

// Boundary-inclusive, supports non-rectangular authored sea shape.
export function isInsideH02Water(point, polygon = HARBOR_WIDE_H02.waterPolygon) {
  if (!validPoint(point) || !Array.isArray(polygon) || polygon.length < 3 || !polygon.every(validPoint)) {
    throw new TypeError('A finite point and 3+ point water polygon are required')
  }
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j], b = polygon[i]
    const cross = (b.x-a.x)*(point.y-a.y) - (b.y-a.y)*(point.x-a.x)
    const minX = Math.min(a.x,b.x), maxX = Math.max(a.x,b.x)
    const minY = Math.min(a.y,b.y), maxY = Math.max(a.y,b.y)
    if (Math.abs(cross) < 1e-7 && point.x >= minX-1e-7 && point.x <= maxX+1e-7
      && point.y >= minY-1e-7 && point.y <= maxY+1e-7) return true
    if ((a.y > point.y) !== (b.y > point.y)
      && point.x < (b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x) inside = !inside
  }
  return inside
}

/**
 * Audits real sampled arc AND taut retrieval line plus optional authored
 * rod-tip displacement. Does not auto-filter uncastable rays, silently narrow
 * actual gameplay input or approve graphic artwork.
 */
export function auditHarborH02Fan(contract = HARBOR_WIDE_H02, options = {}) {
  const {
    angles = H02_QA_CAST_SAMPLES.angles,
    powers = H02_QA_CAST_SAMPLES.powers,
    tipOffsets = H02_QA_CAST_SAMPLES.tipOffsets,
    obstacles = contract.reviewObstacles,
    corridorRadius = 20,
  } = options
  if (!finiteArray(angles) || !finiteArray(powers) || !Array.isArray(tipOffsets) || !tipOffsets.length
    || !tipOffsets.every(offset => offset && typeof offset.id === 'string'
      && Number.isFinite(offset.x) && Number.isFinite(offset.y))
    || powers.some(power => power < 0 || power > 1)
    || angles.some(angle => angle < -75 || angle > 75)) {
    throw new TypeError('Invalid H02 cast angles, powers or socket variations')
  }
  if (!contract || !validPoint(contract.castOrigin) || !contract.castTest
    || !Number.isFinite(contract.castTest.rangePx)
    || !Array.isArray(contract.waterPolygon)) throw new TypeError('Invalid H02 contract')
  const evaluated = []
  for (const offset of tipOffsets) {
    const origin = { x: contract.castOrigin.x+offset.x, y: contract.castOrigin.y+offset.y }
    for (const angleDeg of angles) {
      for (const power01 of powers) {
        const arc = buildTrajectory(origin.x, origin.y, angleDeg, power01, contract.castTest.rangePx)
        const landing = arc.at(-1)
        const waterLanding = isInsideH02Water(landing, contract.waterPolygon)
        const unobstructedFlight = analyzeCastClearZone(arc, obstacles, { corridorRadius })
        // Even a visually unobstructed airborne arc may snag on a pier post
        // as line tightens during reel-in.
        const unobstructedRetrieve = analyzeCastClearZone([origin, landing], obstacles, { corridorRadius })
        const clear = waterLanding && unobstructedFlight.clear && unobstructedRetrieve.clear
        evaluated.push(Object.freeze({
          id: offset.id + ':' + angleDeg + ':' + power01,
          tipOffsetId: offset.id, angleDeg, power01,
          landing: Object.freeze({ ...landing }),
          waterLanding, flightClear: unobstructedFlight.clear,
          retrieveClear: unobstructedRetrieve.clear,
          blockedIds: Object.freeze([...new Set([
            ...unobstructedFlight.blockedIds, ...unobstructedRetrieve.blockedIds,
          ])]),
          clear,
        }))
      }
    }
  }
  return Object.freeze({
    checked: evaluated.length,
    samples: Object.freeze(evaluated),
    allClear: evaluated.every(sample => sample.clear),
    failed: Object.freeze(evaluated.filter(sample => !sample.clear)),
    geometryOnly: true,
    gameInputChanged: false,
    artApproved: false,
  })
}
