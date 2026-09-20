export const FISH_LIST = [
  {
    id: 'aji', name: 'アジ', emoji: '🐟',
    rarity: 'common',
    habitat: ['pointA', 'pointB'],
    castZones: ['near', 'mid'],
    biteRate: 0.70, scoreBase: 80,
    size: 1.0, power: 1.0, stamina: 1.0, skill: 1.0,
    resistanceStrength: 0.8, escapeSpeed: 1.0,
    rageInterval: [3000, 6000], rageDuration: [1500, 3000],
    seasonBonus:  { spring: 1.2, summer: 1.5, autumn: 1.0, winter: 0.6 },
    timeBonus:    { morning: 1.5, noon: 0.8, evening: 1.3, night: 0.7 },
    weatherBonus: { sunny: 1.2, rainy: 0.8, snowy: 0.4, cloudy: 1.0 },
    retrieve: { prefer: 'mixed', idealAppeal: [0.30, 0.66], followSpeed: 58, caution: 0.15, biteThreshold: 72 },
    feel: { hitPrompt: 'コツン！ タップ', hitShake: 0.0035, battleWaveX: 7, battleWaveY: 4, battleSpeed: 4.2, battleScale: 0.96 },
  },
  {
    id: 'tai', name: 'マダイ', emoji: '🐠',
    rarity: 'uncommon',
    habitat: ['pointA', 'pointC'],
    castZones: ['mid', 'far'],
    biteRate: 0.40, scoreBase: 250,
    size: 1.5, power: 1.3, stamina: 1.3, skill: 1.5,
    resistanceStrength: 1.3, escapeSpeed: 1.3,
    rageInterval: [2500, 5000], rageDuration: [2000, 3500],
    seasonBonus:  { spring: 1.5, summer: 1.0, autumn: 1.3, winter: 0.8 },
    timeBonus:    { morning: 1.2, noon: 1.0, evening: 1.5, night: 0.8 },
    weatherBonus: { sunny: 1.0, rainy: 1.2, snowy: 0.5, cloudy: 1.1 },
    retrieve: { prefer: 'stop', idealAppeal: [0.20, 0.50], followSpeed: 48, caution: 0.35, biteThreshold: 82 },
    feel: { hitPrompt: 'グッ！ タップ', hitShake: 0.0045, battleWaveX: 9, battleWaveY: 5, battleSpeed: 2.4, battleScale: 1.02 },
  },
  {
    id: 'bass', name: 'ブラックバス', emoji: '🐟',
    rarity: 'rare',
    habitat: ['pointB'],
    castZones: ['mid', 'far'],
    biteRate: 0.35, scoreBase: 400,
    size: 1.8, power: 2.0, stamina: 1.8, skill: 2.0,
    resistanceStrength: 2.0, escapeSpeed: 1.8,
    rageInterval: [2000, 5000], rageDuration: [2000, 4000],
    seasonBonus:  { spring: 1.0, summer: 1.8, autumn: 1.2, winter: 0.4 },
    timeBonus:    { morning: 0.8, noon: 1.5, evening: 1.8, night: 0.6 },
    weatherBonus: { sunny: 1.5, rainy: 0.8, snowy: 0.2, cloudy: 1.0 },
    retrieve: { prefer: 'twitch', idealAppeal: [0.55, 0.85], followSpeed: 70, caution: 0.30, biteThreshold: 80 },
    feel: { hitPrompt: 'ガツン！ タップ', hitShake: 0.0060, battleWaveX: 16, battleWaveY: 8, battleSpeed: 5.4, battleScale: 1.08 },
  },
  {
    id: 'buri', name: 'ブリ', emoji: '🐟',
    rarity: 'uncommon',
    habitat: ['pointA', 'pointC'],
    castZones: ['far'],
    biteRate: 0.30, scoreBase: 350,
    size: 1.6, power: 1.4, stamina: 1.5, skill: 1.3,
    resistanceStrength: 1.4, escapeSpeed: 1.5,
    rageInterval: [1800, 4000], rageDuration: [1800, 3500],
    seasonBonus:  { spring: 0.8, summer: 0.6, autumn: 1.5, winter: 1.8 },
    timeBonus:    { morning: 1.3, noon: 0.7, evening: 1.0, night: 1.5 },
    weatherBonus: { sunny: 0.8, rainy: 1.3, snowy: 1.0, cloudy: 1.0 },
    retrieve: { prefer: 'slow', idealAppeal: [0.48, 0.78], followSpeed: 76, caution: 0.25, biteThreshold: 85 },
    feel: { hitPrompt: '走る！ タップ', hitShake: 0.0070, battleWaveX: 20, battleWaveY: 7, battleSpeed: 4.5, battleScale: 1.10 },
  },
  {
    id: 'saba', name: 'サバ', emoji: '🐟',
    rarity: 'common',
    habitat: ['pointA', 'pointC'],
    castZones: ['near', 'mid'],
    biteRate: 0.62, scoreBase: 120,
    size: 1.1, power: 1.2, stamina: 1.0, skill: 1.2,
    resistanceStrength: 1.0, escapeSpeed: 1.2,
    rageInterval: [2600, 5200], rageDuration: [1400, 2600],
    seasonBonus:  { spring: 1.1, summer: 1.4, autumn: 1.4, winter: 0.8 },
    timeBonus:    { morning: 1.4, noon: 0.9, evening: 1.2, night: 0.8 },
    weatherBonus: { sunny: 1.0, rainy: 1.1, snowy: 0.5, cloudy: 1.2 },
    retrieve: { prefer: 'mixed', idealAppeal: [0.40, 0.72], followSpeed: 68, caution: 0.18, biteThreshold: 76 },
    feel: { hitPrompt: 'ブルッ！ タップ', hitShake: 0.0040, battleWaveX: 12, battleWaveY: 5, battleSpeed: 5.0, battleScale: 1.0 },
  },
  {
    id: 'isaki', name: 'イサキ', emoji: '🐠',
    rarity: 'uncommon',
    habitat: ['pointB', 'pointC'],
    castZones: ['mid', 'far'],
    biteRate: 0.42, scoreBase: 280,
    size: 1.35, power: 1.35, stamina: 1.3, skill: 1.4,
    resistanceStrength: 1.35, escapeSpeed: 1.25,
    rageInterval: [2400, 4800], rageDuration: [1800, 3200],
    seasonBonus:  { spring: 1.1, summer: 1.6, autumn: 1.2, winter: 0.7 },
    timeBonus:    { morning: 1.3, noon: 1.0, evening: 1.4, night: 0.7 },
    weatherBonus: { sunny: 1.1, rainy: 0.9, snowy: 0.5, cloudy: 1.2 },
    retrieve: { prefer: 'slow', idealAppeal: [0.36, 0.65], followSpeed: 55, caution: 0.32, biteThreshold: 82 },
    feel: { hitPrompt: 'ココン！ タップ', hitShake: 0.0045, battleWaveX: 10, battleWaveY: 6, battleSpeed: 3.0, battleScale: 1.03 },
  },
  {
    id: 'hirame', name: 'ヒラメ', emoji: '🐟',
    rarity: 'rare',
    habitat: ['pointB'],
    castZones: ['mid', 'far'],
    biteRate: 0.28, scoreBase: 520,
    size: 2.0, power: 1.8, stamina: 1.8, skill: 2.1,
    resistanceStrength: 1.9, escapeSpeed: 1.45,
    rageInterval: [2300, 4700], rageDuration: [2200, 3900],
    seasonBonus:  { spring: 1.1, summer: 0.8, autumn: 1.4, winter: 1.5 },
    timeBonus:    { morning: 1.1, noon: 0.8, evening: 1.4, night: 1.2 },
    weatherBonus: { sunny: 0.9, rainy: 1.2, snowy: 0.8, cloudy: 1.3 },
    retrieve: { prefer: 'stop', idealAppeal: [0.25, 0.52], followSpeed: 44, caution: 0.48, biteThreshold: 88 },
    feel: { hitPrompt: 'ズン…！ タップ', hitShake: 0.0060, battleWaveX: 8, battleWaveY: 10, battleSpeed: 2.0, battleScale: 1.12 },
  },
  {
    id: 'kanpachi', name: 'カンパチ', emoji: '🐟',
    rarity: 'rare',
    habitat: ['pointA', 'pointC'],
    castZones: ['far'],
    biteRate: 0.24, scoreBase: 650,
    size: 2.2, power: 2.3, stamina: 2.1, skill: 2.2,
    resistanceStrength: 2.2, escapeSpeed: 2.0,
    rageInterval: [1600, 3600], rageDuration: [1900, 3600],
    seasonBonus:  { spring: 0.9, summer: 1.3, autumn: 1.7, winter: 0.8 },
    timeBonus:    { morning: 1.4, noon: 0.9, evening: 1.2, night: 1.1 },
    weatherBonus: { sunny: 1.0, rainy: 1.2, snowy: 0.4, cloudy: 1.1 },
    retrieve: { prefer: 'slow', idealAppeal: [0.52, 0.82], followSpeed: 82, caution: 0.28, biteThreshold: 88 },
    feel: { hitPrompt: 'ドンッ！ タップ', hitShake: 0.0080, battleWaveX: 23, battleWaveY: 8, battleSpeed: 4.8, battleScale: 1.14 },
  },
  {
    id: 'kue', name: 'クエ', emoji: '🐡',
    rarity: 'legendary',
    habitat: ['pointC'],
    castZones: ['far'],
    biteRate: 0.10, scoreBase: 1200,
    size: 3.0, power: 3.0, stamina: 3.0, skill: 3.0,
    resistanceStrength: 3.0, escapeSpeed: 2.5,
    rageInterval: [1200, 3000], rageDuration: [2500, 5000],
    seasonBonus:  { spring: 1.0, summer: 0.8, autumn: 1.5, winter: 1.2 },
    timeBonus:    { morning: 0.5, noon: 0.3, evening: 1.0, night: 2.0 },
    weatherBonus: { sunny: 0.8, rainy: 1.5, snowy: 0.5, cloudy: 1.1 },
    retrieve: { prefer: 'stop', idealAppeal: [0.20, 0.45], followSpeed: 42, caution: 0.55, biteThreshold: 92 },
    feel: { hitPrompt: '大物！ タップ', hitShake: 0.0100, battleWaveX: 26, battleWaveY: 10, battleSpeed: 1.9, battleScale: 1.18 },
  },
]

const RARITY_WEIGHT = {
  common: 50,
  uncommon: 30,
  rare: 15,
  legendary: 5,
}

export const BAIT_FISH_EFFECT = {
  worm: {
    label: '標準',
    detail: 'いろいろな魚をバランスよく狙える',
    rarityMod: { common: 1, uncommon: 1, rare: 1, legendary: 0 },
  },
  shrimp: {
    label: 'レア魚UP',
    detail: 'レア魚・マダイを狙いやすくする',
    rarityMod: { common: 0.82, uncommon: 1.22, rare: 1.60, legendary: 0 },
  },
  special: {
    label: '大物・クエ狙い',
    detail: '大物の気配を強め、黒潮崎ではクエも狙える',
    rarityMod: { common: 0.68, uncommon: 1.30, rare: 1.85, legendary: 2.80 },
  },
}

export const RARITY_CHON_BONUS = {
  common: 0,
  uncommon: 1,
  rare: 2,
  legendary: 3,
}

export const SAMPLE_FISH = FISH_LIST

export function calcFishWeight(fish, env) {
  const base = RARITY_WEIGHT[fish.rarity] ?? 10
  const season = fish.seasonBonus?.[env.season] ?? 1.0
  const time = fish.timeBonus?.[env.timeOfDay] ?? 1.0
  const weather = fish.weatherBonus?.[env.weather] ?? 1.0
  const baitType = env.player?.baitType ?? 'worm'
  const bait = BAIT_FISH_EFFECT[baitType] ?? BAIT_FISH_EFFECT.worm
  const baitMod = bait.rarityMod?.[fish.rarity] ?? 1.0
  return base * season * time * weather * baitMod
}

export function selectFish(env) {
  const baitType = env.player?.baitType ?? 'worm'
  const candidates = FISH_LIST.filter(fish => {
    if (!fish.habitat.includes(env.point)) return false
    if (fish.id === 'kue' && baitType !== 'special') return false
    return true
  })
  if (candidates.length === 0) return FISH_LIST[0]

  const weights = candidates.map(f => calcFishWeight(f, env))
  const total = weights.reduce((s, w) => s + w, 0)
  let rand = Math.random() * total
  for (let i = 0; i < candidates.length; i++) {
    rand -= weights[i]
    if (rand <= 0) return candidates[i]
  }
  return candidates[candidates.length - 1]
}
