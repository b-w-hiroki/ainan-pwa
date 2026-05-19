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
    trait:       '港',
    summary:     '港の定番スポット',
    difficulty:  1,
    fish:        ['アジ', 'マダイ', 'ブリ'],
    accent:      0x6cc8ff,
    pos:         { x: 0.35, y: 0.32 },
  },
  {
    id:          'pointB',
    name:        '蒼海湾',
    description: '穏やかな入り江に潜む穴場スポット',
    trait:       '入り江',
    summary:     '静かな入り江',
    difficulty:  2,
    fish:        ['アジ', 'ブラックバス'],
    accent:      0xa088ff,
    pos:         { x: 0.62, y: 0.51 },
  },
  {
    id:          'pointC',
    name:        '黒潮崎',
    description: '伝説のクエが眠る激流の激難ポイント',
    trait:       '沖磯',
    summary:     '激流の難所',
    difficulty:  3,
    fish:        ['マダイ', 'ブリ', 'クエ'],
    accent:      0xff7d57,
    pos:         { x: 0.38, y: 0.70 },
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
    const header = this.add.graphics().setDepth(4)
    header.fillStyle(0xffffff, 0.78)
    header.lineStyle(2, 0xffffff, 0.55)
    header.fillRoundedRect(82, 54, W - 104, 58, 18)
    header.strokeRoundedRect(82, 54, W - 104, 58, 18)

    this.add.text(W / 2 + 22, 74, '釣り場を選ぼう', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '27px', fontWeight: '900',
      color: '#1a3a5a',
      shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(5)

    this.add.text(W / 2 + 22, 101, '釣り場によって出る魚が変わるよ', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '700',
      color: '#4a7090',
      shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(5)

    this._buildRouteLine(W, H)

    // ─── 釣り場スポット ──────────────────────────
    FISHING_POINTS.forEach((point, i) => {
      this._buildPointCard(point, W, H, i)
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
      veil.fillGradientStyle(0xeaf8ff, 0xeaf8ff, 0xeaf8ff, 0xeaf8ff, 0.08, 0.08, 0.24, 0.24)
      veil.fillRect(W * 0.04, H * 0.15, W * 0.92, H * 0.80)
      this._buildSeaDecorations(W, H)
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

  _buildSeaDecorations(W, H) {
    const g = this.add.graphics().setDepth(1.6)

    g.fillStyle(0x6dc2e8, 0.34)
    g.fillEllipse(W * 0.78, H * 0.20, 112, 22)
    g.fillEllipse(W * 0.26, H * 0.83, 84, 18)

    this._drawTinyBoat(g, W * 0.78, H * 0.27, 0.82)
    this._drawTinyBoat(g, W * 0.58, H * 0.74, 0.68)
    this._drawBuoy(g, W * 0.27, H * 0.45, 0xff4f4f)
    this._drawBuoy(g, W * 0.72, H * 0.61, 0xffd43b)

    g.lineStyle(2, 0xffffff, 0.34)
    this._drawDashedLine(g, W * 0.22, H * 0.33, W * 0.74, H * 0.26, 7, 7)
    this._drawDashedLine(g, W * 0.66, H * 0.56, W * 0.36, H * 0.75, 7, 7)
  }

  _drawTinyBoat(g, x, y, sc = 1) {
    g.fillStyle(0xffffff, 0.88)
    g.fillRoundedRect(x - 16 * sc, y - 4 * sc, 32 * sc, 9 * sc, 4 * sc)
    g.fillStyle(0x2c78a8, 0.78)
    g.fillTriangle(x - 4 * sc, y - 5 * sc, x + 9 * sc, y - 18 * sc, x + 9 * sc, y - 5 * sc)
    g.lineStyle(1.5 * sc, 0xffffff, 0.56)
    g.lineBetween(x - 24 * sc, y + 8 * sc, x - 44 * sc, y + 10 * sc)
    g.lineBetween(x + 20 * sc, y + 8 * sc, x + 38 * sc, y + 9 * sc)
  }

  _drawBuoy(g, x, y, color) {
    g.fillStyle(0xffffff, 0.92)
    g.fillCircle(x, y, 7)
    g.fillStyle(color, 0.92)
    g.fillCircle(x, y, 4)
    g.lineStyle(2, 0xffffff, 0.45)
    g.strokeCircle(x, y, 10)
  }

  _buildRouteLine(W, H) {
    const g = this.add.graphics().setDepth(2.4)
    g.lineStyle(4, 0xffffff, 0.70)
    for (let i = 0; i < FISHING_POINTS.length - 1; i++) {
      const a = FISHING_POINTS[i]
      const b = FISHING_POINTS[i + 1]
      this._drawDashedLine(g, W * a.pos.x, H * a.pos.y, W * b.pos.x, H * b.pos.y, 10, 8)
    }
    g.lineStyle(2, 0x1a3a5a, 0.18)
    for (let i = 0; i < FISHING_POINTS.length - 1; i++) {
      const a = FISHING_POINTS[i]
      const b = FISHING_POINTS[i + 1]
      this._drawDashedLine(g, W * a.pos.x, H * a.pos.y, W * b.pos.x, H * b.pos.y, 10, 8)
    }
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

  _buildPointCard(point, W, H, index) {
    const anchorY = H * point.pos.y
    const cardW = W * 0.82
    const cardH = 116
    const cardX = index === 1 ? W * 0.12 : W * 0.08
    const cardY = anchorY - 34
    const cy = cardY + cardH / 2

    // 影
    const sh = this.add.graphics().setDepth(3)
    sh.fillStyle(0x000000, 0.18)
    sh.fillRoundedRect(cardX + 3, cardY + 4, cardW, cardH, 18)

    // 本体
    const card = this.add.graphics().setDepth(4)
    const drawCard = (fillColor) => {
      card.clear()
      card.fillStyle(fillColor, 0.96)
      card.lineStyle(2.5, 0x1a2a3a, 1)
      card.fillRoundedRect(cardX, cardY, cardW, cardH, 18)
      card.strokeRoundedRect(cardX, cardY, cardW, cardH, 18)
    }
    drawCard(0xffffff)

    // 左の色アクセントバー
    const accent = this.add.graphics().setDepth(5)
    accent.fillStyle(point.accent, 1)
    accent.fillRoundedRect(cardX, cardY, 10, cardH, { tl: 18, bl: 18, tr: 0, br: 0 })

    // 左上アイコン円
    const iconR = 24
    const iconX = cardX + 38
    const iconY = cardY + 34
    const iconBg = this.add.graphics().setDepth(5)
    iconBg.fillStyle(point.accent, 0.18)
    iconBg.fillCircle(iconX, iconY, iconR)
    iconBg.lineStyle(2, point.accent, 1)
    iconBg.strokeCircle(iconX, iconY, iconR)
    this.add.text(iconX, iconY, POINT_ICON[point.id] ?? ICONS.FISH, {
      fontSize: '28px', resolution: TEXT_RES,
    }).setOrigin(0.5).setDepth(6)

    const numBg = this.add.graphics().setDepth(6)
    numBg.fillStyle(point.accent, 1)
    numBg.lineStyle(2, 0xffffff, 1)
    numBg.fillCircle(cardX + 15, cardY + 18, 13)
    numBg.strokeCircle(cardX + 15, cardY + 18, 13)
    this.add.text(cardX + 15, cardY + 18, `${index + 1}`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '11px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5).setDepth(7)

    // ポイント名
    this.add.text(cardX + 74, cardY + 17, point.name, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '21px', fontWeight: '900', color: '#1a3a5a',
      shadow: SHADOW.subtle,
    }).setOrigin(0, 0).setDepth(6)

    // 難易度バッジ（右上）
    this._buildDifficultyBadge(cardX + cardW - 14, cardY + 14, point.difficulty, 6)

    // 説明文
    this.add.text(cardX + 74, cardY + 49, point.summary, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#4a7090',
      wordWrap: { width: cardW - 160 },
    }).setOrigin(0, 0).setDepth(6)

    // 魚種チップ
    const chipY = cardY + cardH - 34
    let chipX = cardX + 20
    point.fish.forEach(name => {
      const padX = 9
      const chipBg = this.add.graphics().setDepth(5)
      const txt = this.add.text(chipX + padX, chipY + 12, name, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '12px', fontWeight: '900', color: '#1a3a5a',
      }).setOrigin(0, 0.5).setDepth(6)
      const w = txt.width + padX * 2
      chipBg.fillStyle(point.accent, 0.18)
      chipBg.lineStyle(1.5, point.accent, 0.85)
      chipBg.fillRoundedRect(chipX, chipY, w, 26, 8)
      chipBg.strokeRoundedRect(chipX, chipY, w, 26, 8)
      chipX += w + 6
    })

    // 右端シェブロン（タップ誘導）
    const chevY = cy
    const chevX = cardX + cardW - 24
    const chevBg = this.add.graphics().setDepth(5)
    chevBg.fillStyle(point.accent, 0.18)
    chevBg.lineStyle(2, point.accent, 0.85)
    chevBg.fillCircle(chevX, chevY, 18)
    chevBg.strokeCircle(chevX, chevY, 18)
    this.add.text(chevX, chevY, ICONS.CHEVRON, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '30px', fontWeight: '900', color: '#1a2a3a',
    }).setOrigin(0.5, 0.5).setDepth(6)

    // 透明ヒットエリア（カード全体）
    const hit = this.add.rectangle(cardX + cardW / 2, cy, cardW, cardH)
      .setDepth(8)
      .setInteractive({ useHandCursor: true })
    hit.on('pointerdown', () => {
      this.tweens.add({ targets: card, scaleX: 0.98, scaleY: 0.98, duration: 80, yoyo: true })
      this._goToFishing(point.id)
    })
    hit.on('pointerover', () => drawCard(0xeaf6ff))
    hit.on('pointerout',  () => drawCard(0xffffff))
  }

  _buildDifficultyBadge(rightX, topY, level, depth = 4) {
    const STAR_W = 15
    const GAP = 2
    const totalW = STAR_W * 3 + GAP * 2
    const startX = rightX - totalW
    for (let i = 0; i < 3; i++) {
      const filled = i < level
      const tx = startX + i * (STAR_W + GAP) + STAR_W / 2
      const ty = topY + STAR_W / 2
      this.add.text(tx, ty, ICONS.STAR, {
        fontSize: '16px', resolution: TEXT_RES,
        color: filled ? '#e6a800' : '#b9c5d1', fontWeight: '900',
      }).setOrigin(0.5).setDepth(depth)
    }
    const label = ['かんたん', 'ふつう', 'むずかしい'][level - 1] ?? ''
    this.add.text(rightX, topY + 20, label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '11px', fontWeight: '900',
      color: level === 3 ? '#cc4422' : (level === 2 ? '#cc7700' : '#0077cc'),
    }).setOrigin(1, 0).setDepth(depth)
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
