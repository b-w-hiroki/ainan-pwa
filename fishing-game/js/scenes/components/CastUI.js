import { FONT, SHADOW, UI_COLORS } from '../../config/fontStyles.js'
import { buildTrajectory } from '../../game/cast.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export class CastUI {
  constructor(scene) {
    this.scene = scene
  }

  drawPreview(angleDeg, power01) {
    const scene = this.scene
    const pts = buildTrajectory(scene.anchorX, scene.anchorY, angleDeg, power01, scene.castRangePx)
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

    for (let i = 14; i < pts.length; i += 5) {
      const p = pts[i]
      const r = Math.max(2, 5 - Math.floor((i - 14) / 8))
      scene.castGfx.fillStyle(0xffffff, 0.95)
      scene.castGfx.lineStyle(1.5, 0x2f9ed4, 0.85)
      scene.castGfx.fillCircle(p.x, p.y, r)
      scene.castGfx.strokeCircle(p.x, p.y, r)
    }
  }

  drawPowerBar(power01) {
    const { width: W, height: H } = this.scene.scale
    const bx = W / 2 - 101
    const by = H * 0.77

    this.scene.powerGfx.clear()
    this.scene.powerGfx.fillStyle(0x173248, 0.14)
    this.scene.powerGfx.fillRoundedRect(bx + 2, by + 4, 202, 28, 14)
    this.scene.powerGfx.fillStyle(0xf8fdff, 0.96)
    this.scene.powerGfx.lineStyle(2.5, 0x9bcfe5, 0.95)
    this.scene.powerGfx.fillRoundedRect(bx, by, 202, 28, 14)
    this.scene.powerGfx.strokeRoundedRect(bx, by, 202, 28, 14)

    const innerX = bx + 5
    const innerY = by + 5
    const maxW = 192
    const fw = maxW * power01
    if (fw > 0) {
      const color = power01 < 0.55 ? 0x71d6a2 : power01 < 0.82 ? 0xffd95a : 0xff765a
      this.scene.powerGfx.fillStyle(color, 1)
      this.scene.powerGfx.fillRoundedRect(innerX, innerY, fw, 18, 9)
      this.scene.powerGfx.fillStyle(0xffffff, 0.34)
      this.scene.powerGfx.fillRoundedRect(innerX + 4, innerY + 3, Math.max(0, fw - 8), 5, 3)
    }

    this.scene.powerLabel.setVisible(true)
  }

  buildHUD(W, H) {
    const scene = this.scene

    const hintBg = scene.add.graphics().setDepth(54)
    hintBg.fillStyle(0x173248, 0.13)
    hintBg.fillRoundedRect(W / 2 - 132, H * 0.19 - 18, 264, 40, 16)
    hintBg.fillStyle(0xf8fdff, 0.94)
    hintBg.lineStyle(2, 0x9bcfe5, 0.88)
    hintBg.fillRoundedRect(W / 2 - 132, H * 0.19 - 22, 264, 40, 16)
    hintBg.strokeRoundedRect(W / 2 - 132, H * 0.19 - 22, 264, 40, 16)
    scene.castHintBg = hintBg

    scene.hintText = scene.add.text(W / 2, H * 0.19 - 2, '', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900',
      color: UI_COLORS.ink,
    }).setOrigin(0.5).setDepth(55)

    scene.powerLabel = scene.add.text(W / 2, H * 0.74, 'CAST POWER', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900',
      color: UI_COLORS.ink,
      stroke: '#ffffff', strokeThickness: 3,
      letterSpacing: 2,
      shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(37).setVisible(false)
  }

  destroy() {
    this.scene.castHintBg?.destroy()
    this.scene.hintText?.destroy()
    this.scene.powerLabel?.destroy()
  }
}
