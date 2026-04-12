export const BATTLE_TICK_MS = 350

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
  if (state.isRaging) {
    state.escape = Math.min(100, state.escape + 2.5 + Math.random() * 3)
    state.reel = Math.max(0, state.reel - 0.5)
  } else {
    state.escape = Math.max(0, state.escape - 0.4)
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
  state.rageEndAt = nowMs + randRange(fish.rageDuration[0], fish.rageDuration[1])
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
    state.escape = Math.min(100, state.escape + 20)
  } else {
    state.reel = Math.min(100, state.reel + 9)
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
