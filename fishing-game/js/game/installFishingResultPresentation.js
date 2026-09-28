import { isReducedMotion } from './feedback.js'
import { FISHING_MOCK_LAYOUT as L } from '../presentation/layouts/fishingMockLayout.js'

const RARITY = {
  common: { color: 0x78d7ff, rays: 6, scale: 1.00 },
  uncommon: { color: 0x71d6a2, rays: 8, scale: 1.04 },
  rare: { color: 0xb998ff, rays: 10, scale: 1.10 },
  legendary: { color: 0xffd95a, rays: 14, scale: 1.18 },
}

function clearPayoffVisuals(scene) {
  scene._payoffVisuals?.forEach(item => item?.destroy?.())
  scene._payoffVisuals = []
  scene._payoffTweens?.forEach(tween => tween?.stop?.())
  scene._payoffTweens = []
}

function buildPayoffVisuals(scene) {
  clearPayoffVisuals(scene)
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

  const latest = scene.catches?.[scene.catches.length - 1]
  const sizeCm = Number(latest?.sizeCm ?? 0)
  const bigCatch = Number.isFinite(sizeCm) && sizeCm >= (scene.fish?.rarity === 'legendary' ? 100 : scene.fish?.rarity === 'rare' ? 70 : 55)
  if (bigCatch) {
    const badge = scene.add.container(cx, cy + 126).setDepth(135).setScrollFactor(0)
    const bg = scene.add.graphics()
    bg.fillStyle(0xffb51f, 0.96)
    bg.lineStyle(2, 0xffef9a, 0.95)
    bg.fillRoundedRect(-62, -14, 124, 28, 12)
    bg.strokeRoundedRect(-62, -14, 124, 28, 12)
    const txt = scene.add.text(0, 0, scene.fish?.rarity === 'legendary' ? 'MONSTER SIZE' : 'BIG CATCH', {
      fontFamily: 'Nunito, M PLUS Rounded 1c, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#663a00',
      letterSpacing: 0.8,
    }).setOrigin(0.5)
    badge.add([bg, txt])
    objects.push(badge)
    if (!reduced) tweens.push(scene.tweens.add({
      targets: badge,
      scaleX: 1.06,
      scaleY: 1.06,
      duration: 560,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
    }))
  }

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


function clearResultHero(scene) {
  scene._resultHeroTween?.stop?.()
  scene._resultHeroTween?.destroy?.()
  scene._resultHeroTween = null
  scene._resultHeroFish?.destroy?.()
  scene._resultHeroFish = null
  scene._resultHeroShadow?.destroy?.()
  scene._resultHeroShadow = null
}

function buildResultHero(scene) {
  clearResultHero(scene)

  // Phaser can be unreliable when an Image is inserted into an already-built
  // Container after the result overlay becomes visible. Keep the caught fish
  // on its own fixed screen-space layer instead. The card remains UI; the fish
  // is the payoff sitting visually on top of it.
  const icon = scene.resIcon
  if (!icon?.active || !icon.texture?.key) return null

  icon.setVisible(false)
  scene.resEmoji?.setVisible?.(false)

  const { width: W, height: H } = scene.scale
  const heroSize = L.result.fish.width
  const shadow = scene.add.ellipse(L.result.fish.x + 7, L.result.fish.y + 22, heroSize * 0.64, heroSize * 0.18, 0x021723, 0.24)
    .setDepth(131)
    .setScrollFactor(0)
    .setAlpha(0)
  scene._resultHeroShadow = shadow
  const hero = scene.add.image(L.result.fish.x, L.result.fish.y, icon.texture.key)
    .setDisplaySize(L.result.fish.width, L.result.fish.height)
    .setDepth(132)
    .setScrollFactor(0)
    .setAlpha(0)

  scene._resultHeroFish = hero
  const baseScaleX = hero.scaleX
  const baseScaleY = hero.scaleY
  hero.setScale(baseScaleX * 0.78, baseScaleY * 0.78)

  scene.tweens.add({
    targets: [hero, shadow],
    alpha: 1,
    scaleX: baseScaleX,
    scaleY: baseScaleY,
    duration: 360,
    ease: 'Back.easeOut',
  })

  scene._resultHeroTween = scene.tweens.add({
    targets: hero,
    angle: 3.5,
    y: hero.y - 3,
    duration: 1100,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })
  return hero
}

function polishCaughtResult(scene) {
  if (scene.phase !== 'result' || !scene.resultOverlay?.visible) return

  scene.resIcon?.setPosition?.(0, -116)
  scene.resEmoji?.setPosition?.(0, -116)
  scene.resEmoji?.setFontSize?.(108)
  scene.resName?.setY?.(2)
  scene.resPts?.setY?.(58)
  scene.resHint?.setY?.(104)

  scene.resultOverlay.setAlpha(0)
  scene.tweens.add({
    targets: scene.resultOverlay,
    alpha: 1,
    duration: 220,
    ease: 'Sine.easeOut',
  })

  const hero = buildResultHero(scene)
  if (!hero) {
    scene.resEmoji?.setVisible?.(true)
    const visual = scene.resEmoji
    if (visual?.active) {
      const sx = visual.scaleX
      const sy = visual.scaleY
      visual.setScale(sx * 0.88, sy * 0.88)
      scene.tweens.add({
        targets: visual,
        scaleX: sx,
        scaleY: sy,
        duration: 320,
        ease: 'Back.easeOut',
      })
    }
  }
}

/** Result remains one portrait screen, but the caught fish is the visual hero. */
export function installFishingResultPresentation(GameScene) {
  if (GameScene.prototype.__ainanFishingResultPresentationInstalled) return
  GameScene.prototype.__ainanFishingResultPresentationInstalled = true

  GameScene.prototype._polishCaughtResultPresentation = function () {
    polishCaughtResult(this)
  }

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (outcome, ...args) {
    clearResultHero(this)
    clearPayoffVisuals(this)
    const result = originalFinishBattle.call(this, outcome, ...args)
    if (outcome === 'caught') {
      polishCaughtResult(this)
      this.time.delayedCall(0, () => buildPayoffVisuals(this))
    }
    return result
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    clearResultHero(this)
    clearPayoffVisuals(this)
    return originalEnterCast.apply(this, args)
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    clearResultHero(this)
    clearPayoffVisuals(this)
    return originalCleanup.apply(this, args)
  }
}
