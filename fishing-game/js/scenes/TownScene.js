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
  constructor() {
    super({ key: 'TownScene' })
  }

  preload() {
    const bg = ASSETS.backgrounds.homeBase
    if (!this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
  }

  create() {
    const { width: W, height: H } = this.scale
    this._modal = null
    this._background(W, H)
    this._header(W)
    this._summary(W)
    this._facilityGrid(W)
    this._back()
    buildFooterNav(this, W, H, 'home')
  }

  _background(W, H) {
    addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillStyle(0xf6fbff, 0.84)
    veil.fillRect(0, 0, W, H)

    const sky = this.add.graphics().setDepth(2)
    sky.fillGradientStyle(0x3aa8e8, 0x3aa8e8, 0xcff5ff, 0xcff5ff, 0.78, 0.78, 0.18, 0.18)
    sky.fillRoundedRect(16, 98, W - 32, 170, 24)
    sky.fillStyle(0xffffff, 0.68)
    sky.fillEllipse(W * 0.30, 168, 82, 18)
    sky.fillEllipse(W * 0.70, 148, 106, 20)
    sky.fillStyle(0x56c780, 0.58)
    sky.fillEllipse(W * 0.30, 238, 118, 42)
    sky.fillEllipse(W * 0.74, 236, 156, 48)
    sky.fillStyle(0x2fa3d5, 0.62)
    sky.fillRoundedRect(16, 232, W - 32, 36, { tl: 0, tr: 0, bl: 24, br: 24 })
  }

  _header(W) {
    this.add.text(W / 2, 42, `${ICONS.TOWN} 町おこし`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '30px', fontWeight: '900',
      color: '#1a3a5a', shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2, 78, `所持ポイント ${getScore().toLocaleString()} pt`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900',
      color: '#e07800',
    }).setOrigin(0.5).setDepth(5)
  }

  _summary(W) {
    const summary = getTownSummary()
    const x = 26
    const y = 124
    const w = W - 52
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0xffffff, 0.94)
    g.lineStyle(3, 0x1a2a3a, 0.86)
    g.fillRoundedRect(x, y, w, 116, 22)
    g.strokeRoundedRect(x, y, w, 116, 22)

    this.add.text(x + 22, y + 26, summary.rank, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '21px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0, 0.5).setDepth(6)
    this.add.text(x + 22, y + 54, `釣果 ${summary.catches}匹 / 交換 ${summary.rewards}個 / 施設Lv ${summary.totalLevel}`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '900', color: '#4a7090',
    }).setOrigin(0, 0.5).setDepth(6)

    g.fillStyle(0xd8e6ee, 1)
    g.fillRoundedRect(x + 22, y + 78, w - 44, 16, 8)
    g.fillStyle(0x00aa66, 1)
    g.fillRoundedRect(x + 22, y + 78, (w - 44) * (summary.bustle / 100), 16, 8)
    this.add.text(W / 2, y + 106, `にぎわい ${summary.bustle}/100`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '900', color: '#e07800',
    }).setOrigin(0.5).setDepth(6)
  }

  _facilityGrid(W) {
    this.add.text(24, 288, '施設を育てる', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '18px', fontWeight: '900', color: '#1a3a5a',
    }).setDepth(5)
    TOWN_FACILITY_META.forEach((item, i) => {
      const x = 22 + (i % 2) * 176
      const y = 324 + Math.floor(i / 2) * 132
      this._facilityCard(x, y, 160, 112, item)
    })
  }

  _facilityCard(x, y, w, h, item) {
    const summary = getTownSummary()
    const lv = summary.facilities[item.id] ?? 0
    const maxed = lv >= 5
    const cost = getTownFacilityCost(item.id)
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x000000, 0.12)
    g.fillRoundedRect(x + 3, y + 4, w, h, 18)
    g.fillStyle(maxed ? 0xfff7dc : 0xffffff, 0.96)
    g.lineStyle(2.5, maxed ? 0xffb000 : 0x5ebcff, 0.9)
    g.fillRoundedRect(x, y, w, h, 18)
    g.strokeRoundedRect(x, y, w, h, 18)
    g.fillStyle(maxed ? 0xffd900 : 0xe1f5ff, 1)
    g.fillCircle(x + 34, y + 34, 25)

    this.add.text(x + 34, y + 34, item.icon, { fontSize: '23px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(5)
    this.add.text(x + 66, y + 24, item.name, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + 66, y + 47, `Lv.${lv}/5`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '900', color: maxed ? '#cc7700' : '#e07800',
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + 16, y + 76, maxed ? '最大まで発展済み' : `${cost}ptで発展`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '900', color: maxed ? '#00aa66' : '#4a7090',
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0)
      .setDepth(6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showFacility(item, lv, cost))
  }

  _showFacility(item, lv, cost) {
    const { width: W, height: H } = this.scale
    this._modal?.destroy(true)
    const items = []
    items.push(this.add.rectangle(W / 2, H / 2, W, H, 0x1a2a3a, 0.42).setInteractive())

    const x = 34
    const y = 190
    const w = W - 68
    const h = 316
    const bg = this.add.graphics()
    bg.fillStyle(0xffffff, 0.98)
    bg.lineStyle(3, 0x1a2a3a, 1)
    bg.fillRoundedRect(x, y, w, h, 22)
    bg.strokeRoundedRect(x, y, w, h, 22)
    bg.fillStyle(0xe1f5ff, 1)
    bg.fillCircle(W / 2, y + 66, 46)
    items.push(bg)

    items.push(this.add.text(W / 2, y + 66, item.icon, {
      fontSize: '42px', resolution: TEXT_RES,
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 126, item.name, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '23px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 160, item.desc, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#4a7090',
      align: 'center', wordWrap: { width: w - 50 },
    }).setOrigin(0.5, 0))
    items.push(this.add.text(W / 2, y + 210, `${item.effect} / Lv.${lv}/5`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#e07800',
      align: 'center', wordWrap: { width: w - 50 },
    }).setOrigin(0.5))

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

  _actionButton(x, y, label, onTap) {
    const c = this.add.container(0, 0)
    const bg = this.add.graphics()
    bg.fillStyle(0xffd900, 1)
    bg.lineStyle(2.5, 0x1a2a3a, 1)
    bg.fillRoundedRect(x - 86, y - 22, 172, 44, 15)
    bg.strokeRoundedRect(x - 86, y - 22, 172, 44, 15)
    const txt = this.add.text(x, y, label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900', color: '#1a2a3a',
    }).setOrigin(0.5)
    const hit = this.add.rectangle(x, y, 184, 52, 0x000000, 0).setInteractive({ useHandCursor: true }).on('pointerdown', onTap)
    c.add([bg, txt, hit])
    return c
  }

  _plainButton(x, y, label, onTap) {
    return this.add.text(x, y, label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#4a7090',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', onTap)
  }

  _toast(message) {
    this._modal?.destroy(true)
    const { width: W } = this.scale
    const bg = this.add.graphics().setDepth(120)
    bg.fillStyle(0x1a2a3a, 0.92)
    bg.fillRoundedRect(W / 2 - 112, 650, 224, 38, 15)
    const txt = this.add.text(W / 2, 669, message, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5).setDepth(121)
    this.tweens.add({ targets: [bg, txt], alpha: 0, y: '-=14', duration: 900, onComplete: () => { bg.destroy(); txt.destroy() } })
  }

  _back() {
    this.add.text(16, 16, `${ICONS.BACK} ホーム`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '15px', fontWeight: '900',
      color: '#1a3a5a',
      backgroundColor: '#ffffff',
      padding: { x: 14, y: 9 },
    }).setDepth(20).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('HomeScene'))
  }
}
