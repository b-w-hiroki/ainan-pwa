import { isReducedMotion } from './feedback.js'

const STYLE = {
  uncommon: { color: 0x71d6a2, fill: 0.13, ring: 0.22, scale: 1.05 },
  rare: { color: 0x9e7cf2, fill: 0.18, ring: 0.40, scale: 1.11 },
  legendary: { color: 0xffd95a, fill: 0.24, ring: 0.58, scale: 1.18 },
}

function qaRarity() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  if (params.get('qa') !== '1') return null
  const rarity = params.get('qaRarity')
  return ['common', 'uncommon', 'rare', 'legendary'].includes(rarity) ? rarity : null
}

function clearAura(scene) {
  scene._rarityWaterTweens?.forEach(t => { t?.stop?.(); t?.destroy?.() })
  scene._rarityWaterTweens = []
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
  scene._rarityWaterTarget = null
}

function applyAura(scene) {
  const target = scene._targetFishGfx
  const image = target?._assetImage
  if (!target?.active || !image?.active) return

  const style = STYLE[scene.fish?.rarity]
  clearAura(scene)
  scene._rarityWaterTarget = target
  if (!style) return

  target._rarityRestore = {
    width: image.displayWidth,
    height: image.displayHeight,
  }

  const aura = scene.add.graphics()
  aura.fillStyle(style.color, style.fill)
  aura.fillEllipse(0, 0, image.displayWidth * 1.55, image.displayHeight * 2.05)
  aura.lineStyle(scene.fish.rarity === 'legendary' ? 3 : 2, style.color, style.ring)
  aura.strokeEllipse(0, 0, image.displayWidth * 1.36, image.displayHeight * 1.75)
  target.addAt?.(aura, 0)
  target._rarityAura = aura

  image.setDisplaySize(target._rarityRestore.width * style.scale, target._rarityRestore.height * style.scale)
  if (scene.fish.rarity === 'uncommon') image.setTint(0xcff7df)
  if (scene.fish.rarity === 'rare') image.setTint(0xe1d4ff)
  if (scene.fish.rarity === 'legendary') image.setTint(0xffefad)

  if (!isReducedMotion()) {
    scene._rarityWaterTweens = [scene.tweens.add({
      targets: aura,
      alpha: { from: 0.54, to: 1 },
      scaleX: { from: 0.94, to: 1.10 },
      scaleY: { from: 0.94, to: 1.10 },
      duration: scene.fish.rarity === 'legendary' ? 720 : 980,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })]
  }
}

function applyQaVisual(scene, rarity) {
  const target = scene._targetFishGfx
  const image = target?._assetImage
  if (!target?.active || !image?.active) return
  clearAura(scene)
  scene._rarityWaterTarget = target

  const style = STYLE[rarity]
  if (style) {
    target._rarityRestore = { width: image.displayWidth, height: image.displayHeight }
    const aura = scene.add.graphics()
    aura.fillStyle(style.color, style.fill)
    aura.fillEllipse(0, 0, image.displayWidth * 1.55, image.displayHeight * 2.05)
    aura.lineStyle(rarity === 'legendary' ? 3 : 2, style.color, style.ring)
    aura.strokeEllipse(0, 0, image.displayWidth * 1.36, image.displayHeight * 1.75)
    target.addAt?.(aura, 0)
    target._rarityAura = aura
    image.setDisplaySize(target._rarityRestore.width * style.scale, target._rarityRestore.height * style.scale)
    if (rarity === 'uncommon') image.setTint(0xcff7df)
    if (rarity === 'rare') image.setTint(0xe1d4ff)
    if (rarity === 'legendary') image.setTint(0xffefad)
  }
}

function buildQaPreview(scene) {
  const rarity = qaRarity()
  if (!rarity) return
  scene._rarityQaLabel?.destroy?.()
  const label = scene.add.text(scene.scale.width / 2, 128, rarity.toUpperCase(), {
    fontFamily: 'M PLUS Rounded 1c, sans-serif',
    fontSize: '12px', fontStyle: 'bold', color: '#ffffff',
    backgroundColor: 'rgba(7,55,84,.82)',
    padding: { x: 10, y: 5 },
  }).setOrigin(0.5).setDepth(196).setScrollFactor(0)
  scene._rarityQaLabel = label
}

export function installRarityWaterReadability(GameScene) {
  if (GameScene.prototype.__ainanRarityWaterReadabilityInstalled) return
  GameScene.prototype.__ainanRarityWaterReadabilityInstalled = true

  const originalApproach = GameScene.prototype._startFishApproach
  GameScene.prototype._startFishApproach = function (...args) {
    clearAura(this)
    const result = originalApproach.apply(this, args)
    applyAura(this)
    return result
  }

  const originalBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    clearAura(this)
    const rarity = qaRarity()
    const result = originalBattle.apply(this, args)
    if (rarity) {
      // QA reuses the known-good normal Battle composition and changes only
      // the rarity treatment. This keeps visual regression screenshots stable.
      this.time.delayedCall(0, () => {
        applyQaVisual(this, rarity)
        buildQaPreview(this)
      })
    }
    return result
  }

  const originalCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    clearAura(this)
    return originalCast.apply(this, args)
  }

  const originalFinish = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (...args) {
    clearAura(this)
    return originalFinish.apply(this, args)
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    clearAura(this)
    this._rarityQaLabel?.destroy?.()
    this._rarityQaLabel = null
    return originalCleanup.apply(this, args)
  }
}
