export function installMinimalFishingHud(GameScene) {
  if (GameScene.prototype.__ainanMinimalFishingHudInstalled) return
  GameScene.prototype.__ainanMinimalFishingHudInstalled = true

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)

    // SCORE / TIME はホーム・リザルト側で十分。釣り中は水面を広く見せる。
    this.scoreBar?.setVisible(false)
    this._timeChipEvent?.remove(false)
    this._timeChipEvent = undefined

    // 魚影そのものを読むゲームになったため、旧「魚群チャンス」札は常時表示しない。
    if (this.schoolFx) {
      this.tweens.killTweensOf(this.schoolFx)
      this.schoolFx.setVisible(false)
    }

    return result
  }
}
