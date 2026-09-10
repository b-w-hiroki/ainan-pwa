import { getTownFacilities, getTownSummary } from './progress.js'

export const TOWN_UNLOCK_META = {
  pointA: {
    id: 'pointA',
    name: '汐風港',
    shortName: '港',
    unlockedBy: '最初から',
    facilityId: null,
    requiredLevel: 0,
    rewardText: '港釣り',
  },
  pointB: {
    id: 'pointB',
    name: '蒼海湾',
    shortName: '入り江',
    unlockedBy: '魚市場 Lv.1',
    facilityId: 'market',
    requiredLevel: 1,
    rewardText: '入り江釣り',
  },
  pointC: {
    id: 'pointC',
    name: '黒潮崎',
    shortName: '沖磯',
    unlockedBy: 'にぎわい桟橋 Lv.2',
    facilityId: 'pier',
    requiredLevel: 2,
    rewardText: '沖磯・大物釣り',
  },
}

export function getTownUnlockState() {
  const facilities = getTownFacilities()
  const summary = getTownSummary()

  const points = Object.fromEntries(
    Object.values(TOWN_UNLOCK_META).map(meta => {
      const level = meta.facilityId ? (facilities[meta.facilityId] ?? 0) : meta.requiredLevel
      const unlocked = !meta.facilityId || level >= meta.requiredLevel
      return [meta.id, {
        ...meta,
        level,
        unlocked,
        remaining: unlocked ? 0 : Math.max(0, meta.requiredLevel - level),
      }]
    }),
  )

  return {
    points,
    unlockedCount: Object.values(points).filter(p => p.unlocked).length,
    totalCount: Object.keys(points).length,
    bustle: summary.bustle,
    facilities,
  }
}

export function getFishingPointUnlock(pointId) {
  return getTownUnlockState().points[pointId] ?? {
    id: pointId,
    name: pointId,
    unlocked: true,
    unlockedBy: '最初から',
    remaining: 0,
  }
}

export function getNextTownUnlock() {
  const state = getTownUnlockState()
  return Object.values(state.points).find(point => !point.unlocked) ?? null
}

export function getFacilityUnlockReward(facilityId, nextLevel) {
  const match = Object.values(TOWN_UNLOCK_META).find(meta => meta.facilityId === facilityId && meta.requiredLevel === nextLevel)
  if (!match) return null
  return {
    pointId: match.id,
    name: match.name,
    rewardText: match.rewardText,
    label: `${match.name} 解放`,
  }
}
