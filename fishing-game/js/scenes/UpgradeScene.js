import Phaser from 'phaser'
import { FONT, SHADOW, uiText } from '../config/fontStyles.js'
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

const ROD_ICON = {
  basic: '🎋',
  carbon: '🎣',
  premium: '🏆',
}

const BAIT_ICON = {
  worm: '🪱',
  shrimp: '🦐',
  special: '🍡',
}

const MATERIAL_ITEMS = [
  { id: 'scale', name: 'きらめく鱗', desc: '強化素材。今後の育成に使用予定', icon: '✨', qty: 12, rank: { label: 'R', color: 0x5ebcff, glow: 0xe7f7ff } },
  { id: 'shell', name: '貝殻パーツ', desc: '港町のショップ素材', icon: '🐚', qty: 8, rank: { label: 'N', color: 0x8bcf52, glow: 0xecf8df } },
  { id: 'ticket', name: '交換チケット', desc: 'ショップで使える補助券', icon: '🎟️', qty: 3, rank: { label: 'SR', color: 0xffc447, glow: 0xfff2cc } },
  { id: 'gem', name: '青い宝石', desc: 'イベント報酬素材', icon: '💎', qty: 1, rank: { label: 'SR', color: 0x6c7cff, glow: 0xe8e9ff } },
]

export default class UpgradeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UpgradeScene' })
  }

  init(data = {}) {
    this._tab = data.tab ?? this._tab ?? 'rod'
    this._scroll = data.scroll ?? 0
  }

  preload() {
    const bg = ASSETS.backgrounds.homeBase
    if (!this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
    const player = ASSETS.characters.playerDefaultUi
    if (!this.textures.exists(player.key)) this.load.image(player.key, player.path)
  }

  create() {
    const { width: W, height: H } = this.scale
    this._modal = null
    markLicenseFlag('ainan_seen_upgrade')
    this._background(W, H)
    this._header(W)
    this._loadout(W)
    this._inventoryPanel(W, H)
    buildFooterNav(this, W, H, 'equip')
  }

  _background(W, H) {
    addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillStyle(0xf7fbff, 0.72)
    veil.fillRect(0, 0, W, H)
    const top = this.add.graphics().setDepth(2)
    top.fillGradientStyle(0x1f83c6, 0x1f83c6, 0x82dfff, 0x82dfff, 0.9, 0.9, 0.15, 0.15)
    top.fillRect(0, 0, W, 155)
  }

  _header(W) {
    this.add.text(W / 2, 32, `${ICONS.GEAR} 装備`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '27px', fontWeight: '900',
      color: '#ffffff', shadow: SHADOW.medium,
    }).setOrigin(0.5).setDepth(5)
    this._pill(W / 2, 70, 178, 30, `${ICONS.SCORE} ${getScore().toLocaleString()} pt`, 0xffffff, '#1a3a5a')
    this.add.text(W / 2, 106, 'キャラと装備を整えて、釣果を伸ばそう', uiText('chip', {
      fontSize: '15px',
      color: '#ffffff',
      shadow: SHADOW.medium,
    })).setOrigin(0.5).setDepth(5)
  }

  _loadout(W) {
    const equipment = getEquipment()
    const inventory = getInventory()
    const rodType = equipment.rodType ?? 'basic'
    const baitType = equipment.baitType ?? 'worm'
    const y = 130
    const panel = this.add.graphics().setDepth(4)
    panel.fillStyle(0x000000, 0.14)
    panel.fillRoundedRect(18 + 3, y + 5, W - 36, 250, 24)
    panel.fillStyle(0xffffff, 0.92)
    panel.lineStyle(2.5, 0x1a2a3a, 0.9)
    panel.fillRoundedRect(18, y, W - 36, 250, 24)
    panel.strokeRoundedRect(18, y, W - 36, 250, 24)

    this._character(W / 2, y + 132)
    this._equipSlot(72, y + 68, '竿', ROD_ICON[rodType], rodType, ROD_META[rodType], ROD_RANK[rodType], inventory.rods?.[rodType] ?? 0, 'rod')
    this._equipSlot(318, y + 68, 'エサ', BAIT_ICON[baitType], baitType, BAIT_META[baitType], BAIT_RANK[baitType], inventory.baits?.[baitType] ?? 0, 'bait')
    this._emptySlot(72, y + 174, '帽子', '🧢')
    this._emptySlot(318, y + 174, 'バッグ', '🎒')
  }

  _character(x, y) {
    const g = this.add.graphics().setDepth(6)
    g.fillStyle(0x5cc8ff, 0.14)
    g.fillEllipse(x, y + 88, 138, 30)
    const player = this.add.image(x, y - 8, ASSETS.characters.playerDefaultUi.key)
      .setOrigin(0.5, 0.55)
      .setDisplaySize(94, 237)
      .setDepth(7)
    this.textures.get(ASSETS.characters.playerDefaultUi.key)?.setFilter(Phaser.Textures.FilterMode.LINEAR)
    this.add.text(x, y + 104, '港の釣り人', uiText('cardTitle', { fontSize: '16px' })).setOrigin(0.5).setDepth(7)
  }

  _equipSlot(x, y, label, icon, id, item, rank, qty, type) {
    const size = 72
    const isDefault = (type === 'rod' && id === 'basic') || (type === 'bait' && id === 'worm')
    const qtyLabel = type === 'bait'
      ? (id === 'worm' ? '標準装備' : `x${qty}`)
      : '装備中'
    const g = this.add.graphics().setDepth(7)
    g.fillStyle(0x000000, 0.12)
    g.fillRoundedRect(x - size / 2 + 3, y - size / 2 + 4, size, size, 18)
    g.fillStyle(rank.glow, 1)
    g.lineStyle(4, 0xffd900, 1)
    g.fillRoundedRect(x - size / 2, y - size / 2, size, size, 18)
    g.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 18)
    g.fillStyle(0xffffff, 0.74)
    g.fillCircle(x, y - 10, 25)
    this.add.text(x, y - 10, icon, { fontSize: '27px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(8)
    this._rankBadge(x - 22, y - 26, rank)
    this.add.text(x, y + 19, item.name, uiText('micro', { fontSize: '12px', color: '#1a3a5a', wordWrap: { width: size - 8 }, align: 'center' })).setOrigin(0.5).setDepth(8)
    this.add.text(x, y + 37, isDefault ? '基本' : qtyLabel, uiText('micro', { fontSize: '12px', color: isDefault ? '#4a7090' : '#e07800' })).setOrigin(0.5).setDepth(8)
    this.add.rectangle(x, y, size, size, 0x000000, 0).setDepth(9).setInteractive({ useHandCursor: true }).on('pointerdown', () => this._showModal(id, item, type, icon, true, qty, true, rank))
  }

  _emptySlot(x, y, label, icon) {
    const size = 62
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0x1a3a5a, 0.08)
    g.lineStyle(2, 0x6b8aa4, 0.35)
    g.fillRoundedRect(x - size / 2, y - size / 2, size, size, 18)
    g.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 18)
    this.add.text(x, y - 8, icon, { fontSize: '21px', resolution: TEXT_RES, alpha: 0.48 }).setOrigin(0.5).setDepth(6)
    this.add.text(x, y + 18, label, uiText('micro', { fontSize: '12px', color: '#6b7f8f' })).setOrigin(0.5).setDepth(6)
  }

  _inventoryPanel(W, H) {
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
    this.add.text(x + 22, y + 24, '所持品', uiText('panelTitle', { fontSize: '17px' })).setOrigin(0, 0.5).setDepth(5)

    const tabs = [
      { id: 'rod', label: '竿' },
      { id: 'bait', label: 'エサ' },
      { id: 'material', label: '素材' },
    ]
    tabs.forEach((tab, i) => this._tabButton(x + 82 + i * 72, y + 24, 62, 28, tab))
    this._inventoryGrid(x + 18, y + 56, w - 36, h - 76)
  }

  _tabButton(x, y, w, h, tab) {
    const active = this._tab === tab.id
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(active ? 0xffd900 : 0xffffff, 1)
    g.lineStyle(2, active ? 0x1a2a3a : 0xb7c4cf, 1)
    g.fillRoundedRect(x, y - h / 2, w, h, 10)
    g.strokeRoundedRect(x, y - h / 2, w, h, 10)
    this.add.text(x + w / 2, y, tab.label, uiText('button', { fontSize: '13px' })).setOrigin(0.5).setDepth(6)
    this.add.rectangle(x + w / 2, y, w, h, 0x000000, 0).setDepth(7).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.restart({ tab: tab.id, scroll: 0 }))
  }

  _inventoryItems() {
    if (this._tab === 'rod') return Object.entries(ROD_META).map(([id, item]) => ({ id, item, type: 'rod', icon: ROD_ICON[id], rank: ROD_RANK[id] }))
    if (this._tab === 'bait') return Object.entries(BAIT_META).map(([id, item]) => ({ id, item, type: 'bait', icon: BAIT_ICON[id], rank: BAIT_RANK[id] }))
    return MATERIAL_ITEMS.map(item => ({ id: item.id, item, type: 'material', icon: item.icon, rank: item.rank, fixedQty: item.qty }))
  }

  _inventoryGrid(x, y, w, viewH) {
    const items = this._inventoryItems()
    const size = 84
    const gapX = 16
    const gapY = 16
    const cols = 3
    const rows = Math.ceil(items.length / cols)
    const contentH = rows * size + Math.max(0, rows - 1) * gapY
    const maxScroll = Math.max(0, contentH - viewH)
    this._scroll = Phaser.Math.Clamp(this._scroll, 0, maxScroll)

    const maskShape = this.add.graphics().setVisible(false)
    maskShape.fillStyle(0xffffff, 1)
    maskShape.fillRect(x - 2, y - 2, w + 4, viewH + 4)
    const list = this.add.container(0, -this._scroll).setDepth(5).setMask(maskShape.createGeometryMask())

    items.forEach((entry, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      this._inventoryTile(list, x + col * (size + gapX), y + row * (size + gapY), size, entry)
    })

    if (maxScroll > 0) {
      this.input.on('wheel', (_pointer, _objects, _dx, dy) => {
        const next = Phaser.Math.Clamp(this._scroll + dy * 0.55, 0, maxScroll)
        if (next !== this._scroll) this.scene.restart({ tab: this._tab, scroll: next })
      })
    }
  }

  _inventoryTile(parent, x, y, size, entry) {
    const add = obj => {
      parent.add(obj)
      return obj
    }
    const inventory = getInventory()
    const equipment = getEquipment()
    const owned = entry.type === 'material'
      ? true
      : entry.type === 'rod'
        ? (inventory.rods?.[entry.id] ?? 0) > 0
        : entry.id === 'worm' || (inventory.baits?.[entry.id] ?? 0) > 0
    const qty = entry.type === 'material' ? entry.fixedQty : entry.type === 'bait' ? (entry.id === 'worm' ? Infinity : (inventory.baits?.[entry.id] ?? 0)) : (owned ? 1 : 0)
    const equipped = entry.type === 'rod' ? equipment.rodType === entry.id : entry.type === 'bait' ? equipment.baitType === entry.id : false
    const g = add(this.add.graphics())
    g.fillStyle(0x000000, 0.12)
    g.fillRoundedRect(x + 3, y + 4, size, size, 18)
    g.fillStyle(owned ? entry.rank.glow : 0xf1f4f7, 1)
    g.lineStyle(equipped ? 4 : 2.5, equipped ? 0xffd900 : entry.rank.color, owned ? 1 : 0.65)
    g.fillRoundedRect(x, y, size, size, 18)
    g.strokeRoundedRect(x, y, size, size, 18)
    g.fillStyle(0xffffff, owned ? 0.74 : 0.54)
    g.fillCircle(x + size / 2, y + 25, 22)
    add(this.add.text(x + size / 2, y + 25, owned ? entry.icon : ICONS.LOCK, { fontSize: owned ? '24px' : '20px', resolution: TEXT_RES }).setOrigin(0.5))
    this._rankBadge(x + 17, y + 17, entry.rank, parent)
    add(this.add.text(x + size / 2, y + 50, entry.item.name, uiText('micro', { fontSize: '12px', color: '#1a3a5a', wordWrap: { width: size - 6 }, align: 'center' })).setOrigin(0.5, 0))
    add(this.add.text(x + size / 2, y + size - 10, entry.type === 'rod' ? (equipped ? '装備中' : owned ? '所持' : `${entry.item.cost}pt`) : (entry.id === 'worm' ? '基本' : `x${qty}`), uiText('micro', { fontSize: '12px', color: equipped ? '#e07800' : '#4a7090' })).setOrigin(0.5))
    add(this.add.rectangle(x + size / 2, y + size / 2, size, size, 0x000000, 0).setInteractive({ useHandCursor: true }).on('pointerdown', () => this._showModal(entry.id, entry.item, entry.type, entry.icon, owned, qty, equipped, entry.rank)))
  }

  _rankBadge(x, y, rank, parent = null) {
    const g = this.add.graphics().setDepth(8)
    g.fillStyle(rank.color, 1)
    g.lineStyle(1.5, 0xffffff, 0.85)
    g.fillRoundedRect(x - 14, y - 9, 28, 18, 7)
    g.strokeRoundedRect(x - 14, y - 9, 28, 18, 7)
    const t = this.add.text(x, y, rank.label, uiText('micro', { fontSize: '12px', color: '#ffffff' })).setOrigin(0.5)
    if (parent) parent.add([g, t])
  }

  _showModal(id, item, type, icon, owned, qty, equipped, rank) {
    const { width: W, height: H } = this.scale
    this._modal?.destroy(true)
    const items = []
    items.push(this.add.rectangle(W / 2, H / 2, W, H, 0x102b42, 0.48).setInteractive().on('pointerdown', () => this._modal?.destroy(true)))
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
    items.push(this.add.text(W / 2, y + 70, owned ? icon : ICONS.LOCK, { fontSize: owned ? '42px' : '34px', resolution: TEXT_RES }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 152, item.name, uiText('panelTitle', { fontSize: '24px' })).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 188, item.desc, uiText('screenLead', { fontSize: '15px', wordWrap: { width: w - 48 }, align: 'center' })).setOrigin(0.5, 0))
    const isDefaultEquipped = equipped && ((type === 'rod' && id === 'basic') || (type === 'bait' && id === 'worm'))
    const status = type === 'material'
      ? `所持 ${qty}`
      : type === 'rod'
        ? (equipped ? '現在装備中' : owned ? '所持済み' : `${item.cost} ptで購入`)
        : id === 'worm' ? '標準装備 / いつでも使える' : `在庫 ${qty} / ${item.cost} ptで +${item.amount}`
    items.push(this._statLine(W / 2, y + 244, status))
    const action = type === 'material' ? null : type === 'rod' ? (equipped ? null : owned ? '装備する' : '購入して装備') : (equipped ? null : owned ? '装備する' : '購入して装備')
    if (action) items.push(this._actionButton(W / 2, y + 288, action, () => this._apply(id, item, type, owned, qty)))
    if (equipped && !isDefaultEquipped) items.push(this._plainButton(W / 2, y + 324, type === 'bait' ? '外してふつうのえさに戻す' : '外して初心者竿に戻す', () => this._unequip(type)))
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
    const label = this.add.text(x, y, text, uiText('chip', { fontSize: '15px', color: '#9a5600' })).setOrigin(0.5)
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
    } else if (type === 'bait') {
      if (!owned) {
        if (!spendScore(item.cost)) return this._toast('ポイントが足りません')
        inventory.baits[id] = (Number.isFinite(qty) ? qty : 0) + item.amount
      }
      equipment.baitType = id
    }
    saveInventory(inventory)
    saveEquipment(equipment)
    this.scene.restart({ tab: this._tab, scroll: this._scroll })
  }

  _unequip(type) {
    const equipment = getEquipment()
    if (type === 'rod') equipment.rodType = 'basic'
    if (type === 'bait') equipment.baitType = 'worm'
    saveEquipment(equipment)
    this.scene.restart({ tab: this._tab, scroll: this._scroll })
  }

  _actionButton(x, y, label, onTap) {
    const c = this.add.container(0, 0)
    const bg = this.add.graphics()
    bg.fillStyle(0xffd900, 1)
    bg.lineStyle(2.5, 0x1a2a3a, 1)
    bg.fillRoundedRect(x - 86, y - 22, 172, 44, 15)
    bg.strokeRoundedRect(x - 86, y - 22, 172, 44, 15)
    const txt = this.add.text(x, y, label, uiText('button', { fontSize: '15px' })).setOrigin(0.5)
    const hit = this.add.rectangle(x, y, 184, 52, 0x000000, 0).setInteractive({ useHandCursor: true }).on('pointerdown', onTap)
    c.add([bg, txt, hit])
    return c
  }

  _plainButton(x, y, label, onTap) {
    return this.add.text(x, y, label, uiText('chip', { fontSize: '15px', color: '#4a7090' })).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', onTap)
  }

  _pill(x, y, w, h, label, fill, color) {
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(fill, 0.92)
    g.lineStyle(2, 0x1a2a3a, 0.55)
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2)
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, h / 2)
    this.add.text(x, y, label, uiText('chip', { fontSize: '14px', color })).setOrigin(0.5).setDepth(6)
  }

  _toast(message) {
    this._modal?.destroy(true)
    const { width: W } = this.scale
    const bg = this.add.graphics().setDepth(120)
    bg.fillStyle(0x1a2a3a, 0.92)
    bg.fillRoundedRect(W / 2 - 112, 650, 224, 38, 15)
    const txt = this.add.text(W / 2, 669, message, uiText('chip', { fontSize: '15px', color: '#ffffff' })).setOrigin(0.5).setDepth(121)
    this.tweens.add({ targets: [bg, txt], alpha: 0, y: '-=14', duration: 900, onComplete: () => { bg.destroy(); txt.destroy() } })
  }
}
