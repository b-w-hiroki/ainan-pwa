import Phaser from 'phaser'
import { FONT, SHADOW, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { getCatches, markLicenseFlag } from '../game/progress.js'
import { getFishingPointUnlock, getTownUnlockState } from '../game/townUnlocks.js'
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
    this._pointMarkers = {}
    this._unlocks = getTownUnlockState()
    this._buildMapBackground(W, H)
    this._buildHeader(W)
    this._buildRouteLine(W, H)
    FISHING_POINTS.forEach((point, i) => this._buildPointMarker(point, W, H, i))
    this._showMapHint(W, H)
    this._buildBackBtn()
    buildFooterNav(this, W, H, 'home')
    this._maybeRevealNewPoint(W, H)
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
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '25px', fontWeight: '900', color: UI_COLORS.ink, shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2 + 18, 99, `町を育てて海を広げる  ${this._unlocks.unlockedCount}/${this._unlocks.totalCount}`, {
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
    const line = this.add.graphics().setDepth(2.5)
    for (let i = 0; i < FISHING_POINTS.length - 1; i++) {
      const a = FISHING_POINTS[i]
      const b = FISHING_POINTS[i + 1]
      const targetUnlocked = this._unlocks.points[b.id]?.unlocked ?? true
      const x1 = W * a.pos.x, y1 = H * a.pos.y, x2 = W * b.pos.x, y2 = H * b.pos.y
      shadow.lineStyle(5, 0x173248, targetUnlocked ? 0.16 : 0.08)
      line.lineStyle(3, targetUnlocked ? 0xffffff : 0x9caab0, targetUnlocked ? 0.76 : 0.42)
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
    const nextLocked = Object.values(this._unlocks.points).find(p => !p.unlocked)
    const label = nextLocked ? `次の海: ${nextLocked.unlockedBy}` : 'すべての釣り場を解放済み'
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0xf8fdff, 0.92)
    g.lineStyle(1.5, 0x9bcfe5, 0.8)
    g.fillRoundedRect(W / 2 - 126, H - 112, 252, 34, 16)
    g.strokeRoundedRect(W / 2 - 126, H - 112, 252, 34, 16)
    this.add.text(W / 2, H - 95, label, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5).setDepth(5)
  }

  _buildPointMarker(point, W, H, index) {
    const x = W * point.pos.x, y = H * point.pos.y
    const unlock = this._unlocks.points[point.id] ?? getFishingPointUnlock(point.id)
    const marker = this.add.container(x, y).setDepth(6)
    this._pointMarkers[point.id] = marker

    const pulse = this.add.graphics()
    pulse.fillStyle(unlock.unlocked ? point.accent : 0x7c8990, unlock.unlocked ? 0.18 : 0.10)
    pulse.fillCircle(0, 0, 38)

    const pinAsset = POINT_PIN[point.id]
    const pin = this.add.image(0, -6, pinAsset.key).setDisplaySize(58, 72)
    if (!unlock.unlocked) pin.setTint(0x7d8b91).setAlpha(0.58)

    const numBg = this.add.graphics()
    numBg.fillStyle(unlock.unlocked ? 0x173248 : 0x65747b, 0.88)
    numBg.fillCircle(21, -28, 12)
    const num = this.add.text(21, -28, unlock.unlocked ? `${index + 1}` : '×', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: unlock.unlocked ? '9px' : '12px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5)

    const nameBg = this.add.graphics()
    nameBg.fillStyle(0xf8fdff, 0.96)
    nameBg.lineStyle(1.5, unlock.unlocked ? point.accent : 0xa6b2b8, 0.86)
    nameBg.fillRoundedRect(-48, 30, 96, 29, 11)
    nameBg.strokeRoundedRect(-48, 30, 96, 29, 11)
    const name = this.add.text(0, 40, point.name, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5)
    const status = this.add.text(0, 52, unlock.unlocked ? 'OPEN' : 'LOCKED', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '7px', fontWeight: '900', color: unlock.unlocked ? '#2c9a68' : '#7d8b91',
    }).setOrigin(0.5)

    const hit = this.add.circle(0, 0, 44, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showPointDetail(point, unlock))
      .on('pointerover', () => marker.setScale(1.07))
      .on('pointerout', () => marker.setScale(1))

    marker.add([pulse, pin, numBg, num, nameBg, name, status, hit])
    marker._pulse = pulse
    marker._pin = pin
    if (unlock.unlocked) {
      this.tweens.add({ targets: pulse, scaleX: 1.18, scaleY: 1.18, alpha: 0.32, duration: 900 + index * 120, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
      this.tweens.add({ targets: pin, y: pin.y - 3, duration: 1250 + index * 140, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
    }
  }

  _maybeRevealNewPoint(W, H) {
    const point = [...FISHING_POINTS].reverse().find(p => {
      if (p.id === 'pointA') return false
      const unlocked = this._unlocks.points[p.id]?.unlocked
      const seen = localStorage.getItem(`ainan_seen_open_${p.id}`) === '1'
      return unlocked && !seen
    })
    if (!point) return

    localStorage.setItem(`ainan_seen_open_${point.id}`, '1')
    const marker = this._pointMarkers[point.id]
    const isBoss = point.id === 'pointC'
    const accent = isBoss ? 0xffd95a : point.accent
    this.cameras.main.flash(260, 255, 244, 190, true)

    if (marker) {
      marker.setScale(0.72)
      this.tweens.add({ targets: marker, scaleX: 1.16, scaleY: 1.16, duration: 430, ease: 'Back.easeOut', yoyo: true, hold: 260 })
      const ring = this.add.graphics().setDepth(5.8)
      ring.lineStyle(4, accent, 0.92)
      ring.strokeCircle(marker.x, marker.y, 44)
      ring.lineStyle(2, 0xffffff, 0.78)
      ring.strokeCircle(marker.x, marker.y, 53)
      this.tweens.add({
        targets: ring, alpha: 0, scaleX: 1.55, scaleY: 1.55, duration: 1100, ease: 'Quad.easeOut',
        onComplete: () => ring.destroy(),
      })
    }

    const c = this.add.container(W / 2, 150).setDepth(210).setAlpha(0).setScale(0.92)
    const bg = this.add.graphics()
    bg.fillStyle(0x173248, 0.18)
    bg.fillRoundedRect(-151, -39, 302, 82, 21)
    bg.fillStyle(isBoss ? 0x201827 : 0xf8fdff, 0.985)
    bg.lineStyle(3, accent, 0.98)
    bg.fillRoundedRect(-154, -43, 308, 82, 21)
    bg.strokeRoundedRect(-154, -43, 308, 82, 21)
    bg.fillStyle(accent, isBoss ? 0.28 : 0.16)
    bg.fillRoundedRect(-142, -32, 74, 60, 15)

    const label = this.add.text(-105, -14, isBoss ? 'BOSS\nAREA' : 'NEW\nAREA', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: isBoss ? '12px' : '13px', fontWeight: '900',
      color: isBoss ? '#ffd95a' : UI_COLORS.oceanDeep, align: 'center', lineSpacing: -2,
    }).setOrigin(0.5)
    const title = this.add.text(-52, -19, `${point.name} 解放！`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '19px', fontWeight: '900', color: isBoss ? '#ffffff' : UI_COLORS.ink,
    }).setOrigin(0, 0.5)
    const body = this.add.text(-52, 8, isBoss ? '伝説のクエが待つ最終スポット' : point.description, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: isBoss ? '#dff5ff' : UI_COLORS.inkSoft,
      wordWrap: { width: 190 },
    }).setOrigin(0, 0.5)
    const arrow = this.add.text(130, -3, '›', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '28px', fontWeight: '900', color: accent,
    }).setOrigin(0.5)
    const hit = this.add.rectangle(0, 0, 316, 90, 0x000000, 0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        c.destroy(true)
        this._showPointDetail(point, this._unlocks.points[point.id])
      })
    c.add([bg, label, title, body, arrow, hit])
    this.tweens.add({ targets: c, alpha: 1, scaleX: 1, scaleY: 1, duration: 330, ease: 'Back.easeOut' })

    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8
      const sx = marker?.x ?? W / 2
      const sy = marker?.y ?? H / 2
      const star = this.add.text(sx, sy, i % 2 ? '✦' : '★', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: i % 2 ? '12px' : '10px', fontWeight: '900',
        color: i % 3 === 0 ? '#ffffff' : isBoss ? '#ffd95a' : '#fff2a6',
      }).setOrigin(0.5).setDepth(12)
      this.tweens.add({
        targets: star,
        x: sx + Math.cos(angle) * (42 + (i % 3) * 9),
        y: sy + Math.sin(angle) * (42 + (i % 3) * 9),
        alpha: 0,
        scale: 1.35,
        duration: 700 + i * 40,
        ease: 'Quad.easeOut',
        onComplete: () => star.destroy(),
      })
    }
  }

  _showPointDetail(point, unlock = getFishingPointUnlock(point.id)) {
    const { width: W, height: H } = this.scale
    this._closePointDetail()
    markLicenseFlag('ainan_seen_spot')
    const caughtIds = new Set(getCatches().map(c => c.fishId))
    const unknownCount = point.fishIds.filter(id => !caughtIds.has(id)).length

    const x = W * 0.05, y = H - 288, w = W * 0.90, h = 204
    const items = []
    this._dismissLayer = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setDepth(19).setInteractive().on('pointerdown', () => this._closePointDetail())

    const sh = this.add.graphics()
    sh.fillStyle(0x173248, 0.16)
    sh.fillRoundedRect(x + 3, y + 5, w, h, 22)
    const bg = this.add.graphics()
    bg.fillStyle(0xf8fdff, 0.99)
    bg.lineStyle(2.2, unlock.unlocked ? 0x9bcfe5 : 0xa9b4ba, 0.92)
    bg.fillRoundedRect(x, y, w, h, 22)
    bg.strokeRoundedRect(x, y, w, h, 22)
    bg.fillStyle(unlock.unlocked ? point.accent : 0x88979e, 0.12)
    bg.fillRoundedRect(x + 12, y + 12, 66, 72, 18)
    items.push(sh, bg)

    const pinAsset = POINT_PIN[point.id]
    const detailPin = this.add.image(x + 45, y + 48, pinAsset.key).setDisplaySize(45, 56)
    if (!unlock.unlocked) detailPin.setTint(0x7d8b91).setAlpha(0.62)
    items.push(detailPin)
    items.push(this.add.text(x + 88, y + 18, point.name, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '21px', fontWeight: '900', color: UI_COLORS.ink,
    }))
    items.push(this.add.text(x + 88, y + 48, unlock.unlocked ? point.description : `未解放 / ${unlock.unlockedBy}で解放`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '800', color: unlock.unlocked ? UI_COLORS.inkSoft : '#d06b3b', wordWrap: { width: w - 110 },
    }))

    this._addDifficultyTo(items, x + w - 18, y + 18, point.difficulty, unlock.unlocked)
    items.push(this.add.text(x + 18, y + 96, unlock.unlocked
      ? `未発見 ${unknownCount}/${point.fishIds.length}   魚影 ${point.fishShadows}   ${point.env}`
      : `町へ戻って ${unlock.unlockedBy} を達成しよう`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: unlock.unlocked ? UI_COLORS.inkSoft : '#65747b',
    }))

    point.fishIds.forEach((id, i) => {
      const cx = x + 32 + i * 52
      const cy = y + 142
      const chip = this.add.graphics()
      chip.fillStyle(0xffffff, 0.96)
      chip.lineStyle(1.4, unlock.unlocked ? point.accent : 0xb2bdc2, 0.7)
      chip.fillCircle(cx, cy, 21)
      chip.strokeCircle(cx, cy, 21)
      items.push(chip)
      const art = FISH_ART[id]
      if (art?.key && this.textures.exists(art.key)) {
        const fishImage = this.add.image(cx, cy, art.key).setDisplaySize(38, 38)
        if (!unlock.unlocked) fishImage.setTint(0x748087).setAlpha(0.25)
        items.push(fishImage)
      }
    })

    const btn = this.add.graphics()
    btn.fillStyle(0x173248, 0.12)
    btn.fillRoundedRect(x + w - 136, y + 124, 116, 54, 16)
    btn.fillStyle(unlock.unlocked ? 0xffd95a : 0xdff5ff, 1)
    btn.lineStyle(2, 0x173248, 0.82)
    btn.fillRoundedRect(x + w - 138, y + 121, 116, 54, 16)
    btn.strokeRoundedRect(x + w - 138, y + 121, 116, 54, 16)
    const btnText = this.add.text(x + w - 80, y + 148, unlock.unlocked ? 'ここで釣る' : '町を育てる', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5)
    const hit = this.add.rectangle(x + w - 80, y + 148, 124, 60, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => unlock.unlocked ? this._goToFishing(point.id) : this.scene.start('TownScene'))
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

  _addDifficultyTo(items, rightX, topY, level, unlocked = true) {
    const startX = rightX - 48
    for (let i = 0; i < 3; i++) {
      items.push(this.add.text(startX + i * 16, topY, '★', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: unlocked && i < level ? '#e6a800' : '#cbd6dc',
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
    const unlock = getFishingPointUnlock(pointId)
    if (!unlock.unlocked) {
      this.scene.start('TownScene')
      return
    }
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
