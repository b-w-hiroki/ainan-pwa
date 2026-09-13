function setTextInContainer(container, matcher, text) {
  if (!container?.list) return
  const target = container.list.find(obj => obj?.text && matcher(obj.text))
  target?.setText(text)
}

function battleSplash(scene, x, y, strong = false) {
  if (x == null || y == null) return
  const ring = scene.add.ellipse(x, y, strong ? 28 : 20, strong ? 11 : 8)
    .setStrokeStyle(strong ? 2.5 : 1.8, strong ? 0xffe58a : 0xdff5ff, 0.84)
    .setFillStyle(0xffffff, 0)
    .setDepth(34)
  scene.tweens.add({
    targets: ring,
    scaleX: strong ? 2.8 : 2.2,
    scaleY: strong ? 2.2 : 1.8,
    alpha: 0,
    duration: strong ? 380 : 460,
    ease: 'Sine.easeOut',
    onComplete: () => ring.destroy(),
  })
}

function clearBattleContinuity(scene) {
  scene._battleWorldLine?.clear()
  scene._battleNextSplashAt = 0
  scene._battleIntroLabel?.destroy()
  scene._battleIntroLabel = null
}

/**
 * Keeps Battle visually attached to Retrieve instead of becoming a separate
 * minigame screen. The same fish silhouette, water, rod line and character stay
 * in view; the HUD only explains the two rules that matter:
 * - normal: swipe down to reel
 * - raging: stop and wait
 */
export function installVerticalSliceBattleContinuity(GameScene) {
  if (GameScene.prototype.__ainanVerticalSliceBattleContinuityInstalled) return
  GameScene.prototype.__ainanVerticalSliceBattleContinuityInstalled = true

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    this._battleWorldLine = this.add.graphics().setDepth(35)
    this._battleNextSplashAt = 0
    return result
  }

  const originalEnterBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    const result = originalEnterBattle.apply(this, args)
    clearBattleContinuity(this)

    // Numerical values are secondary; bar movement is quicker to read while
    // watching the fish. Keep the numbers hidden in the Vertical Slice.
    this.ebarNum?.setVisible(false)
    this.reelValText?.setVisible(false)

    setTextInContainer(this.reelCTA, text => text.includes('スワイプ'), '↓ スワイプで巻く')
    this.rageTag?.setText('魚が暴れてる！ 今は待つ')

    ;[this.escapeBar, this.battlePanel, this.reelCTA].forEach(obj => {
      if (!obj?.visible) return
      obj.setAlpha(0)
      this.tweens.add({ targets: obj, alpha: 1, duration: 180, ease: 'Sine.easeOut' })
    })

    const fish = this._targetFishGfx
    if (fish?.active) {
      fish.setDepth(32)
      const label = this.add.text(fish.x, fish.y - 38, 'HIT!', {
        fontFamily: 'M PLUS Rounded 1c, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#173248',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(36)
      this._battleIntroLabel = label
      this.tweens.add({
        targets: label,
        y: label.y - 12,
        alpha: 0,
        duration: 520,
        ease: 'Quad.easeOut',
        onComplete: () => {
          label.destroy()
          if (this._battleIntroLabel === label) this._battleIntroLabel = null
        },
      })
      battleSplash(this, fish.x, fish.y, true)
    }

    return result
  }

  const originalSyncBattleUI = GameScene.prototype._syncBattleUI
  GameScene.prototype._syncBattleUI = function (...args) {
    const result = originalSyncBattleUI.apply(this, args)
    this.ebarNum?.setVisible(false)
    this.reelValText?.setVisible(false)
    this.rageTag?.setText('魚が暴れてる！ 今は待つ')
    return result
  }

  const originalUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (time, delta) {
    originalUpdate?.call(this, time, delta)

    if (this.phase !== 'battle' || !this._battleWorldLine) {
      this._battleWorldLine?.clear()
      return
    }

    const fish = this._targetFishGfx?.active ? this._targetFishGfx : null
    const targetX = fish?.x ?? this.bobber?.x
    const targetY = fish?.y ?? this.bobber?.y
    if (targetX == null || targetY == null) return

    // Preserve the physical connection from rod to fish throughout Battle.
    const escape = this.battleState?.escape ?? 0
    const lineColor = escape >= 72 ? 0xffb29f : 0xf8fdff
    this._battleWorldLine.clear()
    this._battleWorldLine.lineStyle(2.2, lineColor, 0.88)
    this._battleWorldLine.lineBetween(this.anchorX, this.anchorY, targetX, targetY)

    if (fish && this.time.now >= (this._battleNextSplashAt ?? 0)) {
      const raging = Boolean(this.battleState?.isRaging)
      this._battleNextSplashAt = this.time.now + (raging ? 260 : 720)
      battleSplash(this, fish.x, fish.y, raging)
    }
  }

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (...args) {
    clearBattleContinuity(this)
    return originalFinishBattle.apply(this, args)
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    clearBattleContinuity(this)
    return originalEnterCast.apply(this, args)
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    clearBattleContinuity(this)
    this._battleWorldLine?.destroy()
    this._battleWorldLine = null
    return originalCleanup.apply(this, args)
  }
}
