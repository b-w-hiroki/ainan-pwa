export const FISH_META = {
  aji:  { name: 'アジ', rarity: 'common',     habitat: '港・入り江', score: 80 },
  tai:  { name: 'マダイ', rarity: 'uncommon', habitat: '港・沖磯',   score: 250 },
  bass: { name: 'ブラックバス', rarity: 'rare', habitat: '入り江',    score: 400 },
  buri: { name: 'ブリ', rarity: 'uncommon',  habitat: '港・沖磯',   score: 350 },
  kue:  { name: 'クエ', rarity: 'legendary', habitat: '沖磯',       score: 1200 },
}

export const ROD_META = {
  basic:   { name: '初心者竿',   desc: '扱いやすい標準の竿',       cost: 0 },
  carbon:  { name: 'カーボン竿', desc: '飛距離と引きが安定する竿', cost: 0 },
  premium: { name: '高級竿',     desc: '大物狙いの上位モデル',     cost: 800 },
}

export const BAIT_META = {
  worm:    { name: 'ミミズ',     desc: '食いつき重視の基本エサ',   cost: 60,  amount: 5 },
  shrimp:  { name: 'エビ',       desc: 'レア魚を少し狙いやすい',   cost: 180, amount: 5 },
  special: { name: '特製まき餌', desc: '遠くの魚を引き寄せる',     cost: 360, amount: 3 },
}

export const REWARD_META = [
  { id: 'sticker', name: '港町ステッカー', desc: 'コレクション用の記念品', cost: 250 },
  { id: 'ticket',  name: '応援チケット',   desc: '町おこしポイントの引換券', cost: 500 },
  { id: 'icebox',  name: '保冷ボックス',   desc: '釣果を持ち帰るための道具', cost: 700 },
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

export function getCatches() {
  return readJson('ainan_catches', [])
}

export function getInventory() {
  return {
    rods:  { basic: 1, carbon: 1, premium: 0 },
    baits: { worm: 12, shrimp: 5, special: 2 },
    ...readJson('ainan_inventory', {}),
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
