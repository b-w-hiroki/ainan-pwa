/** @typedef {'basic' | 'carbon' | 'premium'} RodType */
/** @typedef {'worm' | 'shrimp' | 'special'} BaitType */

/** @type {{ id: RodType; label: string; pullPower: number }} */
export const DEFAULT_ROD = {
  id: 'carbon',
  label: 'カーボン竿',
  pullPower: 1.2,
}

/** @type {{ id: BaitType; label: string; biteRateBonus: number }} */
export const DEFAULT_BAIT = {
  id: 'worm',
  label: 'ミミズ',
  biteRateBonus: 0.15,
}

/** 餌ごとのスタッツ */
export const BAIT_STATS = {
  worm:    { biteRateBonus: 0.15, rareFishBonus: 0.00, attractRadius: 1.0 },
  shrimp:  { biteRateBonus: 0.05, rareFishBonus: 0.10, attractRadius: 1.3 },
  special: { biteRateBonus: 0.10, rareFishBonus: 0.05, attractRadius: 1.8 },
}

/** 竿ごとのスタッツ */
export const ROD_STATS = {
  basic:   { castRange: 1.0, pullPower: 1.0, attractRadius: 1.0 },
  carbon:  { castRange: 1.4, pullPower: 1.2, attractRadius: 1.2 },
  premium: { castRange: 2.0, pullPower: 1.5, attractRadius: 1.5 },
}

/** 竿一覧（UI表示用） */
export const ROD_LIST = [
  { id: 'basic',   icon: '🎣', name: '初心者竿',   description: 'キャスト距離：短' },
  { id: 'carbon',  icon: '🎣', name: 'カーボン竿', description: '距離：中 / 引き力 +20%' },
  { id: 'premium', icon: '🎣', name: '高級竿',     description: '全パラメータ +40%' },
]

/** エサ一覧（UI表示用） */
export const BAIT_LIST = [
  { id: 'worm',    icon: '🪱', name: 'ミミズ',       description: '食いつき率 +15%' },
  { id: 'shrimp',  icon: '🦐', name: 'エビ',         description: 'レア魚出現 +10%' },
  { id: 'special', icon: '✨', name: '特製撒き餌',   description: '誘引範囲 +80%' },
]
