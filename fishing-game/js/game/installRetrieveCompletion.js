import Phaser from 'phaser'
import { FISHING_WORLD } from '../scenes/components/FishingCameraController.js'

export function installRetrieveCompletion(GameScene) {
  if (GameScene.prototype.__ainanRetrieveCompletionInstalled) return
  GameScene.prototype.__ainanRetrieveCompletionInstalled = true

  GameScene.prototype._completeRetrieveToPlayer = function () {
    if (this.phase !== 'retrieve' || this._retrieveReturning) return
    this._retrieveReturning = true
    this._stopSlowRetrieve?.()
    this._retrieveTween?.stop()
    this._retrieveTween?.destroy()
    this._retrieveTween = null
    this._interestTimer?.remove(false)
    this._interestTimer = undefined
    this.retrieveUI?.hide()
    this.playerActionInset?.setVisible(false)
    this.retrieveCoach?.hide()

    this.resultUI?.toast('仕掛けを回収')
    this.fishingCamera?.focusPlayer(false)

    const startX = this.bobber.x
    const startY = this.bobber.y
    const targetX = this.anchorX
    const targetY = this.anchorY
    const distance = Phaser.Math.Distance.Between(startX, startY, targetX, targetY)
    const duration = Phaser.Math.Clamp(distance * 2.2, 160, 380)

    this.tweens.add({
      targets: this.bobber,
      x: targetX,
      y: targetY,
      duration,
      ease: 'Sine.easeIn',
      onUpdate: () => {
        this.lineGfx.clear()
        this.lineGfx.lineStyle(2, 0xffffff, 0.75)
        this.lineGfx.lineBetween(this.anchorX, this.anchorY, this.bobber.x, this.bobber.y)
      },
      onComplete: () => {
        this.bobber.setVisible(false)
        this.lineGfx.clear()
        this._distanceBadge?.setVisible(false)
        this._retrieveReturning = false
        if (this.phase === 'retrieve') this._enterCast()
      },
    })
  }

  const originalUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (time, delta) {
    originalUpdate?.call(this, time, delta)
    if (this.phase !== 'retrieve' || this._retrieveReturning || !this.bobber?.visible) return
    const distancePx = Phaser.Math.Distance.Between(this.anchorX, this.anchorY, this.bobber.x, this.bobber.y)
    if (distancePx <= FISHING_WORLD.pxPerMeter * 0.9) this._completeRetrieveToPlayer()
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    this._retrieveReturning = false
    return originalEnterCast.apply(this, args)
  }
}
