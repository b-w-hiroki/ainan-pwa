function destroyBiteWorldLabel(scene) {
  scene._biteWorldLabelTween?.stop()
  scene._biteWorldLabelTween?.destroy()
  scene._biteWorldLabelTween = null
  scene._biteWorldLabel?.destroy()
  scene._biteWorldLabel = null
}

function showBiteWorldLabel(scene, text, { strong = false } = {}) {
  destroyBiteWorldLabel(scene)
  const x = scene.bobber?.x ?? scene.scale.width / 2
  const y = (scene.bobber?.y ?? scene.scale.height / 2) - 34
  const label = scene.add.text(x, y, text, {
    fontFamily: 'M PLUS Rounded 1c, sans-serif',
    fontSize: strong ? '15px' : '12px',
    fontStyle: 'bold',
    color: strong ? '#173248' : '#ffffff',
    backgroundColor: strong ? 'rgba(255,217,90,0.96)' : 'rgba(23,50,72,0.82)',
    padding: { x: strong ? 12 : 9, y: strong ? 7 : 5 },
    stroke: strong ? '#ffffff' : '#173248',
    strokeThickness: strong ? 2 : 0,
  }).setOrigin(0.5, 1).setDepth(48)

  scene._biteWorldLabel = label
  scene._biteWorldLabelTween = scene.tweens.add({
    targets: label,
    y: y - 7,
    alpha: strong ? 1 : 0.92,
    duration: 520,
    yoyo: !strong,
    ease: 'Sine.easeInOut',
  })
}

/**
 * Keeps the bite prelude in the same water playfield as retrieve. The old
 * large cast-hint panel obscured the fish/lure relationship exactly when the
 * player needed to read it most.
 */
export function installVerticalSliceBitePresentation(GameScene) {
  if (GameScene.prototype.__ainanVerticalSliceBitePresentationInstalled) return
  GameScene.prototype.__ainanVerticalSliceBitePresentationInstalled = true

  const originalBeginBite = GameScene.prototype._beginRetrieveBite
  GameScene.prototype._beginRetrieveBite = function (runtime, ...args) {
    const result = originalBeginBite.call(this, runtime, ...args)
    // If another installer gated the bite, phase stays retrieve. Do not show a
    // bite prelude until the bite really started.
    if (this.phase !== 'wait') return result

    this.castHintBg?.setVisible(false)
    this.hintText?.setVisible(false)
    showBiteWorldLabel(this, `${this.fish?.name ?? '魚'}が近い…`)
    return result
  }

  const originalStartGoon = GameScene.prototype._startGoon
  GameScene.prototype._startGoon = function (...args) {
    if (this.phase === 'wait') showBiteWorldLabel(this, '食った！', { strong: true })
    return originalStartGoon.apply(this, args)
  }

  const originalOpenHitWindow = GameScene.prototype._openHitWindow
  GameScene.prototype._openHitWindow = function (...args) {
    destroyBiteWorldLabel(this)
    const result = originalOpenHitWindow.apply(this, args)
    // Keep the old large cast instruction panel hidden. hitHint + timing ring
    // are sufficient for the actual hook input.
    this.castHintBg?.setVisible(false)
    this.hintText?.setVisible(false)
    return result
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    destroyBiteWorldLabel(this)
    return originalEnterCast.apply(this, args)
  }

  const originalEnterBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    destroyBiteWorldLabel(this)
    return originalEnterBattle.apply(this, args)
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    destroyBiteWorldLabel(this)
    return originalCleanup.apply(this, args)
  }
}
