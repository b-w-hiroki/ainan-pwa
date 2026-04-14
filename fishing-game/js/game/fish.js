/**
 * 魚パラメータ一覧
 * rarity / habitat / biteRate / scoreBase / 食いつきパラメータ(size,power,stamina,skill)
 * seasonBonus / timeBonus / weatherBonus: 出現率ボーナス倍率（1.0=通常 / 1.5=出やすい / 0.5=出にくい）
 * rageInterval: battle.js が使用（暴れ発生インターバル ms）
 * rageDuration:  将来: 魚種ごとの暴れ時間(ms)管理予定（現在は battle.js の定数で上書き）
 */
export const FISH_LIST = [
  {
    id: 'aji', name: 'アジ', emoji: '🐟',
    rarity: 'common',
    habitat: ['pointA', 'pointB'],
    biteRate: 0.70, scoreBase: 80,
    size: 1.0, power: 1.0, stamina: 1.0, skill: 1.0,
    resistanceStrength: 0.8, escapeSpeed: 1.0,
    rageInterval: [3000, 6000], rageDuration: [1500, 3000],
    seasonBonus:  { spring: 1.2, summer: 1.5, autumn: 1.0, winter: 0.6 },
    timeBonus:    { morning: 1.5, noon: 0.8, evening: 1.3, night: 0.7 },
    weatherBonus: { sunny: 1.2, rainy: 0.8, snowy: 0.4 },
  },
  {
    id: 'tai', name: 'マダイ', emoji: '🐠',
    rarity: 'uncommon',
    habitat: ['pointA', 'pointC'],
    biteRate: 0.40, scoreBase: 250,
    size: 1.5, power: 1.3, stamina: 1.3, skill: 1.5,
    resistanceStrength: 1.3, escapeSpeed: 1.3,
    rageInterval: [2500, 5000], rageDuration: [2000, 3500],
    seasonBonus:  { spring: 1.5, summer: 1.0, autumn: 1.3, winter: 0.8 },
    timeBonus:    { morning: 1.2, noon: 1.0, evening: 1.5, night: 0.8 },
    weatherBonus: { sunny: 1.0, rainy: 1.2, snowy: 0.5 },
  },
  {
    id: 'bass', name: 'ブラックバス', emoji: '🐟',
    rarity: 'rare',
    habitat: ['pointB'],
    biteRate: 0.35, scoreBase: 400,
    size: 1.8, power: 2.0, stamina: 1.8, skill: 2.0,
    resistanceStrength: 2.0, escapeSpeed: 1.8,
    rageInterval: [2000, 5000], rageDuration: [2000, 4000],
    seasonBonus:  { spring: 1.0, summer: 1.8, autumn: 1.2, winter: 0.4 },
    timeBonus:    { morning: 0.8, noon: 1.5, evening: 1.8, night: 0.6 },
    weatherBonus: { sunny: 1.5, rainy: 0.8, snowy: 0.2 },
  },
  {
    id: 'buri', name: 'ブリ', emoji: '🐡',
    rarity: 'uncommon',
    habitat: ['pointA', 'pointC'],
    biteRate: 0.30, scoreBase: 350,
    size: 1.6, power: 1.4, stamina: 1.5, skill: 1.3,
    resistanceStrength: 1.4, escapeSpeed: 1.5,
    rageInterval: [1800, 4000], rageDuration: [1800, 3500],
    seasonBonus:  { spring: 0.8, summer: 0.6, autumn: 1.5, winter: 1.8 },
    timeBonus:    { morning: 1.3, noon: 0.7, evening: 1.0, night: 1.5 },
    weatherBonus: { sunny: 0.8, rainy: 1.3, snowy: 1.0 },
  },
  {
    id: 'kue', name: 'クエ', emoji: '🐳',
    rarity: 'legendary',
    habitat: ['pointC'],
    biteRate: 0.10, scoreBase: 1200,
    size: 3.0, power: 3.0, stamina: 3.0, skill: 3.0,
    resistanceStrength: 3.0, escapeSpeed: 2.5,
    rageInterval: [1200, 3000], rageDuration: [2500, 5000],
    seasonBonus:  { spring: 1.0, summer: 0.8, autumn: 1.5, winter: 1.2 },
    timeBonus:    { morning: 0.5, noon: 0.3, evening: 1.0, night: 2.0 },
    weatherBonus: { sunny: 0.8, rainy: 1.5, snowy: 0.5 },
  },
]

/** レア度ごとの基本出現重み */
const RARITY_WEIGHT = {
  common:    50,
  uncommon:  30,
  rare:      15,
  legendary:  5,
}

/** レア度ごとのちょん回数ボーナス（common:2回〜legendary:5回） */
export const RARITY_CHON_BONUS = {
  common:    0,
  uncommon:  1,
  rare:      2,
  legendary: 3,
}

/** 後方互換エイリアス */
export const SAMPLE_FISH = FISH_LIST

/**
 * 魚1匹の出現重みを計算する。
 * 重み = rarityWeight × seasonBonus × timeBonus × weatherBonus
 * @param {typeof FISH_LIST[0]} fish
 * @param {{ season: string, timeOfDay: string, weather: string }} env
 * @returns {number}
 */
export function calcFishWeight(fish, env) {
  const base    = RARITY_WEIGHT[fish.rarity]           ?? 10
  const season  = fish.seasonBonus?.[env.season]       ?? 1.0
  const time    = fish.timeBonus?.[env.timeOfDay]      ?? 1.0
  const weather = fish.weatherBonus?.[env.weather]     ?? 1.0
  return base * season * time * weather
}

/**
 * 環境パラメータに基づいて出現魚を重み付き抽選で選択する。
 * habitat フィルタ → rarity重み × 環境ボーナス で抽選。
 * @param {{ point: string, season: string, weather: string, timeOfDay: string }} env
 * @returns {typeof FISH_LIST[0]}
 */
export function selectFish(env) {
  const candidates = FISH_LIST.filter(f => f.habitat.includes(env.point))

  if (candidates.length === 0) {
    console.warn(`[selectFish] habitat:'${env.point}' に対応する魚がいません。FISH_LIST[0] を使用します。`)
    return FISH_LIST[0]
  }

  const weights = candidates.map(f => calcFishWeight(f, env))
  const total   = weights.reduce((s, w) => s + w, 0)

  let rand = Math.random() * total
  for (let i = 0; i < candidates.length; i++) {
    rand -= weights[i]
    if (rand <= 0) return candidates[i]
  }
  return candidates[candidates.length - 1]
}
