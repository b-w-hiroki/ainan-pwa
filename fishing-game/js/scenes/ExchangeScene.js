import Phaser from 'phaser'
import { FONT, SHADOW } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { ICONS } from '../config/icons.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { getRewards, getScore, getTownBonuses, REWARD_META, saveRewards, spendScore } from '../game/progress.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export default class ExchangeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ExchangeScene' })
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
    this._grid(W)
    buildFooterNav(this, W, H, 'shop')
  }

  _background(W, H) {
    addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillStyle(0xfff3e2, 0.84)
    veil.fillRect(0, 0, W, H)
  }

  _header(W) {
    this.add.text(W / 2, 42, `${ICONS.GIFT} 交換所`, {
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

  _grid(W) {
    const rewards = getRewards()
    const score = getScore()
    const cols = 2
    const cardW = 156
    const cardH = 174
    const gap = 18
    const startX = (W - (cols * cardW + gap)) / 2

    REWARD_META.forEach((item, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = startX + col * (cardW + gap)
      const y = 124 + row * 196
      const cost = this._exchangeCost(item)
      this._tile(x, y, cardW, cardH, item, rewards[item.id] ?? 0, Math.floor(score / cost), cost)
    })
  }

  _tile(x, y, w, h, item, count, available, cost) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x000000, 0.12)
    g.fillRoundedRect(x + 3, y + 4, w, h, 18)
    g.fillStyle(0xffffff, 0.97)
    g.lineStyle(2.5, 0x1a2a3a, 0.9)
    g.fillRoundedRect(x, y, w, h, 18)
    g.strokeRoundedRect(x, y, w, h, 18)
    g.fillStyle(0xff9b5e, 0.20)
    g.fillCircle(x + w / 2, y + 39, 31)

    this.add.text(x + w / 2, y + 39, ICONS.GIFT, {
      fontSize: '28px', resolution: TEXT_RES,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(x + w / 2, y + 78, item.name, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900',
      color: '#1a3a5a', align: 'center',
      wordWrap: { width: w - 18 },
    }).setOrigin(0.5, 0).setDepth(5)
    this.add.text(x + w / 2, y + 108, item.desc, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '10px', fontWeight: '800',
      color: '#4a7090', align: 'center',
      wordWrap: { width: w - 18 },
    }).setOrigin(0.5, 0).setDepth(5)
    this.add.text(x + 14, y + h - 29, `所持 ${count}`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '10px', fontWeight: '900', color: '#4a7090',
    }).setOrigin(0, 0).setDepth(5)
    this.add.text(x + w - 14, y + h - 29, `可 ${available}`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '10px', fontWeight: '900', color: '#00aa66',
    }).setOrigin(1, 0).setDepth(5)
    this.add.text(x + w / 2, y + h - 12, `${cost} pt`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '900', color: '#e07800',
    }).setOrigin(0.5).setDepth(5)

    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0)
      .setDepth(6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showModal(item, count, available, cost))
  }

  _showModal(item, count, available, cost) {
    const { width: W, height: H } = this.scale
    this._modal?.destroy(true)
    const items = []
    items.push(this.add.rectangle(W / 2, H / 2, W, H, 0x1a2a3a, 0.42)
      .setInteractive()
      .on('pointerdown', () => this._modal?.destroy(true)))

    const x = 30
    const y = 170
    const w = W - 60
    const h = 340
    const bg = this.add.graphics()
    bg.fillStyle(0xffffff, 0.98)
    bg.lineStyle(3, 0x1a2a3a, 1)
    bg.fillRoundedRect(x, y, w, h, 22)
    bg.strokeRoundedRect(x, y, w, h, 22)
    bg.fillStyle(0xff9b5e, 0.18)
    bg.fillCircle(W / 2, y + 68, 48)
    items.push(bg)

    items.push(this.add.text(W / 2, y + 68, ICONS.GIFT, {
      fontSize: '42px', resolution: TEXT_RES,
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 128, item.name, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '23px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 164, item.desc, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#4a7090',
      wordWrap: { width: w - 48 }, align: 'center',
    }).setOrigin(0.5, 0))
    items.push(this.add.text(W / 2, y + 214, `所持 ${count}   交換可能 ${available}   価格 ${cost} pt`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900', color: '#e07800',
    }).setOrigin(0.5))

    items.push(this._actionButton(W / 2, y + 270, '交換する', () => this._exchange(item, cost)))
    items.push(this._plainButton(W / 2, y + h - 28, '閉じる', () => this._modal?.destroy(true)))

    this._modal = this.add.container(0, 20, items).setDepth(100).setAlpha(0)
    this.tweens.add({ targets: this._modal, y: 0, alpha: 1, duration: 160, ease: 'Sine.easeOut' })
  }

  _exchange(item, cost) {
    if (!spendScore(cost)) return this._toast('ポイントが足りません')
    const rewards = getRewards()
    rewards[item.id] = (rewards[item.id] ?? 0) + 1
    saveRewards(rewards)
    this.scene.restart()
  }

  _exchangeCost(item) {
    const discount = getTownBonuses().exchangeDiscount
    return Math.max(1, Math.round(item.cost * (1 - discount)))
  }

  _actionButton(x, y, label, onTap) {
    const c = this.add.container(0, 0)
    const bg = this.add.graphics()
    bg.fillStyle(0xffd900, 1)
    bg.lineStyle(2.5, 0x1a2a3a, 1)
    bg.fillRoundedRect(x - 68, y - 20, 136, 40, 14)
    bg.strokeRoundedRect(x - 68, y - 20, 136, 40, 14)
    const txt = this.add.text(x, y, label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900', color: '#1a2a3a',
    }).setOrigin(0.5)
    const hit = this.add.rectangle(x, y, 146, 48, 0x000000, 0).setInteractive({ useHandCursor: true }).on('pointerdown', onTap)
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
    bg.fillStyle(0x1a2a3a, 0.9)
    bg.fillRoundedRect(W / 2 - 112, 640, 224, 38, 15)
    const txt = this.add.text(W / 2, 659, message, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5).setDepth(121)
    this.tweens.add({ targets: [bg, txt], alpha: 0, y: '-=14', duration: 900, onComplete: () => { bg.destroy(); txt.destroy() } })
  }
}
