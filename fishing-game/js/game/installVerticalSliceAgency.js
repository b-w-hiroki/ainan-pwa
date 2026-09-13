import { FISH_INTEREST_STATE } from './fishInterest.js'

const MIN_DECISIONS_BEFORE_BITE = 2
const WAIT_AFTER_MOVE_WINDOW_MS = 1800

function recordDecision(scene, type) {
  const state = scene.retrieveState
  if (!state) return
  state.decisionCount = (state.decisionCount ?? 0) + 1
  state.lastDecisionType = type
  state.lastDecisionAt = scene.time.now
}

/**
 * Vertical Slice 1.0 agency gate.
 *
 * Fish may notice/inspect the lure passively, but they cannot transition into
 * the bite sequence until the player has made at least two meaningful retrieve
 * decisions. This keeps the core loop from collapsing back into cast-and-wait.
 */
export function installVerticalSliceAgency(GameScene) {
  if (GameScene.prototype.__ainanVerticalSliceAgencyInstalled) return
  GameScene.prototype.__ainanVerticalSliceAgencyInstalled = true

  const originalEnterRetrieve = GameScene.prototype._enterRetrieve
  GameScene.prototype._enterRetrieve = function (...args) {
    const result = originalEnterRetrieve.apply(this, args)
    if (this.retrieveState) {
      this.retrieveState.decisionCount = 0
      this.retrieveState.lastDecisionType = null
      this.retrieveState.lastDecisionAt = 0
      this.retrieveState.lastMoveDecisionAt = 0
      this.retrieveState.waitCountedForMoveAt = 0
    }
    return result
  }

  const originalTwitch = GameScene.prototype._twitchRetrieve
  GameScene.prototype._twitchRetrieve = function (...args) {
    const beforeUntil = this.retrieveState?.twitchUntil ?? 0
    const beforeAction = this.retrieveState?.action
    const result = originalTwitch.apply(this, args)
    const accepted = this.phase === 'retrieve'
      && this.retrieveState
      && this.retrieveState.action === 'twitch'
      && (this.retrieveState.twitchUntil ?? 0) > beforeUntil
      && beforeAction !== 'twitch'
    if (accepted) {
      recordDecision(this, 'twitch')
      this.retrieveState.lastMoveDecisionAt = this.time.now
    }
    return result
  }

  const originalSlow = GameScene.prototype._startSlowRetrieve
  GameScene.prototype._startSlowRetrieve = function (...args) {
    const wasHeld = Boolean(this.retrieveState?.slowHeld)
    const result = originalSlow.apply(this, args)
    const accepted = this.phase === 'retrieve'
      && this.retrieveState?.slowHeld
      && !wasHeld
    if (accepted) {
      recordDecision(this, 'slowReel')
      this.retrieveState.lastMoveDecisionAt = this.time.now
    }
    return result
  }

  const originalIdle = GameScene.prototype._setRetrieveIdle
  GameScene.prototype._setRetrieveIdle = function (...args) {
    const state = this.retrieveState
    const moveAt = state?.lastMoveDecisionAt ?? 0
    const canCountWait = this.phase === 'retrieve'
      && moveAt > 0
      && this.time.now - moveAt <= WAIT_AFTER_MOVE_WINDOW_MS
      && (state?.waitCountedForMoveAt ?? 0) !== moveAt

    const result = originalIdle.apply(this, args)
    if (canCountWait && this.retrieveState) {
      recordDecision(this, 'wait')
      this.retrieveState.waitCountedForMoveAt = moveAt
    }
    return result
  }

  const originalBeginBite = GameScene.prototype._beginRetrieveBite
  GameScene.prototype._beginRetrieveBite = function (runtime, ...args) {
    const decisions = this.retrieveState?.decisionCount ?? 0
    if (this.phase === 'retrieve' && decisions < MIN_DECISIONS_BEFORE_BITE) {
      // Keep the fish visibly interested, but hold it just below bite-ready so
      // another player decision is required instead of passive time.
      runtime.state = FISH_INTEREST_STATE.INSPECT
      runtime.interest = Math.min(runtime.interest ?? 0, 76)
      this.retrieveUI?.syncFishSense?.(FISH_INTEREST_STATE.INSPECT)
      const remaining = MIN_DECISIONS_BEFORE_BITE - decisions
      this.retrieveUI?.setHint(
        remaining > 1
          ? '魚は気づいている。まずルアーを動かしてみよう'
          : '食いそう…もう一手、巻くか止めて誘おう',
      )
      return
    }
    return originalBeginBite.call(this, runtime, ...args)
  }
}
