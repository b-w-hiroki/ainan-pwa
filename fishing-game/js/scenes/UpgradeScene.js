import Phaser from 'phaser'
import { FONT, SHADOW } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { ICONS } from '../config/icons.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import {
  BAIT_META,
  ROD_META,
  getEquipment,
  getInventory,
  getScore,
  saveEquipment,
  saveInventory,
  spendScore,
} from '../game/progress.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export default class UpgradeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UpgradeScene' })
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
    this._section(W, 112, '竿', ICONS.ROD, ROD_META, 'rod')
    this._section(W, 404, 'エサ', ICONS.BAIT, BAIT_META, 'bait')
    buildFooterNav(this, W, H, 'upgrade')
  }

  _background(W, H) {
    addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillStyle(0xfff7df, 0.82)
    veil.fillRect(0, 0, W, H)
  }

  _header(W) {
    this.add.text(W / 2, 42, `${ICONS.GEAR} タックル強化`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '28px', fontWeight: '900',
      color: '#1a3a5a', shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2, 78, `所持ポイント ${getScore().toLocaleString()} pt`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900',
      color: '#e07800',
    }).setOrigin(0.5).setDepth(5)
  }

  _section(W, y, label, icon, meta, type) {
    this.add.text(24, y, `${icon} ${label}`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '16px', fontWeight: '900', color: '#1a3a5a',
    }).setDepth(5)

    const entries = Object.entries(meta)
    const size = 94
    const gap = 14
    const startX = (W - (entries.length * size + (entries.length - 1) * gap)) / 2
    entries.forEach(([id, item], i) => {
      this._tile(startX + i * (size + gap), y + 34, size, id, item, type, icon)
    })
  }

  _tile(x, y, size, id, item, type, icon) {
    const inventory = getInventory()
    const equipment = getEquipment()
    const owned = type === 'rod' ? (inventory.rods?.[id] ?? 0) > 0 : (inventory.baits?.[id] ?? 0) > 0
    const qty = type === 'bait' ? (inventory.baits?.[id] ?? 0) : (owned ? 1 : 0)
    const equipped = type === 'rod' ? equipment.rodType === id : equipment.baitType === id
    const accent = type === 'rod' ? 0x5ebcff : 0xff9b5e

    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x000000, 0.12)
    g.fillRoundedRect(x + 3, y + 4, size, size, 18)
    g.fillStyle(0xffffff, owned ? 0.97 : 0.74)
    g.lineStyle(equipped ? 3.5 : 2.5, equipped ? 0xffd900 : 0x1a2a3a, 0.95)
    g.fillRoundedRect(x, y, size, size, 18)
    g.strokeRoundedRect(x, y, size, size, 18)
    g.fillStyle(accent, 0.18)
    g.fillCircle(x + size / 2, y + 34, 27)

    this.add.text(x + size / 2, y + 34, owned ? icon : ICONS.LOCK, {
      fontSize: owned ? '28px' : '22px', resolution: TEXT_RES,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(x + size / 2, y + 68, item.name, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '11px', fontWeight: '900',
      color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(5)
    this.add.text(x + size / 2, y + 86, type === 'bait' ? `×${qty}` : (equipped ? '装備中' : owned ? '所持' : `${item.cost}pt`), {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '10px', fontWeight: '900',
      color: equipped ? '#e07800' : '#4a7090',
    }).setOrigin(0.5).setDepth(5)

    this.add.rectangle(x + size / 2, y + size / 2, size, size, 0x000000, 0)
      .setDepth(6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showModal(id, item, type, icon, owned, qty, equipped))
  }

  _showModal(id, item, type, icon, owned, qty, equipped) {
    const { width: W, height: H } = this.scale
    this._modal?.destroy(true)
    const items = []
    items.push(this.add.rectangle(W / 2, H / 2, W, H, 0x1a2a3a, 0.42).setInteractive())

    const x = 30
    const y = 178
    const w = W - 60
    const h = 330
    const accent = type === 'rod' ? 0x5ebcff : 0xff9b5e
    const bg = this.add.graphics()
    bg.fillStyle(0xffffff, 0.98)
    bg.lineStyle(3, 0x1a2a3a, 1)
    bg.fillRoundedRect(x, y, w, h, 22)
    bg.strokeRoundedRect(x, y, w, h, 22)
    bg.fillStyle(accent, 0.18)
    bg.fillCircle(W / 2, y + 70, 48)
    items.push(bg)

    items.push(this.add.text(W / 2, y + 70, owned ? icon : ICONS.LOCK, {
      fontSize: owned ? '44px' : '34px', resolution: TEXT_RES,
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 132, item.name, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '24px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 168, item.desc, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#4a7090',
      wordWrap: { width: w - 44 }, align: 'center',
    }).setOrigin(0.5, 0))

    const status = type === 'rod'
      ? (equipped ? '装備中' : owned ? '所持済み' : `${item.cost} pt`)
      : `在庫 ${qty} / ${item.cost} ptで+${item.amount}`
    items.push(this.add.text(W / 2, y + 216, status, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '15px', fontWeight: '900', color: '#e07800',
    }).setOrigin(0.5))

    const action = type === 'rod'
      ? (equipped ? null : owned ? '装備する' : '購入して装備')
      : '購入して装備'
    if (action) items.push(this._actionButton(W / 2, y + 268, action, () => this._apply(id, item, type, owned, qty)))
    items.push(this._plainButton(W / 2, y + h - 30, '閉じる', () => this._modal?.destroy(true)))

    this._modal = this.add.container(0, 20, items).setDepth(100).setAlpha(0)
    this.tweens.add({ targets: this._modal, y: 0, alpha: 1, duration: 160, ease: 'Sine.easeOut' })
  }

  _apply(id, item, type, owned, qty) {
    const inventory = getInventory()
    const equipment = getEquipment()
    if (type === 'rod') {
      if (!owned && !spendScore(item.cost)) return this._toast('ポイントが足りません')
      inventory.rods[id] = 1
      equipment.rodType = id
    } else {
      if (!spendScore(item.cost)) return this._toast('ポイントが足りません')
      inventory.baits[id] = qty + item.amount
      equipment.baitType = id
    }
    saveInventory(inventory)
    saveEquipment(equipment)
    this.scene.restart()
  }

  _actionButton(x, y, label, onTap) {
    const c = this.add.container(0, 0)
    const bg = this.add.graphics()
    bg.fillStyle(0xffd900, 1)
    bg.lineStyle(2.5, 0x1a2a3a, 1)
    bg.fillRoundedRect(x - 78, y - 21, 156, 42, 14)
    bg.strokeRoundedRect(x - 78, y - 21, 156, 42, 14)
    const txt = this.add.text(x, y, label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900', color: '#1a2a3a',
    }).setOrigin(0.5)
    const hit = this.add.rectangle(x, y, 166, 50, 0x000000, 0).setInteractive({ useHandCursor: true }).on('pointerdown', onTap)
    c.add([bg, txt, hit])
    return c
  }

  _plainButton(x, y, label, onTap) {
    const txt = this.add.text(x, y, label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#4a7090',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', onTap)
    return txt
  }

  _toast(message) {
    this._modal?.destroy(true)
    const { width: W } = this.scale
    const bg = this.add.graphics().setDepth(120)
    bg.fillStyle(0x1a2a3a, 0.9)
    bg.fillRoundedRect(W / 2 - 112, 650, 224, 38, 15)
    const txt = this.add.text(W / 2, 669, message, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5).setDepth(121)
    this.tweens.add({ targets: [bg, txt], alpha: 0, y: '-=14', duration: 900, onComplete: () => { bg.destroy(); txt.destroy() } })
  }
}
