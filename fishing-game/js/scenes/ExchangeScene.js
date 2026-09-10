import Phaser from 'phaser'
import { FONT, SHADOW, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { getRewards, getScore, getTownBonuses, REWARD_META, saveRewards, spendScore } from '../game/progress.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const REWARD_ART = {
  sticker: ASSETS.rewards.sticker,
  ticket: ASSETS.rewards.ticket,
  icebox: ASSETS.rewards.icebox,
}

export default class ExchangeScene extends Phaser.Scene {
  constructor() { super({ key: 'ExchangeScene' }) }

  preload() {
    const wanted = [ASSETS.backgrounds.townGrowing, ...Object.values(REWARD_ART)]
    wanted.forEach(asset => {
      if (asset?.status === 'ready' && !this.textures.exists(asset.key)) this.load.image(asset.key, asset.path)
    })
  }

  create() {
    const { width: W, height: H } = this.scale
    this._modal = null
    this._background(W, H)
    this._header(W)
    this._townBenefit(W)
    this._grid(W)
    buildFooterNav(this, W, H, 'shop')
  }

  _background(W, H) {
    addCoverImage(this, ASSETS.backgrounds.townGrowing.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillGradientStyle(0xfffbf2, 0xfffbf2, 0xf8fdff, 0xf8fdff, 0.70, 0.70, 0.88, 0.88)
    veil.fillRect(0, 0, W, H)
  }

  _header(W) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x173248, 0.11)
    g.fillRoundedRect(16, 16, W - 32, 82, 22)
    g.fillStyle(0xf8fdff, 0.97)
    g.lineStyle(2, 0x9bcfe5, 0.88)
    g.fillRoundedRect(16, 12, W - 32, 82, 22)
    g.strokeRoundedRect(16, 12, W - 32, 82, 22)
    g.fillStyle(0xfff1bd, 0.78)
    g.fillRoundedRect(24, 20, W - 48, 13, 7)

    this.add.text(32, 47, '港の交換所', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '25px', fontWeight: '900',
      color: UI_COLORS.ink, shadow: SHADOW.subtle,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(32, 72, '釣りと町おこしの記念品を交換', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '800', color: UI_COLORS.inkSoft,
    }).setOrigin(0, 0.5).setDepth(5)

    this.add.text(W - 32, 47, `${getScore().toLocaleString()} pt`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '18px', fontWeight: '900', color: UI_COLORS.warning,
    }).setOrigin(1, 0.5).setDepth(5)
    this.add.text(W - 32, 70, '所持ポイント', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.inkSoft,
    }).setOrigin(1, 0.5).setDepth(5)
  }

  _townBenefit(W) {
    const discount = getTownBonuses().exchangeDiscount
    const pct = Math.round(discount * 100)
    const x = 24, y = 106, w = W - 48, h = 48
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x173248, 0.08)
    g.fillRoundedRect(x + 2, y + 3, w, h, 16)
    g.fillStyle(0xffffff, 0.95)
    g.lineStyle(1.5, 0x9bcfe5, 0.75)
    g.fillRoundedRect(x, y, w, h, 16)
    g.strokeRoundedRect(x, y, w, h, 16)
    g.fillStyle(0x71d6a2, 0.18)
    g.fillCircle(x + 26, y + 24, 17)
    this.add.text(x + 26, y + 24, '%', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: UI_COLORS.success,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(x + 52, y + 17, '港まつり広場ボーナス', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + 52, y + 33, pct > 0 ? `交換価格 ${pct}% OFF` : '広場を育てると交換価格がお得になる', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: pct > 0 ? UI_COLORS.success : UI_COLORS.inkSoft,
    }).setOrigin(0, 0.5).setDepth(5)
  }

  _grid(W) {
    const rewards = getRewards()
    const score = getScore()
    const cols = 2, cardW = 160, cardH = 180, gap = 14
    const startX = (W - (cols * cardW + gap)) / 2

    REWARD_META.forEach((item, i) => {
      const col = i % cols, row = Math.floor(i / cols)
      const x = startX + col * (cardW + gap)
      const y = 174 + row * 194
      const cost = this._exchangeCost(item)
      this._tile(x, y, cardW, cardH, item, rewards[item.id] ?? 0, Math.floor(score / cost), cost)
    })
  }

  _tile(x, y, w, h, item, count, available, cost) {
    const canBuy = available > 0
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x173248, 0.10)
    g.fillRoundedRect(x + 3, y + 4, w, h, 19)
    g.fillStyle(0xffffff, 0.98)
    g.lineStyle(2, canBuy ? 0x9bcfe5 : 0xcbd6dc, 0.9)
    g.fillRoundedRect(x, y, w, h, 19)
    g.strokeRoundedRect(x, y, w, h, 19)
    g.fillStyle(canBuy ? 0xfff1bd : 0xecf1f4, 0.9)
    g.fillRoundedRect(x + 10, y + 10, w - 20, 76, 16)

    const art = REWARD_ART[item.id]
    if (art?.key && this.textures.exists(art.key)) {
      this.add.image(x + w / 2, y + 48, art.key).setDisplaySize(72, 72).setDepth(5).setAlpha(canBuy ? 1 : 0.58)
    }

    this.add.text(x + w / 2, y + 98, item.name, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: UI_COLORS.ink,
      align: 'center', wordWrap: { width: w - 18 },
    }).setOrigin(0.5, 0).setDepth(5)
    this.add.text(x + w / 2, y + 122, item.desc, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: UI_COLORS.inkSoft,
      align: 'center', wordWrap: { width: w - 18 },
    }).setOrigin(0.5, 0).setDepth(5)

    g.fillStyle(canBuy ? 0xdff5ff : 0xf0f3f5, 1)
    g.fillRoundedRect(x + 10, y + h - 38, w - 20, 28, 10)
    this.add.text(x + 18, y + h - 24, `所持 ${count}`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.inkSoft,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + w - 18, y + h - 24, `${cost} pt`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: canBuy ? UI_COLORS.warning : UI_COLORS.muted,
    }).setOrigin(1, 0.5).setDepth(5)

    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0)
      .setDepth(6).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showModal(item, count, available, cost))
  }

  _showModal(item, count, available, cost) {
    const { width: W, height: H } = this.scale
    this._modal?.destroy(true)
    const items = []
    items.push(this.add.rectangle(W / 2, H / 2, W, H, 0x173248, 0.44).setInteractive().on('pointerdown', () => this._modal?.destroy(true)))

    const x = 30, y = 164, w = W - 60, h = 350
    const bg = this.add.graphics()
    bg.fillStyle(0x173248, 0.14)
    bg.fillRoundedRect(x + 3, y + 5, w, h, 24)
    bg.fillStyle(0xf8fdff, 0.99)
    bg.lineStyle(2.2, 0x9bcfe5, 0.92)
    bg.fillRoundedRect(x, y, w, h, 24)
    bg.strokeRoundedRect(x, y, w, h, 24)
    bg.fillStyle(0xfff1bd, 0.88)
    bg.fillRoundedRect(x + 22, y + 20, w - 44, 116, 22)
    items.push(bg)

    const art = REWARD_ART[item.id]
    if (art?.key && this.textures.exists(art.key)) items.push(this.add.image(W / 2, y + 78, art.key).setDisplaySize(106, 106))

    items.push(this.add.text(W / 2, y + 155, item.name, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '22px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 187, item.desc, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '800', color: UI_COLORS.inkSoft,
      wordWrap: { width: w - 48 }, align: 'center',
    }).setOrigin(0.5, 0))
    items.push(this.add.text(W / 2, y + 238, `所持 ${count}   交換可能 ${available}   ${cost} pt`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: UI_COLORS.warning,
    }).setOrigin(0.5))

    if (available > 0) {
      items.push(this._actionButton(W / 2, y + 286, '交換する', () => this._exchange(item, cost)))
    } else {
      items.push(this.add.text(W / 2, y + 286, 'ポイントが足りません', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: UI_COLORS.muted,
      }).setOrigin(0.5))
    }
    items.push(this._plainButton(W / 2, y + h - 25, '閉じる', () => this._modal?.destroy(true)))

    this._modal = this.add.container(0, 18, items).setDepth(100).setAlpha(0)
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
    bg.fillStyle(0x173248, 0.13)
    bg.fillRoundedRect(x - 72 + 2, y - 21 + 3, 144, 42, 14)
    bg.fillStyle(0xffd95a, 1)
    bg.lineStyle(2, 0x173248, 0.82)
    bg.fillRoundedRect(x - 72, y - 21, 144, 42, 14)
    bg.strokeRoundedRect(x - 72, y - 21, 144, 42, 14)
    const txt = this.add.text(x, y, label, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5)
    const hit = this.add.rectangle(x, y, 150, 48, 0x000000, 0).setInteractive({ useHandCursor: true }).on('pointerdown', onTap)
    c.add([bg, txt, hit])
    return c
  }

  _plainButton(x, y, label, onTap) {
    return this.add.text(x, y, label, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: UI_COLORS.inkSoft,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', onTap)
  }

  _toast(message) {
    this._modal?.destroy(true)
    const { width: W, height: H } = this.scale
    const bg = this.add.graphics().setDepth(120)
    bg.fillStyle(0x173248, 0.92)
    bg.fillRoundedRect(W / 2 - 112, H - 138, 224, 38, 15)
    const txt = this.add.text(W / 2, H - 119, message, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5).setDepth(121)
    this.tweens.add({ targets: [bg, txt], alpha: 0, y: '-=14', duration: 900, onComplete: () => { bg.destroy(); txt.destroy() } })
  }
}
