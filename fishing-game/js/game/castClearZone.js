// Review-only cast corridor validator for authored props (posts, ropes, boats,
// pets). The launching quay is not an obstacle here: the rod starts over it.
// This checks explicit obstacle geometry only; it cannot approve artwork.
const EPS = 1e-7
const validPoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y)
const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
const inRange = (a, b, p) => p.x >= Math.min(a.x, b.x) - EPS && p.x <= Math.max(a.x, b.x) + EPS
  && p.y >= Math.min(a.y, b.y) - EPS && p.y <= Math.max(a.y, b.y) + EPS

function intersects(a, b, c, d) {
  const s1 = cross(a, b, c), s2 = cross(a, b, d)
  const s3 = cross(c, d, a), s4 = cross(c, d, b)
  if ((s1 > EPS && s2 < -EPS || s1 < -EPS && s2 > EPS)
    && (s3 > EPS && s4 < -EPS || s3 < -EPS && s4 > EPS)) return true
  return (Math.abs(s1) <= EPS && inRange(a, b, c))
    || (Math.abs(s2) <= EPS && inRange(a, b, d))
    || (Math.abs(s3) <= EPS && inRange(c, d, a))
    || (Math.abs(s4) <= EPS && inRange(c, d, b))
}

function pointSegmentDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y
  const squared = dx * dx + dy * dy
  const t = squared > EPS ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / squared)) : 0
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t))
}

function segmentDistance(a, b, c, d) {
  if (intersects(a, b, c, d)) return 0
  return Math.min(
    pointSegmentDistance(a, c, d), pointSegmentDistance(b, c, d),
    pointSegmentDistance(c, a, b), pointSegmentDistance(d, a, b),
  )
}

function insidePolygon(p, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j]
    if (Math.abs(cross(a, b, p)) <= EPS && inRange(a, b, p)) return true
    if ((a.y > p.y) !== (b.y > p.y)
      && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

function corridorHitsObstacle(a, b, obstacle, radius) {
  if (obstacle.kind === 'circle') {
    return pointSegmentDistance(obstacle.center, a, b) <= obstacle.radius + radius + EPS
  }
  const polygon = obstacle.points
  if (insidePolygon(a, polygon) || insidePolygon(b, polygon)) return true
  return polygon.some((vertex, i) => segmentDistance(a, b, vertex, polygon[(i + 1) % polygon.length]) <= radius + EPS)
}

/**
 * Static world-space trajectory check, intended for QA and future prop authoring.
 * Does not change cast odds, ranges, fishing collisions or production visuals.
 *
 * @param {{x:number,y:number}[]} trajectory path from rod tip to landing
 * @param {Array<{id:string,kind:'circle',center:{x:number,y:number},radius:number}|{id:string,kind:'polygon',points:{x:number,y:number}[]}>} obstacles explicit protrusions, NOT the launch platform
 * @param {{corridorRadius?: number}} options safety margin for rod/line/lure
 */
export function analyzeCastClearZone(trajectory, obstacles = [], { corridorRadius = 0 } = {}) {
  if (!Array.isArray(trajectory) || trajectory.length < 2 || !trajectory.every(validPoint)) {
    throw new TypeError('A finite cast trajectory with at least two points is required')
  }
  if (!Array.isArray(obstacles) || !Number.isFinite(corridorRadius) || corridorRadius < 0) {
    throw new TypeError('Invalid obstacles or corridor radius')
  }
  const blockedIds = []
  for (let index = 0; index < obstacles.length; index++) {
    const obstacle = obstacles[index]
    const valid = obstacle && (obstacle.kind === 'circle'
      ? validPoint(obstacle.center) && Number.isFinite(obstacle.radius) && obstacle.radius >= 0
      : obstacle.kind === 'polygon' && Array.isArray(obstacle.points)
        && obstacle.points.length >= 3 && obstacle.points.every(validPoint))
    if (!valid) throw new TypeError('Invalid authored cast obstacle at index ' + index)
    if (trajectory.slice(1).some((b, i) => corridorHitsObstacle(trajectory[i], b, obstacle, corridorRadius))) {
      blockedIds.push(obstacle.id || 'obstacle-' + index)
    }
  }
  return Object.freeze({
    clear: blockedIds.length === 0,
    blockedIds: Object.freeze(blockedIds),
    checkedObstacles: obstacles.length,
    geometryOnly: true,
    artApprovalRequired: true,
  })
}
