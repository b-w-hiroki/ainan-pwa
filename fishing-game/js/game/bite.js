import { RARITY_CHON_BONUS } from './fish.js'
import { BAIT_STATS, ROD_STATS } from './params.js'

// ── ベース定数 ──────────────────────────────────────────────────
const BASE = {
  CHON_COUNT:       2,     // 基本ちょん回数
  CHON_DEPTH_PX:    8,     // ちょん①の沈み量(px)
  CHON_DEPTH_GROW:  1.4,   // ちょんが増えるごとの沈み量倍率
  CHON_DURATION_MS: 200,   // ちょんアニメ時間(ms)
  WAIT_MIN_MS:      700,   // 前兆待機時間の最小値(ms)
  WAIT_MAX_MS:      1200,  // 前兆待機時間の最大値(ms)
  GOON_DEPTH_PX:    30,    // ぐんっ！の沈み量(px)
  GOON_DURATION_MS: 150,   // ぐんっ！アニメ時間(ms)
  HIT_WINDOW_MS:    1200,  // ヒット受付時間(ms)
}

/**
 * 魚パラメータから食いつきシーケンス設定を生成する。
 * 実際の値 = BASE値 × 魚パラメータ補正 × ランダム幅
 * @param {object} fish - fish.js の魚オブジェクト
 * @returns {object} biteConfig
 */
export function buildBiteConfig(fish) {
  const rarityBonus = RARITY_CHON_BONUS[fish.rarity] ?? 0

  return {
    // ちょんの回数: common=2, uncommon=3, rare=4, legendary=5
    chonCount: BASE.CHON_COUNT + rarityBonus,

    // サイズが大きいほど深く沈む
    chonDepthPx: BASE.CHON_DEPTH_PX * fish.size,

    // ちょんが増えるごとの沈み量倍率（固定）
    chonDepthGrow: BASE.CHON_DEPTH_GROW,

    // powerが高いほどアニメが速い（短い）
    chonDurationMs: Math.round(BASE.CHON_DURATION_MS / fish.power),

    // skillが高いほどランダム幅が広がり不規則になる
    waitMinMs: Math.round(BASE.WAIT_MIN_MS / fish.skill),
    waitMaxMs: Math.round(BASE.WAIT_MAX_MS * fish.skill),

    // size × power で決まる（大きく速い魚ほど深く引き込む）
    goonDepthPx: Math.round(BASE.GOON_DEPTH_PX * fish.size * fish.power),

    // powerが高いほど速い
    goonDurationMs: Math.round(BASE.GOON_DURATION_MS / fish.power),

    // staminaが高いほど短い（難しい）
    hitWindowMs: Math.round(BASE.HIT_WINDOW_MS / fish.stamina),
  }
}

/**
 * biteConfig から前兆待機時間をランダムに生成する。
 * @param {ReturnType<typeof buildBiteConfig>} biteConfig
 * @returns {number} 待機時間(ms)
 */
export function randomWaitMs(biteConfig) {
  return Phaser.Math.Between(biteConfig.waitMinMs, biteConfig.waitMaxMs)
}

// ── 誘引範囲 ─────────────────────────────────────────────────────
const BASE_ATTRACT_RADIUS = 120

/**
 * 餌・竿・スキルレベルから誘引範囲の半径(px)を計算する。
 * @param {{ baitType: string, rodType: string, skillLevel?: number }} player
 * @returns {number}
 */
export function calcAttractRadius(player) {
  const bait     = BAIT_STATS[player.baitType]  ?? BAIT_STATS.worm
  const rod      = ROD_STATS[player.rodType]    ?? ROD_STATS.basic
  const skillMod = 1 + ((player.skillLevel ?? 1) - 1) * 0.1

  return Math.round(BASE_ATTRACT_RADIUS * bait.attractRadius * rod.attractRadius * skillMod)
}

/**
 * 魚影が誘引範囲内にいるか判定する。
 * @param {Phaser.GameObjects.GameObject} fishGfx
 * @param {Phaser.GameObjects.GameObject} bobber
 * @param {number} radius
 * @returns {boolean}
 */
export function isInAttractRange(fishGfx, bobber, radius) {
  const dist = Phaser.Math.Distance.Between(fishGfx.x, fishGfx.y, bobber.x, bobber.y)
  return dist <= radius
}
