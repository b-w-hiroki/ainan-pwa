/**
 * 魚パラメータ一覧
 * escapeSpeed: 暴れ中の逃走ゲージ上昇倍率（基準 1.0）
 * resistanceStrength: 引き抵抗（大きいほど逃走ゲージが上がりやすい）
 *
 * Phase2 拡張フィールド（現在は仮値 / 将来的に重み付け抽選に使用）
 * habitat:     出現する釣りポイント ID 配列
 * seasonBonus: 季節ごとの出現率ボーナス倍率
 * timeBonus:   時間帯ごとの出現率ボーナス倍率
 * weatherBonus:天候ごとの出現率ボーナス倍率
 */
export const FISH_LIST = [
  {
    id: 'aji',
    name: 'アジ',
    emoji: '🐟',
    rarity: 'common',
    biteRate: 0.70,
    resistanceStrength: 0.6,
    escapeSpeed: 0.7,
    rageInterval: [3000, 6000],
    rageDuration: [800, 1400],     // 将来: 魚種ごとの暴れ時間(ms)管理予定（現在は battle.js の定数で上書き）
    scoreBase: 80,
    // ── Phase2 拡張フィールド ──
    habitat:      ['pointA', 'pointB'],
    seasonBonus:  { spring: 1.0, summer: 1.2, autumn: 1.0, winter: 0.8 },
    timeBonus:    { morning: 1.2, noon: 1.0, evening: 1.1, night: 0.9 },
    weatherBonus: { sunny: 1.0, rainy: 1.1, snowy: 0.8 },
  },
  {
    id: 'tai',
    name: 'マダイ',
    emoji: '🐠',
    rarity: 'uncommon',
    biteRate: 0.40,
    resistanceStrength: 1.0,
    escapeSpeed: 1.0,
    rageInterval: [2500, 5000],
    rageDuration: [1000, 1800],    // 将来: 魚種ごとの暴れ時間(ms)管理予定（現在は battle.js の定数で上書き）
    scoreBase: 250,
    // ── Phase2 拡張フィールド ──
    habitat:      ['pointA', 'pointC'],
    seasonBonus:  { spring: 1.3, summer: 1.0, autumn: 1.1, winter: 0.9 },
    timeBonus:    { morning: 1.0, noon: 1.2, evening: 1.0, night: 0.8 },
    weatherBonus: { sunny: 1.2, rainy: 0.9, snowy: 0.7 },
  },
  {
    id: 'bass',
    name: 'ブラックバス',
    emoji: '🐟',
    rarity: 'rare',
    biteRate: 0.35,
    resistanceStrength: 1.1,
    escapeSpeed: 1.2,
    rageInterval: [2000, 5000],
    rageDuration: [1200, 2200],    // 将来: 魚種ごとの暴れ時間(ms)管理予定（現在は battle.js の定数で上書き）
    scoreBase: 400,
    // ── Phase2 拡張フィールド ──
    habitat:      ['pointB'],
    seasonBonus:  { spring: 1.0, summer: 1.5, autumn: 0.9, winter: 0.6 },
    timeBonus:    { morning: 0.8, noon: 1.0, evening: 1.3, night: 1.2 },
    weatherBonus: { sunny: 1.1, rainy: 1.3, snowy: 0.5 },
  },
  {
    id: 'buri',
    name: 'ブリ',
    emoji: '🐡',
    rarity: 'uncommon',
    biteRate: 0.30,
    resistanceStrength: 1.3,
    escapeSpeed: 1.1,
    rageInterval: [1800, 4000],
    rageDuration: [1400, 2400],    // 将来: 魚種ごとの暴れ時間(ms)管理予定（現在は battle.js の定数で上書き）
    scoreBase: 350,
    // ── Phase2 拡張フィールド ──
    habitat:      ['pointA', 'pointC'],
    seasonBonus:  { spring: 0.9, summer: 0.8, autumn: 1.4, winter: 1.2 },
    timeBonus:    { morning: 1.1, noon: 0.9, evening: 1.0, night: 1.2 },
    weatherBonus: { sunny: 1.0, rainy: 1.2, snowy: 1.1 },
  },
  {
    id: 'kue',
    name: 'クエ',
    emoji: '🐳',
    rarity: 'legendary',
    biteRate: 0.10,
    resistanceStrength: 1.8,
    escapeSpeed: 1.5,
    rageInterval: [1200, 3000],
    rageDuration: [1800, 3200],    // 将来: 魚種ごとの暴れ時間(ms)管理予定（現在は battle.js の定数で上書き）
    scoreBase: 1200,
    // ── Phase2 拡張フィールド ──
    habitat:      ['pointC'],
    seasonBonus:  { spring: 1.0, summer: 1.0, autumn: 1.2, winter: 1.0 },
    timeBonus:    { morning: 0.7, noon: 0.8, evening: 1.0, night: 1.5 },
    weatherBonus: { sunny: 0.9, rainy: 1.0, snowy: 1.1 },
  },
]

/** 後方互換エイリアス（既存コードが SAMPLE_FISH を参照している場合向け） */
export const SAMPLE_FISH = FISH_LIST

/**
 * 環境パラメータに基づいて出現魚を選択する。
 * Phase2 では seasonBonus / timeBonus / weatherBonus で重み付け抽選に拡張予定。
 * 現時点は habitat フィルタのみ適用してランダム選択。
 *
 * @param {{ point: string, season: string, weather: string, timeOfDay: string }} env
 * @returns {typeof FISH_LIST[0]}
 */
export function selectFish(env) {
  const candidates = FISH_LIST.filter(f => f.habitat.includes(env.point))

  if (candidates.length === 0) {
    console.warn(`[selectFish] habitat:'${env.point}' に対応する魚がいません。FISH_LIST[0] を使用します。`)
    return FISH_LIST[0]
  }

  // Phase2: ここに seasonBonus × timeBonus × weatherBonus の重み付け抽選を追加予定
  return candidates[Math.floor(Math.random() * candidates.length)]
}
