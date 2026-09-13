export function installRetrieveLandingBeat(GameScene) {
  if (GameScene.prototype.__ainanRetrieveLandingBeatInstalled) return
  GameScene.prototype.__ainanRetrieveLandingBeatInstalled = true

  const originalEnterRetrieve = GameScene.prototype._enterRetrieve
  GameScene.prototype._enterRetrieve = function (x, y) {
    const result = originalEnterRetrieve.call(this, x, y)
    this._retrieveReadyAt = this.time.now + 240

    if (this.retrieveUI?.container) {
      this.retrieveUI.container.setAlpha(0.18)
      this.tweens.add({
        targets: this.retrieveUI.container,
        alpha: 1,
        duration: 220,
        ease: 'Sine.easeOut',
      })
    }

    this._landingBeatText?.destroy()
    this._landingBeatText = this.add.text(x, y - 28, '着水', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#173248',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(47)

    this.tweens.add({
      targets: this._landingBeatText,
      y: y - 42,
      alpha: 0,
      duration: 460,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this._landingBeatText?.destroy()
        this._landingBeatText = null
      },
    })

    this.time.delayedCall(250, () => {
      if (this.phase !== 'retrieve') return
      if (this._retrieveTutorialDone) this.retrieveUI?.setHint('魚影を見て、少しずつ巻こう')
    })
    return result
  }

  const originalTwitch = GameScene.prototype._twitchRetrieve
  GameScene.prototype._twitchRetrieve = function (...args) {
    if (this.phase === 'retrieve' && this.time.now < (this._retrieveReadyAt ?? 0)) return
    return originalTwitch.apply(this, args)
  }

  const originalSlow = GameScene.prototype._startSlowRetrieve
  GameScene.prototype._startSlowRetrieve = function (...args) {
    if (this.phase === 'retrieve' && this.time.now < (this._retrieveReadyAt ?? 0)) return
    return originalSlow.apply(this, args)
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    this._retrieveReadyAt = 0
    this._landingBeatText?.destroy()
    this._landingBeatText = null
    return originalEnterCast.apply(this, args)
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    this._landingBeatText?.destroy()
    this._landingBeatText = null
    return originalCleanup.apply(this, args)
  }
}
