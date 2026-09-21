import { FISH_LIST } from './fish.js'
import { isReducedMotion } from './feedback.js'

const STYLE = {
  uncommon: { color: 0x71d6a2, fill: 0.13, ring: 0.22, scale: 1.05 },
  rare: { color: 0x9e7cf2, fill: 0.18, ring: 0.40, scale: 1.11 },
  legendary: { color: 0xffd95a, fill: 0.24, ring: 0.58, scale: 1.18 },
}

const QA_FISH = {
  common: 'aji',
  uncommon: 'tai',
  rare: 'hirame',
  legendary: 'kue',
}

function qaRarity() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  if (params.get('qa') !== '1') return null
  const rarity = params.get('qaRarity')
  return QA_FISH[rarity] ? rarity : null
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

function forceQaFish(scene) {
  const rarity = qaRarity()
  if (!rarity) return null
  const fish = FISH_LIST.find(item => item.id === QA_FISH[rarity])
  if (!fish) return null
  scene.fish = fish
  scene.env ??= {}
  // Kue is used only as a legendary visual sample here; keep it away from
  // pointC so boss systems cannot classify this comparison as a boss fight.
  scene.env.point = rarity === 'legendary' ? 'pointA' : (fish.habitat?.[0] ?? scene.env.point)
  return fish
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
    const forced = forceQaFish(this)
    const result = originalBattle.apply(this, args)
    if (forced) {
      // The forced Battle path is used only by visual QA. Apply the same
      // rarity treatment to the on-screen target after Battle composition.
      this.time.delayedCall(0, () => {
        applyAura(this)
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
