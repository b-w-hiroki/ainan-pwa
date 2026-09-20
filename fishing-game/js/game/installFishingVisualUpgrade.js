import { isReducedMotion } from './feedback.js'
const TEXT_RES = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1

const SPOT_THEMES = {
  pointA: { accent: 0x66e4f3, glow: 0xd6fbff, deep: 0x073b5b },
  pointB: { accent: 0x7ce6c8, glow: 0xe0fff5, deep: 0x064b57 },
  pointC: { accent: 0xffc66d, glow: 0xffedc4, deep: 0x092f4e },
}

const RARITY_THEMES = {
  common: { label: 'COMMON', accent: 0x8fd8e8 },
  uncommon: { label: 'UNCOMMON', accent: 0x79dfa5 },
  rare: { label: 'RARE', accent: 0x9a8cff },
  legendary: { label: 'LEGEND', accent: 0xffd45c },
}

function spotTheme(scene) {
  return SPOT_THEMES[scene.env?.point] ?? SPOT_THEMES.pointA
}

function rarityTheme(scene) {
  return RARITY_THEMES[scene.fish?.rarity] ?? RARITY_THEMES.common
}

function clearDisplayGroup(scene, key) {
  const group = scene[key]
  if (!group) return
  ;(group.tweens ?? []).forEach(tween => {
    tween?.stop?.()
    tween?.destroy?.()
  })
  ;(group.objects ?? []).forEach(obj => obj?.destroy?.())
  scene[key] = null
}

function buildFieldAtmosphere(scene) {
  clearDisplayGroup(scene, '_visualUpgradeAtmosphere')
  const { width: W, height: H } = scene.scale
  const theme = spotTheme(scene)
  const objects = []
  const tweens = []
  const reduced = isReducedMotion()

  const veil = scene.add.graphics().setDepth(5).setScrollFactor(0)
  veil.fillGradientStyle(theme.glow, theme.glow, theme.deep, theme.deep, 0.12, 0.12, 0.01, 0.01)
  veil.fillRect(0, 0, W, H * 0.48)
  veil.fillGradientStyle(theme.deep, theme.deep, theme.deep, theme.deep, 0, 0, 0.14, 0.14)
  veil.fillRect(0, H * 0.58, W, H * 0.42)
  objects.push(veil)

  const caustics = [
    [W * 0.18, H * 0.31, 138, 28, 0.055, 5200],
    [W * 0.72, H * 0.43, 172, 34, 0.045, 6100],
    [W * 0.42, H * 0.57, 116, 24, 0.035, 4700],
  ]
  caustics.forEach(([x, y, w, h, alpha, duration], index) => {
    const light = scene.add.ellipse(x, y, w, h, theme.glow, alpha).setDepth(5).setScrollFactor(0)
    light.setAngle(index % 2 ? -11 : 9)
    objects.push(light)
    if (!reduced) tweens.push(scene.tweens.add({
      targets: light,
      x: x + (index % 2 ? -22 : 24),
      alpha: alpha * 1.65,
      scaleX: 1.12,
      duration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    }))
  })

  ;[
    [W * 0.14, H * 0.26, 2.4],
    [W * 0.83, H * 0.34, 1.8],
    [W * 0.64, H * 0.53, 2.1],
    [W * 0.28, H * 0.62, 1.5],
  ].forEach(([x, y, radius], index) => {
    const glint = scene.add.circle(x, y, radius, theme.glow, 0.15).setDepth(8).setScrollFactor(0)
    objects.push(glint)
    if (!reduced) tweens.push(scene.tweens.add({
      targets: glint,
      alpha: 0.52,
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 1150 + index * 260,
      delay: index * 180,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    }))
  })

  scene._visualUpgradeAtmosphere = { objects, tweens }
}

function addRareFishAuras(scene) {
  const theme = spotTheme(scene)
  scene.bg?._fishRuntime?.forEach(runtime => {
    const def = scene.bg?._fishDefs?.[runtime.index]
    const fish = runtime.gfx
    if (def?.t !== 'rare' || !fish?.addAt || fish._visualUpgradeAura) return

    const aura = scene.add.ellipse(0, 0, 92, 42, theme.accent, 0.08)
      .setStrokeStyle(2, theme.glow, 0.22)
    fish.addAt(aura, 0)
    fish._visualUpgradeAura = aura
    fish._visualUpgradeAuraTween = isReducedMotion() ? null : scene.tweens.add({
      targets: aura,
      alpha: 0.20,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 1050,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  })
}

function spawnHitBurst(scene) {
  const x = scene.bobber?.x ?? scene.scale.width / 2
  const y = scene.bobber?.y ?? scene.scale.height / 2
  const theme = spotTheme(scene)

  ;[0, 1].forEach(index => {
    const ring = scene.add.ellipse(x, y, 76, 32, 0xffffff, 0)
      .setStrokeStyle(index ? 2 : 3, index ? theme.accent : theme.glow, index ? 0.68 : 0.92)
      .setDepth(49)
      .setScale(index ? 0.72 : 0.54)
    scene.tweens.add({
      targets: ring,
      scaleX: index ? 1.48 : 1.28,
      scaleY: index ? 1.48 : 1.28,
      alpha: 0,
      duration: index ? 420 : 300,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    })
  })

  const hit = scene.add.text(x, y - 48, 'HIT!', {
    fontFamily: 'Nunito, M PLUS Rounded 1c, sans-serif',
    resolution: TEXT_RES,
    fontSize: '18px',
    fontStyle: 'bold',
    color: '#ffffff',
    stroke: '#073754',
    strokeThickness: 5,
  }).setOrigin(0.5).setDepth(50).setAlpha(0)
  scene.tweens.add({
    targets: hit,
    y: y - 62,
    alpha: 1,
    duration: 130,
    yoyo: true,
    hold: 90,
    ease: 'Back.easeOut',
    onComplete: () => hit.destroy(),
  })
}

function clearBattleFocus(scene) {
  clearDisplayGroup(scene, '_visualUpgradeBattleFocus')
}

function buildBattleFocus(scene) {
  clearBattleFocus(scene)
  const fish = scene._targetFishGfx
  if (!fish?.active) return
  const rarity = rarityTheme(scene)
  const size = scene.fish?.rarity === 'legendary' ? 190 : scene.fish?.rarity === 'rare' ? 170 : 148
  const halo = scene.add.ellipse(fish.x, fish.y, size, size * 0.48, rarity.accent, 0.09)
    .setStrokeStyle(2.2, rarity.accent, 0.30)
    .setDepth(32)
  const tween = scene.tweens.add({
    targets: halo,
    alpha: 0.22,
    scaleX: 1.10,
    scaleY: 1.10,
    duration: 760,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })
  scene._visualUpgradeBattleFocus = { objects: [halo], tweens: [tween] }
}

function syncBattleFocus(scene) {
  const halo = scene._visualUpgradeBattleFocus?.objects?.[0]
  const fish = scene._targetFishGfx
  if (!halo?.active || !fish?.active || scene.phase !== 'battle') return
  halo.setPosition(fish.x, fish.y)
}

function clearResultAccent(scene) {
  clearDisplayGroup(scene, '_visualUpgradeResultAccent')
}

function buildResultAccent(scene) {
  clearResultAccent(scene)
  const { width: W, height: H } = scene.scale
  const rarity = rarityTheme(scene)
  const heroY = H / 2 - 116
  const objects = []
  const tweens = []

  const halo = scene.add.ellipse(W / 2, heroY, 194, 194, rarity.accent, 0.13)
    .setStrokeStyle(2.4, rarity.accent, 0.42)
    .setDepth(131)
    .setScrollFactor(0)
  objects.push(halo)
  tweens.push(scene.tweens.add({
    targets: halo,
    alpha: 0.24,
    scaleX: 1.08,
    scaleY: 1.08,
    duration: 920,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  }))

  if (scene.fish?.rarity === 'rare' || scene.fish?.rarity === 'legendary') {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8
      const x = W / 2 + Math.cos(angle) * 105
      const y = heroY + Math.sin(angle) * 105
      const sparkle = scene.add.circle(x, y, i % 2 ? 2.4 : 3.2, rarity.accent, 0.58)
        .setDepth(133)
        .setScrollFactor(0)
      objects.push(sparkle)
      tweens.push(scene.tweens.add({
        targets: sparkle,
        alpha: 0.12,
        scaleX: 1.7,
        scaleY: 1.7,
        duration: 720 + i * 80,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }))
    }
  }

  const badge = scene.add.graphics().setDepth(134).setScrollFactor(0)
  badge.fillStyle(0x073754, 0.90)
  badge.fillRoundedRect(W / 2 - 54, heroY - 112, 108, 26, 13)
  badge.lineStyle(1.6, rarity.accent, 0.95)
  badge.strokeRoundedRect(W / 2 - 54, heroY - 112, 108, 26, 13)
  const label = scene.add.text(W / 2, heroY - 99, rarity.label, {
    fontFamily: 'Nunito, sans-serif',
    resolution: TEXT_RES,
    fontSize: '11px',
    fontStyle: 'bold',
    color: '#ffffff',
    letterSpacing: 1.2,
  }).setOrigin(0.5).setDepth(135).setScrollFactor(0)
  objects.push(badge, label)

  scene._visualUpgradeResultAccent = { objects, tweens }
}

export function installFishingVisualUpgrade(GameScene) {
  if (GameScene.prototype.__ainanFishingVisualUpgradeInstalled) return
  GameScene.prototype.__ainanFishingVisualUpgradeInstalled = true

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    buildFieldAtmosphere(this)
    addRareFishAuras(this)
    return result
  }

  const originalOpenHitWindow = GameScene.prototype._openHitWindow
  GameScene.prototype._openHitWindow = function (...args) {
    const result = originalOpenHitWindow.apply(this, args)
    spawnHitBurst(this)
    return result
  }

  const originalEnterBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    const result = originalEnterBattle.apply(this, args)
    buildBattleFocus(this)
    return result
  }

  const originalUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (...args) {
    const result = originalUpdate?.apply(this, args)
    syncBattleFocus(this)
    return result
  }

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (outcome, ...args) {
    clearBattleFocus(this)
    clearResultAccent(this)
    const result = originalFinishBattle.call(this, outcome, ...args)
    if (outcome === 'caught') buildResultAccent(this)
    return result
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    clearBattleFocus(this)
    clearResultAccent(this)
    return originalEnterCast.apply(this, args)
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    clearBattleFocus(this)
    clearResultAccent(this)
    clearDisplayGroup(this, '_visualUpgradeAtmosphere')
    this.bg?._fishRuntime?.forEach(runtime => {
      const fish = runtime.gfx
      fish?._visualUpgradeAuraTween?.stop?.()
      fish?._visualUpgradeAuraTween?.destroy?.()
      fish?._visualUpgradeAura?.destroy?.()
      if (fish) {
        fish._visualUpgradeAuraTween = null
        fish._visualUpgradeAura = null
      }
    })
    return originalCleanup.apply(this, args)
  }
}
