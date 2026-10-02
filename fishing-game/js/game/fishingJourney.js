import {
  FISH_META,
  getCatches,
  getEquipment,
  getInventory,
  getStaminaState,
  getTownSummary,
} from './progress.js'
import { getNextTownUnlock, getTownUnlockState } from './townUnlocks.js'

const POINT_NAMES = Object.freeze({ pointA: '汐風港', pointB: '蒼海湾', pointC: '黒潮崎' })
const ROD_NAMES = Object.freeze({ basic: '初心者竿', carbon: 'カーボン竿', premium: '匠の竿' })
const BAIT_NAMES = Object.freeze({ worm: 'ふつうの虫', shrimp: 'エビ', special: '特製まき餌' })

function recommendedPoint(unlocks) {
  if (unlocks.points.pointC?.unlocked) return 'pointC'
  if (unlocks.points.pointB?.unlocked) return 'pointB'
  return 'pointA'
}

export function getFishingPreparation(pointId = null) {
  const unlocks = getTownUnlockState()
  const equipment = getEquipment()
  const inventory = getInventory()
  const stamina = getStaminaState()
  const resolvedPointId = pointId ?? recommendedPoint(unlocks)
  const location = unlocks.points[resolvedPointId] ?? unlocks.points.pointA
  const rodType = equipment.rodType ?? 'carbon'
  const baitType = equipment.baitType ?? 'worm'
  const rodOwned = (inventory.rods?.[rodType] ?? 0) > 0
  const baitUnlock = unlocks.baitShop[baitType] ?? { unlocked: true, unlockedBy: '最初から' }
  const baitCount = baitType === 'worm' ? Infinity : (inventory.baits?.[baitType] ?? 0)
  const baitReady = baitUnlock.unlocked && baitCount > 0
  const staminaReady = stamina.current >= 1
  const blockers = []

  if (!location.unlocked) blockers.push({ id: 'location', scene: 'TownScene', label: '町を育てる', detail: `解放条件: ${location.unlockedBy}` })
  if (!rodOwned) blockers.push({ id: 'rod', scene: 'UpgradeScene', label: '竿を装備する', detail: `${ROD_NAMES[rodType] ?? rodType}を所持していません` })
  if (!baitUnlock.unlocked) blockers.push({ id: 'baitUnlock', scene: 'TownScene', label: '餌を解放する', detail: `解放条件: ${baitUnlock.unlockedBy}` })
  else if (!baitReady) blockers.push({ id: 'baitStock', scene: 'UpgradeScene', label: '餌を補充する', detail: `${BAIT_NAMES[baitType] ?? baitType}の在庫がありません` })
  if (!staminaReady) blockers.push({ id: 'stamina', scene: 'HomeScene', label: 'STを回復する', detail: '挑戦にはST 1が必要です' })

  return Object.freeze({
    ready: blockers.length === 0,
    pointId: resolvedPointId,
    location: Object.freeze({ ...location, name: POINT_NAMES[resolvedPointId] ?? location.name, ready: location.unlocked }),
    rod: Object.freeze({ id: rodType, name: ROD_NAMES[rodType] ?? rodType, owned: rodOwned, ready: rodOwned }),
    bait: Object.freeze({
      id: baitType,
      name: BAIT_NAMES[baitType] ?? baitType,
      unlocked: baitUnlock.unlocked,
      unlockedBy: baitUnlock.unlockedBy,
      count: baitCount,
      ready: baitReady,
    }),
    stamina: Object.freeze({ ...stamina, cost: 1, ready: staminaReady }),
    blockers: Object.freeze(blockers),
    primaryBlocker: blockers[0] ?? null,
  })
}

export function getFishingJourney() {
  const catches = getCatches()
  const town = getTownSummary()
  const seenTown = localStorage.getItem('ainan_seen_town') === '1'
  const nextUnlock = getNextTownUnlock()
  const preparation = getFishingPreparation()
  const lastCatch = catches[catches.length - 1] ?? null
  const lastFishName = FISH_META[lastCatch?.fishId]?.name ?? '釣果'

  if (catches.length === 0) {
    return Object.freeze({
      id: 'first-catch',
      mode: 'first',
      title: 'まず1匹釣ろう',
      body: '汐風港でキャストして、釣果カードまで見よう',
      scene: 'MapScene',
      cta: '汐風港で1匹釣る',
      shortCta: '釣りに行く',
      progress: '1/4  まずは釣果を作る',
      preparation: getFishingPreparation('pointA'),
    })
  }

  if (!seenTown) {
    return Object.freeze({
      id: 'review-catch',
      mode: 'first',
      title: `${lastFishName}の釣果を確認`,
      body: '得点と魚は獲得済み。港の変化と使い道を見よう',
      scene: 'TownScene',
      cta: '港の変化を見る',
      shortCta: '港へ行く',
      progress: '2/4  釣果を理解する',
      preparation,
    })
  }

  if (nextUnlock) {
    return Object.freeze({
      id: 'grow-town',
      mode: 'first',
      title: `次の目標: ${nextUnlock.name}を解放`,
      body: `${nextUnlock.unlockedBy}が条件。獲得済みの釣果ptで港を育てよう`,
      scene: 'TownScene',
      cta: `${nextUnlock.name}の条件を見る`,
      shortCta: '港を育てる',
      progress: '3/4  釣果の使い道を選ぶ',
      preparation,
      nextUnlock,
    })
  }

  if (!preparation.ready) {
    const blocker = preparation.primaryBlocker
    return Object.freeze({
      id: 'prepare',
      mode: 'return',
      title: `準備: ${blocker.label}`,
      body: blocker.detail,
      scene: blocker.scene,
      cta: blocker.label,
      shortCta: blocker.label,
      progress: '準備完了後に釣り場へ',
      preparation,
    })
  }

  return Object.freeze({
    id: 'challenge',
    mode: 'return',
    title: `現在目標: ${preparation.location.name}へ`,
    body: `${preparation.rod.name} / ${preparation.bait.name} / ST ${preparation.stamina.current}　準備完了`,
    scene: 'MapScene',
    cta: `${preparation.location.name}を選ぶ`,
    shortCta: '釣り場を選ぶ',
    progress: town.totalLevel > 0 ? `港Lv合計 ${town.totalLevel} ・ 次の釣果へ` : '4/4  次の釣果へ',
    preparation,
  })
}

export function getRetryJourneyCopy(pointId = null) {
  const preparation = getFishingPreparation(pointId)
  if (!preparation.ready) {
    const blocker = preparation.primaryBlocker
    return Object.freeze({
      canRetry: false,
      primary: blocker.label,
      cause: blocker.id === 'stamina' ? 'STが足りません' : '同条件で再挑戦できません',
      advice: blocker.detail,
      scene: blocker.scene,
    })
  }
  return Object.freeze({
    canRetry: true,
    primary: '同条件で再挑戦  −1ST',
    cause: '魚に主導権を取られた',
    advice: '暴れている間は待ち、巻ける隙に下へスワイプ',
    scene: 'GameScene',
  })
}
