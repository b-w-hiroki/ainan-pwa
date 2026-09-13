function findBattleTarget(scene) {
  if (scene._targetFishGfx?.active) return scene._targetFishGfx
  const runtime = scene.bg?._fishRuntime?.find(item => item?.gfx?.active)
  if (!runtime) return null
  scene.bg?._fishTweens?.[runtime.index]?.stop?.()
  runtime.gfx.setPosition((scene.bobber?.x ?? scene.anchorX) + 78, (scene.bobber?.y ?? scene.anchorY - 260) + 24)
  scene._targetFishIndex = runtime.index
  scene._targetFishGfx = runtime.gfx
  return runtime.gfx
}

function emphasizeBattleFish(scene, fish) {
  if (!fish) return
  const image = fish._assetImage
  if (image && !scene._battleFishRestore) {
    scene._battleFishRestore = {
      fish,
      image,
      width: image.displayWidth,
      height: image.displayHeight,
      depth: fish.depth,
    }
  }

  const rarity = scene.fish?.rarity ?? 'common'
  const width = rarity === 'legendary' ? 142 : rarity === 'rare' ? 124 : rarity === 'uncommon' ? 104 : 88
  if (image) image.setDisplaySize(width, width * 0.5)
  fish.setDepth(33)
  fish._followWake?.setAlpha?.(0)

  scene._battleFishMotion?.stop?.()
  scene._battleFishMotion?.destroy?.()
  scene._battleFishMotion = scene.tweens.add({
    targets: fish,
    x: fish.x + 10,
    y: fish.y - 5,
    angle: fish.scaleX < 0 ? -4 : 4,
    duration: 620,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })
}

function restoreBattleFish(scene) {
  scene._battleFishMotion?.stop?.()
  scene._battleFishMotion?.destroy?.()
  scene._battleFishMotion = null
  const restore = scene._battleFishRestore
  if (restore?.image?.active) restore.image.setDisplaySize(restore.width, restore.height)
  if (restore?.fish?.active) restore.fish.setDepth(restore.depth ?? 22).setAngle(0)
  scene._battleFishRestore = null
}

function enforceBattleComposition(scene) {
  if (scene.phase !== 'battle') return
  scene.retrieveCoach?.hide?.()
  scene.lineGfx?.clear?.()
  scene.bobber?.setVisible?.(false)
  scene._assetLureRipple?.setVisible?.(false)
}

/**
 * Battle uses the same water world as Retrieve, but removes the lure-as-subject
 * composition. One enlarged fish shadow and one physical line own the field.
 */
export function installFishingBattlePresentation(GameScene) {
  if (GameScene.prototype.__ainanFishingBattlePresentationInstalled) return
  GameScene.prototype.__ainanFishingBattlePresentationInstalled = true

  const originalEnterBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    // QA/direct Battle entry still gets a visible fish target. Normal play
    // already has _targetFishGfx from the bite sequence.
    const targetBefore = findBattleTarget(this)
    const result = originalEnterBattle.apply(this, args)
    const target = this._targetFishGfx?.active ? this._targetFishGfx : targetBefore
    enforceBattleComposition(this)
    emphasizeBattleFish(this, target)
    return result
  }

  const originalUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (...args) {
    const result = originalUpdate?.apply(this, args)
    enforceBattleComposition(this)
    return result
  }

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (...args) {
    restoreBattleFish(this)
    return originalFinishBattle.apply(this, args)
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    restoreBattleFish(this)
    return originalEnterCast.apply(this, args)
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    restoreBattleFish(this)
    return originalCleanup.apply(this, args)
  }
}
