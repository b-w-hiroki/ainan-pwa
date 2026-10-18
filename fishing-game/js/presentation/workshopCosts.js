import { MATERIAL_META } from '../game/midgameProgression.js'

// Present the same recipe consumed by the progression actions.
export function getWorkshopCostState(cost, score, materials) {
  const rows = Object.entries(cost.materials ?? {}).filter(([, required]) => required > 0).map(([id, required]) => {
    const owned = materials[id] ?? 0
    return { id, label: `${MATERIAL_META[id].mark} ${owned}/${required}`, missing: Math.max(0, required - owned) }
  })
  const missingScore = Math.max(0, cost.score - score)
  const shortage = [
    ...(missingScore ? [`${missingScore}pt`] : []),
    ...rows.filter(row => row.missing).map(row => `${MATERIAL_META[row.id].mark}${row.missing}`),
  ]
  return { rows, affordable: shortage.length === 0, shortage: shortage.length ? `あと ${shortage.join('・')}` : '' }
}
