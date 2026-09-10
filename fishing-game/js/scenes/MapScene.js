import Phaser from 'phaser'
import { FONT, SHADOW, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { getCatches, markLicenseFlag } from '../game/progress.js'
import { buildFooterNav } from '../ui/FooterNav.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const FISH_ART = {
  aji: ASSETS.fish.ajiIcon,
  tai: ASSETS.fish.madaiIcon,
  bass: ASSETS.fish.blackBassIcon,
  buri: ASSETS.fish.buriIcon,
  kue: ASSETS.fish.kueIcon,
}

const POINT_PIN = {
  pointA: ASSETS.ui.spotPinHarbor,
  pointB: ASSETS.ui.spotPinBay,
  pointC: ASSETS.ui.spotPinCape,
}

const FISHING_POINTS = [
  {
    id: 'pointA', name: '汐風港', description: 'アジ・マダイが狙える港の定番ポイント',
    trait: '港', summary: '港の定番スポット', difficulty: 1,
    fish: ['アジ', 'マダイ', 'ブリ'], fishIds: ['aji', 'tai', 'buri'], fishShadows: 12,
    env: '昼は見通し良好 / 魚影多め', accent: 0x5bb5d8, pos: { x: 0.35, y: 0.32 },
  },
  {
    id: 'pointB', name: '蒼海湾', description: '穏やかな入り江に潜む穴場スポット',
    trait: '入り江', summary: '静かな入り江', difficulty: 2,
    fish: ['アジ', 'ブラックバス'], fishIds: ['aji', 'bass'], fishShadows: 8,
    env: '入り江で静か / レア魚の気配', accent: 0x8f80e8, pos: { x: 0.62, y: 0.51 },
  },
  {
    id: 'pointC', name: '黒潮崎', description: '伝説のクエが眠る激流の激難ポイント',
    trait: '沖磯', summary: '激流の難所', difficulty: 3,
    fish: ['マダイ', 'ブリ', 'クエ'], fishIds: ['tai', 'buri', 'kue'], fishShadows: 5,
    env: '流れが速い / 大物チャンス', accent: 0xff765a, pos: { x: 0.38, y: 0.70 },
  },
]

export default class MapScene extends Phaser.Scene {
  constructor() { super({ key: 'MapScene' }) }

  preload() {
    const wanted = [ASSETS.backgrounds.mapTown, ...Object.values(POINT_PIN), ...Object.values(FISH_ART)]
    wanted.forEach(asset => {
      if (asset?.status === 'ready' && !this.textures.exists(asset.key)) this.load.image(asset.key, asset.path)
    })
  }

  create() {
    const { width: W, height: H } = this.scale
    this._detailPanel = null
    this._dismissLayer = null
    this._buildMapBackground(W, H)
    this._buildHeader(W)
    this._buildRouteLine(W, H)
    FISHING_POINTS.forEach((point, i) => this._buildPointMarker(point, W, H, i))
    this._showMapHint(W, H)
    this._buildBackBtn()
    buildFooterNav(this, W, H, 'home')
  }

  _buildHeader(W) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x173248, 0.10)
    g.fillRoundedRect(72, 52, W - 92, 70, 20)
    g.fillStyle(0xf8fdff, 0.94)
    g.lineStyle(2, 0xffffff, 0.82)
    g.fillRoundedRect(72, 48, W - 92, 70, 20)
    g.strokeRoundedRect(72, 48, W - 92, 70, 20)
    this.add.text(W / 2 + 18, 70, '釣り場を選ぼう', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '25px', fontWeight: '900',
      color: UI_COLORS.ink, shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2 + 18, 99, '場所ごとに魚と景色が変わる', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '800', color: UI_COLORS.inkSoft,
    }).setOrigin(0.5).setDepth(5)
  }

  _buildMapBackground(W, H) {
    const artBg = addCoverImage(this, ASSETS.backgrounds.mapTown.key, W, H, 0)
    if (artBg) {
      const veil = this.add.graphics().setDepth(1)
      veil.fillStyle(0xffffff, 0.13)
      veil.fillRect(0, 0, W, H)
      veil.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.30, 0.30, 0.06, 0.06)
      veil.fillRect(0, 0, W, H * 0.24)
      this._buildSeaDecorations(W, H)
      return
    }

    const bg = this.add.graphics().setDepth(0)
    bg.fillGradientStyle(0xfff2cf, 0xfff2cf, 0xa8ddf0, 0xa8ddf0, 1)
    bg.fillRect(0, 0, W, H)
    bg.fillGradientStyle(0x78cdec, 0x78cdec, 0x4fa7d6, 0x4fa7d6, 1)
    bg.fillRoundedRect(W * 0.03, H * 0.17, W * 0.94, H * 0.76, 28)
    bg.fillStyle(0xf2d789, 1)
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
  }

  _buildSeaDecorations(W, H) {
    const g = this.add.graphics().setDepth(1.6)
    g.fillStyle(0x6dc2e8, 0.28)
    g.fillEllipse(W * 0.78, H * 0.20, 112, 22)
    g.fillEllipse(W * 0.26, H * 0.83, 84, 18)
    this._drawTinyBoat(g, W * 0.78, H * 0.27, 0.82)
    this._drawTinyBoat(g, W * 0.58, H * 0.74, 0.68)
    this._drawBuoy(g, W * 0.27, H * 0.45, 0xff765a)
    this._drawBuoy(g, W * 0.72, H * 0.61, 0xffd95a)
  }

  _drawTinyBoat(g, x, y, sc = 1) {
    g.fillStyle(0xffffff, 0.88)
    g.fillRoundedRect(x - 16 * sc, y - 4 * sc, 32 * sc, 9 * sc, 4 * sc)
    g.fillStyle(0x2c78a8, 0.78)
    g.fillTriangle(x - 4 * sc, y - 5 * sc, x + 9 * sc, y - 18 * sc, x + 9 * sc, y - 5 * sc)
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
    const shadow = this.add.graphics().setDepth(2.4)
    shadow.lineStyle(5, 0x173248, 0.16)
    const line = this.add.graphics().setDepth(2.5)
    line.lineStyle(3, 0xffffff, 0.76)
    for (let i = 0; i < FISHING_POINTS.length - 1; i++) {
      const a = FISHING_POINTS[i]
      const b = FISHING_POINTS[i + 1]
      const x1 = W * a.pos.x, y1 = H * a.pos.y, x2 = W * b.pos.x, y2 = H * b.pos.y
      this._drawDashedLine(shadow, x1, y1 + 2, x2, y2 + 2, 10, 8)
      this._drawDashedLine(line, x1, y1, x2, y2, 10, 8)
    }
  }

  _drawDashedLine(g, x1, y1, x2, y2, dash, gap) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy)
    const ux = dx / len, uy = dy / len
    for (let d = 0; d < len; d += dash + gap) {
      const d2 = Math.min(d + dash, len)
      g.lineBetween(x1 + ux * d, y1 + uy * d, x1 + ux * d2, y1 + uy * d2)
    }
  }

  _showMapHint(W, H) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0xf8fdff, 0.90)
    g.lineStyle(1.5, 0x9bcfe5, 0.8)
    g.fillRoundedRect(W / 2 - 110, H - 112, 220, 34, 16)
    g.strokeRoundedRect(W / 2 - 110, H - 112, 220, 34, 16)
    this.add.text(W / 2, H - 95, 'ピンをタップして釣り場を確認', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5).setDepth(5)
  }

  _buildPointMarker(point, W, H, index) {
    const x = W * point.pos.x, y = H * point.pos.y
    const marker = this.add.container(x, y).setDepth(6)
    const pulse = this.add.graphics()
    pulse.fillStyle(point.accent, 0.18)
    pulse.fillCircle(0, 0, 38)

    const pinAsset = POINT_PIN[point.id]
    const pin = this.add.image(0, -6, pinAsset.key).setDisplaySize(58, 72)
    const numBg = this.add.graphics()
    numBg.fillStyle(0x173248, 0.82)
    numBg.fillCircle(21, -28, 11)
    const num = this.add.text(21, -28, `${index + 1}`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5)

    const nameBg = this.add.graphics()
    nameBg.fillStyle(0xf8fdff, 0.96)
    nameBg.lineStyle(1.5, point.accent, 0.86)
    nameBg.fillRoundedRect(-45, 30, 90, 27, 11)
    nameBg.strokeRoundedRect(-45, 30, 90, 27, 11)
    const name = this.add.text(0, 43, point.name, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5)

    const hit = this.add.circle(0, 0, 42, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showPointDetail(point))
      .on('pointerover', () => marker.setScale(1.07))
      .on('pointerout', () => marker.setScale(1))

    marker.add([pulse, pin, numBg, num, nameBg, name, hit])
    this.tweens.add({ targets: pulse, scaleX: 1.18, scaleY: 1.18, alpha: 0.32, duration: 900 + index * 120, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
    this.tweens.add({ targets: pin, y: pin.y - 3, duration: 1250 + index * 140, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
  }

  _showPointDetail(point) {
    const { width: W, height: H } = this.scale
    this._closePointDetail()
    markLicenseFlag('ainan_seen_spot')
    const caughtIds = new Set(getCatches().map(c => c.fishId))
    const unknownCount = point.fishIds.filter(id => !caughtIds.has(id)).length

    const x = W * 0.05, y = H - 276, w = W * 0.90, h = 192
    const items = []
    this._dismissLayer = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setDepth(19).setInteractive().on('pointerdown', () => this._closePointDetail())

    const sh = this.add.graphics()
    sh.fillStyle(0x173248, 0.16)
    sh.fillRoundedRect(x + 3, y + 5, w, h, 22)
    const bg = this.add.graphics()
    bg.fillStyle(0xf8fdff, 0.99)
    bg.lineStyle(2.2, 0x9bcfe5, 0.92)
    bg.fillRoundedRect(x, y, w, h, 22)
    bg.strokeRoundedRect(x, y, w, h, 22)
    bg.fillStyle(point.accent, 0.12)
    bg.fillRoundedRect(x + 12, y + 12, 66, 72, 18)
    items.push(sh, bg)

    const pinAsset = POINT_PIN[point.id]
    items.push(this.add.image(x + 45, y + 48, pinAsset.key).setDisplaySize(45, 56))
    items.push(this.add.text(x + 88, y + 20, point.name, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '21px', fontWeight: '900', color: UI_COLORS.ink,
    }))
    items.push(this.add.text(x + 88, y + 50, point.description, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '800', color: UI_COLORS.inkSoft, wordWrap: { width: w - 110 },
    }))

    this._addDifficultyTo(items, x + w - 18, y + 18, point.difficulty)
    items.push(this.add.text(x + 18, y + 96, `未発見 ${unknownCount}/${point.fishIds.length}   魚影 ${point.fishShadows}   ${point.env}`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.inkSoft,
    }))

    point.fishIds.forEach((id, i) => {
      const cx = x + 32 + i * 52
      const cy = y + 138
      const chip = this.add.graphics()
      chip.fillStyle(0xffffff, 0.96)
      chip.lineStyle(1.4, point.accent, 0.7)
      chip.fillCircle(cx, cy, 21)
      chip.strokeCircle(cx, cy, 21)
      items.push(chip)
      const art = FISH_ART[id]
      if (art?.key && this.textures.exists(art.key)) items.push(this.add.image(cx, cy, art.key).setDisplaySize(38, 38))
    })

    const btn = this.add.graphics()
    btn.fillStyle(0x173248, 0.12)
    btn.fillRoundedRect(x + w - 130 + 2, y + 119 + 3, 108, 50, 16)
    btn.fillStyle(0xffd95a, 1)
    btn.lineStyle(2, 0x173248, 0.82)
    btn.fillRoundedRect(x + w - 130, y + 119, 108, 50, 16)
    btn.strokeRoundedRect(x + w - 130, y + 119, 108, 50, 16)
    const btnText = this.add.text(x + w - 76, y + 144, 'ここで釣る', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5)
    const hit = this.add.rectangle(x + w - 76, y + 144, 116, 56, 0x000000, 0).setInteractive({ useHandCursor: true }).on('pointerdown', () => this._goToFishing(point.id))
    items.push(btn, btnText, hit)

    this._detailPanel = this.add.container(0, 20, items).setDepth(20).setAlpha(0)
    this.tweens.add({ targets: this._detailPanel, y: 0, alpha: 1, duration: 180, ease: 'Sine.easeOut' })
  }

  _closePointDetail() {
    this._detailPanel?.destroy(true)
    this._detailPanel = null
    this._dismissLayer?.destroy()
    this._dismissLayer = null
  }

  _addDifficultyTo(items, rightX, topY, level) {
    const startX = rightX - 48
    for (let i = 0; i < 3; i++) {
      items.push(this.add.text(startX + i * 16, topY, '★', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: i < level ? '#e6a800' : '#cbd6dc',
      }))
    }
  }

  _buildBackBtn() {
    const c = this.add.container(16, 16).setDepth(200)
    const bg = this.add.graphics()
    bg.fillStyle(0xf8fdff, 0.95)
    bg.lineStyle(1.5, 0x9bcfe5, 0.85)
    bg.fillRoundedRect(0, 0, 62, 34, 13)
    bg.strokeRoundedRect(0, 0, 62, 34, 13)
    const txt = this.add.text(31, 17, '‹ 戻る', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5)
    const hit = this.add.rectangle(31, 17, 70, 42, 0x000000, 0).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('HomeScene'))
    c.add([bg, txt, hit])
  }

  _goToFishing(pointId) {
    markLicenseFlag('ainan_went_fishing')
    this.scene.start('GameScene', {
      point: pointId,
      season: this._getCurrentSeason(),
      weather: 'sunny',
      timeOfDay: this._getCurrentTimeOfDay(),
    })
  }

  _getCurrentSeason() {
    const m = new Date().getMonth() + 1
    if (m >= 3 && m <= 5) return 'spring'
    if (m >= 6 && m <= 8) return 'summer'
    if (m >= 9 && m <= 11) return 'autumn'
    return 'winter'
  }

  _getCurrentTimeOfDay() {
    const h = new Date().getHours()
    if (h >= 5 && h < 10) return 'morning'
    if (h >= 10 && h < 16) return 'noon'
    if (h >= 16 && h < 19) return 'evening'
    return 'night'
  }
}
