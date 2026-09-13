function buildEscapeRetry(scene) {
  const container = scene.add.container(0, 0).setVisible(false)
  const x = -106
  const y = 111
  const w = 212
  const h = 48

  const shadow = scene.add.graphics()
  shadow.fillStyle(0x173248, 0.13)
  shadow.fillRoundedRect(x + 2, y + 5, w, h, 16)

  const bg = scene.add.graphics()
  bg.fillStyle(0xffd95a, 0.99)
  bg.lineStyle(2.5, 0x173248, 0.90)
  bg.fillRoundedRect(x, y, w, h, 16)
  bg.strokeRoundedRect(x, y, w, h, 16)
  bg.fillStyle(0xffffff, 0.25)
  bg.fillRoundedRect(x + 12, y + 8, w - 24, 8, 4)

  const text = scene.add.text(0, y + h / 2, '↻ もう一度挑戦', {
    fontFamily: 'M PLUS Rounded 1c, sans-serif',
    fontSize: '15px',
    fontStyle: 'bold',
    color: '#173248',
  }).setOrigin(0.5)

  const hit = scene.add.rectangle(0, y + h / 2, w + 4, h + 4, 0x000000, 0)
    .setInteractive({ useHandCursor: true })
    .on('pointerup', () => {
      scene._skipNextDown = false
      scene.resultOverlay?.setVisible(false)
      container.setVisible(false)
      scene._enterCast()
    })

  container.add([shadow, bg, text, hit])
  scene.resultOverlay?.add(container)
  return container
}

/**
 * Result routing for the Vertical Slice.
 *
 * Caught fish expose the Town/retry/book success actions. Escaped fish hide
 * those hit targets completely and expose only one explicit retry CTA.
 */
export function installVerticalSliceResultRouting(GameScene) {
  if (GameScene.prototype.__ainanVerticalSliceResultRoutingInstalled) return
  GameScene.prototype.__ainanVerticalSliceResultRoutingInstalled = true

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    this._escapeRetryOverlay = buildEscapeRetry(this)
    this.resultSuccessActions?.setVisible(true)
    return result
  }

  const originalOnDown = GameScene.prototype._onDown
  GameScene.prototype._onDown = function (pointer) {
    // Result navigation is handled only by explicit buttons. Do not let a tap
    // on the fish/card/background silently bypass Town or retry routing.
    if (this.phase === 'result') return
    return originalOnDown.call(this, pointer)
  }

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (outcome, ...args) {
    const result = originalFinishBattle.call(this, outcome, ...args)
    const escaped = outcome !== 'caught'
    this._escapeRetryOverlay?.setVisible(escaped)
    this.resultSuccessActions?.setVisible(!escaped)
    if (escaped) {
      this.resHint?.setText('もう一度挑戦して、魚の動きを読もう')
    } else {
      this.resHint?.setText('釣果を町へ持ち帰ろう')
    }
    return result
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    this._skipNextDown = false
    this._escapeRetryOverlay?.setVisible(false)
    this.resultSuccessActions?.setVisible(true)
    return originalEnterCast.apply(this, args)
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    this._escapeRetryOverlay?.destroy(true)
    this._escapeRetryOverlay = null
    return originalCleanup.apply(this, args)
  }
}
