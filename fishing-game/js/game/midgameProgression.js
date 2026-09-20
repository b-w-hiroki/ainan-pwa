import { FISH_META, getCatches, getGems, getScore, setGems, setScore, spendScore } from './progress.js'

const readJson = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fallback)) } catch { return fallback }
}
const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value))

export const MATERIAL_META = {
  scale: { name: 'きらめく鱗', mark: '鱗' },
  shell: { name: '貝殻パーツ', mark: '貝' },
  ticket: { name: '交換チケット', mark: '券' },
  crystal: { name: '青い宝石', mark: '晶' },
}

export const ACCESSORY_META = {
  cap: {
    name: '潮風キャップ', slot: 'hat', mark: '帽',
    desc: '合わせの感覚を整える港町の帽子',
    scoreCost: 500, materials: { scale: 6, shell: 3 },
    bonus: { biteRateBonus: 0.04 },
  },
  bag: {
    name: 'タックルバッグ', slot: 'bag', mark: '鞄',
    desc: '仕掛けを整理し、魚を寄せやすくするバッグ',
    scoreCost: 700, materials: { shell: 6, ticket: 2 },
    bonus: { attractRadiusMod: 1.12, baitSaveChance: 0.15 },
  },
}

export const MEAL_META = {
  harborBowl: {
    name: '港のまかない丼', mark: '丼', scoreCost: 100, stockCost: 1, uses: 3,
    desc: '3回の釣りで食いつき率アップ', bonus: { biteRateBonus: 0.06 },
  },
  fisherPlate: {
    name: '漁師の焼き魚定食', mark: '定', scoreCost: 180, stockCost: 1, uses: 3,
    desc: '3回の釣りで獲得ポイントアップ', bonus: { scoreMod: 1.12 },
  },
  powerStew: {
    name: '大漁あら汁', mark: '汁', scoreCost: 240, stockCost: 1, uses: 3,
    desc: '3回の釣りで引き寄せ力アップ', bonus: { pullPowerMod: 1.12 },
  },
}

export const BOSS_META = {
  harborRunner: {
    id: 'harborRunner', pointId: 'pointA', fishId: 'buri', minSize: 55,
    title: '汐風港の疾走王', short: '港王', rewardScore: 600, rewardGems: 0,
  },
  bayHunter: {
    id: 'bayHunter', pointId: 'pointB', fishId: 'bass', minSize: 55,
    title: '蒼海湾のハンター', short: '湾王', rewardScore: 800, rewardGems: 1,
  },
  kue: {
    id: 'kue', pointId: 'pointC', fishId: 'kue', minSize: 100,
    title: '黒潮の主', short: '黒潮', rewardScore: 1200, rewardGems: 2,
  },
}

export const COLLECTION_REWARDS = [
  { id: 'discover3', count: 3, label: '3種発見', score: 300, gems: 0 },
  { id: 'discover6', count: 6, label: '6種発見', score: 500, gems: 1 },
  { id: 'discover9', count: 9, label: '図鑑完成', score: 900, gems: 2 },
]

export function getMaterials() {
  return { scale: 0, shell: 0, ticket: 0, crystal: 0, ...readJson('ainan_materials', {}) }
}
export function saveMaterials(value) { writeJson('ainan_materials', value) }

export function getRodLevels() {
  return { basic: 1, carbon: 1, premium: 1, ...readJson('ainan_rod_levels', {}) }
}
export function saveRodLevels(value) { writeJson('ainan_rod_levels', value) }

export function getAccessoryState() {
  const saved = readJson('ainan_accessories', {})
  return {
    owned: { cap: false, bag: false, ...(saved.owned ?? {}) },
    equipped: { hat: null, bag: null, ...(saved.equipped ?? {}) },
  }
}
export function saveAccessoryState(value) { writeJson('ainan_accessories', value) }

export function getCatchStock() { return readJson('ainan_catch_stock', {}) }
export function saveCatchStock(value) { writeJson('ainan_catch_stock', value) }

export function getActiveMeal() {
  const raw = readJson('ainan_active_meal', null)
  if (!raw?.id || (raw.usesLeft ?? 0) <= 0 || !MEAL_META[raw.id]) return null
  return { ...raw, meta: MEAL_META[raw.id] }
}
export function consumeMealUse() {
  const active = getActiveMeal()
  if (!active) return null
  const next = Math.max(0, active.usesLeft - 1)
  if (next <= 0) localStorage.removeItem('ainan_active_meal')
  else writeJson('ainan_active_meal', { id: active.id, usesLeft: next })
  return active
}

export function getRodUpgradeCost(rodId) {
  const level = getRodLevels()[rodId] ?? 1
  if (level >= 5) return null
  const multiplier = rodId === 'premium' ? 1.8 : rodId === 'carbon' ? 1.35 : 1
  const next = level + 1
  return {
    level: next,
    score: Math.round(220 * level * multiplier),
    materials: {
      scale: 2 * level,
      shell: Math.max(0, level - 1),
      ...(rodId === 'premium' && next >= 4 ? { crystal: 1 } : {}),
    },
  }
}

function hasMaterials(cost = {}) {
  const mats = getMaterials()
  return Object.entries(cost).every(([id, qty]) => (mats[id] ?? 0) >= qty)
}
function spendMaterials(cost = {}) {
  const mats = getMaterials()
  if (!hasMaterials(cost)) return false
  Object.entries(cost).forEach(([id, qty]) => { mats[id] = Math.max(0, (mats[id] ?? 0) - qty) })
  saveMaterials(mats)
  return true
}

export function upgradeRodLevel(rodId) {
  const cost = getRodUpgradeCost(rodId)
  if (!cost) return { ok: false, reason: 'max' }
  if (getScore() < cost.score) return { ok: false, reason: 'score', cost }
  if (!hasMaterials(cost.materials)) return { ok: false, reason: 'materials', cost }
  if (!spendScore(cost.score)) return { ok: false, reason: 'score', cost }
  spendMaterials(cost.materials)
  const levels = getRodLevels()
  levels[rodId] = cost.level
  saveRodLevels(levels)
  return { ok: true, level: cost.level, cost }
}

export function purchaseAccessory(id) {
  const meta = ACCESSORY_META[id]
  if (!meta) return { ok: false, reason: 'missing' }
  const state = getAccessoryState()
  if (state.owned[id]) return equipAccessory(id)
  if (getScore() < meta.scoreCost) return { ok: false, reason: 'score' }
  if (!hasMaterials(meta.materials)) return { ok: false, reason: 'materials' }
  if (!spendScore(meta.scoreCost)) return { ok: false, reason: 'score' }
  spendMaterials(meta.materials)
  state.owned[id] = true
  state.equipped[meta.slot] = id
  saveAccessoryState(state)
  return { ok: true, equipped: true }
}

export function equipAccessory(id) {
  const meta = ACCESSORY_META[id]
  const state = getAccessoryState()
  if (!meta || !state.owned[id]) return { ok: false, reason: 'owned' }
  state.equipped[meta.slot] = id
  saveAccessoryState(state)
  return { ok: true, equipped: true }
}

export function getProgressionBonuses(rodId = 'basic', mealOverride = null) {
  const level = getRodLevels()[rodId] ?? 1
  const accessories = getAccessoryState()
  const meal = mealOverride ?? getActiveMeal()
  const bonus = {
    castRangeMod: 1 + Math.max(0, level - 1) * 0.025,
    pullPowerMod: 1 + Math.max(0, level - 1) * 0.045,
    attractRadiusMod: 1,
    biteRateBonus: 0,
    baitSaveChance: 0,
    scoreMod: 1,
    rodLevel: level,
    mealId: meal?.id ?? null,
  }
  Object.values(accessories.equipped).filter(Boolean).forEach(id => {
    const b = ACCESSORY_META[id]?.bonus ?? {}
    bonus.attractRadiusMod *= b.attractRadiusMod ?? 1
    bonus.biteRateBonus += b.biteRateBonus ?? 0
    bonus.baitSaveChance += b.baitSaveChance ?? 0
  })
  const mb = meal?.meta?.bonus ?? {}
  bonus.pullPowerMod *= mb.pullPowerMod ?? 1
  bonus.biteRateBonus += mb.biteRateBonus ?? 0
  bonus.scoreMod *= mb.scoreMod ?? 1
  return bonus
}

export function grantCatchLoot(fish, catchData, pointId = null) {
  if (!fish?.id || !catchData) return null
  const stock = getCatchStock()
  stock[fish.id] = (stock[fish.id] ?? 0) + 1
  saveCatchStock(stock)

  const materials = getMaterials()
  const grants =
    fish.rarity === 'legendary' ? { scale: 2, shell: 2, ticket: 2, crystal: 1 } :
    fish.rarity === 'rare' ? { scale: 2, shell: 1, ticket: 1 } :
    fish.rarity === 'uncommon' ? { scale: 1, shell: 1 } :
    { scale: 1 }
  Object.entries(grants).forEach(([id, qty]) => { materials[id] = (materials[id] ?? 0) + qty })
  saveMaterials(materials)
  const boss = recordBossCatch(fish.id, catchData.sizeCm, pointId)
  return { grants, boss }
}

export function sellCatch(fishId, qty = 1) {
  const stock = getCatchStock()
  const current = stock[fishId] ?? 0
  const amount = Math.max(0, Math.min(current, qty))
  if (amount <= 0) return { ok: false, reason: 'stock' }
  const base = FISH_META[fishId]?.score ?? 80
  const value = Math.max(30, Math.round(base * 0.55)) * amount
  stock[fishId] = current - amount
  saveCatchStock(stock)
  setScore(getScore() + value)
  return { ok: true, value, qty: amount }
}

export function sellAllCatches() {
  const stock = getCatchStock()
  let value = 0
  let qty = 0
  Object.entries(stock).forEach(([fishId, count]) => {
    const amount = Math.max(0, count ?? 0)
    if (!amount) return
    const base = FISH_META[fishId]?.score ?? 80
    value += Math.max(30, Math.round(base * 0.55)) * amount
    qty += amount
    stock[fishId] = 0
  })
  if (!qty) return { ok: false, reason: 'stock' }
  saveCatchStock(stock)
  setScore(getScore() + value)
  return { ok: true, value, qty }
}
function consumeAnyCatch(qty = 1) {
  const stock = getCatchStock()
  const order = Object.keys(stock).sort((a, b) => (stock[b] ?? 0) - (stock[a] ?? 0))
  let remaining = qty
  for (const id of order) {
    const take = Math.min(remaining, stock[id] ?? 0)
    stock[id] = (stock[id] ?? 0) - take
    remaining -= take
    if (remaining <= 0) break
  }
  if (remaining > 0) return false
  saveCatchStock(stock)
  return true
}

export function cookMeal(id) {
  const meta = MEAL_META[id]
  if (!meta) return { ok: false, reason: 'missing' }
  const stockTotal = Object.values(getCatchStock()).reduce((sum, value) => sum + (value ?? 0), 0)
  if (stockTotal < meta.stockCost) return { ok: false, reason: 'stock' }
  if (getScore() < meta.scoreCost) return { ok: false, reason: 'score' }
  if (!spendScore(meta.scoreCost)) return { ok: false, reason: 'score' }
  if (!consumeAnyCatch(meta.stockCost)) {
    setScore(getScore() + meta.scoreCost)
    return { ok: false, reason: 'stock' }
  }
  writeJson('ainan_active_meal', { id, usesLeft: meta.uses })
  return { ok: true, meal: getActiveMeal() }
}

export function getBossStates() {
  const trophies = readJson('ainan_boss_trophies', {})
  const catches = getCatches()
  let changed = false
  Object.values(BOSS_META).forEach(meta => {
    const best = catches.filter(item => item.fishId === meta.fishId && (!item.point || item.point === meta.pointId)).reduce((max, item) => Math.max(max, item.sizeCm ?? 0), 0)
    if (best >= meta.minSize && (!trophies[meta.id] || best > (trophies[meta.id].sizeCm ?? 0))) {
      trophies[meta.id] = { sizeCm: best, claimed: trophies[meta.id]?.claimed ?? false, timestamp: trophies[meta.id]?.timestamp ?? Date.now() }
      changed = true
    }
  })
  if (changed) writeJson('ainan_boss_trophies', trophies)
  return Object.fromEntries(Object.values(BOSS_META).map(meta => [meta.id, {
    ...meta,
    cleared: !!trophies[meta.id],
    claimed: !!trophies[meta.id]?.claimed,
    sizeCm: trophies[meta.id]?.sizeCm ?? 0,
  }]))
}

export function recordBossCatch(fishId, sizeCm, pointId = null) {
  const meta = Object.values(BOSS_META).find(item => item.fishId === fishId && sizeCm >= item.minSize && (!pointId || item.pointId === pointId))
  if (!meta) return null
  const trophies = readJson('ainan_boss_trophies', {})
  const old = trophies[meta.id]
  if (!old || sizeCm > (old.sizeCm ?? 0)) {
    trophies[meta.id] = { sizeCm, claimed: old?.claimed ?? false, timestamp: Date.now() }
    writeJson('ainan_boss_trophies', trophies)
  }
  return meta
}

export function claimBossReward(id) {
  const meta = BOSS_META[id]
  const trophies = readJson('ainan_boss_trophies', {})
  const entry = trophies[id]
  if (!meta || !entry || entry.claimed) return false
  setScore(getScore() + meta.rewardScore)
  if (meta.rewardGems) setGems(getGems() + meta.rewardGems)
  entry.claimed = true
  trophies[id] = entry
  writeJson('ainan_boss_trophies', trophies)
  return true
}

export function getCollectionRewardState() {
  const found = new Set(getCatches().map(c => c.fishId)).size
  const claimed = readJson('ainan_collection_rewards', {})
  return COLLECTION_REWARDS.map(reward => ({
    ...reward,
    available: found >= reward.count && !claimed[reward.id],
    claimed: !!claimed[reward.id],
    found,
  }))
}

export function claimCollectionReward(id) {
  const reward = COLLECTION_REWARDS.find(item => item.id === id)
  const found = new Set(getCatches().map(c => c.fishId)).size
  const claimed = readJson('ainan_collection_rewards', {})
  if (!reward || found < reward.count || claimed[id]) return false
  if (reward.score) setScore(getScore() + reward.score)
  if (reward.gems) setGems(getGems() + reward.gems)
  claimed[id] = true
  writeJson('ainan_collection_rewards', claimed)
  return true
}
