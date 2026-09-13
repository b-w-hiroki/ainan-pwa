/**
 * Vertical Slice hook rule:
 *
 * Once the player has successfully created a bite and the HIT window is open,
 * the input result must be deterministic. A tap inside the active window hooks
 * the fish; failing to tap before the timer expires misses it.
 *
 * Species difficulty already exists in buildBiteConfig().hitWindowMs and in
 * the following Battle, so a second hidden RNG roll here only makes correct
 * input feel unreliable.
 */
export function installVerticalSliceHookInput(GameScene) {
  if (GameScene.prototype.__ainanVerticalSliceHookInputInstalled) return
  GameScene.prototype.__ainanVerticalSliceHookInputInstalled = true

  const originalOnDown = GameScene.prototype._onDown
  GameScene.prototype._onDown = function (pointer) {
    if (this.phase === 'wait' && this.waitTapActive) {
      this._killWaitTimers?.()
      this._enterBattle?.()
      return
    }
    return originalOnDown.call(this, pointer)
  }
}
