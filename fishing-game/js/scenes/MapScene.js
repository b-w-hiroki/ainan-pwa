import Phaser from 'phaser'
import { FONT, SHADOW } from '../config/fontStyles.js'
import { COLOR } from '../config/palette.js'
import { ICONS, POINT_ICON } from '../config/icons.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { FISH_META, getCatches, markLicenseFlag } from '../game/progress.js'
import { buildFooterNav } from '../ui/FooterNav.js'

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
    fishIds:     ['aji', 'tai', 'buri'],
    fishShadows: 12,
    env:         '昼は見通し良好 / 魚影多め',
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
    fishIds:     ['aji', 'bass'],
    fishShadows: 8,
    env:         '入り江で静か / レア魚の気配',
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
    fishIds:     ['tai', 'buri', 'kue'],
    fishShadows: 5,
    env:         '流れが速い / 大物チャンス',
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

    this._detailPanel = null
    this._dismissLayer = null

    // ─── 釣り場スポット ──────────────────────────
    FISHING_POINTS.forEach((point, i) => {
      this._buildPointMarker(point, W, H, i)
    })

    this._showMapHint(W, H)
    buildFooterNav(this, W, H, 'home')
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

  _showMapHint(W, H) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0xffffff, 0.82)
    g.lineStyle(2, 0xffffff, 0.45)
    g.fillRoundedRect(W / 2 - 118, H - 112, 236, 34, 16)
    g.strokeRoundedRect(W / 2 - 118, H - 112, 236, 34, 16)
    this.add.text(W / 2, H - 95, 'マップのポイントをタップ', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(5)
  }

  _buildPointMarker(point, W, H, index) {
    const x = W * point.pos.x
    const y = H * point.pos.y
    const marker = this.add.container(x, y).setDepth(6)

    const pulse = this.add.graphics()
    pulse.fillStyle(point.accent, 0.18)
    pulse.fillCircle(0, 0, 31)

    const g = this.add.graphics()
    g.fillStyle(0xffffff, 0.95)
    g.lineStyle(4, point.accent, 1)
    g.fillCircle(0, 0, 25)
    g.strokeCircle(0, 0, 25)
    g.fillStyle(point.accent, 1)
    g.fillCircle(0, 0, 15)

    const label = this.add.text(0, 0, `${index + 1}`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '16px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5)

    const nameBg = this.add.graphics()
    nameBg.fillStyle(0xffffff, 0.92)
    nameBg.lineStyle(1.5, point.accent, 0.86)
    nameBg.fillRoundedRect(-42, 30, 84, 25, 10)
    nameBg.strokeRoundedRect(-42, 30, 84, 25, 10)
    const name = this.add.text(0, 42, point.name, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0.5)

    const hit = this.add.circle(0, 0, 38, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showPointDetail(point, index))
      .on('pointerover', () => marker.setScale(1.06))
      .on('pointerout', () => marker.setScale(1))

    marker.add([pulse, g, label, nameBg, name, hit])
    this.tweens.add({
      targets: pulse,
      scaleX: 1.18,
      scaleY: 1.18,
      alpha: 0.35,
      duration: 900 + index * 120,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  }

  _showPointDetail(point, index) {
    const { width: W, height: H } = this.scale
    this._closePointDetail()
    markLicenseFlag('ainan_seen_spot')
    const caughtIds = new Set(getCatches().map(c => c.fishId))
    const unknownCount = point.fishIds.filter(id => !caughtIds.has(id)).length

    const x = W * 0.06
    const y = H - 250
    const w = W * 0.88
    const h = 166
    const items = []

    this._dismissLayer = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0)
      .setDepth(19)
      .setInteractive({ useHandCursor: false })
      .on('pointerdown', () => this._closePointDetail())

    const sh = this.add.graphics()
    sh.fillStyle(0x000000, 0.20)
    sh.fillRoundedRect(x + 3, y + 5, w, h, 20)

    const bg = this.add.graphics()
    bg.fillStyle(0xffffff, 0.97)
    bg.lineStyle(3, 0x1a2a3a, 1)
    bg.fillRoundedRect(x, y, w, h, 20)
    bg.strokeRoundedRect(x, y, w, h, 20)
    bg.fillStyle(point.accent, 1)
    bg.fillRoundedRect(x, y, 12, h, { tl: 20, bl: 20, tr: 0, br: 0 })

    items.push(sh, bg)

    const iconBg = this.add.graphics()
    iconBg.fillStyle(point.accent, 0.16)
    iconBg.lineStyle(2, point.accent, 1)
    iconBg.fillCircle(x + 42, y + 42, 27)
    iconBg.strokeCircle(x + 42, y + 42, 27)
    items.push(iconBg)

    items.push(this.add.text(x + 42, y + 42, POINT_ICON[point.id] ?? ICONS.FISH, {
      fontSize: '28px', resolution: TEXT_RES,
    }).setOrigin(0.5))

    items.push(this.add.text(x + 76, y + 24, point.name, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '23px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0, 0))

    items.push(this.add.text(x + 76, y + 58, point.description, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '800', color: '#4a7090',
      wordWrap: { width: w - 108 },
    }).setOrigin(0, 0))

    items.push(this.add.text(x + 22, y + 88, `未発見 ${unknownCount}/${point.fishIds.length}  魚影 ${point.fishShadows}`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900',
      color: '#e07800',
    }).setOrigin(0, 0.5))

    items.push(this.add.text(x + 22, y + 110, point.env, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '900',
      color: '#4a7090',
    }).setOrigin(0, 0.5))

    this._addDifficultyTo(items, x + w - 18, y + 18, point.difficulty)

    let chipX = x + 22
    point.fish.forEach(name => {
      const chipBg = this.add.graphics()
      const txt = this.add.text(chipX + 9, y + 134, name, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '12px', fontWeight: '900', color: '#1a3a5a',
      }).setOrigin(0, 0.5)
      const cw = txt.width + 18
      chipBg.fillStyle(point.accent, 0.16)
      chipBg.lineStyle(1.5, point.accent, 0.82)
      chipBg.fillRoundedRect(chipX, y + 121, cw, 26, 8)
      chipBg.strokeRoundedRect(chipX, y + 121, cw, 26, 8)
      items.push(chipBg, txt)
      chipX += cw + 7
    })

    const btn = this.add.graphics()
    btn.fillStyle(0xffd900, 1)
    btn.lineStyle(2.5, 0x1a2a3a, 1)
    btn.fillRoundedRect(x + w - 118, y + 111, 96, 38, 13)
    btn.strokeRoundedRect(x + w - 118, y + 111, 96, 38, 13)
    const btnText = this.add.text(x + w - 70, y + 115, 'ここで釣る', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900', color: '#1a2a3a',
    }).setOrigin(0.5)
    btnText.setY(y + 130)
    const hit = this.add.rectangle(x + w - 70, y + 130, 104, 46, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._goToFishing(point.id))
    items.push(btn, btnText, hit)

    this._detailPanel = this.add.container(0, 24, items).setDepth(20).setAlpha(0)
    this.tweens.add({
      targets: this._detailPanel,
      y: 0,
      alpha: 1,
      duration: 180,
      ease: 'Sine.easeOut',
    })
  }

  _closePointDetail() {
    this._detailPanel?.destroy(true)
    this._detailPanel = null
    this._dismissLayer?.destroy()
    this._dismissLayer = null
  }

  _addDifficultyTo(items, rightX, topY, level) {
    const STAR_W = 15
    const GAP = 2
    const totalW = STAR_W * 3 + GAP * 2
    const startX = rightX - totalW
    for (let i = 0; i < 3; i++) {
      const filled = i < level
      items.push(this.add.text(startX + i * (STAR_W + GAP) + STAR_W / 2, topY + STAR_W / 2, ICONS.STAR, {
        fontSize: '16px', resolution: TEXT_RES,
        color: filled ? '#e6a800' : '#b9c5d1', fontWeight: '900',
      }).setOrigin(0.5))
    }
    const label = ['かんたん', 'ふつう', 'むずかしい'][level - 1] ?? ''
    items.push(this.add.text(rightX, topY + 20, label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '11px', fontWeight: '900',
      color: level === 3 ? '#cc4422' : (level === 2 ? '#cc7700' : '#0077cc'),
    }).setOrigin(1, 0))
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
    markLicenseFlag('ainan_went_fishing')
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
