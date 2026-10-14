// Canonical player-facing names. Map selection and fishing HUD must never
// silently diverge for the same point ID.
export const FISHING_GROUND_NAMES = Object.freeze({
  pointA: '汐風港',
  pointB: '蒼海湾',
  pointC: '黒潮崎',
})

export function getFishingGroundName(pointId) {
  return Object.hasOwn(FISHING_GROUND_NAMES, pointId)
    ? FISHING_GROUND_NAMES[pointId]
    : FISHING_GROUND_NAMES.pointA
}
