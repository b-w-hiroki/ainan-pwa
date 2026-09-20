import { isReducedMotion } from './feedback.js'

const SCENE_ACCENT = {
  HomeScene: 0x5bb5d8,
  MapScene: 0x68cfff,
  TownScene: 0xffd95a,
  ProfileScene: 0x71d6a2,
  DailyScene: 0xffb45d,
  AchievementScene: 0xffd95a,
  CollectionScene: 0x8f80e8,
  WorkshopScene: 0xffb45d,
  HarborServicesScene: 0x5bb5d8,
  SettingsScene: 0x8f80e8,
}

function addEdgeVignette(scene, W, H, accent) {
  const g = scene.add.graphics().setDepth(2).setScrollFactor(0)
  g.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.05, 0.05, 0, 0)
  g.fillRect(0, 0, W, H * 0.28)
  g.fillGradientStyle(accent, accent, 0x173248, 0x173248, 0, 0, 0.05, 0.10)
  g.fillRect(0, H * 0.68, W, H * 0.22)
  return g
}

function addCornerGlints(scene, W, H, accent) {
  const reduced = isReducedMotion()
  const positions = [[24, 118], [W - 28, 142], [34, H * 0.58], [W - 32, H * 0.64]]
  positions.forEach(([x, y], i) => {
    const ring = scene.add.circle(x, y, 3 + (i % 2), accent, 0.18).setDepth(3).setScrollFactor(0)
    const dot = scene.add.circle(x, y, 1.5, 0xffffff, 0.76).setDepth(4).setScrollFactor(0)
    if (!reduced) scene.tweens.add({
      targets: [ring, dot],
      alpha: { from: 0.18, to: 0.74 },
      scaleX: { from: 0.9, to: 1.7 },
      scaleY: { from: 0.9, to: 1.7 },
      duration: 1300 + i * 210,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  })
}

function decorateHome(scene, W, H) {
  const reduced = isReducedMotion()
  const glow = scene.add.ellipse(W * 0.58, H * 0.58, W * 0.92, H * 0.62, 0xcff6ff, 0.08).setDepth(3).setScrollFactor(0)
  const warm = scene.add.ellipse(W * 0.42, H * 0.62, W * 0.62, H * 0.38, 0xffefad, 0.055).setDepth(3).setScrollFactor(0)
  if (!reduced) scene.tweens.add({
    targets: [glow, warm],
    alpha: { from: 0.045, to: 0.13 },
    scaleX: 1.035,
    scaleY: 1.035,
    duration: 2600,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })
  const shine = scene.add.graphics().setDepth(6).setScrollFactor(0)
  shine.lineStyle(3, 0xffffff, 0.16)
  shine.lineBetween(W * 0.18, H * 0.76, W * 0.82, H * 0.69)
  shine.lineStyle(1.5, 0xfff2bb, 0.16)
  shine.lineBetween(W * 0.30, H * 0.80, W * 0.74, H * 0.74)
}

function decorateMap(scene, W, H) {
  const reduced = isReducedMotion()
  const points = [[0.35, 0.32, 0x5bb5d8], [0.62, 0.50, 0x8f80e8], [0.38, 0.69, 0xff765a]]
  points.forEach(([fx, fy, color], i) => {
    const halo = scene.add.circle(W * fx, H * fy, 34 + i * 2, color, 0.09).setDepth(2).setScrollFactor(0)
    const ring = scene.add.circle(W * fx, H * fy, 24 + i * 2, color, 0).setStrokeStyle(2, color, 0.26).setDepth(3).setScrollFactor(0)
    if (!reduced) scene.tweens.add({
      targets: [halo, ring],
      alpha: { from: 0.08, to: 0.28 },
      scaleX: 1.22,
      scaleY: 1.22,
      duration: 1500 + i * 260,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  })
  const topGlow = scene.add.ellipse(W / 2, 94, W * 0.74, 120, 0xffffff, 0.12).setDepth(1).setScrollFactor(0)
  topGlow.setBlendMode?.('ADD')
}

function decorateTown(scene, W, H) {
  const reduced = isReducedMotion()
  const total = scene._summary?.totalLevel ?? 0
  const bustle = scene._summary?.bustle ?? 0
  const count = Math.min(10, 3 + Math.floor(total / 2))
  for (let i = 0; i < count; i++) {
    const x = 22 + ((i * 61) % Math.max(50, W - 44))
    const y = H * (0.18 + (i % 5) * 0.09)
    const light = scene.add.circle(x, y, i % 3 === 0 ? 3.4 : 2.2, bustle >= 70 ? 0xffd95a : 0xdff7ff, 0.2).setDepth(3)
    if (!reduced) scene.tweens.add({
      targets: light,
      alpha: { from: 0.16, to: bustle >= 70 ? 0.75 : 0.48 },
      duration: 900 + i * 170,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }
  if (total >= 10) {
    const beam = scene.add.graphics().setDepth(2)
    beam.fillStyle(0xffe99b, 0.045)
    beam.fillTriangle(W * 0.12, H * 0.15, W * 0.28, H * 0.15, W * 0.43, H * 0.63)
    beam.fillTriangle(W * 0.72, H * 0.13, W * 0.86, H * 0.13, W * 0.58, H * 0.65)
  }
}

function decorateCardScene(scene, W, H, accent) {
  const g = scene.add.graphics().setDepth(2).setScrollFactor(0)
  g.fillStyle(accent, 0.05)
  g.fillCircle(W * 0.86, 76, 82)
  g.fillCircle(W * 0.08, H * 0.72, 58)
  g.lineStyle(1.5, 0xffffff, 0.20)
  g.lineBetween(20, 100, W - 20, 92)
  addCornerGlints(scene, W, H, accent)
}

function decorateScene(scene) {
  const key = scene.scene?.key ?? scene.sys?.settings?.key
  const accent = SCENE_ACCENT[key]
  if (!accent) return
  const { width: W, height: H } = scene.scale
  addEdgeVignette(scene, W, H, accent)
  if (key === 'HomeScene') decorateHome(scene, W, H)
  else if (key === 'MapScene') decorateMap(scene, W, H)
  else if (key === 'TownScene') decorateTown(scene, W, H)
  else decorateCardScene(scene, W, H, accent)
}

export function installSceneVisualPowerPass(...SceneClasses) {
  SceneClasses.filter(Boolean).forEach(SceneClass => {
    if (SceneClass.prototype.__ainanVisualPowerPassInstalled) return
    SceneClass.prototype.__ainanVisualPowerPassInstalled = true
    const originalCreate = SceneClass.prototype.create
    SceneClass.prototype.create = function (...args) {
      const result = originalCreate.apply(this, args)
      decorateScene(this)
      return result
    }
  })
}
