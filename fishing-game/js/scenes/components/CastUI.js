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

    scene.powerLabel?.setText(`${meters.toFixed(0)}m・${zone}・${fishText}`)
    scene.hintText?.setText(signal.count > 0 ? `${zone}を狙う　魚影あり` : `${zone}　方向をずらして魚影を探す`)

    const rad = (angleDeg * Math.PI) / 180
    const tip = {
      x: scene.anchorX + Math.sin(rad) * scene.shaftDisplayPx,
      y: scene.anchorY - Math.cos(rad) * scene.shaftDisplayPx,
    }

    scene.castGfx.clear()
    scene.castGfx.lineStyle(18, 0xffffff, 0.45)
    scene.castGfx.lineBetween(scene.anchorX, scene.anchorY, tip.x, tip.y)
    scene.castGfx.lineStyle(9, 0xff765a, 1)
    scene.castGfx.lineBetween(scene.anchorX, scene.anchorY, tip.x, tip.y)
    scene.castGfx.lineStyle(2.5, 0x173248, 0.9)
    scene.castGfx.lineBetween(scene.anchorX, scene.anchorY, tip.x, tip.y)

    const headTip = {
      x: scene.anchorX + Math.sin(rad) * (scene.shaftDisplayPx + 14),
      y: scene.anchorY - Math.cos(rad) * (scene.shaftDisplayPx + 14),
    }
    const perpX = -Math.sin(rad) * 12
    const perpY = Math.cos(rad) * 12
    scene.castGfx.fillStyle(0xffd95a, 1)
    scene.castGfx.lineStyle(2.5, 0x173248, 0.92)
    scene.castGfx.fillTriangle(
      headTip.x + Math.sin(rad) * 16, headTip.y - Math.cos(rad) * 16,
      headTip.x + perpX, headTip.y + perpY,
      headTip.x - perpX, headTip.y - perpY,
    )

    for (let i = 14; i < pts.length; i += 6) {
      const p = pts[i]
      const r = Math.max(2, 5 - Math.floor((i - 14) / 9))
      scene.castGfx.fillStyle(0xffffff, 0.92)
      scene.castGfx.lineStyle(1.5, 0x2f9ed4, 0.78)
      scene.castGfx.fillCircle(p.x, p.y, r)
      scene.castGfx.strokeCircle(p.x, p.y, r)
    }

    const targetColor = signal.count > 0 ? 0xffd95a : 0x8edfff
    scene.castGfx.fillStyle(targetColor, 0.13)
    scene.castGfx.fillEllipse(end.x, end.y, 58, 27)
    scene.castGfx.lineStyle(3, targetColor, 0.95)
    scene.castGfx.strokeEllipse(end.x, end.y, 58, 27)
    scene.castGfx.lineStyle(1.5, 0xffffff, 0.86)
    scene.castGfx.strokeEllipse(end.x, end.y, 36, 17)
    scene.castGfx.lineStyle(2, targetColor, 0.86)
    scene.castGfx.lineBetween(end.x - 10, end.y, end.x + 10, end.y)
    scene.castGfx.lineBetween(end.x, end.y - 6, end.x, end.y + 6)

    const targetFish = signal.nearest?.gfx
    if (targetFish) {
      scene.castGfx.lineStyle(2, 0xffe998, 0.72)
      scene.castGfx.strokeEllipse(targetFish.x, targetFish.y, 52, 28)
    }
  }

  drawPowerBar(power01) {
    const scene = this.scene
    const { width: W } = scene.scale
    const bx = W / 2 - 101
    const by = MOBILE_FRAME.playBottom - 48
    const innerX = bx + 5
    const innerY = by + 5
    const maxW = 192
    const world = scene.fishingCamera?.world
    const pxPerMeter = world?.pxPerMeter ?? 18
    const maxMeters = Math.max(1, scene.castRangePx / pxPerMeter)
    const nearEnd = clamp(23 / maxMeters, 0, 1)
    const midEnd = clamp(35 / maxMeters, 0, 1)

    scene.powerGfx.clear()
    scene.powerGfx.fillStyle(0x173248, 0.14)
    scene.powerGfx.fillRoundedRect(bx + 2, by + 4, 202, 28, 14)
    scene.powerGfx.fillStyle(0xf8fdff, 0.96)
    scene.powerGfx.lineStyle(2.5, 0x9bcfe5, 0.95)
    scene.powerGfx.fillRoundedRect(bx, by, 202, 28, 14)
    scene.powerGfx.strokeRoundedRect(bx, by, 202, 28, 14)

    scene.powerGfx.fillStyle(0x71d6a2, 0.22)
    scene.powerGfx.fillRoundedRect(innerX, innerY, maxW * nearEnd, 18, 9)
    if (midEnd > nearEnd) {
      scene.powerGfx.fillStyle(0xffd95a, 0.20)
      scene.powerGfx.fillRect(innerX + maxW * nearEnd, innerY, maxW * (midEnd - nearEnd), 18)
    }
    if (midEnd < 1) {
      scene.powerGfx.fillStyle(0xff765a, 0.16)
      scene.powerGfx.fillRoundedRect(innerX + maxW * midEnd, innerY, maxW * (1 - midEnd), 18, 9)
    }

    if (nearEnd < 1) {
      scene.powerGfx.lineStyle(1.5, 0x173248, 0.28)
      scene.powerGfx.lineBetween(innerX + maxW * nearEnd, innerY + 1, innerX + maxW * nearEnd, innerY + 17)
    }
    if (midEnd < 1) {
      scene.powerGfx.lineStyle(1.5, 0x173248, 0.28)
      scene.powerGfx.lineBetween(innerX + maxW * midEnd, innerY + 1, innerX + maxW * midEnd, innerY + 17)
    }

    const fw = maxW * power01
    if (fw > 0) {
      const currentMeters = maxMeters * power01
      const color = currentMeters < 23 ? 0x71d6a2 : currentMeters < 35 ? 0xffd95a : 0xff765a
      scene.powerGfx.fillStyle(color, 0.94)
      scene.powerGfx.fillRoundedRect(innerX, innerY, fw, 18, 9)
      scene.powerGfx.fillStyle(0xffffff, 0.34)
      scene.powerGfx.fillRoundedRect(innerX + 4, innerY + 3, Math.max(0, fw - 8), 5, 3)
    }

    scene.powerGfx.lineStyle(1.6, 0xffffff, 0.72)
    scene.powerGfx.strokeRoundedRect(innerX, innerY, maxW, 18, 9)
    scene.powerLabel.setVisible(true)
  }

  buildHUD(W, _H) {
    const scene = this.scene
    const guideY = MOBILE_FRAME.topHudHeight + 24

    const hintBg = scene.add.graphics().setDepth(54)
    hintBg.fillStyle(0x173248, 0.12)
    hintBg.fillRoundedRect(W / 2 - 126, guideY - 15, 252, 34, 14)
    hintBg.fillStyle(0xf8fdff, 0.94)
    hintBg.lineStyle(1.8, 0x9bcfe5, 0.88)
    hintBg.fillRoundedRect(W / 2 - 126, guideY - 19, 252, 34, 14)
    hintBg.strokeRoundedRect(W / 2 - 126, guideY - 19, 252, 34, 14)
    scene.castHintBg = hintBg

    scene.hintText = scene.add.text(W / 2, guideY - 2, '', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900',
      color: UI_COLORS.ink,
    }).setOrigin(0.5).setDepth(55)

    scene.powerLabel = scene.add.text(W / 2, MOBILE_FRAME.playBottom - 72, 'CAST POWER', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900',
      color: UI_COLORS.ink,
      stroke: '#ffffff', strokeThickness: 3,
      letterSpacing: 0.5,
      shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(37).setVisible(false)
  }

  destroy() {
    this.scene.castHintBg?.destroy()
    this.scene.hintText?.destroy()
    this.scene.powerLabel?.destroy()
  }
}
