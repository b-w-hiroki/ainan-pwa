export const FISH_META = {
  aji: {
    name: 'アジ',
    icon: 'ア',
    rarity: 'common',
    habitat: '港・入り江',
    hint: '朝や夕方、港の近くでよく見かける小型魚。',
    encounter: '汐風港・蒼海湾で魚影が多い時に狙いやすい。',
    score: 80,
  },
  tai: {
    name: 'マダイ',
    icon: '鯛',
    rarity: 'uncommon',
    habitat: '港・沖磯',
    hint: '明るい時間帯の沖寄りで反応しやすい人気魚。',
    encounter: '汐風港・黒潮崎で中型以上の魚影を狙う。',
    score: 250,
  },
  bass: {
    name: 'ブラックバス',
    icon: 'バ',
    rarity: 'rare',
    habitat: '入り江',
    hint: '静かな湾の障害物付近に潜みやすい。',
    encounter: '蒼海湾で濃い魚影を狙うと出会いやすい。',
    score: 400,
  },
  buri: {
    name: 'ブリ',
    icon: '鰤',
    rarity: 'uncommon',
    habitat: '港・沖磯',
    hint: '回遊してくる魚群に混ざることがある力強い魚。',
    encounter: '汐風港・黒潮崎で魚群チャンス中に狙う。',
    score: 350,
  },
  kue: {
    name: 'クエ',
    icon: 'ク',
    rarity: 'legendary',
    habitat: '沖磯',
    hint: '黒潮が当たる深場に潜む、めったに出ない大物。',
    encounter: '黒潮崎の濃い魚影。強い竿と良いエサが欲しい。',
    score: 1200,
  },
}

export const ROD_META = {
  basic:   { name: '初心者竿', desc: '扱いやすい標準の竿', cost: 0 },
  carbon:  { name: 'カーボン竿', desc: '飛距離と引きが安定する竿', cost: 0 },
  premium: { name: '高級竿', desc: '大物狙いの上位モデル', cost: 800 },
}

export const BAIT_META = {
  worm:    { name: 'ミミズ', desc: '食いつき重視の基本エサ', cost: 60, amount: 5 },
  shrimp:  { name: 'エビ', desc: 'レア魚を少し狙いやすいエサ', cost: 180, amount: 5 },
  special: { name: '特製まき餌', desc: '遠くの魚を引き寄せるエサ', cost: 360, amount: 3 },
}

export const REWARD_META = [
  { id: 'sticker', name: '港町ステッカー', desc: 'コレクション用の記念品', cost: 250 },
  { id: 'ticket',  name: '応援チケット', desc: '町おこしポイントの引換券', cost: 500 },
  { id: 'icebox',  name: '保冷ボックス', desc: '釣果を持ち帰るための道具', cost: 700 },
]

export const MISSION_META = [
  { id: 'catch_aji', title: 'アジを1匹釣る', desc: '港の定番魚を釣ってみよう', target: 1, reward: 80, type: 'catch', fishId: 'aji' },
  { id: 'catch_any_3', title: '魚を3匹釣る', desc: '好きな釣り場で釣果を重ねよう', target: 3, reward: 160, type: 'catchAny' },
  { id: 'open_book', title: '図鑑を確認する', desc: '釣った魚の情報を見てみよう', target: 1, reward: 60, type: 'manual' },
]

export const LICENSE_META = [
  { id: 'go_fishing', title: '釣り場へ行く', desc: 'マップから釣り場を選ぶ', reward: 'ミミズ x5' },
  { id: 'first_catch', title: 'はじめて釣る', desc: '魚を1匹釣り上げる', reward: '80pt' },
  { id: 'check_book', title: '図鑑を見る', desc: '魚のヒントを確認する', reward: 'エビ x2' },
  { id: 'equip_rod', title: '竿を確認', desc: '強化画面で装備を見る', reward: '60pt' },
  { id: 'use_bait', title: 'エサを選ぶ', desc: '釣り画面でエサを確認する', reward: 'ミミズ x5' },
  { id: 'catch_three', title: '3匹釣る', desc: '累計3匹釣る', reward: 'カーボン素材' },
  { id: 'find_spot', title: '釣り場情報', desc: '未発見魚数を確認する', reward: '120pt' },
  { id: 'upgrade_try', title: '強化に触れる', desc: '装備詳細を開く', reward: 'エビ x3' },
  { id: 'license_done', title: '釣り免許卒業', desc: 'すべての課題を終える', reward: '高級竿' },
]

export const TOWN_FACILITY_META = [
  {
    id: 'market',
    name: '魚市場',
    icon: '🐟',
    desc: '釣果を町のにぎわいに変える拠点',
    effect: '釣果ポイントの価値アップ',
    baseCost: 120,
  },
  {
    id: 'pier',
    name: 'にぎわい桟橋',
    icon: '⚓',
    desc: '釣り人が集まる港のシンボル',
    effect: '魚影チャンスの演出強化',
    baseCost: 180,
  },
  {
    id: 'guide',
    name: '案内所',
    icon: '📋',
    desc: '初心者にもわかりやすい案内拠点',
    effect: 'ミッション報酬の見通しアップ',
    baseCost: 220,
  },
  {
    id: 'festival',
    name: '港まつり広場',
    icon: '🎪',
    desc: '町おこしイベントの中心になる広場',
    effect: '交換所アイテムの魅力アップ',
    baseCost: 320,
  },
]

const readJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

export function getScore() {
  return parseInt(localStorage.getItem('ainan_score') ?? '0', 10)
}

export function setScore(score) {
  localStorage.setItem('ainan_score', String(Math.max(0, score)))
}

function todayKey() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getDailyBonusState() {
  const lastClaimed = localStorage.getItem('ainan_daily_bonus_date') ?? ''
  const streak = parseInt(localStorage.getItem('ainan_daily_bonus_streak') ?? '0', 10)
  const canClaim = lastClaimed !== todayKey()
  const reward = 100 + Math.min(6, streak) * 20
  return { canClaim, lastClaimed, streak, reward }
}

export function claimDailyBonus() {
  const state = getDailyBonusState()
  if (!state.canClaim) return { ok: false, ...state }
  const nextStreak = state.streak + 1
  setScore(getScore() + state.reward)
  localStorage.setItem('ainan_daily_bonus_date', todayKey())
  localStorage.setItem('ainan_daily_bonus_streak', String(nextStreak))
  return { ok: true, ...state, streak: nextStreak }
}

export function getCatches() {
  return readJson('ainan_catches', [])
}

export function getInventory() {
  const saved = readJson('ainan_inventory', {})
  return {
    rods:  { basic: 1, carbon: 1, premium: 0, ...(saved.rods ?? {}) },
    baits: { worm: 12, shrimp: 5, special: 2, ...(saved.baits ?? {}) },
  }
}

export function saveInventory(inventory) {
  localStorage.setItem('ainan_inventory', JSON.stringify(inventory))
}

export function getEquipment() {
  return {
    rodType: 'carbon',
    baitType: 'worm',
    ...readJson('ainan_equipment', {}),
  }
}

export function saveEquipment(equipment) {
  localStorage.setItem('ainan_equipment', JSON.stringify(equipment))
}

export function getRewards() {
  return readJson('ainan_rewards', {})
}

export function saveRewards(rewards) {
  localStorage.setItem('ainan_rewards', JSON.stringify(rewards))
}

export function spendScore(cost) {
  const score = getScore()
  if (score < cost) return false
  setScore(score - cost)
  return true
}

export function getTownFacilities() {
  return {
    market: 0,
    pier: 0,
    guide: 0,
    festival: 0,
    ...readJson('ainan_town_facilities', {}),
  }
}

export function saveTownFacilities(facilities) {
  localStorage.setItem('ainan_town_facilities', JSON.stringify(facilities))
}

export function getTownFacilityCost(id) {
  const meta = TOWN_FACILITY_META.find(f => f.id === id)
  const lv = getTownFacilities()[id] ?? 0
  return Math.round((meta?.baseCost ?? 100) * (1 + lv * 0.75))
}

export function upgradeTownFacility(id) {
  const facilities = getTownFacilities()
  const lv = facilities[id] ?? 0
  if (lv >= 5) return { ok: false, reason: 'max' }
  const cost = getTownFacilityCost(id)
  if (!spendScore(cost)) return { ok: false, reason: 'score' }
  facilities[id] = lv + 1
  saveTownFacilities(facilities)
  return { ok: true, level: facilities[id] }
}

export function getTownSummary() {
  const facilities = getTownFacilities()
  const totalLevel = Object.values(facilities).reduce((sum, lv) => sum + lv, 0)
  const catches = getCatches().length
  const rewards = Object.values(getRewards()).reduce((sum, count) => sum + count, 0)
  const bustle = Math.min(100, totalLevel * 10 + catches * 2 + rewards * 4)
  const rank = bustle >= 80 ? '港町フェス級' : bustle >= 50 ? '人気スポット' : bustle >= 25 ? 'にぎわい始め' : '小さな港町'
  return { facilities, totalLevel, catches, rewards, bustle, rank }
}

export function getTownBonuses() {
  const f = getTownFacilities()
  return {
    scoreMod: 1 + (f.market ?? 0) * 0.04,
    attractRadiusMod: 1 + (f.pier ?? 0) * 0.025,
    missionRewardMod: 1 + (f.guide ?? 0) * 0.05,
    exchangeDiscount: Math.min(0.20, (f.festival ?? 0) * 0.04),
  }
}

export function getPlayerRank() {
  const catches = getCatches().length
  const rank = Math.max(1, Math.floor(catches / 3) + 1)
  const current = catches % 3
  return {
    rank,
    current,
    nextNeed: 3 - current,
    title: rank >= 8 ? '港の名人' : rank >= 5 ? '人気の釣り師' : rank >= 3 ? '一人前の釣り師' : '港の釣り人',
  }
}

export function getRankBonuses() {
  const { rank } = getPlayerRank()
  const step = Math.max(0, rank - 1)
  return {
    skillLevel: rank,
    castRangeMod: 1 + Math.min(0.20, step * 0.025),
    pullPowerMod: 1 + Math.min(0.25, step * 0.03),
    biteRateBonus: Math.min(0.10, step * 0.012),
    attractRadiusMod: 1 + Math.min(0.20, step * 0.025),
  }
}

export function getMissionProgress() {
  const catches = getCatches()
  const seenBook = localStorage.getItem('ainan_seen_book') === '1'
  return {
    catch_aji: catches.filter(c => c.fishId === 'aji').length,
    catch_any_3: catches.length,
    open_book: seenBook ? 1 : 0,
  }
}

export function getClaimedMissions() {
  return readJson('ainan_claimed_missions', {})
}

export function saveClaimedMissions(claimed) {
  localStorage.setItem('ainan_claimed_missions', JSON.stringify(claimed))
}

export function getClaimedLicenses() {
  return readJson('ainan_claimed_licenses', {})
}

export function saveClaimedLicenses(claimed) {
  localStorage.setItem('ainan_claimed_licenses', JSON.stringify(claimed))
}

export function claimLicenseReward(licenseId) {
  const item = LICENSE_META.find(m => m.id === licenseId)
  if (!item) return false

  const claimed = getClaimedLicenses()
  if (claimed[licenseId]) return false

  const inventory = getInventory()
  switch (licenseId) {
    case 'go_fishing':
    case 'use_bait':
      inventory.baits.worm = (inventory.baits.worm ?? 0) + 5
      saveInventory(inventory)
      break
    case 'check_book':
      inventory.baits.shrimp = (inventory.baits.shrimp ?? 0) + 2
      saveInventory(inventory)
      break
    case 'upgrade_try':
      inventory.baits.shrimp = (inventory.baits.shrimp ?? 0) + 3
      saveInventory(inventory)
      break
    case 'license_done':
      inventory.rods.premium = 1
      saveInventory(inventory)
      break
    case 'first_catch':
      setScore(getScore() + 80)
      break
    case 'equip_rod':
      setScore(getScore() + 60)
      break
    case 'catch_three':
      setScore(getScore() + 100)
      break
    case 'find_spot':
      setScore(getScore() + 120)
      break
    default:
      break
  }

  claimed[licenseId] = true
  saveClaimedLicenses(claimed)
  return true
}

export function markBookSeen() {
  localStorage.setItem('ainan_seen_book', '1')
}

export function getLicenseProgress() {
  const catches = getCatches()
  const seenBook = localStorage.getItem('ainan_seen_book') === '1'
  const seenUpgrade = localStorage.getItem('ainan_seen_upgrade') === '1'
  const seenSpot = localStorage.getItem('ainan_seen_spot') === '1'
  const touchedTackle = localStorage.getItem('ainan_touched_tackle') === '1'
  return {
    go_fishing: localStorage.getItem('ainan_went_fishing') === '1',
    first_catch: catches.length >= 1,
    check_book: seenBook,
    equip_rod: seenUpgrade,
    use_bait: touchedTackle,
    catch_three: catches.length >= 3,
    find_spot: seenSpot,
    upgrade_try: seenUpgrade,
    license_done: catches.length >= 3 && seenBook && seenUpgrade && seenSpot,
  }
}

export function markLicenseFlag(key) {
  localStorage.setItem(key, '1')
}
