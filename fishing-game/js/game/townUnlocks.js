import { getCatches, getTownFacilities, getTownSummary } from './progress.js'

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

export const BAIT_SHOP_UNLOCK_META = {
  worm: {
    id: 'worm',
    name: 'ふつうのえさ',
    unlockedBy: '最初から',
    facilityId: null,
    requiredLevel: 0,
    rewardText: '基本エサ',
  },
  shrimp: {
    id: 'shrimp',
    name: 'エビ',
    unlockedBy: '魚市場 Lv.1',
    facilityId: 'market',
    requiredLevel: 1,
    rewardText: 'エビ販売',
  },
  special: {
    id: 'special',
    name: '特製まき餌',
    unlockedBy: '港まつり広場 Lv.1',
    facilityId: 'festival',
    requiredLevel: 1,
    rewardText: '特製まき餌販売',
  },
}

export const TOWN_CHALLENGE_META = {
  kue: {
    id: 'kue',
    title: '黒潮の主を追え',
    targetFishId: 'kue',
    pointId: 'pointC',
    requiredBaitId: 'special',
    unlockedBy: '黒潮崎を解放',
    desc: '特製まき餌を使い、黒潮崎の伝説のクエを釣り上げよう。',
  },
}

function resolveFacilityUnlock(meta, facilities = getTownFacilities()) {
  const level = meta.facilityId ? (facilities[meta.facilityId] ?? 0) : meta.requiredLevel
  const unlocked = !meta.facilityId || level >= meta.requiredLevel
  return {
    ...meta,
    level,
    unlocked,
    remaining: unlocked ? 0 : Math.max(0, meta.requiredLevel - level),
  }
}

export function getTownUnlockState() {
  const facilities = getTownFacilities()
  const summary = getTownSummary()

  const points = Object.fromEntries(
    Object.values(TOWN_UNLOCK_META).map(meta => [meta.id, resolveFacilityUnlock(meta, facilities)]),
  )

  const baitShop = Object.fromEntries(
    Object.values(BAIT_SHOP_UNLOCK_META).map(meta => [meta.id, resolveFacilityUnlock(meta, facilities)]),
  )

  return {
    points,
    baitShop,
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

export function getBaitShopUnlock(baitId) {
  const meta = BAIT_SHOP_UNLOCK_META[baitId]
  if (!meta) return { id: baitId, name: baitId, unlocked: true, unlockedBy: '最初から', remaining: 0 }
  return resolveFacilityUnlock(meta)
}

export function getKueChallengeState() {
  const meta = TOWN_CHALLENGE_META.kue
  const point = getFishingPointUnlock(meta.pointId)
  const catches = getCatches()
  const completed = catches.some(catchData => catchData.fishId === meta.targetFishId)
  return {
    ...meta,
    unlocked: point.unlocked,
    completed,
    status: completed ? 'complete' : point.unlocked ? 'active' : 'locked',
    conditionText: point.unlocked ? '黒潮崎で特製まき餌を使おう' : point.unlockedBy,
  }
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

export function getFacilityMilestoneRewards(facilityId, nextLevel) {
  const rewards = []
  const point = Object.values(TOWN_UNLOCK_META).find(meta => meta.facilityId === facilityId && meta.requiredLevel === nextLevel)
  if (point) rewards.push({ type: 'point', id: point.id, label: `${point.name} 解放`, detail: point.rewardText })

  Object.values(BAIT_SHOP_UNLOCK_META)
    .filter(meta => meta.facilityId === facilityId && meta.requiredLevel === nextLevel)
    .forEach(meta => rewards.push({ type: 'bait', id: meta.id, label: `${meta.name} 販売開始`, detail: meta.rewardText }))

  if (facilityId === 'pier' && nextLevel === 2) {
    rewards.push({ type: 'challenge', id: 'kue', label: '「黒潮の主を追え」解放', detail: 'クエ挑戦' })
  }

  return rewards
}
