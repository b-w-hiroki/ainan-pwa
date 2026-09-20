function findBattleTarget(scene) {
  if (scene._targetFishGfx?.active) return scene._targetFishGfx
  const runtime = scene.bg?._fishRuntime?.find(item => item?.gfx?.active)
  if (!runtime) return null
  scene.bg?._fishTweens?.[runtime.index]?.stop?.()
  scene._targetFishIndex = runtime.index
  scene._targetFishGfx = runtime.gfx
  return runtime.gfx
}

function dimBackgroundFish(scene, target) {
  if (!scene._battleFishAlphaRestore) {
    scene._battleFishAlphaRestore = (scene.bg?._fishGfx ?? []).map(fish => ({ fish, alpha: fish?.alpha ?? 1 }))
  }
  scene._battleFishAlphaRestore.forEach(({ fish }) => {
    if (!fish?.active) return
    fish.setAlpha(fish === target ? 1 : 0.16)
  })
}

function restoreBackgroundFish(scene) {
  scene._battleFishAlphaRestore?.forEach(({ fish, alpha }) => fish?.active && fish.setAlpha(alpha))
  scene._battleFishAlphaRestore = null
}

function anchorBattleFish(scene, fish) {
  if (!fish?.active || scene.phase !== 'battle') return
  const cam = scene.cameras.main
  const t = scene.time.now / 1000
  const feel = scene.fish?.feel ?? {}
  const speed = feel.battleSpeed ?? 3.2
  const waveX = feel.battleWaveX ?? 12
  const waveY = feel.battleWaveY ?? 7
  const screenX = scene.scale.width * 0.31 + Math.sin(t * speed) * waveX
  const screenY = 300 + Math.sin(t * (speed + 0.9)) * waveY
  fish.setPosition(cam.scrollX + screenX, cam.scrollY + screenY)
  fish.setAngle(Math.sin(t * (speed + 0.5)) * Math.min(8, 3 + waveX * 0.16) * (fish.scaleX < 0 ? -1 : 1))
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
  const width = rarity === 'legendary' ? 164 : rarity === 'rare' ? 148 : rarity === 'uncommon' ? 132 : 120
  const scale = scene.fish?.feel?.battleScale ?? 1
  if (image) image.setDisplaySize(width * scale, width * 0.5 * scale)
  fish.setDepth(33).setAlpha(1)
  fish._followWake?.setAlpha?.(0)
  dimBackgroundFish(scene, fish)
  anchorBattleFish(scene, fish)
}

function restoreBattleFish(scene) {
  const restore = scene._battleFishRestore
  if (restore?.image?.active) restore.image.setDisplaySize(restore.width, restore.height)
  if (restore?.fish?.active) restore.fish.setDepth(restore.depth ?? 22).setAngle(0)
  scene._battleFishRestore = null
  restoreBackgroundFish(scene)
}

function enforceBattleComposition(scene) {
  if (scene.phase !== 'battle') return
  scene.retrieveCoach?.hide?.()
  scene.lineGfx?.clear?.()
  scene.bobber?.setVisible?.(false)
  scene._assetLureRipple?.setVisible?.(false)
  anchorBattleFish(scene, scene._targetFishGfx)
  dimBackgroundFish(scene, scene._targetFishGfx)
}

/**
 * Battle uses the same water world as Retrieve, but removes the lure-as-subject
 * composition. One enlarged hooked fish and one physical line own the field.
 */
export function installFishingBattlePresentation(GameScene) {
  if (GameScene.prototype.__ainanFishingBattlePresentationInstalled) return
  GameScene.prototype.__ainanFishingBattlePresentationInstalled = true

  const originalEnterBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    const targetBefore = findBattleTarget(this)
    const result = originalEnterBattle.apply(this, args)
    const target = this._targetFishGfx?.active ? this._targetFishGfx : targetBefore
    emphasizeBattleFish(this, target)
    enforceBattleComposition(this)
    return result
  }

  const originalUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (...args) {
    // Anchor before the legacy Battle continuity line is drawn so the line and
    // fish read as one interaction in the same frame.
    if (this.phase === 'battle') anchorBattleFish(this, this._targetFishGfx)
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
