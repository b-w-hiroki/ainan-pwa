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


function rememberBiteFish(scene, fish) {
  const image = fish?._assetImage
  if (!image || scene._biteFishRestore) return
  scene._biteFishRestore = {
    fish,
    image,
    width: image.displayWidth,
    height: image.displayHeight,
    depth: fish.depth,
  }
}

function emphasizeBiteFish(scene) {
  const fish = scene._targetFishGfx
  const image = fish?._assetImage
  if (!fish?.active || !image) return
  rememberBiteFish(scene, fish)
  const width = Math.max(72, Math.min(104, image.displayWidth * 1.22))
  image.setDisplaySize(width, width * 0.5)
  fish.setDepth(34)
  scene._biteFishPulse?.stop?.()
  scene._biteFishPulse?.destroy?.()
  scene._biteFishPulse = scene.tweens.add({
    targets: fish,
    scaleY: 1.06,
    duration: 420,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })
}

function restoreBiteFish(scene) {
  scene._biteFishPulse?.stop?.()
  scene._biteFishPulse?.destroy?.()
  scene._biteFishPulse = null
  const restore = scene._biteFishRestore
  if (restore?.image?.active) restore.image.setDisplaySize(restore.width, restore.height)
  if (restore?.fish?.active) restore.fish.setDepth(restore.depth ?? 22).setScale(restore.fish.scaleX < 0 ? -1 : 1, 1)
  scene._biteFishRestore = null
}

function styleHitPrompt(scene) {
  if (!scene.hitHint) return
  const controlsTop = scene.scale.height - 176
  scene.hitHint
    .setText(scene.fish?.feel?.hitPrompt ?? '今！ タップ')
    .setPosition(scene.scale.width / 2, controlsTop - 76)
    .setFontSize(28)
    .setDepth(99)
    .setVisible(true)
  scene._hitHintBaseY = scene.hitHint.y
}

/**
 * Bite/Hit stays inside the fishing field. The fish/lure relationship remains
 * visible and the only large instruction appears at the actual hook moment.
 */
export function installFishingBiteHitPresentation(GameScene) {
  if (GameScene.prototype.__ainanFishingBiteHitPresentationInstalled) return
  GameScene.prototype.__ainanFishingBiteHitPresentationInstalled = true

  const originalBeginBite = GameScene.prototype._beginRetrieveBite
  GameScene.prototype._beginRetrieveBite = function (...args) {
    const result = originalBeginBite.apply(this, args)
    if (this.phase !== 'wait') return result
    this.castHintBg?.setVisible(false)
    this.hintText?.setVisible(false)
    showBiteWorldLabel(this, `${this.fish?.name ?? '魚'}が近い…`)
    this.retrieveCoach?.hide?.()
    emphasizeBiteFish(this)
    return result
  }

  const originalStartGoon = GameScene.prototype._startGoon
  GameScene.prototype._startGoon = function (...args) {
    if (this.phase === 'wait') {
      emphasizeBiteFish(this)
      this.cameras.main.shake(120, this.fish?.feel?.hitShake ?? 0.004)
      showBiteWorldLabel(this, '食った！', { strong: true })
    }
    return originalStartGoon.apply(this, args)
  }

  const originalOpenHitWindow = GameScene.prototype._openHitWindow
  GameScene.prototype._openHitWindow = function (...args) {
    destroyBiteWorldLabel(this)
    const result = originalOpenHitWindow.apply(this, args)
    this.castHintBg?.setVisible(false)
    this.hintText?.setVisible(false)
    styleHitPrompt(this)
    return result
  }

  const originalEnterBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    restoreBiteFish(this)
    destroyBiteWorldLabel(this)
    return originalEnterBattle.apply(this, args)
  }

  const originalOnMiss = GameScene.prototype._onMiss
  GameScene.prototype._onMiss = function (...args) {
    restoreBiteFish(this)
    return originalOnMiss.apply(this, args)
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    restoreBiteFish(this)
    destroyBiteWorldLabel(this)
    return originalEnterCast.apply(this, args)
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    restoreBiteFish(this)
    destroyBiteWorldLabel(this)
    return originalCleanup.apply(this, args)
  }
}
