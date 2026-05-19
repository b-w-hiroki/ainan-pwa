import Phaser from 'phaser'
import { FONT, SHADOW } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { ICONS } from '../config/icons.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { getRewards, getScore, REWARD_META, saveRewards, spendScore } from '../game/progress.js'

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
    this._background(W, H)
    this._header(W)
    this._items(W)
    buildFooterNav(this, W, H, 'exchange')
  }

  _background(W, H) {
    addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillStyle(0xfff3e2, 0.82)
    veil.fillRect(0, 0, W, H)
  }

  _header(W) {
    this.add.text(W / 2, 44, `${ICONS.GIFT} 交換所`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '30px', fontWeight: '900',
      color: '#1a3a5a', shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2, 80, `所持ポイント ${getScore().toLocaleString()} pt`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900',
      color: '#e07800',
    }).setOrigin(0.5).setDepth(5)
  }

  _items(W) {
    const rewards = getRewards()
    REWARD_META.forEach((item, i) => {
      const y = 128 + i * 132
      this._card(24, y, W - 48, 106, item, rewards[item.id] ?? 0)
    })

    const total = Object.values(rewards).reduce((sum, n) => sum + n, 0)
    this.add.text(W / 2, 548, `交換済みアイテム ${total} 個`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '15px', fontWeight: '900',
      color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(5)
  }

  _card(x, y, w, h, item, count) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x000000, 0.12)
    g.fillRoundedRect(x + 3, y + 4, w, h, 18)
    g.fillStyle(0xffffff, 0.97)
    g.lineStyle(2.5, 0x1a2a3a, 0.9)
    g.fillRoundedRect(x, y, w, h, 18)
    g.strokeRoundedRect(x, y, w, h, 18)
    g.fillStyle(0xff9b5e, 1)
    g.fillRoundedRect(x, y, 10, h, { tl: 18, bl: 18, tr: 0, br: 0 })

    this.add.text(x + 36, y + 35, ICONS.GIFT, {
      fontSize: '27px', resolution: TEXT_RES,
    }).setOrigin(0.5).setDepth(6)
    this.add.text(x + 70, y + 18, item.name, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '18px', fontWeight: '900',
      color: '#1a3a5a',
    }).setDepth(6)
    this.add.text(x + 70, y + 47, item.desc, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '800',
      color: '#4a7090',
      wordWrap: { width: w - 210 },
    }).setDepth(6)
    this.add.text(x + 70, y + 72, `所持 ${count}`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '900',
      color: '#e07800',
    }).setDepth(6)

    const bx = x + w - 80
    const by = y + 56
    const b = this.add.graphics().setDepth(5)
    b.fillStyle(0xffd900, 1)
    b.lineStyle(2.5, 0x1a2a3a, 1)
    b.fillRoundedRect(bx - 48, by - 18, 96, 36, 12)
    b.strokeRoundedRect(bx - 48, by - 18, 96, 36, 12)
    this.add.text(bx, by, `${item.cost} pt`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900',
      color: '#1a2a3a',
    }).setOrigin(0.5).setDepth(6)
    this.add.rectangle(bx, by, 104, 44, 0x000000, 0)
      .setDepth(7)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._exchange(item))
  }

  _exchange(item) {
    if (!spendScore(item.cost)) return this._toast('ポイントが足りません')
    const rewards = getRewards()
    rewards[item.id] = (rewards[item.id] ?? 0) + 1
    saveRewards(rewards)
    this.scene.restart()
  }

  _toast(message) {
    const { width: W } = this.scale
    const bg = this.add.graphics().setDepth(80)
    bg.fillStyle(0x1a2a3a, 0.9)
    bg.fillRoundedRect(W / 2 - 112, 610, 224, 38, 15)
    const txt = this.add.text(W / 2, 629, message, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5).setDepth(81)
    this.tweens.add({ targets: [bg, txt], alpha: 0, y: '-=14', duration: 900, onComplete: () => { bg.destroy(); txt.destroy() } })
  }
}
