import Phaser from 'phaser'
import { FONT, SHADOW } from '../config/fontStyles.js'
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
    veil.fillStyle(0xf6fbff, 0.76)
    veil.fillRect(0, 0, W, H)
  }

  _header(W) {
    this.add.text(W / 2, 38, `${ICONS.TOWN} みんなの港町`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '28px', fontWeight: '900',
      color: '#1a3a5a', shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(10)
    this.add.text(W / 2, 70, `所持ポイント ${getScore().toLocaleString()} pt`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: '#e07800',
    }).setOrigin(0.5).setDepth(10)
  }

  _livingTown(W) {
    const s = getTownSummary()
    const y = 96
    const h = 244
    const g = this.add.graphics().setDepth(3)
    g.fillStyle(0xbfeaff, 0.95); g.fillRoundedRect(14, y, W - 28, h, 24)
    g.fillStyle(0x74c9ef, 0.9); g.fillRect(14, y + 154, W - 28, 62)
    g.fillStyle(0xd9b36c, 1); g.fillRect(14, y + 212, W - 28, 28)

    // Town changes visually as bustle grows. Each threshold adds life to the harbor.
    const bustle = s.bustle
    this._building(46, y + 122, '魚屋', bustle >= 12 ? '🐟' : '🔒', bustle >= 12)
    this._building(137, y + 110, '食堂', bustle >= 28 ? '🍚' : '🔒', bustle >= 28)
    this._building(228, y + 122, '市場', bustle >= 48 ? '🏪' : '🔒', bustle >= 48)
    this._building(319, y + 104, '船着場', bustle >= 70 ? '⛴️' : '🔒', bustle >= 70)

    if (bustle >= 12) this._person(62, y + 199, '👨‍🍳')
    if (bustle >= 28) this._person(155, y + 202, '👩‍🌾')
    if (bustle >= 48) { this._person(245, y + 199, '🧑‍🦱'); this._person(278, y + 205, '👧') }
    if (bustle >= 70) { this._person(332, y + 199, '🧑‍✈️'); this._boat(295, y + 181) }
    if (bustle >= 90) { this._person(105, y + 202, '🧒'); this._person(205, y + 199, '👵'); this._flag(346, y + 132) }

    this.add.text(28, y + 20, s.rank, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '18px', fontWeight: '900', color: '#1a3a5a' }).setDepth(8)
    this.add.text(W - 28, y + 22, `にぎわい ${bustle}/100`, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: '#e07800' }).setOrigin(1, 0).setDepth(8)

    const next = bustle < 12 ? '魚屋が開きそう。まずは釣果を町へ届けよう！'
      : bustle < 28 ? '魚が集まり始めた。次は食堂を呼び戻そう！'
      : bustle < 48 ? '町の評判が上昇中。市場の再開まであと少し！'
      : bustle < 70 ? '観光客が増えてきた。船着場を復活させよう！'
      : bustle < 90 ? '沖へ出る準備が整ってきた。町をもっと賑やかに！'
      : '港は大にぎわい！ 次の大物が町を待っている。'
    const card = this.add.graphics().setDepth(7)
    card.fillStyle(0xffffff, 0.94); card.fillRoundedRect(26, y + 246, W - 52, 54, 17)
    card.lineStyle(2, 0x5ebcff, 0.65); card.strokeRoundedRect(26, y + 246, W - 52, 54, 17)
    this.add.text(W / 2, y + 273, next, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: '#315d78', align: 'center', wordWrap: { width: W - 82 } }).setOrigin(0.5).setDepth(8)
  }

  _building(x, y, name, icon, open) {
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(open ? 0xfff4d5 : 0xd9e1e6, 1); g.fillRoundedRect(x - 34, y - 36, 68, 58, 8)
    g.fillStyle(open ? 0xf06b4f : 0x8798a5, 1); g.fillTriangle(x - 40, y - 36, x + 40, y - 36, x, y - 63)
    this.add.text(x, y - 14, icon, { fontSize: '25px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(6)
    this.add.text(x, y + 34, name, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: open ? '#315d78' : '#7d8b94' }).setOrigin(0.5).setDepth(6)
  }

  _person(x, y, icon) { this.add.text(x, y, icon, { fontSize: '22px', resolution: TEXT_RES }).setOrigin(0.5, 1).setDepth(7) }
  _boat(x, y) { this.add.text(x, y, '⛵', { fontSize: '30px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(6) }
  _flag(x, y) { this.add.text(x, y, '🎏', { fontSize: '28px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(7) }

  _facilityGrid(W) {
    const s = getTownSummary()
    this.add.text(24, 414, '町を育てる', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '18px', fontWeight: '900', color: '#1a3a5a' }).setDepth(5)
    this.add.text(W - 24, 418, `釣果 ${s.catches}匹`, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: '#4a7090' }).setOrigin(1, 0).setDepth(5)
    TOWN_FACILITY_META.forEach((item, i) => {
      const x = 22 + (i % 2) * 176
      const y = 450 + Math.floor(i / 2) * 104
      this._facilityCard(x, y, 160, 88, item)
    })
  }

  _facilityCard(x, y, w, h, item) {
    const summary = getTownSummary()
    const lv = summary.facilities[item.id] ?? 0
    const maxed = lv >= 5
    const cost = getTownFacilityCost(item.id)
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x000000, 0.1); g.fillRoundedRect(x + 3, y + 4, w, h, 16)
    g.fillStyle(maxed ? 0xfff7dc : 0xffffff, 0.97); g.lineStyle(2.5, maxed ? 0xffb000 : 0x5ebcff, 0.9)
    g.fillRoundedRect(x, y, w, h, 16); g.strokeRoundedRect(x, y, w, h, 16)
    this.add.text(x + 30, y + 31, item.icon, { fontSize: '25px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(5)
    this.add.text(x + 57, y + 22, item.name, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: '#1a3a5a' }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + 57, y + 45, `Lv.${lv}/5`, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: maxed ? '#cc7700' : '#e07800' }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + 16, y + 69, maxed ? '発展済み' : `${cost}ptで発展`, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: maxed ? '#00aa66' : '#4a7090' }).setOrigin(0, 0.5).setDepth(5)
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0).setDepth(6).setInteractive({ useHandCursor: true }).on('pointerdown', () => this._showFacility(item, lv, cost))
  }

  _showFacility(item, lv, cost) {
    const { width: W, height: H } = this.scale
    this._modal?.destroy(true)
    const items = []
    items.push(this.add.rectangle(W / 2, H / 2, W, H, 0x1a2a3a, 0.42).setInteractive().on('pointerdown', () => this._modal?.destroy(true)))
    const x = 34, y = 190, w = W - 68, h = 316
    const bg = this.add.graphics(); bg.fillStyle(0xffffff, 0.98); bg.lineStyle(3, 0x1a2a3a, 1); bg.fillRoundedRect(x, y, w, h, 22); bg.strokeRoundedRect(x, y, w, h, 22); bg.fillStyle(0xe1f5ff, 1); bg.fillCircle(W / 2, y + 66, 46); items.push(bg)
    items.push(this.add.text(W / 2, y + 66, item.icon, { fontSize: '42px', resolution: TEXT_RES }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 126, item.name, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '23px', fontWeight: '900', color: '#1a3a5a' }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 160, item.desc, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: '#4a7090', align: 'center', wordWrap: { width: w - 50 } }).setOrigin(0.5, 0))
    items.push(this.add.text(W / 2, y + 210, `${item.effect} / Lv.${lv}/5`, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: '#e07800', align: 'center', wordWrap: { width: w - 50 } }).setOrigin(0.5))
    if (lv < 5) items.push(this._actionButton(W / 2, y + 258, `${cost}ptで発展`, () => this._upgrade(item.id)))
    items.push(this._plainButton(W / 2, y + h - 28, '閉じる', () => this._modal?.destroy(true)))
    this._modal = this.add.container(0, 18, items).setDepth(100).setAlpha(0)
    this.tweens.add({ targets: this._modal, y: 0, alpha: 1, duration: 160, ease: 'Sine.easeOut' })
  }

  _upgrade(id) {
    const result = upgradeTownFacility(id)
    if (!result.ok) return this._toast(result.reason === 'max' ? '最大レベルです' : 'ポイントが足りません')
    this.scene.restart()
  }

  _actionButton(x, y, label, onTap) { return this._button(x, y, label, 0xffd900, '#4a3200', onTap) }
  _plainButton(x, y, label, onTap) { return this._button(x, y, label, 0xe7f4fa, '#315d78', onTap, 126, 36) }

  _button(x, y, label, fill, color, onTap, w = 210, h = 46) {
    const c = this.add.container(x, y)
    const bg = this.add.graphics(); bg.fillStyle(fill, 1); bg.lineStyle(2, 0x1a2a3a, 0.7); bg.fillRoundedRect(-w / 2, -h / 2, w, h, 15); bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 15)
    const t = this.add.text(0, 0, label, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color }).setOrigin(0.5)
    c.add([bg, t]); c.setSize(w, h).setInteractive({ useHandCursor: true }).on('pointerdown', onTap); return c
  }

  _toast(message) {
    const { width: W, height: H } = this.scale
    const t = this.add.text(W / 2, H - 126, message, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: '#ffffff', backgroundColor: '#1a2a3a', padding: { x: 18, y: 10 } }).setOrigin(0.5).setDepth(150)
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 12, delay: 900, duration: 260, onComplete: () => t.destroy() })
  }
}
