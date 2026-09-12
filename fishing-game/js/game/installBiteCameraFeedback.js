export function installBiteCameraFeedback(GameScene) {
  if (GameScene.prototype.__ainanBiteCameraFeedbackInstalled) return
  GameScene.prototype.__ainanBiteCameraFeedbackInstalled = true

  const originalBeginRetrieveBite = GameScene.prototype._beginRetrieveBite
  GameScene.prototype._beginRetrieveBite = function (runtime) {
    const result = originalBeginRetrieveBite.call(this, runtime)
    this.fishingCamera?.focusBite(
      this.bobber?.x ?? 0,
      this.bobber?.y ?? 0,
      runtime?.gfx?.x,
      runtime?.gfx?.y,
    )
    return result
  }

  const originalStartGoon = GameScene.prototype._startGoon
  GameScene.prototype._startGoon = function (...args) {
    this.cameras.main.shake(110, 0.0035)
    return originalStartGoon.apply(this, args)
  }

  const originalOpenHitWindow = GameScene.prototype._openHitWindow
  GameScene.prototype._openHitWindow = function (...args) {
    const result = originalOpenHitWindow.apply(this, args)
    this._hitRingGfx?.setScrollFactor?.(0)
    this.hitHint?.setScrollFactor?.(0)
    this.castHintBg?.setScrollFactor?.(0)
    this.hintText?.setScrollFactor?.(0)
    return result
  }
}
