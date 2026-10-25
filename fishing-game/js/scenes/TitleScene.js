import Phaser from 'phaser'
import { FONT, SHADOW } from '../config/fontStyles.js'
import { ICONS } from '../config/icons.js'
import { ASSETS } from '../config/assetManifest.js'
import { loadGameTexture } from '../utils/loadGameTexture.js'
import { Button } from '../ui/Button.js'
import { getQaSceneRoute } from '../game/qaBootstrap.js'
import { loadUiArt } from '../ui/UiArt.js'
import { isReducedMotion } from '../game/feedback.js'
import { addCoverImage, addReadableOverlay } from '../utils/imageLayout.js'
import { canvasDisplayScale, touchHeight } from '../ui/touchLayout.js'

const TEXT_RES = window.devicePixelRatio ?? 1
const BUILD_ID = (import.meta.env.VITE_BUILD_SHA ?? 'local').slice(0, 8)

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' })
  }

  preload() {
    loadUiArt(this)
    const bg = ASSETS.backgrounds.titleHarborMorning
    if (!this.textures.exists(bg.key)) loadGameTexture(this, bg)
  }

  create() {
    const { width: W, height: H } = this.scale
    const compact = canvasDisplayScale(this) < 0.75
    const shortPortrait = H <= 500 && W < H

    // Deterministic CI screenshot routing. Normal play is unaffected.
    const qaRoute = getQaSceneRoute(window.location.search)
    if (qaRoute) {
      this.scene.start(qaRoute.scene, qaRoute.data)
      return
    }

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

    // ─── タイトルロゴ ────────────────────────────────
    const location = this.add.graphics().setDepth(4)
    location.fillStyle(0x123a54, 0.72)
    location.lineStyle(1.5, 0xffe6a0, 0.9)
    location.fillRoundedRect(W / 2 - 81, H * 0.105 - 14, 162, 28, 14)
    location.strokeRoundedRect(W / 2 - 81, H * 0.105 - 14, 162, 28, 14)
    this.add.text(W / 2, H * 0.105, 'EHIME  ·  愛南の海', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: compact ? '15px' : '12px', fontWeight: '900',
      color: '#fff5d9', letterSpacing: 1.1,
    }).setOrigin(0.5).setDepth(5)

    const logoGroup = this.add.container(W / 2, H * 0.19).setDepth(5)
    const logo = this.add.text(0, 0, 'AINAN', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '68px', fontWeight: '900',
      color: '#fff9e9',
      stroke: '#173248', strokeThickness: 6,
      shadow: { ...SHADOW.strong, color: 'rgba(9,38,57,0.62)', offsetY: 5, blur: 2 },
      letterSpacing: 2,
    }).setOrigin(0.5)
    logoGroup.add([logo])

    this.tweens.add({
      targets: logoGroup, y: H * 0.19 - 5,
      duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    })

    const subBg = this.add.graphics().setDepth(4)
    subBg.fillStyle(0x123a54, 0.78)
    subBg.lineStyle(1.5, 0xffd95a, 0.92)
    subBg.fillRoundedRect(W / 2 - 112, H * 0.27 - 16, 224, 32, 16)
    subBg.strokeRoundedRect(W / 2 - 112, H * 0.27 - 16, 224, 32, 16)
    this.add.text(W / 2, H * 0.27, '釣りと町づくりの海辺の暮らし', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: compact ? '17px' : '14px', fontWeight: '900',
      color: '#ffffff',
      shadow: SHADOW.medium,
    }).setOrigin(0.5).setDepth(5)

    // ─── 世界観と遊びの紹介 ──────────────────────────
    const copyY = H * (shortPortrait ? 0.52 : 0.615)
    const copyBg = this.add.graphics().setDepth(4)
    copyBg.fillStyle(0x123a54, 0.76)
    copyBg.lineStyle(1.5, 0xffffff, 0.56)
    copyBg.fillRoundedRect(W / 2 - 156, copyY - 37, 312, 74, 20)
    copyBg.strokeRoundedRect(W / 2 - 156, copyY - 37, 312, 74, 20)
    this.add.text(W / 2, copyY - 12, '釣って、育てて、港町を元気に。', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: compact ? '18px' : '16px', fontWeight: '900',
      color: '#fff5d9',
      shadow: SHADOW.medium,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2, copyY + 15, '愛南の海から、物語をはじめよう', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: compact ? '15px' : '12px', fontWeight: '800',
      color: '#e5f7ff',
      shadow: SHADOW.medium,
    }).setOrigin(0.5).setDepth(5)

    // ─── スタートボタン ──────────────────────────────
    this._startButton = new Button(this, {
      x: W / 2, y: H * (shortPortrait ? 0.70 : 0.735),
      w: 282, h: 70,
      label: 'ゲームをはじめる',
      subLabel: '釣って、育てて、町を元気に',
      icon:  ICONS.PLAY,
      variant: 'primary',
      fontSize: 22,
      depth: 10,
      keyboard: true,
      pulse: true,
      onClick: () => this._startHome(),
    })

    const helpHeight = touchHeight(this, 46)
    this._helpButton = new Button(this, {
      x: W / 2, y: H * (shortPortrait ? 0.87 : helpHeight > 54 ? 0.84 : 0.825),
      w: 210, h: helpHeight,
      label: '遊び方',
      icon: ICONS.HELP,
      variant: 'ghost',
      fontSize: 16,
      depth: 10,
      onClick: () => this.scene.start('HelpScene'),
    })

    // ボタン誘導パルス
    // ─── フッター ─────────────────────────────────
    if (!shortPortrait) {
      const footerBg = this.add.graphics().setDepth(4)
      footerBg.fillStyle(0xffffff, 0.70)
      footerBg.fillRoundedRect(W / 2 - 122, H * 0.95 - 12, 244, 24, 12)
      this.add.text(W / 2, H * 0.95, '釣り × 町おこし  AINAN', {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: compact ? '15px' : '12px', fontWeight: '700',
        color: '#1a3a5a',
      }).setOrigin(0.5).setDepth(5).setAlpha(0.9)
    }

    this.add.text(W - 8, H - 7, `build ${BUILD_ID}`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '8px', fontWeight: '800',
      color: '#173248',
    }).setOrigin(1, 1).setDepth(6).setAlpha(0.58)
  }

  _startHome() {
    if (this._leavingTitle) return
    this._leavingTitle = true

    const enterHome = () => this.scene.start('HomeScene', { fromTitle: true })
    if (isReducedMotion()) {
      enterHome()
      return
    }

    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, enterHome)
    this.cameras.main.fadeOut(260, 7, 34, 54)
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
