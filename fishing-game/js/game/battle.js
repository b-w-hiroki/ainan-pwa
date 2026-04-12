// ── バトルバランス定数 ──────────────────────────────────────────
export const BATTLE_TICK_MS     = 200   // ms tick間隔（350→200 レスポンス向上）
const SWIPE_REEL_AMOUNT         = 5     // おとなしい時のスワイプ巻き上げ量（9→5 バトル長く）
const SWIPE_PENALTY             = 20    // 暴れ中スワイプの逃走ゲージ加算
const ESCAPE_DECAY              = 0.5   // おとなしい時の逃走ゲージ自然減衰（2.5pt/秒、追い詰められ感を緩和）
const RAGE_DURATION_MIN         = 2000  // 暴れ最小時間 ms（1400→2000）
const RAGE_DURATION_MAX         = 4000  // 暴れ最大時間 ms（2800→4000）
// ───────────────────────────────────────────────────────────────

function randRange(a, b) {
  return a + Math.random() * (b - a)
}

/**
 * @param {typeof import('./fish.js').SAMPLE_FISH[0]} fish
 * @param {{ pullPower?: number }} rod
 */
export function createBattleState(fish, rod) {
  const pull = rod.pullPower ?? 1
  return {
    escape: Math.min(92, 28 * (fish.resistanceStrength / pull)),
    reel: 48,
    isRaging: false,
    /** @type {number} */
    rageEndAt: 0,
    /** @type {number} */
    nextRageAt: 0,
  }
}

/**
 * @param {ReturnType<typeof createBattleState>} state
 * @param {typeof import('./fish.js').SAMPLE_FISH[0]} fish
 * @param {number} nowMs
 */
export function armFirstRage(state, fish, nowMs) {
  state.nextRageAt = nowMs + randRange(fish.rageInterval[0], fish.rageInterval[1])
}

/**
 * @param {ReturnType<typeof createBattleState>} state
 * @param {typeof import('./fish.js').SAMPLE_FISH[0]} fish
 */
export function tickBattle(state, fish) {
  const speed = fish.escapeSpeed ?? 1
  if (state.isRaging) {
    // 魚種ごとの escapeSpeed × resistanceStrength で個性を反映
    const rise = speed * fish.resistanceStrength * (1.5 + Math.random() * 2)
    state.escape = Math.min(100, state.escape + rise)
    state.reel = Math.max(0, state.reel - 0.5)
  } else {
    state.escape = Math.max(0, state.escape - ESCAPE_DECAY)
  }
}

/**
 * 暴れ開始（タイマーはシーン側の時刻で比較）
 * @param {ReturnType<typeof createBattleState>} state
 * @param {typeof import('./fish.js').SAMPLE_FISH[0]} fish
 * @param {number} nowMs
 * @returns {boolean}
 */
export function tryEnterRage(state, fish, nowMs) {
  if (state.isRaging) return false
  if (nowMs < state.nextRageAt) return false
  state.isRaging = true
  state.rageEndAt = nowMs + randRange(RAGE_DURATION_MIN, RAGE_DURATION_MAX)
  return true
}

/**
 * @param {ReturnType<typeof createBattleState>} state
 * @param {typeof import('./fish.js').SAMPLE_FISH[0]} fish
 * @param {number} nowMs
 * @returns {boolean} 暴れが終了したら true
 */
export function tryExitRage(state, fish, nowMs) {
  if (!state.isRaging) return false
  if (nowMs < state.rageEndAt) return false
  state.isRaging = false
  state.nextRageAt = nowMs + randRange(fish.rageInterval[0], fish.rageInterval[1])
  return true
}

/**
 * @param {ReturnType<typeof createBattleState>} state
 * @param {boolean} isRaging
 */
export function applySwipe(state, isRaging) {
  if (isRaging) {
    state.escape = Math.min(100, state.escape + SWIPE_PENALTY)
  } else {
    state.reel = Math.min(100, state.reel + SWIPE_REEL_AMOUNT)
    state.escape = Math.max(0, state.escape - 1.5)
  }
}

/**
 * @param {ReturnType<typeof createBattleState>} state
 * @returns {'caught' | 'escaped' | null}
 */
export function battleOutcome(state) {
  if (state.escape >= 100) return 'escaped'
  if (state.reel >= 100) return 'caught'
  return null
}

/**
 * @param {number} escape
 * @returns {'none' | 'flash' | 'critical'}
 */
export function dangerBand(escape) {
  if (escape >= 85) return 'critical'
  if (escape >= 65) return 'flash'
  return 'none'
}
