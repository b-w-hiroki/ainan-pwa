// Pure guards for one successful, player-visible Town upgrade transaction.
// Feedback is earned only when the stored facility level moves forward.
const levelOf = (summary, id) => {
  if (typeof id !== 'string' || !id || ['__proto__', 'constructor', 'prototype'].includes(id)) return null
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
