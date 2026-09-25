import { haptic, playSfx } from './feedback.js'

function burst(scene, x, y, { color = 0xbcecff, radius = 34, depth = 240, strong = false } = {}) {
  const ring = scene.add.ellipse(x, y, radius * 2, radius, 0xffffff, 0)
    .setStrokeStyle(strong ? 4 : 2.5, color, 0.88)
    .setDepth(depth)
    .setScrollFactor(0)
  const glow = scene.add.ellipse(x, y, radius * 1.4, radius * 0.72, color, strong ? 0.18 : 0.10)
    .setDepth(depth - 1)
    .setScrollFactor(0)

  scene.tweens.add({
    targets: [ring, glow],
    scaleX: strong ? 2.1 : 1.65,
    scaleY: strong ? 2.1 : 1.65,
    alpha: 0,
    duration: strong ? 420 : 300,
    ease: 'Quad.easeOut',
    onComplete: () => { ring.destroy(); glow.destroy() },
  })
}

function screenPoint(scene, obj, fallbackX, fallbackY) {
  if (!obj) return { x: fallbackX, y: fallbackY }
  const cam = scene.cameras?.main
  return {
    x: obj.x - (cam?.scrollX ?? 0),
    y: obj.y - (cam?.scrollY ?? 0),
  }
}

export function installFishingFeelPass(GameScene) {
  if (GameScene.prototype.__ainanFishingFeelPassInstalled) return
  GameScene.prototype.__ainanFishingFeelPassInstalled = true

  const originalFire = GameScene.prototype._fireCast
  GameScene.prototype._fireCast = function (...args) {
    haptic(12)
    playSfx('tap')
    this.cameras?.main?.shake?.(85, 0.0016)
    return originalFire.apply(this, args)
  }

  const originalTwitch = GameScene.prototype._twitchRetrieve
  if (originalTwitch) {
    GameScene.prototype._twitchRetrieve = function (...args) {
      const before = this.bobber ? { x: this.bobber.x, y: this.bobber.y } : null
      const result = originalTwitch.apply(this, args)
      if (before) {
        const p = screenPoint(this, this.bobber, this.scale.width * 0.68, this.scale.height * 0.48)
        burst(this, p.x, p.y, { radius: 22 })
      }
      haptic(8)
      return result
    }
  }

  const originalSlow = GameScene.prototype._startSlowRetrieve
  if (originalSlow) {
    GameScene.prototype._startSlowRetrieve = function (...args) {
      haptic(6)
      return originalSlow.apply(this, args)
    }
  }

  const originalHit = GameScene.prototype._openHitWindow
  GameScene.prototype._openHitWindow = function (...args) {
    const result = originalHit.apply(this, args)
    const p = screenPoint(this, this.bobber, this.scale.width / 2, this.scale.height * 0.42)
    burst(this, p.x, p.y, { color: 0xffd95a, radius: 38, strong: true })
    this.cameras?.main?.shake?.(150, 0.006)
    haptic([18, 20, 38])
    return result
  }

  const originalBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    const result = originalBattle.apply(this, args)
    burst(this, this.scale.width / 2, 334, { color: 0x8edfff, radius: 72, strong: true, depth: 150 })
    this.cameras?.main?.shake?.(180, 0.004)
    haptic(20)
    return result
  }

  const originalFinish = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (outcome, ...args) {
    const result = originalFinish.call(this, outcome, ...args)
    if (outcome === 'caught') {
      this.cameras?.main?.flash?.(180, 255, 246, 190, true)
      this.cameras?.main?.shake?.(130, 0.003)
      haptic([24, 18, 42])
      playSfx('catch')
    }
    return result
  }
}
