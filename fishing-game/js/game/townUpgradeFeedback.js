// Pure guards for one successful, player-visible Town upgrade transaction.
// Feedback is earned only when the stored facility level moves forward.
const VALID_FACILITIES = new Set(['market', 'pier', 'guide', 'festival'])
const levelOf = (summary, id) => {
  if (!VALID_FACILITIES.has(id)) return null
  const facilities = summary?.facilities
  if (!facilities || !Object.prototype.hasOwnProperty.call(facilities, id)) return 0
  const value = facilities[id]
  return Number.isInteger(value) && value >= 0 && value <= 5 ? value : null
}

export function isCurrentFacilityLevel(summary, id, displayedLevel) {
  const actual = levelOf(summary, id)
  return actual !== null && Number.isInteger(displayedLevel) && actual === displayedLevel
}

export function didFacilityLevelAdvance(previousSummary, nextSummary, id) {
  const previous = levelOf(previousSummary, id)
  const next = levelOf(nextSummary, id)
  return previous !== null && next !== null && next === previous + 1
}


// The same facility panel is the bridge from a catch reward back to fishing.
// A player short of points should have a real next action, not a dead-end
// purchase button that only displays an error toast.
export function getTownUpgradeAction(level, cost, availableScore) {
  if (!Number.isInteger(level) || level < 0 || level >= 5
    || !Number.isSafeInteger(cost) || cost < 0
    || !Number.isSafeInteger(availableScore) || availableScore < 0) return null
  const missing = Math.max(0, cost - availableScore)
  if (missing === 0) return Object.freeze({
    kind: 'upgrade', label: `${cost.toLocaleString()}ptで発展`, missing: 0,
  })
  return Object.freeze({
    kind: 'fish', label: `あと${missing.toLocaleString()}pt・釣りへ`, missing,
  })
}
