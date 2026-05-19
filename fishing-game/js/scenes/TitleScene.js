import Phaser from 'phaser'
import { FONT, SHADOW } from '../config/fontStyles.js'
import { ICONS } from '../config/icons.js'
import { ASSETS } from '../config/assetManifest.js'
import { Button } from '../ui/Button.js'
import { addCoverImage, addReadableOverlay } from '../utils/imageLayout.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' })
  }

  preload() {
    const bg = ASSETS.backgrounds.titleHarborMorning
    if (!this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
  }

  create() {
    const { width: W, height: H } = this.scale

    const artBg = addCoverImage(this, ASSETS.backgrounds.titleHarborMorning.key, W, H, 0)
    if (artBg) {
      addReadableOverlay(this, W, H, 1)
      this._buildDaytimeAccents(W, H)
    } else {
      const bg = this.add.graphics().setDepth(0)
      bg.fillGradientStyle(0xffe8b8, 0xffe8b8, 0xa0d6ee, 0xa0d6ee, 1)
      bg.fillRect(0, 0, W, H * 0.55)
      bg.fillGradientStyle(0x5db3df, 0x5db3df, 0x1f6996, 0x1f6996, 1)
      bg.fillRect(0, H * 0.55, W, H * 0.45)

      // 太陽
      bg.fillStyle(0xffe066, 1)
      bg.fillCircle(W * 0.5, H * 0.42, 56)
      bg.fillStyle(0xfff3b0, 0.5)
      bg.fillCircle(W * 0.5, H * 0.42, 86)
      bg.fillStyle(0xffe9a0, 0.25)
      bg.fillCircle(W * 0.5, H * 0.42, 118)

      // 太陽の海面反射
      bg.fillStyle(0xffd86b, 0.32)
      bg.fillRect(W * 0.40, H * 0.555, W * 0.20, 4)
      ;[0.58, 0.62, 0.68, 0.76, 0.84].forEach((f, i) => {
        bg.fillStyle(0xffd86b, 0.18 - i * 0.025)
        const w = W * (0.20 + i * 0.05)
        bg.fillRect((W - w) / 2, H * f, w, 2.5)
      })

      // 水面のセルシェードストライプ（白）
      bg.fillStyle(0xffffff, 0.16)
      bg.fillRect(0, H * 0.66, W, 2)
      bg.fillStyle(0xffffff, 0.10)
      bg.fillRect(0, H * 0.74, W, 2)
      bg.fillStyle(0xffffff, 0.06)
      bg.fillRect(0, H * 0.84, W, 2)

      // 雲（背景）
      this._drawCloud(bg, W * 0.15, H * 0.18, 0.9)
      this._drawCloud(bg, W * 0.82, H * 0.12, 0.65)

      // 鳥のシルエット
      this._drawBird(bg, W * 0.20, H * 0.30)
      this._drawBird(bg, W * 0.74, H * 0.34, 0.7)
    }

    // ─── ロゴ ──────────────────────────────────────
    const logoGroup = this.add.container(W / 2, H * 0.19).setDepth(5)

    const logo = this.add.text(0, 0, '釣りゲーム', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '62px', fontWeight: '900',
      color: '#ffffff',
      shadow: SHADOW.strong,
    }).setOrigin(0.5)

    // （仮）バッジ
    const kariW = 58, kariH = 26
    const kariBg = this.add.graphics()
    kariBg.fillStyle(0xff6a3d, 1)
    kariBg.fillRoundedRect(-kariW / 2, -kariH / 2, kariW, kariH, 8)
    kariBg.y = -44
    const kariTxt = this.add.text(0, -44, '（仮）', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5)

    logoGroup.add([logo, kariBg, kariTxt])

    this.tweens.add({
      targets: logoGroup, y: H * 0.19 - 6,
      duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    })

    // サブタイトル（ロゴの下）
    const subBg = this.add.graphics().setDepth(4)
    subBg.fillStyle(0x123a54, 0.26)
    subBg.fillRoundedRect(W / 2 - 92, H * 0.27 - 14, 184, 28, 14)
    this.add.text(W / 2, H * 0.27, '— 釣り × 町おこし —', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '17px', fontWeight: '800',
      color: '#ffffff',
      shadow: SHADOW.medium,
    }).setOrigin(0.5).setDepth(5)

    // ─── キャッチコピー ─────────────────────────────
    const copyBg = this.add.graphics().setDepth(4)
    copyBg.fillStyle(0x123a54, 0.34)
    copyBg.fillRoundedRect(W / 2 - 142, H * 0.62 - 18, 284, 36, 18)
    this.add.text(W / 2, H * 0.62, '小さな港町で、大きな一匹を狙おう', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '16px', fontWeight: '700',
      color: '#ffffff',
      shadow: SHADOW.medium,
    }).setOrigin(0.5).setDepth(5)

    // ─── スタートボタン ──────────────────────────────
    const btn = new Button(this, {
      x: W / 2, y: H * 0.735,
      w: 270, h: 68,
      label: 'タップでスタート',
      icon:  ICONS.PLAY,
      variant: 'primary',
      fontSize: 22,
      depth: 10,
      onClick: () => this.scene.start('HomeScene'),
    })

    // ボタン誘導パルス
    this.tweens.add({
      targets: btn.container,
      scaleX: 1.04, scaleY: 1.04,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    })

    // ─── フッター ─────────────────────────────────
    const footerBg = this.add.graphics().setDepth(4)
    footerBg.fillStyle(0xffffff, 0.70)
    footerBg.fillRoundedRect(W / 2 - 122, H * 0.95 - 12, 244, 24, 12)
    this.add.text(W / 2, H * 0.95, '釣り × 町おこしゲーム（プロトタイプ）', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '700',
      color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(5).setAlpha(0.9)
  }

  _drawCloud(g, cx, cy, sc) {
    const w = 90 * sc, h = 22 * sc
    g.fillStyle(0xffffff, 0.92)
    g.lineStyle(2, 0xc8e8f8, 0.85)
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2)
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2)
    g.fillCircle(cx - w * 0.2, cy - h * 0.7, h * 0.95)
    g.fillCircle(cx + w * 0.08, cy - h * 0.55, h * 0.75)
    g.fillCircle(cx + w * 0.34, cy - h * 0.38, h * 0.55)
  }

  _drawBird(g, cx, cy, sc = 1) {
    const s = 10 * sc
    g.lineStyle(2.2 * sc, 0x1a3a5a, 0.55)
    g.beginPath()
    g.moveTo(cx - s, cy)
    g.lineTo(cx - s * 0.5, cy - s * 0.5)
    g.lineTo(cx, cy)
    g.lineTo(cx + s * 0.5, cy - s * 0.5)
    g.lineTo(cx + s, cy)
    g.strokePath()
  }

  _buildDaytimeAccents(W, H) {
    const g = this.add.graphics().setDepth(2)

    g.fillGradientStyle(0x42c8ff, 0x42c8ff, 0xffffff, 0xffffff, 0.18, 0.18, 0.02, 0.02)
    g.fillRect(0, 0, W, H * 0.34)
    g.fillStyle(0xffffff, 0.14)
    g.fillCircle(W * 0.82, H * 0.34, 52)
    g.fillCircle(W * 0.82, H * 0.34, 82)

    this._drawWhiteCloud(g, W * 0.18, H * 0.13, 0.62)
    this._drawWhiteCloud(g, W * 0.82, H * 0.18, 0.48)
    this._drawBird(g, W * 0.62, H * 0.12, 0.85)
    this._drawBird(g, W * 0.72, H * 0.16, 0.62)

    g.lineStyle(2, 0xffffff, 0.36)
    g.lineBetween(W * 0.12, H * 0.47, W * 0.38, H * 0.46)
    g.lineBetween(W * 0.60, H * 0.50, W * 0.88, H * 0.49)
  }

  _drawWhiteCloud(g, cx, cy, sc) {
    const w = 86 * sc
    const h = 20 * sc
    g.fillStyle(0xffffff, 0.72)
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2)
    g.fillCircle(cx - w * 0.22, cy - h * 0.55, h * 0.95)
    g.fillCircle(cx + w * 0.08, cy - h * 0.64, h * 0.82)
    g.fillCircle(cx + w * 0.34, cy - h * 0.36, h * 0.58)
  }
}
