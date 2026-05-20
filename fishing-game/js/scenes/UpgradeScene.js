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
  markLicenseFlag,
  getScore,
  saveEquipment,
  saveInventory,
  spendScore,
} from '../game/progress.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const ROD_RANK = {
  basic: { label: 'N', color: 0x8ed6ff, glow: 0xdff5ff },
  carbon: { label: 'R', color: 0x6c7cff, glow: 0xe8e9ff },
  premium: { label: 'SR', color: 0xc46cff, glow: 0xf5e2ff },
}

const BAIT_RANK = {
  worm: { label: 'N', color: 0xff9b5e, glow: 0xffeadf },
  shrimp: { label: 'R', color: 0xff6f9d, glow: 0xffe3ec },
  special: { label: 'SR', color: 0xffc447, glow: 0xfff2cc },
}

const EMPTY_SLOTS = [
  { label: '帽子', icon: '🧢', x: 72, y: 166 },
  { label: '服', icon: '👕', x: 318, y: 166 },
  { label: 'お守り', icon: '✨', x: 72, y: 276 },
  { label: 'バッグ', icon: '🎒', x: 318, y: 276 },
]

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
    markLicenseFlag('ainan_seen_upgrade')
    this._background(W, H)
    this._header(W)
    this._loadout(W)
    this._inventoryGrid(W)
    buildFooterNav(this, W, H, 'upgrade')
  }

  _background(W, H) {
    addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)

    const veil = this.add.graphics().setDepth(1)
    veil.fillStyle(0xf7fbff, 0.72)
    veil.fillRect(0, 0, W, H)

    const top = this.add.graphics().setDepth(2)
    top.fillGradientStyle(0x1f83c6, 0x1f83c6, 0x82dfff, 0x82dfff, 0.9, 0.9, 0.15, 0.15)
    top.fillRect(0, 0, W, 155)

    const floor = this.add.graphics().setDepth(2)
    floor.fillGradientStyle(0xffffff, 0xffffff, 0xdaf7ff, 0xdaf7ff, 0.18, 0.18, 0.82, 0.82)
    floor.fillRect(0, 155, W, H - 155)
  }

  _header(W) {
    this.add.text(W / 2, 32, `${ICONS.GEAR} タックル強化`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '27px', fontWeight: '900',
      color: '#ffffff', shadow: SHADOW.medium,
    }).setOrigin(0.5).setDepth(5)

    this._pill(W / 2, 70, 178, 30, `${ICONS.SCORE} ${getScore().toLocaleString()} pt`, 0xffffff, '#1a3a5a')
    this.add.text(W / 2, 106, 'キャラと装備を整えて、釣果を伸ばそう', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900',
      color: '#ffffff', shadow: SHADOW.medium,
    }).setOrigin(0.5).setDepth(5)
  }

  _loadout(W) {
    const equipment = getEquipment()
    const inventory = getInventory()
    const y = 130

    const panel = this.add.graphics().setDepth(4)
    panel.fillStyle(0x000000, 0.14)
    panel.fillRoundedRect(18 + 3, y + 5, W - 36, 250, 24)
    panel.fillStyle(0xffffff, 0.92)
    panel.lineStyle(2.5, 0x1a2a3a, 0.9)
    panel.fillRoundedRect(18, y, W - 36, 250, 24)
    panel.strokeRoundedRect(18, y, W - 36, 250, 24)

    this._character(W / 2, y + 132)

    this._equipSlot(72, y + 68, '竿', ICONS.ROD, equipment.rodType, ROD_META[equipment.rodType], ROD_RANK[equipment.rodType], inventory.rods?.[equipment.rodType] ?? 0, 'rod', true)
    this._equipSlot(318, y + 68, 'エサ', ICONS.BAIT, equipment.baitType, BAIT_META[equipment.baitType], BAIT_RANK[equipment.baitType], inventory.baits?.[equipment.baitType] ?? 0, 'bait', true)

    EMPTY_SLOTS.forEach(slot => this._emptySlot(slot.x, y + slot.y - 130, slot.label, slot.icon))
  }

  _character(x, y) {
    const g = this.add.graphics().setDepth(6)
    g.fillStyle(0x5cc8ff, 0.14)
    g.fillEllipse(x, y + 82, 128, 32)

    g.fillStyle(0xffd29a, 1)
    g.lineStyle(3, 0x1a2a3a, 1)
    g.fillCircle(x, y - 36, 35)
    g.strokeCircle(x, y - 36, 35)

    g.fillStyle(0x1a3a5a, 1)
    g.fillCircle(x - 12, y - 42, 3)
    g.fillCircle(x + 12, y - 42, 3)
    g.lineStyle(2, 0x1a3a5a, 1)
    g.beginPath()
    g.arc(x, y - 33, 11, 0.15, Math.PI - 0.15)
    g.strokePath()

    g.fillStyle(0x3ab7ff, 1)
    g.lineStyle(3, 0x1a2a3a, 1)
    g.fillRoundedRect(x - 36, y, 72, 80, 20)
    g.strokeRoundedRect(x - 36, y, 72, 80, 20)

    g.fillStyle(0xffffff, 0.92)
    g.fillCircle(x, y + 29, 20)
    this.add.text(x, y + 29, ICONS.ROD, { fontSize: '25px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(7)

    this.add.text(x, y + 104, '港の釣り人', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '15px', fontWeight: '900',
      color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(7)
  }

  _equipSlot(x, y, label, icon, id, item, rank, qty, type, equipped) {
    const size = 72
    const g = this.add.graphics().setDepth(7)
    g.fillStyle(0x000000, 0.12)
    g.fillRoundedRect(x - size / 2 + 3, y - size / 2 + 4, size, size, 18)
    g.fillStyle(rank.glow, 1)
    g.lineStyle(equipped ? 4 : 2.5, equipped ? 0xffd900 : rank.color, 1)
    g.fillRoundedRect(x - size / 2, y - size / 2, size, size, 18)
    g.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 18)
    g.fillStyle(0xffffff, 0.74)
    g.fillCircle(x, y - 10, 25)

    this.add.text(x, y - 10, icon, { fontSize: '27px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(8)
    this._rankBadge(x - 22, y - 26, rank)
    this.add.text(x, y + 22, label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '10px', fontWeight: '900',
      color: '#55708a',
    }).setOrigin(0.5).setDepth(8)
    this.add.text(x, y + 36, type === 'bait' ? `x${qty}` : '装備中', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '10px', fontWeight: '900',
      color: '#e07800',
    }).setOrigin(0.5).setDepth(8)

    this.add.rectangle(x, y, size, size, 0x000000, 0)
      .setDepth(9)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showModal(id, item, type, icon, true, qty, true, rank))
  }

  _emptySlot(x, y, label, icon) {
    const size = 62
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0x1a3a5a, 0.08)
    g.lineStyle(2, 0x6b8aa4, 0.35)
    g.fillRoundedRect(x - size / 2, y - size / 2, size, size, 18)
    g.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 18)
    this.add.text(x, y - 8, icon, {
      fontSize: '21px',
      resolution: TEXT_RES,
      alpha: 0.48,
    }).setOrigin(0.5).setDepth(6)
    this.add.text(x, y + 18, label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '9px', fontWeight: '900',
      color: '#6b7f8f',
    }).setOrigin(0.5).setDepth(6)
  }

  _inventoryGrid(W) {
    const items = [
      ...Object.entries(ROD_META).map(([id, item]) => ({ id, item, type: 'rod', icon: ICONS.ROD, rank: ROD_RANK[id] })),
      ...Object.entries(BAIT_META).map(([id, item]) => ({ id, item, type: 'bait', icon: ICONS.BAIT, rank: BAIT_RANK[id] })),
    ]

    const x = 18
    const y = 402
    const w = W - 36
    const h = 260

    const panel = this.add.graphics().setDepth(4)
    panel.fillStyle(0x000000, 0.14)
    panel.fillRoundedRect(x + 3, y + 5, w, h, 24)
    panel.fillStyle(0xffffff, 0.95)
    panel.lineStyle(2.5, 0x1a2a3a, 0.9)
    panel.fillRoundedRect(x, y, w, h, 24)
    panel.strokeRoundedRect(x, y, w, h, 24)

    this.add.text(x + 22, y + 26, '所持品', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '17px', fontWeight: '900',
      color: '#1a3a5a',
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + w - 22, y + 26, 'タップで詳細', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '11px', fontWeight: '900',
      color: '#6b7f8f',
    }).setOrigin(1, 0.5).setDepth(5)

    const size = 78
    const gapX = 27
    const gapY = 16
    const startX = x + 22
    const startY = y + 52
    items.forEach((entry, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      this._inventoryTile(startX + col * (size + gapX), startY + row * (size + gapY), size, entry)
    })
  }

  _inventoryTile(x, y, size, entry) {
    const inventory = getInventory()
    const equipment = getEquipment()
    const owned = entry.type === 'rod' ? (inventory.rods?.[entry.id] ?? 0) > 0 : (inventory.baits?.[entry.id] ?? 0) > 0
    const qty = entry.type === 'bait' ? (inventory.baits?.[entry.id] ?? 0) : (owned ? 1 : 0)
    const equipped = entry.type === 'rod' ? equipment.rodType === entry.id : equipment.baitType === entry.id

    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0x000000, 0.12)
    g.fillRoundedRect(x + 3, y + 4, size, size, 18)
    g.fillStyle(owned ? entry.rank.glow : 0xf1f4f7, 1)
    g.lineStyle(equipped ? 4 : 2.5, equipped ? 0xffd900 : entry.rank.color, owned ? 1 : 0.65)
    g.fillRoundedRect(x, y, size, size, 18)
    g.strokeRoundedRect(x, y, size, size, 18)
    g.fillStyle(0xffffff, owned ? 0.74 : 0.54)
    g.fillCircle(x + size / 2, y + 26, 23)

    this.add.text(x + size / 2, y + 26, owned ? entry.icon : ICONS.LOCK, {
      fontSize: owned ? '25px' : '20px', resolution: TEXT_RES,
    }).setOrigin(0.5).setDepth(6)
    this._rankBadge(x + 17, y + 17, entry.rank)
    this.add.text(x + size / 2, y + 52, entry.item.name, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '9px', fontWeight: '900',
      color: '#1a3a5a',
      wordWrap: { width: size - 8 },
      align: 'center',
    }).setOrigin(0.5, 0).setDepth(6)
    this.add.text(x + size / 2, y + size - 10, entry.type === 'bait' ? `x${qty}` : (equipped ? '装備中' : owned ? '所持' : `${entry.item.cost}pt`), {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '9px', fontWeight: '900',
      color: equipped ? '#e07800' : '#4a7090',
    }).setOrigin(0.5).setDepth(6)

    this.add.rectangle(x + size / 2, y + size / 2, size, size, 0x000000, 0)
      .setDepth(7)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showModal(entry.id, entry.item, entry.type, entry.icon, owned, qty, equipped, entry.rank))
  }

  _rankBadge(x, y, rank) {
    const g = this.add.graphics().setDepth(8)
    g.fillStyle(rank.color, 1)
    g.lineStyle(1.5, 0xffffff, 0.85)
    g.fillRoundedRect(x - 14, y - 9, 28, 18, 7)
    g.strokeRoundedRect(x - 14, y - 9, 28, 18, 7)
    this.add.text(x, y, rank.label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '10px', fontWeight: '900',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(9)
  }

  _showModal(id, item, type, icon, owned, qty, equipped, rank) {
    const { width: W, height: H } = this.scale
    this._modal?.destroy(true)
    const items = []
    items.push(this.add.rectangle(W / 2, H / 2, W, H, 0x102b42, 0.48)
      .setInteractive()
      .on('pointerdown', () => this._modal?.destroy(true)))

    const x = 30
    const y = 166
    const w = W - 60
    const h = 354
    const bg = this.add.graphics()
    bg.fillStyle(0xffffff, 0.985)
    bg.lineStyle(3, 0x1a2a3a, 1)
    bg.fillRoundedRect(x, y, w, h, 24)
    bg.strokeRoundedRect(x, y, w, h, 24)
    bg.fillStyle(rank.glow, 1)
    bg.fillRoundedRect(x + 14, y + 14, w - 28, 114, 18)
    bg.lineStyle(2.5, rank.color, 1)
    bg.strokeRoundedRect(x + 14, y + 14, w - 28, 114, 18)
    bg.fillStyle(0xffffff, 0.76)
    bg.fillCircle(W / 2, y + 70, 45)
    items.push(bg)

    items.push(this.add.text(W / 2, y + 70, owned ? icon : ICONS.LOCK, {
      fontSize: owned ? '42px' : '34px', resolution: TEXT_RES,
    }).setOrigin(0.5))
    items.push(this.add.text(x + 42, y + 38, type === 'rod' ? 'ROD' : 'BAIT', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '900',
      color: '#5b7890',
    }).setOrigin(0, 0.5))
    items.push(this.add.text(x + w - 42, y + 38, rank.label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '18px', fontWeight: '900',
      color: '#ffffff',
      backgroundColor: Phaser.Display.Color.IntegerToColor(rank.color).rgba,
      padding: { x: 8, y: 3 },
    }).setOrigin(1, 0.5))

    items.push(this.add.text(W / 2, y + 152, item.name, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '24px', fontWeight: '900',
      color: '#1a3a5a',
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 188, item.desc, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900',
      color: '#4a7090',
      wordWrap: { width: w - 48 },
      align: 'center',
    }).setOrigin(0.5, 0))

    const status = type === 'rod'
      ? (equipped ? '現在装備中' : owned ? '所持済み' : `${item.cost} ptで購入`)
      : `在庫 ${qty} / ${item.cost} ptで +${item.amount}`
    items.push(this._statLine(W / 2, y + 244, status))

    const action = type === 'rod'
      ? (equipped ? null : owned ? '装備する' : '購入して装備')
      : '購入して装備'
    if (action) items.push(this._actionButton(W / 2, y + 294, action, () => this._apply(id, item, type, owned, qty)))
    items.push(this._plainButton(W / 2, y + h - 28, '閉じる', () => this._modal?.destroy(true)))

    this._modal = this.add.container(0, 18, items).setDepth(100).setAlpha(0)
    this.tweens.add({ targets: this._modal, y: 0, alpha: 1, duration: 160, ease: 'Sine.easeOut' })
  }

  _statLine(x, y, text) {
    const c = this.add.container(0, 0)
    const bg = this.add.graphics()
    bg.fillStyle(0xfff1d0, 1)
    bg.lineStyle(2, 0xe07800, 0.55)
    bg.fillRoundedRect(x - 118, y - 18, 236, 36, 14)
    bg.strokeRoundedRect(x - 118, y - 18, 236, 36, 14)
    const label = this.add.text(x, y, text, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900',
      color: '#9a5600',
    }).setOrigin(0.5)
    c.add([bg, label])
    return c
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
    bg.fillRoundedRect(x - 86, y - 22, 172, 44, 15)
    bg.strokeRoundedRect(x - 86, y - 22, 172, 44, 15)
    const txt = this.add.text(x, y, label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900',
      color: '#1a2a3a',
    }).setOrigin(0.5)
    const hit = this.add.rectangle(x, y, 184, 52, 0x000000, 0).setInteractive({ useHandCursor: true }).on('pointerdown', onTap)
    c.add([bg, txt, hit])
    return c
  }

  _plainButton(x, y, label, onTap) {
    return this.add.text(x, y, label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900',
      color: '#4a7090',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', onTap)
  }

  _pill(x, y, w, h, label, fill, color) {
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(fill, 0.92)
    g.lineStyle(2, 0x1a2a3a, 0.55)
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2)
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, h / 2)
    this.add.text(x, y, label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900',
      color,
    }).setOrigin(0.5).setDepth(6)
  }

  _toast(message) {
    this._modal?.destroy(true)
    const { width: W } = this.scale
    const bg = this.add.graphics().setDepth(120)
    bg.fillStyle(0x1a2a3a, 0.92)
    bg.fillRoundedRect(W / 2 - 112, 650, 224, 38, 15)
    const txt = this.add.text(W / 2, 669, message, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(121)
    this.tweens.add({ targets: [bg, txt], alpha: 0, y: '-=14', duration: 900, onComplete: () => { bg.destroy(); txt.destroy() } })
  }
}
