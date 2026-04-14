import { FONT } from '../../config/fontStyles.js'
import { C, CS, COLOR } from '../../config/palette.js'
import { buildTrajectory } from '../../game/cast.js'

const TEXT_RES = window.devicePixelRatio ?? 1

/**
 * キャスト矢印・軌跡ドット・パワーゲージの描画を担当するUI。
 * GameScene が持つ castGfx / powerGfx を直接操作する。
 */
export class CastUI {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene
  }

  /**
   * キャストプレビュー（矢印・軌跡ドット）を描画する
   * @param {number} angleDeg
   * @param {number} power01
   */
  drawPreview(angleDeg, power01) {
    const scene = this.scene
    const pts = buildTrajectory(scene.anchorX, scene.anchorY, angleDeg, power01, scene.castRangePx)
    const rad  = (angleDeg * Math.PI) / 180
    const tip  = {
      x: scene.anchorX + Math.sin(rad) * scene.shaftDisplayPx,
      y: scene.anchorY - Math.cos(rad) * scene.shaftDisplayPx,
    }

    scene.castGfx.clear()

    scene.castGfx.lineStyle(20, 0xff5500, 1)
    scene.castGfx.lineBetween(scene.anchorX, scene.anchorY, tip.x, tip.y)
    scene.castGfx.lineStyle(3, C.OUTLINE, 1)
    scene.castGfx.lineBetween(scene.anchorX, scene.anchorY, tip.x, tip.y)

    const headTip = {
      x: scene.anchorX + Math.sin(rad) * (scene.shaftDisplayPx + 14),
      y: scene.anchorY - Math.cos(rad) * (scene.shaftDisplayPx + 14),
    }
    const perpX = -Math.sin(rad) * 12
    const perpY =  Math.cos(rad) * 12
    scene.castGfx.fillStyle(0xffcc00, 1)
    scene.castGfx.lineStyle(3, C.OUTLINE, 1)
    scene.castGfx.fillTriangle(
      headTip.x + Math.sin(rad) * 16, headTip.y - Math.cos(rad) * 16,
      headTip.x + perpX, headTip.y + perpY,
      headTip.x - perpX, headTip.y - perpY,
    )

    for (let i = 14; i < pts.length; i += 5) {
      const p = pts[i]
      const r = Math.max(2, 6 - Math.floor((i - 14) / 7))
      scene.castGfx.fillStyle(0xffee00, 1)
      scene.castGfx.lineStyle(2, 0xcc8800, 1)
      scene.castGfx.fillCircle(p.x, p.y, r)
      scene.castGfx.strokeCircle(p.x, p.y, r)
    }
  }

  /**
   * パワーゲージを描画する
   * @param {number} power01
   */
  drawPowerBar(power01) {
    const { width: W, height: H } = this.scene.scale
    const bx = W / 2 - 95
    const by = H * 0.77

    this.scene.powerGfx.clear()
    this.scene.powerGfx.fillStyle(0xffffff, 0.45)
    this.scene.powerGfx.lineStyle(3, C.OUTLINE, 1)
    this.scene.powerGfx.fillRoundedRect(bx, by, 190, 24, 12)
    this.scene.powerGfx.strokeRoundedRect(bx, by, 190, 24, 12)

    const fw = 184 * power01
    const g1 = fw * 0.55, g2 = fw * 0.80
    if (fw > 0) {
      this.scene.powerGfx.fillStyle(0x44ff66, 1)
      this.scene.powerGfx.fillRoundedRect(bx + 3, by + 3, g1, 18, 9)
    }
    if (fw > g1) {
      this.scene.powerGfx.fillStyle(0xffee00, 1)
      this.scene.powerGfx.fillRect(bx + 3 + g1, by + 3, g2 - g1, 18)
    }
    if (fw > g2) {
      this.scene.powerGfx.fillStyle(0xff3300, 1)
      this.scene.powerGfx.fillRoundedRect(bx + 3 + g2, by + 3, fw - g2, 18, 0)
    }

    this.scene.powerLabel.setVisible(true)
  }

  /** ヒントテキスト・パワーラベルを生成する（GameScene.create() から呼ぶ） */
  buildHUD(W, H) {
    const scene = this.scene

    scene.hintText = scene.add.text(W / 2, H * 0.19, '', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontStyle: '700',
      color: COLOR.TEXT1, backgroundColor: 'rgba(255,255,255,0.80)',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setDepth(55)

    scene.powerLabel = scene.add.text(W / 2, H * 0.74, 'CAST POWER', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontStyle: '700',
      color: CS, stroke: COLOR.WHITE, strokeThickness: 2,
      letterSpacing: 2,
    }).setOrigin(0.5).setDepth(37).setVisible(false)
  }

  destroy() {
    this.scene.hintText?.destroy()
    this.scene.powerLabel?.destroy()
  }
}
