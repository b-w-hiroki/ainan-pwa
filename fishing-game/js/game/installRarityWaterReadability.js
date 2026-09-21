import { isReducedMotion } from './feedback.js'

const STYLE = {
  uncommon: { color: 0x71d6a2, alpha: 0.13, ring: 0.22, scale: 1.05 },
  rare: { color: 0x9e7cf2, alpha: 0.18, ring: 0.38, scale: 1.11 },
  legendary: { color: 0xffd95a, alpha: 0.24, ring: 0.55, scale: 1.18 },
}

function clearAura(scene) {
  scene._rarityWaterTweens?.forEach(t => { t?.stop?.(); t?.destroy?.() })
  scene._rarityWaterTweens = []
  scene._rarityWaterTarget = null
}

function applyAura(scene) {
  const target = scene._targetFishGfx
  const image = target?._assetImage
  const style = STYLE[scene.fish?.rarity]
  if (!target?.active || !image?.active || !style) return
  if (target._rarityAura) target._rarityAura.destroy()

  const aura = scene.add.graphics()
  aura.fillStyle(style.color, style.alpha)
  aura.fillEllipse(0, 0, image.displayWidth * 1.55, image.displayHeight * 2.05)
  aura.lineStyle(scene.fish?.rarity === 'legendary' ? 3 : 2, style.color, style.ring)
  aura.strokeEllipse(0, 0, image.displayWidth * 1.36, image.displayHeight * 1.75)
  target.addAt?.(aura, 0)
  target._rarityAura = aura

  if (!target._rarityRestore) {
    target._rarityRestore = {
      width: image.displayWidth,
      height: image.displayHeight,
      tint: image.tintTopLeft,
    }
  }
  image.setDisplaySize(target._rarityRestore.width * style.scale, target._rarityRestore.height * style.scale)
  if (scene.fish.rarity === 'uncommon') image.setTint(0xcff7df)
  if (scene.fish.rarity === 'rare') image.setTint(0xe1d4ff)
  if (scene.fish.rarity === 'legendary') image.setTint(0xffefad)

  scene._rarityWaterTarget = target
  scene._rarityWaterTweens = []
  if (!isReducedMotion()) {
    scene._rarityWaterTweens.push(scene.tweens.add({
      targets: aura,
      alpha: { from: 0.52, to: 1 },
      scaleX: { from: 0.94, to: 1.10 },
      scaleY: { from: 0.94, to: 1.10 },
      duration: scene.fish.rarity === 'legendary' ? 720 : 980,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    }))
  }
}

function restore(scene) {
  const target = scene._rarityWaterTarget
  const image = target?._assetImage
  if (target?._rarityAura) {
    target._rarityAura.destroy()
    target._rarityAura = null
  }
  if (image?.active && target?._rarityRestore) {
    image.setDisplaySize(target._rarityRestore.width, target._rarityRestore.height)
    image.clearTint?.()
  }
  if (target) target._rarityRestore = null
  clearAura(scene)
}

export function installRarityWaterReadability(GameScene) {
  if (GameScene.prototype.__ainanRarityWaterReadabilityInstalled) return
  GameScene.prototype.__ainanRarityWaterReadabilityInstalled = true

  const originalApproach = GameScene.prototype._startFishApproach
  GameScene.prototype._startFishApproach = function (...args) {
    restore(this)
    const result = originalApproach.apply(this, args)
    applyAura(this)
    return result
  }

  const originalBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    restore(this)
    return originalBattle.apply(this, args)
  }

  const originalCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    restore(this)
    return originalCast.apply(this, args)
  }

  const originalFinish = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (...args) {
    restore(this)
    return originalFinish.apply(this, args)
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    restore(this)
    return originalCleanup.apply(this, args)
  }
}
