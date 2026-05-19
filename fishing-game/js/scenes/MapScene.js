import Phaser from 'phaser'
import { FONT, SHADOW } from '../config/fontStyles.js'
import { COLOR } from '../config/palette.js'
import { ICONS, POINT_ICON } from '../config/icons.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const FISHING_POINTS = [
  {
    id:          'pointA',
    name:        '汐風港',
    description: 'アジ・マダイが狙える港の定番ポイント',
    difficulty:  1,
    fish:        ['アジ', 'マダイ', 'ブリ'],
    accent:      0x6cc8ff,
  },
  {
    id:          'pointB',
    name:        '蒼海湾',
    description: '穏やかな入り江に潜む穴場スポット',
    difficulty:  2,
    fish:        ['アジ', 'ブラックバス'],
    accent:      0xa088ff,
  },
  {
    id:          'pointC',
    name:        '黒潮崎',
    description: '伝説のクエが眠る激流の激難ポイント',
    difficulty:  3,
    fish:        ['マダイ', 'ブリ', 'クエ'],
    accent:      0xff7d57,
  },
]

export default class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' })
  }

  preload() {
    const bg = ASSETS.backgrounds.mapTown
    if (!this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
  }

  create() {
    const { width: W, height: H } = this.scale

    this._buildMapBackground(W, H)

    // ─── 戻るボタン ──────────────────────────────
    this._buildBackBtn(W, H)

    // ─── タイトル ──────────────────────────────
    this.add.text(W / 2, 66, '釣り場を選ぼう', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '30px', fontWeight: '900',
      color: '#1a3a5a',
      shadow: SHADOW.medium,
    }).setOrigin(0.5).setDepth(2)

    this.add.text(W / 2, 102, '釣り場によって出る魚が変わるよ', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '700',
      color: '#4a7090',
      shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(2)

    // ─── 釣り場カード ──────────────────────────
    FISHING_POINTS.forEach((point, i) => {
      this._buildPointCard(point, W, 194 + i * 168)
    })
  }

  _buildMapBackground(W, H) {
    const artBg = addCoverImage(this, ASSETS.backgrounds.mapTown.key, W, H, 0)
    if (artBg) {
      const veil = this.add.graphics().setDepth(1)
      veil.fillStyle(0xffffff, 0.18)
      veil.fillRect(0, 0, W, H)
      veil.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.30, 0.30, 0.08, 0.08)
      veil.fillRect(0, 0, W, H * 0.24)
      veil.fillGradientStyle(0xeaf8ff, 0xeaf8ff, 0xeaf8ff, 0xeaf8ff, 0.22, 0.22, 0.34, 0.34)
      veil.fillRect(W * 0.04, H * 0.12, W * 0.92, H * 0.82)
      return
    }

    const bg = this.add.graphics().setDepth(0)
    bg.fillGradientStyle(0xfff2cf, 0xfff2cf, 0xa8ddf0, 0xa8ddf0, 1)
    bg.fillRect(0, 0, W, H)

    bg.fillGradientStyle(0x78cdec, 0x78cdec, 0x4fa7d6, 0x4fa7d6, 1)
    bg.fillRoundedRect(W * 0.03, H * 0.17, W * 0.94, H * 0.76, 28)

    bg.fillStyle(0xffffff, 0.26)
    ;[0.24, 0.34, 0.49, 0.63, 0.79].forEach(f => {
      bg.fillRoundedRect(W * 0.08, H * f, W * 0.84, 3, 2)
    })

    bg.fillStyle(0xf2d789, 1)
    bg.lineStyle(2.5, 0x1a2a3a, 0.22)
    bg.beginPath()
    bg.moveTo(0, H * 0.20)
    bg.lineTo(W * 0.22, H * 0.18)
    bg.lineTo(W * 0.30, H * 0.31)
    bg.lineTo(W * 0.19, H * 0.45)
    bg.lineTo(W * 0.34, H * 0.62)
    bg.lineTo(W * 0.21, H * 0.82)
    bg.lineTo(0, H * 0.92)
    bg.closePath()
    bg.fillPath()
    bg.strokePath()

    bg.fillStyle(0x76c65a, 0.82)
    bg.fillCircle(W * 0.12, H * 0.28, 26)
    bg.fillCircle(W * 0.19, H * 0.38, 20)
    bg.fillCircle(W * 0.15, H * 0.72, 28)

    bg.lineStyle(4, 0xffffff, 0.56)
    const route = [
      [W * 0.20, H * 0.24],
      [W * 0.72, H * 0.30],
      [W * 0.28, H * 0.50],
      [W * 0.74, H * 0.66],
      [W * 0.30, H * 0.82],
    ]
    for (let i = 0; i < route.length - 1; i++) {
      const [x1, y1] = route[i]
      const [x2, y2] = route[i + 1]
      this._drawDashedLine(bg, x1, y1, x2, y2, 10, 8)
    }

    bg.fillStyle(0xffffff, 0.30)
    bg.fillCircle(W * 0.84, H * 0.20, 34)
    bg.lineStyle(2, 0x1a3a5a, 0.18)
    bg.strokeCircle(W * 0.84, H * 0.20, 34)
  }

  _drawDashedLine(g, x1, y1, x2, y2, dash, gap) {
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy)
    const ux = dx / len
    const uy = dy / len
    for (let d = 0; d < len; d += dash + gap) {
      const d2 = Math.min(d + dash, len)
      g.lineBetween(x1 + ux * d, y1 + uy * d, x1 + ux * d2, y1 + uy * d2)
    }
  }

  _buildPointCard(point, W, cy) {
    const cardX = W * 0.06
    const cardW = W * 0.88
    const cardH = 148
    const cardY = cy - cardH / 2

    // 影
    const sh = this.add.graphics().setDepth(1)
    sh.fillStyle(0x000000, 0.18)
    sh.fillRoundedRect(cardX + 3, cardY + 4, cardW, cardH, 18)

    // 本体
    const card = this.add.graphics().setDepth(2)
    const drawCard = (fillColor) => {
      card.clear()
      card.fillStyle(fillColor, 1)
      card.lineStyle(2.5, 0x1a2a3a, 1)
      card.fillRoundedRect(cardX, cardY, cardW, cardH, 18)
      card.strokeRoundedRect(cardX, cardY, cardW, cardH, 18)
    }
    drawCard(0xffffff)

    // 左の色アクセントバー
    const accent = this.add.graphics().setDepth(3)
    accent.fillStyle(point.accent, 1)
    accent.fillRoundedRect(cardX, cardY, 8, cardH, { tl: 18, bl: 18, tr: 0, br: 0 })

    // 左上アイコン円
    const iconR = 28
    const iconX = cardX + 38
    const iconY = cardY + 38
    const iconBg = this.add.graphics().setDepth(3)
    iconBg.fillStyle(point.accent, 0.18)
    iconBg.fillCircle(iconX, iconY, iconR)
    iconBg.lineStyle(2, point.accent, 1)
    iconBg.strokeCircle(iconX, iconY, iconR)
    this.add.text(iconX, iconY, POINT_ICON[point.id] ?? ICONS.FISH, {
      fontSize: '28px', resolution: TEXT_RES,
    }).setOrigin(0.5).setDepth(4)

    // ポイント名
    this.add.text(cardX + 82, cardY + 18, point.name, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '22px', fontWeight: '900', color: '#1a3a5a',
      shadow: SHADOW.subtle,
    }).setOrigin(0, 0).setDepth(4)

    // 難易度バッジ（右上）
    this._buildDifficultyBadge(cardX + cardW - 16, cardY + 16, point.difficulty)

    // 説明文
    this.add.text(cardX + 82, cardY + 50, point.description, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '700', color: '#4a7090',
      wordWrap: { width: cardW - 152 },
    }).setOrigin(0, 0).setDepth(4)

    // 魚種チップ
    const chipY = cardY + cardH - 42
    let chipX = cardX + 18
    point.fish.forEach(name => {
      const padX = 9
      const chipBg = this.add.graphics().setDepth(3)
      const txt = this.add.text(chipX + padX, chipY + 12, name, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '13px', fontWeight: '800', color: '#1a3a5a',
      }).setOrigin(0, 0.5).setDepth(4)
      const w = txt.width + padX * 2
      chipBg.fillStyle(point.accent, 0.18)
      chipBg.lineStyle(1.5, point.accent, 0.85)
      chipBg.fillRoundedRect(chipX, chipY, w, 26, 8)
      chipBg.strokeRoundedRect(chipX, chipY, w, 26, 8)
      chipX += w + 6
    })

    // 右端シェブロン（タップ誘導）
    const chevY = cy
    const chevX = cardX + cardW - 26
    const chevBg = this.add.graphics().setDepth(3)
    chevBg.fillStyle(point.accent, 0.18)
    chevBg.lineStyle(2, point.accent, 0.85)
    chevBg.fillCircle(chevX, chevY, 18)
    chevBg.strokeCircle(chevX, chevY, 18)
    this.add.text(chevX, chevY, ICONS.CHEVRON, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '30px', fontWeight: '900', color: '#1a2a3a',
    }).setOrigin(0.5, 0.5).setDepth(4)

    // 透明ヒットエリア（カード全体）
    const hit = this.add.rectangle(W / 2, cy, cardW, cardH)
      .setDepth(5)
      .setInteractive({ useHandCursor: true })
    hit.on('pointerdown', () => {
      this.tweens.add({ targets: card, scaleX: 0.98, scaleY: 0.98, duration: 80, yoyo: true })
      this._goToFishing(point.id)
    })
    hit.on('pointerover', () => drawCard(0xeaf6ff))
    hit.on('pointerout',  () => drawCard(0xffffff))
  }

  _buildDifficultyBadge(rightX, topY, level) {
    const STAR_W = 16
    const GAP = 2
    const totalW = STAR_W * 3 + GAP * 2
    const startX = rightX - totalW
    for (let i = 0; i < 3; i++) {
      const filled = i < level
      const tx = startX + i * (STAR_W + GAP) + STAR_W / 2
      const ty = topY + STAR_W / 2
      this.add.text(tx, ty, ICONS.STAR, {
        fontSize: '17px', resolution: TEXT_RES,
        color: filled ? '#e6a800' : '#b9c5d1', fontWeight: '900',
      }).setOrigin(0.5).setDepth(4)
    }
    const label = ['かんたん', 'ふつう', 'むずかしい'][level - 1] ?? ''
    this.add.text(rightX, topY + 20, label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '800',
      color: level === 3 ? '#cc4422' : (level === 2 ? '#cc7700' : '#0077cc'),
    }).setOrigin(1, 0).setDepth(4)
  }

  _buildBackBtn(W, H) {
    const btn = this.add.text(16, 16, `${ICONS.BACK} ホーム`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '15px', fontWeight: '700', color: COLOR.TEXT1,
      backgroundColor: '#ffffff',
      padding: { x: 14, y: 9 },
      shadow: { offsetX: 1, offsetY: 1, color: 'rgba(0,0,0,0.25)', blur: 2, fill: true },
    })
      .setOrigin(0, 0)
      .setDepth(200)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('HomeScene'))
      .on('pointerover', () => btn.setStyle({ backgroundColor: '#d0f0ff' }))
      .on('pointerout',  () => btn.setStyle({ backgroundColor: '#ffffff' }))
  }

  _goToFishing(pointId) {
    this.scene.start('GameScene', {
      point:     pointId,
      season:    this._getCurrentSeason(),
      weather:   'sunny',
      timeOfDay: this._getCurrentTimeOfDay(),
    })
  }

  _getCurrentSeason() {
    const m = new Date().getMonth() + 1
    if (m >= 3 && m <= 5)  return 'spring'
    if (m >= 6 && m <= 8)  return 'summer'
    if (m >= 9 && m <= 11) return 'autumn'
    return 'winter'
  }

  _getCurrentTimeOfDay() {
    const h = new Date().getHours()
    if (h >= 5  && h < 10) return 'morning'
    if (h >= 10 && h < 16) return 'noon'
    if (h >= 16 && h < 19) return 'evening'
    return 'night'
  }
}
