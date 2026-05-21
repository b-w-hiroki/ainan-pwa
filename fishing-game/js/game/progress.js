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

export const LICENSE_SHEETS = [
  {
    id: 'basic',
    title: 'はじめての釣り',
    subtitle: '基本操作と画面を覚える',
    color: 0xffd900,
    completeReward: { text: '高級竿', grant: { rods: { premium: 1 } } },
    milestoneRewards: [
      { id: 'm3', count: 3, text: 'ミミズ x10', grant: { baits: { worm: 10 } } },
      { id: 'm5', count: 5, text: '200pt', grant: { score: 200 } },
    ],
    lineRewards: [
      { id: 'row0', text: '80pt', grant: { score: 80 } },
      { id: 'row1', text: 'ミミズ x5', grant: { baits: { worm: 5 } } },
      { id: 'row2', text: 'エビ x3', grant: { baits: { shrimp: 3 } } },
      { id: 'col0', text: '60pt', grant: { score: 60 } },
      { id: 'col1', text: 'エビ x2', grant: { baits: { shrimp: 2 } } },
      { id: 'col2', text: '120pt', grant: { score: 120 } },
    ],
    tasks: [
      { id: 'go_fishing', title: '釣り場へ行く', desc: 'マップから釣り場を選ぶ', reward: 'ミミズ x8', grant: { baits: { worm: 8 } } },
      { id: 'first_catch', title: 'はじめて釣る', desc: '魚を1匹釣り上げる', reward: '120pt', grant: { score: 120 } },
      { id: 'check_book', title: '図鑑を見る', desc: '魚のヒントを確認する', reward: 'エビ x4', grant: { baits: { shrimp: 4 } } },
      { id: 'equip_rod', title: '竿を確認', desc: '強化画面で装備を見る', reward: '100pt', grant: { score: 100 } },
      { id: 'use_bait', title: 'エサを選ぶ', desc: '釣り画面でエサを確認する', reward: 'ミミズ x8', grant: { baits: { worm: 8 } } },
      { id: 'catch_three', title: '3匹釣る', desc: '累計3匹釣る', reward: '180pt', grant: { score: 180 } },
      { id: 'find_spot', title: '釣り場情報', desc: '未発見魚数を確認する', reward: '180pt', grant: { score: 180 } },
      { id: 'upgrade_try', title: '強化に触れる', desc: '装備詳細を開く', reward: 'エビ x5', grant: { baits: { shrimp: 5 } } },
      { id: 'license_done', title: '基本卒業', desc: 'このシートをすべて達成する', reward: '高級竿', grant: { rods: { premium: 1 } } },
    ],
  },
  {
    id: 'angler',
    title: '釣り師への道',
    subtitle: '釣果と図鑑を伸ばす',
    color: 0x5ebcff,
    completeReward: { text: '特製まき餌 x5', grant: { baits: { special: 5 } } },
    milestoneRewards: [
      { id: 'm3', count: 3, text: 'エビ x8', grant: { baits: { shrimp: 8 } } },
      { id: 'm5', count: 5, text: '350pt', grant: { score: 350 } },
    ],
    lineRewards: [
      { id: 'row0', text: '160pt', grant: { score: 160 } },
      { id: 'row1', text: 'エビ x5', grant: { baits: { shrimp: 5 } } },
      { id: 'row2', text: '220pt', grant: { score: 220 } },
      { id: 'col0', text: 'ミミズ x8', grant: { baits: { worm: 8 } } },
      { id: 'col1', text: '180pt', grant: { score: 180 } },
      { id: 'col2', text: '特製まき餌 x2', grant: { baits: { special: 2 } } },
    ],
    tasks: [
      { id: 'catch_five', title: '5匹釣る', desc: '累計5匹釣る', reward: '200pt', grant: { score: 200 } },
      { id: 'catch_ten', title: '10匹釣る', desc: '累計10匹釣る', reward: '260pt', grant: { score: 260 } },
      { id: 'score_1000', title: '1000pt到達', desc: '所持ポイント1000pt以上', reward: 'エビ x6', grant: { baits: { shrimp: 6 } } },
      { id: 'find_three_fish', title: '3種発見', desc: '図鑑で3種類見つける', reward: '240pt', grant: { score: 240 } },
      { id: 'catch_rare', title: 'レアを狙う', desc: 'レア魚を1匹釣る', reward: '特製まき餌 x3', grant: { baits: { special: 3 } } },
      { id: 'own_premium', title: '高級竿入手', desc: '高級竿を所持する', reward: '300pt', grant: { score: 300 } },
      { id: 'mission_two', title: 'ミッション2個', desc: 'ミッション報酬を2個受け取る', reward: 'ミミズ x12', grant: { baits: { worm: 12 } } },
      { id: 'rank_three', title: 'ランク3', desc: '釣り師ランク3に到達', reward: '360pt', grant: { score: 360 } },
      { id: 'angler_done', title: '釣り師認定', desc: 'このシートをすべて達成する', reward: '特製まき餌 x5', grant: { baits: { special: 5 } } },
    ],
  },
  {
    id: 'town',
    title: '町おこし活動',
    subtitle: '施設と交換で町を育てる',
    color: 0x8bcf52,
    completeReward: { text: '500pt', grant: { score: 500 } },
    milestoneRewards: [
      { id: 'm3', count: 3, text: '300pt', grant: { score: 300 } },
      { id: 'm5', count: 5, text: '特製まき餌 x4', grant: { baits: { special: 4 } } },
    ],
    lineRewards: [
      { id: 'row0', text: '200pt', grant: { score: 200 } },
      { id: 'row1', text: 'エビ x6', grant: { baits: { shrimp: 6 } } },
      { id: 'row2', text: '300pt', grant: { score: 300 } },
      { id: 'col0', text: 'ミミズ x10', grant: { baits: { worm: 10 } } },
      { id: 'col1', text: '特製まき餌 x3', grant: { baits: { special: 3 } } },
      { id: 'col2', text: '350pt', grant: { score: 350 } },
    ],
    tasks: [
      { id: 'facility_one', title: '施設Lv1', desc: 'いずれかの施設をLv1にする', reward: '220pt', grant: { score: 220 } },
      { id: 'facility_total_three', title: '施設合計Lv3', desc: '施設Lv合計を3にする', reward: 'エビ x8', grant: { baits: { shrimp: 8 } } },
      { id: 'bustle_25', title: 'にぎわい25', desc: '町のにぎわい25以上', reward: '260pt', grant: { score: 260 } },
      { id: 'market_two', title: '魚市場Lv2', desc: '魚市場をLv2にする', reward: '320pt', grant: { score: 320 } },
      { id: 'pier_two', title: '桟橋Lv2', desc: 'にぎわい桟橋をLv2にする', reward: '特製まき餌 x4', grant: { baits: { special: 4 } } },
      { id: 'guide_two', title: '案内所Lv2', desc: '案内所をLv2にする', reward: '360pt', grant: { score: 360 } },
      { id: 'exchange_one', title: '交換1回', desc: '交換所のアイテムを1個所持', reward: 'ミミズ x14', grant: { baits: { worm: 14 } } },
      { id: 'festival_two', title: '広場Lv2', desc: '港まつり広場をLv2にする', reward: '420pt', grant: { score: 420 } },
      { id: 'town_done', title: '町おこし認定', desc: 'このシートをすべて達成する', reward: '500pt', grant: { score: 500 } },
    ],
  },
]
export const LICENSE_META = LICENSE_SHEETS[0].tasks

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

export function getClaimedLicenseBonuses() {
  return readJson('ainan_claimed_license_bonuses', {})
}

export function saveClaimedLicenseBonuses(claimed) {
  localStorage.setItem('ainan_claimed_license_bonuses', JSON.stringify(claimed))
}

function grantReward(grant = {}) {
  if (grant.score) setScore(getScore() + grant.score)
  const inventory = getInventory()
  let changedInventory = false
  Object.entries(grant.rods ?? {}).forEach(([id, value]) => {
    inventory.rods[id] = Math.max(inventory.rods[id] ?? 0, value)
    changedInventory = true
  })
  Object.entries(grant.baits ?? {}).forEach(([id, value]) => {
    inventory.baits[id] = (inventory.baits[id] ?? 0) + value
    changedInventory = true
  })
  if (changedInventory) saveInventory(inventory)
}

export function claimLicenseReward(licenseId) {
  const item = LICENSE_SHEETS.flatMap(sheet => sheet.tasks).find(m => m.id === licenseId)
  if (!item) return false
  const progress = getLicenseProgress()
  if (!progress[licenseId]) return false
  const claimed = getClaimedLicenses()
  if (claimed[licenseId]) return false
  grantReward(item.grant)
  claimed[licenseId] = true
  saveClaimedLicenses(claimed)
  return true
}

export function claimLicenseBonus(sheetId, bonusId) {
  const sheet = LICENSE_SHEETS.find(s => s.id === sheetId)
  if (!sheet) return false
  const progress = getLicenseProgress()
  const claimed = getClaimedLicenseBonuses()
  const key = `${sheetId}:${bonusId}`
  if (claimed[key]) return false

  const tasks = sheet.tasks
  const completed = tasks.filter(task => progress[task.id]).length
  let reward = null
  if (bonusId === 'complete') {
    if (completed < tasks.length) return false
    reward = sheet.completeReward
  } else {
    reward = sheet.milestoneRewards?.find(r => r.id === bonusId)
    if (!reward || completed < reward.count) return false
  }
  grantReward(reward.grant)
  claimed[key] = true
  saveClaimedLicenseBonuses(claimed)
  return true
}

export function claimAllLicenseRewards(sheetId) {
  const sheet = LICENSE_SHEETS.find(s => s.id === sheetId)
  if (!sheet) return { taskCount: 0, completeClaimed: false }
  const progress = getLicenseProgress()
  const claimed = getClaimedLicenses()
  let taskCount = 0

  sheet.tasks.forEach(task => {
    if (!progress[task.id] || claimed[task.id]) return
    grantReward(task.grant)
    claimed[task.id] = true
    taskCount += 1
  })
  if (taskCount > 0) saveClaimedLicenses(claimed)

  let bonusCount = 0
  ;(sheet.milestoneRewards ?? []).forEach(reward => {
    if (claimLicenseBonus(sheetId, reward.id)) bonusCount += 1
  })
  const completeClaimed = claimLicenseBonus(sheetId, 'complete')
  return { taskCount, bonusCount, completeClaimed }
}

export function markBookSeen() {
  localStorage.setItem('ainan_seen_book', '1')
}

export function getLicenseProgress() {
  const catches = getCatches()
  const foundFish = new Set(catches.map(c => c.fishId))
  const seenBook = localStorage.getItem('ainan_seen_book') === '1'
  const seenUpgrade = localStorage.getItem('ainan_seen_upgrade') === '1'
  const seenSpot = localStorage.getItem('ainan_seen_spot') === '1'
  const touchedTackle = localStorage.getItem('ainan_touched_tackle') === '1'
  const inventory = getInventory()
  const claimedMissions = getClaimedMissions()
  const rewards = getRewards()
  const town = getTownSummary()
  const facilities = getTownFacilities()
  const score = getScore()
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
    catch_five: catches.length >= 5,
    catch_ten: catches.length >= 10,
    score_1000: score >= 1000,
    find_three_fish: foundFish.size >= 3,
    catch_rare: catches.some(c => ['bass', 'kue'].includes(c.fishId)),
    own_premium: (inventory.rods?.premium ?? 0) > 0,
    mission_two: Object.values(claimedMissions).filter(Boolean).length >= 2,
    rank_three: getPlayerRank().rank >= 3,
    angler_done: catches.length >= 10 && foundFish.size >= 3 && getPlayerRank().rank >= 3,
    facility_one: Object.values(facilities).some(lv => lv >= 1),
    facility_total_three: town.totalLevel >= 3,
    bustle_25: town.bustle >= 25,
    market_two: (facilities.market ?? 0) >= 2,
    pier_two: (facilities.pier ?? 0) >= 2,
    guide_two: (facilities.guide ?? 0) >= 2,
    exchange_one: Object.values(rewards).reduce((sum, count) => sum + count, 0) >= 1,
    festival_two: (facilities.festival ?? 0) >= 2,
    town_done: town.totalLevel >= 8 && town.bustle >= 50,
  }
}

export function markLicenseFlag(key) {
  localStorage.setItem(key, '1')
}
