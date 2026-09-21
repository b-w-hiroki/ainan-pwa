import { isReducedMotion } from './feedback.js'

const RARITY = {
  common: { color: 0x78d7ff, rays: 6, scale: 1.00 },
  uncommon: { color: 0x71d6a2, rays: 8, scale: 1.04 },
  rare: { color: 0xb998ff, rays: 10, scale: 1.10 },
  legendary: { color: 0xffd95a, rays: 14, scale: 1.18 },
}

function clear(scene) {
  scene._payoffVisuals?.forEach(item => item?.destroy?.())
  scene._payoffVisuals = []
  scene._payoffTweens?.forEach(tween => tween?.stop?.())
  scene._payoffTweens = []
}

function build(scene) {
  clear(scene)
  if (scene.phase !== 'result' || !scene.resultOverlay?.visible) return
  const { width: W, height: H } = scene.scale
  const rarity = RARITY[scene.fish?.rarity] ?? RARITY.common
  const cx = W / 2, cy = H / 2 - 116
  const objects = []
  const tweens = []
  const reduced = isReducedMotion()

  const back = scene.add.circle(cx, cy, 104 * rarity.scale, rarity.color, 0.10).setDepth(129).setScrollFactor(0)
  const ring1 = scene.add.circle(cx, cy, 84 * rarity.scale, rarity.color, 0).setStrokeStyle(3, rarity.color, 0.38).setDepth(130).setScrollFactor(0)
  const ring2 = scene.add.circle(cx, cy, 98 * rarity.scale, 0xffffff, 0).setStrokeStyle(1.5, 0xffffff, 0.22).setDepth(130).setScrollFactor(0)
  objects.push(back, ring1, ring2)

  const rays = scene.add.graphics().setDepth(129).setScrollFactor(0)
  for (let i = 0; i < rarity.rays; i++) {
    const a = (Math.PI * 2 * i) / rarity.rays
    const r1 = 92 * rarity.scale
    const r2 = (116 + (i % 2) * 16) * rarity.scale
    rays.lineStyle(i % 2 ? 2 : 3, rarity.color, i % 2 ? 0.17 : 0.25)
    rays.lineBetween(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, cx + Math.cos(a) * r2, cy + Math.sin(a) * r2)
  }
  objects.push(rays)

  if (['rare', 'legendary'].includes(scene.fish?.rarity)) {
    for (let i = 0; i < (scene.fish.rarity === 'legendary' ? 12 : 7); i++) {
      const a = (Math.PI * 2 * i) / (scene.fish.rarity === 'legendary' ? 12 : 7)
      const r = 112 + (i % 3) * 12
      const star = scene.add.text(cx + Math.cos(a) * r, cy + Math.sin(a) * r, i % 2 ? '✦' : '•', {
        fontFamily: 'M PLUS Rounded 1c, sans-serif',
        fontSize: i % 2 ? '14px' : '11px',
        fontStyle: 'bold',
        color: scene.fish.rarity === 'legendary' ? '#ffd95a' : '#d8c6ff',
      }).setOrigin(0.5).setDepth(134).setScrollFactor(0).setAlpha(0.7)
      objects.push(star)
      if (!reduced) tweens.push(scene.tweens.add({
        targets: star,
        alpha: { from: 0.28, to: 1 },
        scaleX: { from: 0.85, to: 1.35 },
        scaleY: { from: 0.85, to: 1.35 },
        duration: 760 + i * 80,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }))
    }
  }

  if (!reduced) {
    tweens.push(scene.tweens.add({
      targets: [ring1, ring2],
      scaleX: 1.08,
      scaleY: 1.08,
      alpha: { from: 0.55, to: 0.16 },
      duration: 1250,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    }))
  }

  scene._payoffVisuals = objects
  scene._payoffTweens = tweens
}

export function installResultPayoffVisuals(GameScene) {
  if (GameScene.prototype.__ainanResultPayoffVisualsInstalled) return
  GameScene.prototype.__ainanResultPayoffVisualsInstalled = true

  const originalFinish = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (outcome, ...args) {
    clear(this)
    const result = originalFinish.call(this, outcome, ...args)
    if (outcome === 'caught') this.time.delayedCall(0, () => build(this))
    return result
  }

  const originalCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    clear(this)
    return originalCast.apply(this, args)
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    clear(this)
    return originalCleanup.apply(this, args)
  }
}
