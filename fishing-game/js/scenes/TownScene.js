import Phaser from 'phaser'
import { FONT, SHADOW, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { ICONS } from '../config/icons.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import {
  TOWN_FACILITY_META,
  getScore,
  getTownFacilityCost,
  getTownSummary,
  upgradeTownFacility,
} from '../game/progress.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export default class TownScene extends Phaser.Scene {
  constructor() { super({ key: 'TownScene' }) }

  preload() {
    const bg = ASSETS.backgrounds.homeBase
    if (!this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
  }

  create() {
    const { width: W, height: H } = this.scale
    this._modal = null
    this._background(W, H)
    this._header(W)
    this._livingTown(W)
    this._facilityGrid(W)
    buildFooterNav(this, W, H, 'town')
  }

  _background(W, H) {
    addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillGradientStyle(0xf8fdff, 0xf8fdff, 0xf8fdff, 0xf8fdff, 0.72, 0.72, 0.88, 0.88)
    veil.fillRect(0, 0, W, H)
  }

  _header(W) {
    const g = this.add.graphics().setDepth(8)
    g.fillStyle(0x173248, 0.11)
    g.fillRoundedRect(12, 14, W - 24, 74, 22)
    g.fillStyle(0xf8fdff, 0.97)
    g.lineStyle(2, 0x9bcfe5, 0.9)
    g.fillRoundedRect(12, 10, W - 24, 74, 22)
    g.strokeRoundedRect(12, 10, W - 24, 74, 22)
    g.fillStyle(0xdff5ff, 0.7)
    g.fillRoundedRect(20, 18, W - 40, 14, 7)

    this.add.text(26, 45, `${ICONS.TOWN} みんなの港町`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '24px', fontWeight: '900',
      color: UI_COLORS.ink, shadow: SHADOW.subtle,
    }).setOrigin(0, 0.5).setDepth(10)

    this.add.text(W - 26, 39, `${getScore().toLocaleString()} pt`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: UI_COLORS.warning,
    }).setOrigin(1, 0.5).setDepth(10)
    this.add.text(W - 26, 59, 'まちづくりポイント', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.inkSoft,
    }).setOrigin(1, 0.5).setDepth(10)
  }

  _livingTown(W) {
    const s = getTownSummary()
    const bustle = s.bustle
    const x = 14, y = 98, w = W - 28, h = 246

    const shell = this.add.graphics().setDepth(3)
    shell.fillStyle(0x173248, 0.13)
    shell.fillRoundedRect(x + 3, y + 5, w, h, 24)
    shell.fillStyle(0xcfefff, 1)
    shell.lineStyle(2, 0x9bcfe5, 0.9)
    shell.fillRoundedRect(x, y, w, h, 24)
    shell.strokeRoundedRect(x, y, w, h, 24)

    shell.fillGradientStyle(0xbdeaff, 0xbdeaff, 0xe8f8ff, 0xe8f8ff, 1)
    shell.fillRoundedRect(x + 3, y + 3, w - 6, 116, { tl: 21, tr: 21, bl: 0, br: 0 })
    shell.fillStyle(0x66c9ed, 1)
    shell.fillRect(x + 3, y + 118, w - 6, 60)
    shell.fillStyle(0x48b2dc, 0.65)
    for (let i = 0; i < 6; i++) shell.fillEllipse(x + 36 + i * 60, y + 132 + (i % 2) * 7, 42, 5)
    shell.fillStyle(0xe1bf78, 1)
    shell.fillRect(x + 3, y + 178, w - 6, 65)
    shell.fillStyle(0xd3a85b, 0.34)
    shell.fillRect(x + 3, y + 204, w - 6, 4)

    this._drawHarborDecor(x, y, w, bustle)

    const milestones = [
      { name: '魚屋', threshold: 12, icon: '🐟', bx: x + 52, by: y + 126 },
      { name: '食堂', threshold: 28, icon: '🍚', bx: x + 140, by: y + 115 },
      { name: '市場', threshold: 48, icon: '🏪', bx: x + 228, by: y + 126 },
      { name: '船着場', threshold: 70, icon: '⛴️', bx: x + 316, by: y + 110 },
    ]
    milestones.forEach(m => this._building(m.bx, m.by, m.name, bustle >= m.threshold ? m.icon : '🔒', bustle >= m.threshold))

    if (bustle >= 12) this._person(x + 68, y + 194, '👨‍🍳')
    if (bustle >= 28) this._person(x + 158, y + 197, '👩‍🌾')
    if (bustle >= 48) { this._person(x + 244, y + 194, '🧑‍🦱'); this._person(x + 278, y + 201, '👧') }
    if (bustle >= 70) { this._person(x + 330, y + 194, '🧑‍✈️'); this._boat(x + 300, y + 165) }
    if (bustle >= 90) { this._person(x + 113, y + 199, '🧒'); this._person(x + 202, y + 194, '👵'); this._flag(x + 344, y + 126) }

    this.add.text(x + 16, y + 16, s.rank, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '16px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(8)
    this.add.text(x + w - 16, y + 17, `釣果 ${s.catches}匹`, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.inkSoft }).setOrigin(1, 0).setDepth(8)

    const meterY = y + h - 28
    shell.fillStyle(0xffffff, 0.72)
    shell.fillRoundedRect(x + 16, meterY, w - 32, 12, 6)
    shell.fillStyle(0x2f9ed4, 1)
    shell.fillRoundedRect(x + 16, meterY, Math.max(8, (w - 32) * (bustle / 100)), 12, 6)
    shell.fillStyle(0xffffff, 0.34)
    shell.fillRoundedRect(x + 20, meterY + 2, Math.max(0, (w - 40) * (bustle / 100)), 3, 2)
    this.add.text(x + 16, meterY - 7, 'にぎわい', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.inkSoft }).setOrigin(0, 1).setDepth(8)
    this.add.text(x + w - 16, meterY - 7, `${bustle}/100`, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.oceanDeep }).setOrigin(1, 1).setDepth(8)

    this._nextMilestoneCard(W, y + h + 10, bustle)
  }

  _drawHarborDecor(x, y, w, bustle) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0xffffff, 0.78)
    g.fillCircle(x + 46, y + 61, 6)
    g.fillCircle(x + 54, y + 57, 4)
    g.fillCircle(x + w - 58, y + 48, 5)
    if (bustle >= 28) {
      g.fillStyle(0xff765a, 0.9)
      g.fillTriangle(x + 94, y + 181, x + 102, y + 168, x + 110, y + 181)
      g.fillTriangle(x + 112, y + 181, x + 120, y + 168, x + 128, y + 181)
    }
    if (bustle >= 48) {
      g.lineStyle(2, 0x173248, 0.35)
      g.lineBetween(x + 202, y + 171, x + 202, y + 196)
      g.fillStyle(0xffd95a, 0.95)
      g.fillCircle(x + 202, y + 169, 5)
    }
  }

  _nextMilestoneCard(W, y, bustle) {
    const next = bustle < 12 ? { title: '次は 魚屋', body: '釣果を集めて、港に最初のお店を呼び戻そう。', accent: 0x2f9ed4 }
      : bustle < 28 ? { title: '次は 食堂', body: '魚が集まり始めた。町で食べられる場所を増やそう。', accent: 0xffd95a }
      : bustle < 48 ? { title: '次は 市場', body: '評判が広がってきた。人が集まる場所をつくろう。', accent: 0xff765a }
      : bustle < 70 ? { title: '次は 船着場', body: '観光客が増えてきた。もっと遠い海へ出られそう。', accent: 0x71d6a2 }
      : bustle < 90 ? { title: '港を仕上げよう', body: '町はもう一息。さらに人が集まる港へ。', accent: 0x2f9ed4 }
      : { title: '港は大にぎわい！', body: '次の大物と、新しい町の物語が待っている。', accent: 0xffd95a }

    const x = 22, w = W - 44, h = 58
    const g = this.add.graphics().setDepth(6)
    g.fillStyle(0x173248, 0.08); g.fillRoundedRect(x + 2, y + 3, w, h, 17)
    g.fillStyle(0xffffff, 0.96); g.lineStyle(1.6, 0x9bcfe5, 0.82); g.fillRoundedRect(x, y, w, h, 17); g.strokeRoundedRect(x, y, w, h, 17)
    g.fillStyle(next.accent, 0.16); g.fillCircle(x + 28, y + h / 2, 18)
    this.add.text(x + 28, y + h / 2, '★', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '16px', fontWeight: '900', color: UI_COLORS.ink }).setOrigin(0.5).setDepth(7)
    this.add.text(x + 54, y + 19, next.title, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: UI_COLORS.ink }).setOrigin(0, 0.5).setDepth(7)
    this.add.text(x + 54, y + 39, next.body, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: UI_COLORS.inkSoft }).setOrigin(0, 0.5).setDepth(7)
  }

  _building(x, y, name, icon, open) {
    const g = this.add.graphics().setDepth(5)
    const body = open ? 0xfff6dd : 0xdce7ec
    const roof = open ? 0xff765a : 0x93a6b2
    g.fillStyle(0x173248, open ? 0.13 : 0.08)
    g.fillRoundedRect(x - 33, y - 34, 66, 58, 8)
    g.fillStyle(body, 1)
    g.lineStyle(1.5, open ? 0xc6a75f : 0xaab8c0, 0.7)
    g.fillRoundedRect(x - 34, y - 38, 68, 58, 8)
    g.strokeRoundedRect(x - 34, y - 38, 68, 58, 8)
    g.fillStyle(roof, 1)
    g.fillTriangle(x - 40, y - 38, x + 40, y - 38, x, y - 64)
    if (open) {
      g.fillStyle(0x9ed7ed, 1)
      g.fillRoundedRect(x - 24, y - 24, 14, 12, 2)
      g.fillRoundedRect(x + 10, y - 24, 14, 12, 2)
      g.fillStyle(0xb9824f, 1)
      g.fillRoundedRect(x - 6, y - 7, 12, 27, 2)
    }
    this.add.text(x, y - 16, icon, { fontSize: '22px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(6)
    this.add.text(x, y + 31, name, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: open ? UI_COLORS.ink : UI_COLORS.muted }).setOrigin(0.5).setDepth(6)
  }

  _person(x, y, icon) { this.add.text(x, y, icon, { fontSize: '21px', resolution: TEXT_RES }).setOrigin(0.5, 1).setDepth(7) }
  _boat(x, y) { this.add.text(x, y, '⛵', { fontSize: '28px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(6) }
  _flag(x, y) { this.add.text(x, y, '🎏', { fontSize: '26px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(7) }

  _facilityGrid(W) {
    const s = getTownSummary()
    const top = 422
    this.add.text(24, top, '町を育てる', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '17px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    this.add.text(W - 24, top + 3, `施設Lv 合計 ${s.totalFacilityLevel}`, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.inkSoft }).setOrigin(1, 0).setDepth(5)

    TOWN_FACILITY_META.forEach((item, i) => {
      const x = 22 + (i % 2) * 176
      const y = 452 + Math.floor(i / 2) * 102
      this._facilityCard(x, y, 160, 86, item)
    })
  }

  _facilityCard(x, y, w, h, item) {
    const summary = getTownSummary()
    const lv = summary.facilities[item.id] ?? 0
    const maxed = lv >= 5
    const cost = getTownFacilityCost(item.id)
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x173248, 0.08); g.fillRoundedRect(x + 2, y + 3, w, h, 17)
    g.fillStyle(maxed ? 0xfffbec : 0xffffff, 0.98)
    g.lineStyle(1.7, maxed ? 0xe2b94b : 0x9bcfe5, 0.9)
    g.fillRoundedRect(x, y, w, h, 17); g.strokeRoundedRect(x, y, w, h, 17)
    g.fillStyle(maxed ? 0xfff0b8 : 0xdff5ff, 1); g.fillCircle(x + 28, y + 28, 20)
    this.add.text(x + 28, y + 28, item.icon, { fontSize: '22px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(5)
    this.add.text(x + 56, y + 19, item.name, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: UI_COLORS.ink }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + 56, y + 40, `Lv.${lv}/5`, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: maxed ? UI_COLORS.warning : UI_COLORS.oceanDeep }).setOrigin(0, 0.5).setDepth(5)

    for (let i = 0; i < 5; i++) {
      g.fillStyle(i < lv ? (maxed ? 0xffd95a : 0x2f9ed4) : 0xdfeaf0, 1)
      g.fillCircle(x + 18 + i * 18, y + 66, 4)
    }
    this.add.text(x + w - 12, y + 66, maxed ? '発展済み' : `${cost}pt`, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: maxed ? UI_COLORS.success : UI_COLORS.warning }).setOrigin(1, 0.5).setDepth(5)
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0).setDepth(6).setInteractive({ useHandCursor: true }).on('pointerdown', () => this._showFacility(item, lv, cost))
  }

  _showFacility(item, lv, cost) {
    const { width: W, height: H } = this.scale
    this._modal?.destroy(true)
    const items = []
    items.push(this.add.rectangle(W / 2, H / 2, W, H, 0x173248, 0.44).setInteractive().on('pointerdown', () => this._modal?.destroy(true)))
    const x = 34, y = 188, w = W - 68, h = 320
    const bg = this.add.graphics()
    bg.fillStyle(0x173248, 0.14); bg.fillRoundedRect(x + 3, y + 5, w, h, 24)
    bg.fillStyle(0xf8fdff, 0.99); bg.lineStyle(2.2, 0x9bcfe5, 0.9); bg.fillRoundedRect(x, y, w, h, 24); bg.strokeRoundedRect(x, y, w, h, 24)
    bg.fillStyle(0xdff5ff, 1); bg.fillCircle(W / 2, y + 66, 46)
    items.push(bg)
    items.push(this.add.text(W / 2, y + 66, item.icon, { fontSize: '42px', resolution: TEXT_RES }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 126, item.name, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '22px', fontWeight: '900', color: UI_COLORS.ink }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 160, item.desc, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '800', color: UI_COLORS.inkSoft, align: 'center', wordWrap: { width: w - 50 } }).setOrigin(0.5, 0))
    items.push(this.add.text(W / 2, y + 212, `${item.effect} / Lv.${lv}/5`, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: UI_COLORS.warning, align: 'center', wordWrap: { width: w - 50 } }).setOrigin(0.5))
    if (lv < 5) items.push(this._actionButton(W / 2, y + 260, `${cost}ptで発展`, () => this._upgrade(item.id)))
    items.push(this._plainButton(W / 2, y + h - 27, '閉じる', () => this._modal?.destroy(true)))
    this._modal = this.add.container(0, 18, items).setDepth(100).setAlpha(0)
    this.tweens.add({ targets: this._modal, y: 0, alpha: 1, duration: 160, ease: 'Sine.easeOut' })
  }

  _upgrade(id) {
    const result = upgradeTownFacility(id)
    if (!result.ok) return this._toast(result.reason === 'max' ? '最大レベルです' : 'ポイントが足りません')
    this.scene.restart()
  }

  _actionButton(x, y, label, onTap) { return this._button(x, y, label, 0xffd95a, UI_COLORS.ink, onTap) }
  _plainButton(x, y, label, onTap) { return this._button(x, y, label, 0xdff5ff, UI_COLORS.oceanDeep, onTap, 126, 36) }

  _button(x, y, label, fill, color, onTap, w = 210, h = 46) {
    const c = this.add.container(x, y)
    const bg = this.add.graphics()
    bg.fillStyle(0x173248, 0.12); bg.fillRoundedRect(-w / 2 + 2, -h / 2 + 3, w, h, 15)
    bg.fillStyle(fill, 1); bg.lineStyle(2, 0x173248, 0.7); bg.fillRoundedRect(-w / 2, -h / 2, w, h, 15); bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 15)
    const t = this.add.text(0, 0, label, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color }).setOrigin(0.5)
    c.add([bg, t]); c.setSize(w, h).setInteractive({ useHandCursor: true }).on('pointerdown', onTap); return c
  }

  _toast(message) {
    const { width: W, height: H } = this.scale
    const t = this.add.text(W / 2, H - 126, message, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: '#ffffff', backgroundColor: UI_COLORS.ink, padding: { x: 18, y: 10 } }).setOrigin(0.5).setDepth(150)
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 12, delay: 900, duration: 260, onComplete: () => t.destroy() })
  }
}
