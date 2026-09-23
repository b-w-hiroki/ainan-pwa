import { FONT, SHADOW, UI_COLORS } from '../../config/fontStyles.js'
import { MOBILE_FRAME } from '../../config/mobileFrame.js'
import { buildTrajectory, clampLanding } from '../../game/cast.js'

const TEXT_RES = window.devicePixelRatio ?? 1
const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

function zoneLabel(meters) {
  if (meters < 23) return '近場'
  if (meters < 35) return '中距離'
  return '遠距離'
}

function fishSignal(scene, end) {
  const runtimes = scene.bg?._fishRuntime ?? []
  const nearby = runtimes
    .filter(runtime => runtime?.gfx?.active)
    .map(runtime => ({ runtime, distance: Math.hypot(runtime.gfx.x - end.x, runtime.gfx.y - end.y) }))
    .filter(item => item.distance <= 145)
    .sort((a, b) => a.distance - b.distance)

  return {
    count: nearby.length,
    nearest: nearby[0]?.runtime ?? null,
  }
}

export class CastUI {
  constructor(scene) {
    this.scene = scene
  }

  drawPreview(angleDeg, power01) {
    const scene = this.scene
    const pts = buildTrajectory(scene.anchorX, scene.anchorY, angleDeg, power01, scene.castRangePx)
    const world = scene.fishingCamera?.world
    if (world?.waterBounds?.minX != null) clampLanding(pts, world.waterBounds)

    const end = pts[pts.length - 1]
    const pxPerMeter = world?.pxPerMeter ?? 18
    const meters = Math.hypot(end.x - scene.anchorX, end.y - scene.anchorY) / pxPerMeter
    const zone = zoneLabel(meters)
    const signal = fishSignal(scene, end)
    const fishText = signal.count > 0 ? `魚影 ${Math.min(signal.count, 3)}${signal.count > 3 ? '+' : ''}` : '魚影なし'

    scene._mobileHudSetStatus?.(`${meters.toFixed(0)}m · ${zone}`)
    scene.powerLabel?.setText(`${fishText}　離して投げる`)
    scene.hintText?.setText(signal.count > 0 ? '着水地点の近くに魚影あり' : '方向をずらして魚影を探す')

    const rad = (angleDeg * Math.PI) / 180
    const tip = {
      x: scene.anchorX + Math.sin(rad) * scene.shaftDisplayPx,
      y: scene.anchorY - Math.cos(rad) * scene.shaftDisplayPx,
    }

    scene.castGfx.clear()

    // The rod direction is only a short supporting cue. The landing reticle is
    // visually stronger because the water is the actual playfield.
    scene.castGfx.lineStyle(11, 0xffffff, 0.22)
    scene.castGfx.lineBetween(scene.anchorX, scene.anchorY, tip.x, tip.y)
    scene.castGfx.lineStyle(4, 0xffd95a, 0.90)
    scene.castGfx.lineBetween(scene.anchorX, scene.anchorY, tip.x, tip.y)

    // Sparse trajectory dots keep the center water readable.
    for (let i = 14; i < pts.length; i += 8) {
      const p = pts[i]
      const r = Math.max(2, 4 - Math.floor((i - 14) / 12))
      scene.castGfx.fillStyle(0xffffff, 0.86)
      scene.castGfx.fillCircle(p.x, p.y, r)
    }

    const targetColor = signal.count > 0 ? 0xffd95a : 0x8edfff
    scene.castGfx.fillStyle(targetColor, signal.count > 0 ? 0.16 : 0.10)
    scene.castGfx.fillEllipse(end.x, end.y, 68, 31)
    scene.castGfx.lineStyle(3, targetColor, 0.96)
    scene.castGfx.strokeEllipse(end.x, end.y, 68, 31)
    scene.castGfx.lineStyle(1.5, 0xffffff, 0.82)
    scene.castGfx.strokeEllipse(end.x, end.y, 40, 19)
    scene.castGfx.lineStyle(2, targetColor, 0.90)
    scene.castGfx.lineBetween(end.x - 12, end.y, end.x + 12, end.y)
    scene.castGfx.lineBetween(end.x, end.y - 7, end.x, end.y + 7)

    const targetFish = signal.nearest?.gfx
    if (targetFish) {
      scene.castGfx.lineStyle(2, 0xffe998, 0.66)
      scene.castGfx.strokeEllipse(targetFish.x, targetFish.y, 58, 31)
    }
  }

  drawPowerBar(power01) {
    const scene = this.scene
    const { width: W } = scene.scale
    const controlsTop = MOBILE_FRAME.height - MOBILE_FRAME.bottomControlsHeight
    const barW = 226
    const bx = W / 2 - barW / 2
    const by = controlsTop + 45
    const innerX = bx + 6
    const innerY = by + 6
    const maxW = barW - 12
    const world = scene.fishingCamera?.world
    const pxPerMeter = world?.pxPerMeter ?? 18
    const maxMeters = Math.max(1, scene.castRangePx / pxPerMeter)
    const nearEnd = clamp(23 / maxMeters, 0, 1)
    const midEnd = clamp(35 / maxMeters, 0, 1)

    scene.powerGfx.clear()
    scene.powerGfx.fillStyle(0x071a28, 0.18)
    scene.powerGfx.fillRoundedRect(bx + 2, by + 4, barW, 30, 15)
    scene.powerGfx.fillStyle(0xf8fdff, 0.96)
    scene.powerGfx.lineStyle(2, 0x9bcfe5, 0.90)
    scene.powerGfx.fillRoundedRect(bx, by, barW, 30, 15)
    scene.powerGfx.strokeRoundedRect(bx, by, barW, 30, 15)

    scene.powerGfx.fillStyle(0x71d6a2, 0.24)
    scene.powerGfx.fillRoundedRect(innerX, innerY, maxW * nearEnd, 18, 9)
    if (midEnd > nearEnd) {
      scene.powerGfx.fillStyle(0xffd95a, 0.22)
      scene.powerGfx.fillRect(innerX + maxW * nearEnd, innerY, maxW * (midEnd - nearEnd), 18)
    }
    if (midEnd < 1) {
      scene.powerGfx.fillStyle(0xff765a, 0.18)
      scene.powerGfx.fillRoundedRect(innerX + maxW * midEnd, innerY, maxW * (1 - midEnd), 18, 9)
    }

    const fw = maxW * power01
    if (fw > 0) {
      const currentMeters = maxMeters * power01
      const color = currentMeters < 23 ? 0x58b8df : currentMeters < 35 ? 0xffd95a : 0xff765a
      scene.powerGfx.fillStyle(color, 0.96)
      scene.powerGfx.fillRoundedRect(innerX, innerY, fw, 18, 9)
      scene.powerGfx.fillStyle(0xffffff, 0.35)
      scene.powerGfx.fillRoundedRect(innerX + 4, innerY + 3, Math.max(0, fw - 8), 4, 2)
    }

    scene.powerGfx.lineStyle(1.4, 0xffffff, 0.72)
    scene.powerGfx.strokeRoundedRect(innerX, innerY, maxW, 18, 9)
    scene.powerLabel.setVisible(true)
  }

  buildHUD(W, _H) {
    const scene = this.scene
    const guideY = MOBILE_FRAME.topHudHeight + 18
    const controlsTop = MOBILE_FRAME.height - MOBILE_FRAME.bottomControlsHeight

    const hintBg = scene.add.graphics().setDepth(54)
    hintBg.fillStyle(0x071a28, 0.42)
    hintBg.fillRoundedRect(W / 2 - 96, guideY - 11, 192, 24, 12)
    hintBg.lineStyle(1.2, 0xffffff, 0.18)
    hintBg.strokeRoundedRect(W / 2 - 96, guideY - 11, 192, 24, 12)
    scene.castHintBg = hintBg

    scene.hintText = scene.add.text(W / 2, guideY + 1, '狙う場所を決める', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(55)

    scene.powerLabel = scene.add.text(W / 2, controlsTop + 25, '長押し → 離して投げる', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900',
      color: UI_COLORS.ink,
      stroke: '#ffffff', strokeThickness: 3,
      letterSpacing: 0.2,
      shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(37).setVisible(false)
  }

  destroy() {
    this.scene.castHintBg?.destroy()
    this.scene.hintText?.destroy()
    this.scene.powerLabel?.destroy()
  }
}
