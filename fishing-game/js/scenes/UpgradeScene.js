import Phaser from 'phaser'
import { FONT, SHADOW, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { BAIT_FISH_EFFECT } from '../game/fish.js'
import { getBaitShopUnlock } from '../game/townUnlocks.js'
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
  basic: { label: 'N', color: 0x5bb5d8, glow: 0xdff5ff },
  carbon: { label: 'R', color: 0x6c7cff, glow: 0xe8e9ff },
  premium: { label: 'SR', color: 0xc46cff, glow: 0xf5e2ff },
}

const BAIT_RANK = {
  worm: { label: 'N', color: 0xff9b5e, glow: 0xffeadf },
  shrimp: { label: 'R', color: 0xff6f9d, glow: 0xffe3ec },
  special: { label: 'SR', color: 0xffc447, glow: 0xfff2cc },
}

const ROD_POWER = { basic: 80, carbon: 130, premium: 220 }
const BAIT_POWER = { worm: 20, shrimp: 55, special: 95 }

const ROD_ART = {
  basic: ASSETS.equipment.rodBasic,
  carbon: ASSETS.equipment.rodCarbon,
  premium: ASSETS.equipment.rodPremium,
}

const BAIT_ART = {
  worm: ASSETS.equipment.baitWorm,
  shrimp: ASSETS.equipment.baitShrimp,
  special: ASSETS.equipment.baitSpecial,
}

const MATERIAL_ITEMS = [
  { id: 'scale', name: 'きらめく鱗', desc: '強化素材。今後の育成に使用予定', mark: '鱗', qty: 12, rank: { label: 'R', color: 0x5ebcff, glow: 0xe7f7ff } },
  { id: 'shell', name: '貝殻パーツ', desc: '港町のショップ素材', mark: '貝', qty: 8, rank: { label: 'N', color: 0x8bcf52, glow: 0xecf8df } },
  { id: 'ticket', name: '交換チケット', desc: 'ショップで使える補助券', mark: '券', qty: 3, rank: { label: 'SR', color: 0xffc447, glow: 0xfff2cc } },
  { id: 'gem', name: '青い宝石', desc: 'イベント報酬素材', mark: '晶', qty: 1, rank: { label: 'SR', color: 0x6c7cff, glow: 0xe8e9ff } },
]

export default class UpgradeScene extends Phaser.Scene {
  constructor() { super({ key: 'UpgradeScene' }) }

  init(data = {}) {
    this._tab = data.tab ?? this._tab ?? 'rod'
    this._scroll = data.scroll ?? 0
  }

  preload() {
    const wanted = [
      ASSETS.backgrounds.homeBase,
      ASSETS.characters.playerDefaultUi,
      ...Object.values(ROD_ART),
      ...Object.values(BAIT_ART),
    ]
    wanted.forEach(asset => {
      if (asset?.status === 'ready' && !this.textures.exists(asset.key)) this.load.image(asset.key, asset.path)
    })
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
    veil.fillGradientStyle(0xf8fdff, 0xf8fdff, 0xeaf7fc, 0xeaf7fc, 0.62, 0.62, 0.90, 0.90)
    veil.fillRect(0, 0, W, H)
    const top = this.add.graphics().setDepth(2)
    top.fillGradientStyle(0x1f83c6, 0x1f83c6, 0x66c9ed, 0x66c9ed, 0.92, 0.92, 0.52, 0.52)
    top.fillRect(0, 0, W, 142)
  }

  _header(W) {
    const equipment = getEquipment()
    this.add.text(24, 30, '装備', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '25px', fontWeight: '900', color: '#ffffff', shadow: SHADOW.medium,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(24, 57, '竿とエサで釣りの手応えが変わる', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: '#eaf8ff', shadow: SHADOW.subtle,
    }).setOrigin(0, 0.5).setDepth(5)

    const wallet = this.add.graphics().setDepth(5)
    wallet.fillStyle(0xffffff, 0.94)
    wallet.lineStyle(1.5, 0xffffff, 0.78)
    wallet.fillRoundedRect(W - 132, 20, 112, 38, 14)
    wallet.strokeRoundedRect(W - 132, 20, 112, 38, 14)
    this.add.text(W - 28, 39, `${getScore().toLocaleString()} pt`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: UI_COLORS.warning,
    }).setOrigin(1, 0.5).setDepth(6)

    this._powerPlate(W / 2, 100, this._calcPower(equipment))
  }

  _loadout(W) {
    const equipment = getEquipment()
    const inventory = getInventory()
    const rodType = equipment.rodType ?? 'basic'
    const baitType = equipment.baitType ?? 'worm'
    const y = 132

    const panel = this.add.graphics().setDepth(4)
    panel.fillStyle(0x173248, 0.12)
    panel.fillRoundedRect(18 + 3, y + 5, W - 36, 248, 24)
    panel.fillStyle(0xf8fdff, 0.96)
    panel.lineStyle(1.8, 0x9bcfe5, 0.88)
    panel.fillRoundedRect(18, y, W - 36, 248, 24)
    panel.strokeRoundedRect(18, y, W - 36, 248, 24)
    panel.fillStyle(0xdff5ff, 0.55)
    panel.fillRoundedRect(28, y + 12, W - 56, 28, 13)

    this.add.text(W / 2, y + 26, 'CURRENT LOADOUT', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.oceanDeep,
      letterSpacing: 1,
    }).setOrigin(0.5).setDepth(5)

    this._character(W / 2, y + 142)
    this._equipSlot(70, y + 89, '竿', rodType, ROD_META[rodType], ROD_RANK[rodType], inventory.rods?.[rodType] ?? 0, 'rod', ROD_ART[rodType])
    this._equipSlot(320, y + 89, 'エサ', baitType, BAIT_META[baitType], BAIT_RANK[baitType], inventory.baits?.[baitType] ?? 0, 'bait', BAIT_ART[baitType])
    this._emptySlot(70, y + 188, '帽子')
    this._emptySlot(320, y + 188, 'バッグ')
  }

  _calcPower(equipment) {
    const rod = equipment?.rodType ?? 'basic'
    const bait = equipment?.baitType ?? 'worm'
    return 100 + (ROD_POWER[rod] ?? ROD_POWER.basic) + (BAIT_POWER[bait] ?? BAIT_POWER.worm)
  }

  _powerPlate(x, y, value) {
    const w = 176, h = 42
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0x173248, 0.18)
    g.fillRoundedRect(x - w / 2 + 2, y - h / 2 + 4, w, h, 15)
    g.fillStyle(0xffe17a, 1)
    g.lineStyle(2, 0xffffff, 0.75)
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 15)
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 15)
    g.fillStyle(0xffffff, 0.32)
    g.fillRoundedRect(x - w / 2 + 8, y - h / 2 + 5, w - 16, 8, 4)
    this.add.text(x - 45, y, 'POWER', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: '#765000', letterSpacing: 1,
    }).setOrigin(0.5).setDepth(6)
    this.add.text(x + 35, y, String(value), {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '23px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5).setDepth(6)
  }

  _character(x, y) {
    const g = this.add.graphics().setDepth(6)
    g.fillStyle(0x5cc8ff, 0.12)
    g.fillEllipse(x, y + 78, 128, 26)
    const player = this.add.image(x, y - 13, ASSETS.characters.playerDefaultUi.key)
      .setOrigin(0.5, 0.55).setDisplaySize(92, 230).setDepth(7)
    this.textures.get(ASSETS.characters.playerDefaultUi.key)?.setFilter(Phaser.Textures.FilterMode.LINEAR)
    this.add.text(x, y + 92, '港の釣り人', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5).setDepth(7)
  }

  _equipSlot(x, y, label, id, item, rank, qty, type, art) {
    const size = 78
    const isDefault = (type === 'rod' && id === 'basic') || (type === 'bait' && id === 'worm')
    const qtyLabel = type === 'bait' ? (id === 'worm' ? '標準装備' : `x${qty}`) : '装備中'
    const g = this.add.graphics().setDepth(7)
    g.fillStyle(0x173248, 0.10)
    g.fillRoundedRect(x - size / 2 + 2, y - size / 2 + 3, size, size, 18)
    g.fillStyle(rank.glow, 1)
    g.lineStyle(3, 0xffd95a, 0.95)
    g.fillRoundedRect(x - size / 2, y - size / 2, size, size, 18)
    g.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 18)
    g.fillStyle(0xffffff, 0.72)
    g.fillCircle(x, y - 9, 27)

    if (art?.key && this.textures.exists(art.key)) this.add.image(x, y - 9, art.key).setDisplaySize(55, 55).setDepth(8)
    this._rankBadge(x - 25, y - 28, rank)
    this.add.text(x, y + 21, item.name, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: UI_COLORS.ink,
      wordWrap: { width: size - 7 }, align: 'center',
    }).setOrigin(0.5).setDepth(8)
    this.add.text(x, y + 36, isDefault ? '基本' : qtyLabel, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '900', color: isDefault ? UI_COLORS.inkSoft : UI_COLORS.warning,
    }).setOrigin(0.5).setDepth(8)
    this.add.rectangle(x, y, size, size, 0x000000, 0).setDepth(9).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showModal(id, item, type, art, true, qty, true, rank))
  }

  _emptySlot(x, y, label) {
    const size = 62
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0x173248, 0.05)
    g.lineStyle(1.5, 0x9bb3c0, 0.40)
    g.fillRoundedRect(x - size / 2, y - size / 2, size, size, 17)
    g.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 17)
    this.add.text(x, y - 6, '＋', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '20px', fontWeight: '700', color: UI_COLORS.muted,
    }).setOrigin(0.5).setDepth(6)
    this.add.text(x, y + 18, label, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: UI_COLORS.muted,
    }).setOrigin(0.5).setDepth(6)
  }

  _inventoryPanel(W, H) {
    const x = 18, y = 400, w = W - 36, h = 262
    const panel = this.add.graphics().setDepth(4)
    panel.fillStyle(0x173248, 0.10)
    panel.fillRoundedRect(x + 3, y + 5, w, h, 24)
    panel.fillStyle(0xf8fdff, 0.97)
    panel.lineStyle(1.8, 0x9bcfe5, 0.88)
    panel.fillRoundedRect(x, y, w, h, 24)
    panel.strokeRoundedRect(x, y, w, h, 24)
    this.add.text(x + 18, y + 24, '所持品', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(5)

    const tabs = [{ id: 'rod', label: '竿' }, { id: 'bait', label: 'エサ' }, { id: 'material', label: '素材' }]
    tabs.forEach((tab, i) => this._tabButton(x + 94 + i * 70, y + 24, 60, 28, tab))
    this._inventoryGrid(x + 18, y + 56, w - 36, h - 76)
  }

  _tabButton(x, y, w, h, tab) {
    const active = this._tab === tab.id
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(active ? 0xffd95a : 0xffffff, 1)
    g.lineStyle(1.5, active ? 0x173248 : 0xb7cbd5, active ? 0.75 : 0.75)
    g.fillRoundedRect(x, y - h / 2, w, h, 10)
    g.strokeRoundedRect(x, y - h / 2, w, h, 10)
    this.add.text(x + w / 2, y, tab.label, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5).setDepth(6)
    this.add.rectangle(x + w / 2, y, w, h, 0x000000, 0).setDepth(7).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.restart({ tab: tab.id, scroll: 0 }))
  }

  _inventoryItems() {
    if (this._tab === 'rod') return Object.entries(ROD_META).map(([id, item]) => ({ id, item, type: 'rod', art: ROD_ART[id], rank: ROD_RANK[id] }))
    if (this._tab === 'bait') return Object.entries(BAIT_META).map(([id, item]) => ({ id, item, type: 'bait', art: BAIT_ART[id], rank: BAIT_RANK[id] }))
    return MATERIAL_ITEMS.map(item => ({ id: item.id, item, type: 'material', mark: item.mark, rank: item.rank, fixedQty: item.qty }))
  }

  _inventoryGrid(x, y, w, viewH) {
    const items = this._inventoryItems()
    const size = 84, gapX = 16, gapY = 16, cols = 3
    const rows = Math.ceil(items.length / cols)
    const contentH = rows * size + Math.max(0, rows - 1) * gapY
    const maxScroll = Math.max(0, contentH - viewH)
    this._scroll = Phaser.Math.Clamp(this._scroll, 0, maxScroll)

    const maskShape = this.add.graphics().setVisible(false)
    maskShape.fillStyle(0xffffff, 1)
    maskShape.fillRect(x - 2, y - 2, w + 4, viewH + 4)
    const list = this.add.container(0, -this._scroll).setDepth(5).setMask(maskShape.createGeometryMask())

    items.forEach((entry, i) => {
      const col = i % cols, row = Math.floor(i / cols)
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
    const add = obj => { parent.add(obj); return obj }
    const inventory = getInventory()
    const equipment = getEquipment()
    const owned = entry.type === 'material'
      ? true
      : entry.type === 'rod'
        ? (inventory.rods?.[entry.id] ?? 0) > 0
        : entry.id === 'worm' || (inventory.baits?.[entry.id] ?? 0) > 0
    const qty = entry.type === 'material' ? entry.fixedQty : entry.type === 'bait' ? (entry.id === 'worm' ? Infinity : (inventory.baits?.[entry.id] ?? 0)) : (owned ? 1 : 0)
    const equipped = entry.type === 'rod' ? equipment.rodType === entry.id : entry.type === 'bait' ? equipment.baitType === entry.id : false
    const shopUnlock = entry.type === 'bait' ? getBaitShopUnlock(entry.id) : null

    const g = add(this.add.graphics())
    g.fillStyle(0x173248, 0.08)
    g.fillRoundedRect(x + 2, y + 3, size, size, 17)
    g.fillStyle(owned ? entry.rank.glow : 0xf0f3f5, 1)
    g.lineStyle(equipped ? 3 : 1.6, equipped ? 0xffd95a : entry.rank.color, owned ? 0.95 : 0.45)
    g.fillRoundedRect(x, y, size, size, 17)
    g.strokeRoundedRect(x, y, size, size, 17)
    g.fillStyle(0xffffff, owned ? 0.78 : 0.45)
    g.fillCircle(x + size / 2, y + 26, 24)

    if (entry.art?.key && owned && this.textures.exists(entry.art.key)) {
      add(this.add.image(x + size / 2, y + 26, entry.art.key).setDisplaySize(52, 52))
    } else {
      add(this.add.text(x + size / 2, y + 26, owned ? (entry.mark ?? '•') : 'LOCK', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: owned ? '14px' : '8px', fontWeight: '900', color: owned ? UI_COLORS.ink : UI_COLORS.muted,
      }).setOrigin(0.5))
    }

    this._rankBadge(x + 17, y + 17, entry.rank, parent)
    add(this.add.text(x + size / 2, y + 53, entry.item.name, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: UI_COLORS.ink,
      wordWrap: { width: size - 6 }, align: 'center',
    }).setOrigin(0.5, 0))
    const footer = entry.type === 'rod'
      ? (equipped ? '装備中' : owned ? '所持' : `${entry.item.cost}pt`)
      : entry.type === 'material'
        ? `x${qty}`
        : entry.id === 'worm'
          ? '基本'
          : !shopUnlock?.unlocked && !owned
            ? '町で解放'
            : `x${qty}`
    add(this.add.text(x + size / 2, y + size - 8, footer, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '900', color: equipped ? UI_COLORS.warning : UI_COLORS.inkSoft,
    }).setOrigin(0.5))
    add(this.add.rectangle(x + size / 2, y + size / 2, size, size, 0x000000, 0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showModal(entry.id, entry.item, entry.type, entry.art, owned, qty, equipped, entry.rank, entry.mark)))
  }

  _rankBadge(x, y, rank, parent = null) {
    const g = this.add.graphics().setDepth(8)
    g.fillStyle(rank.color, 1)
    g.lineStyle(1.2, 0xffffff, 0.85)
    g.fillRoundedRect(x - 13, y - 8, 26, 16, 6)
    g.strokeRoundedRect(x - 13, y - 8, 26, 16, 6)
    const t = this.add.text(x, y, rank.label, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5)
    if (parent) parent.add([g, t])
  }

  _showModal(id, item, type, art, owned, qty, equipped, rank, mark = '') {
    const { width: W, height: H } = this.scale
    this._modal?.destroy(true)
    const items = []
    items.push(this.add.rectangle(W / 2, H / 2, W, H, 0x173248, 0.48).setInteractive().on('pointerdown', () => this._modal?.destroy(true)))
    const x = 30, y = 160, w = W - 60, h = 366
    const bg = this.add.graphics()
    bg.fillStyle(0x173248, 0.14)
    bg.fillRoundedRect(x + 3, y + 5, w, h, 24)
    bg.fillStyle(0xf8fdff, 0.99)
    bg.lineStyle(2.2, 0x9bcfe5, 0.9)
    bg.fillRoundedRect(x, y, w, h, 24)
    bg.strokeRoundedRect(x, y, w, h, 24)
    bg.fillStyle(rank.glow, 1)
    bg.fillRoundedRect(x + 16, y + 16, w - 32, 126, 20)
    bg.lineStyle(1.8, rank.color, 0.72)
    bg.strokeRoundedRect(x + 16, y + 16, w - 32, 126, 20)
    items.push(bg)

    if (art?.key && owned && this.textures.exists(art.key)) {
      items.push(this.add.image(W / 2, y + 79, art.key).setDisplaySize(110, 110))
    } else {
      items.push(this.add.text(W / 2, y + 79, owned ? mark : 'LOCK', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: owned ? '28px' : '13px', fontWeight: '900', color: UI_COLORS.muted,
      }).setOrigin(0.5))
    }

    items.push(this.add.text(W / 2, y + 164, item.name, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '21px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5))
    const effect = type === 'bait' ? BAIT_FISH_EFFECT[id]?.detail : null
    items.push(this.add.text(W / 2, y + 197, effect ? `${item.desc}\n${effect}` : item.desc, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '800', color: UI_COLORS.inkSoft,
      wordWrap: { width: w - 48 }, align: 'center', lineSpacing: 3,
    }).setOrigin(0.5, 0))

    const isDefaultEquipped = equipped && ((type === 'rod' && id === 'basic') || (type === 'bait' && id === 'worm'))
    const shopUnlock = type === 'bait' ? getBaitShopUnlock(id) : null
    const status = type === 'material'
      ? `所持 ${qty}`
      : type === 'rod'
        ? (equipped ? '現在装備中' : owned ? '所持済み' : `${item.cost} ptで購入`)
        : id === 'worm'
          ? '標準装備 / いつでも使える'
          : shopUnlock?.unlocked
            ? `在庫 ${qty} / ${item.cost} ptで +${item.amount}`
            : `在庫 ${qty} / 販売解放: ${shopUnlock?.unlockedBy}`
    items.push(this._statLine(W / 2, y + 258, status))

    let action = null
    if (type === 'rod') action = equipped ? null : owned ? '装備する' : '購入して装備'
    if (type === 'bait') {
      if (!owned && !shopUnlock?.unlocked) action = null
      else if (!owned) action = '購入して装備'
      else if (!equipped) action = '装備する'
      else if (id !== 'worm' && shopUnlock?.unlocked) action = '補充する'
    }
    if (action) items.push(this._actionButton(W / 2, y + 304, action, () => action === '補充する' ? this._restock(id, item, qty) : this._apply(id, item, type, owned, qty)))
    if (type === 'bait' && !owned && !shopUnlock?.unlocked) {
      items.push(this._actionButton(W / 2, y + 304, '町で販売を解放', () => this.scene.start('TownScene')))
    }
    if (equipped && !isDefaultEquipped) items.push(this._plainButton(W / 2, y + 329, type === 'bait' ? 'ふつうのエサに戻す' : '初心者竿に戻す', () => this._unequip(type)))
    items.push(this._plainButton(W / 2, y + h - 24, '閉じる', () => this._modal?.destroy(true)))

    this._modal = this.add.container(0, 18, items).setDepth(100).setAlpha(0)
    this.tweens.add({ targets: this._modal, y: 0, alpha: 1, duration: 160, ease: 'Sine.easeOut' })
  }

  _statLine(x, y, text) {
    const c = this.add.container(0, 0)
    const bg = this.add.graphics()
    bg.fillStyle(0xfff3c9, 1)
    bg.lineStyle(1.5, 0xe2b94b, 0.7)
    bg.fillRoundedRect(x - 118, y - 18, 236, 36, 14)
    bg.strokeRoundedRect(x - 118, y - 18, 236, 36, 14)
    const label = this.add.text(x, y, text, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: '#8a5a00',
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
    } else if (type === 'bait') {
      if (!owned) {
        const shopUnlock = getBaitShopUnlock(id)
        if (!shopUnlock.unlocked) return this._toast(`販売解放: ${shopUnlock.unlockedBy}`)
        if (!spendScore(item.cost)) return this._toast('ポイントが足りません')
        inventory.baits[id] = (Number.isFinite(qty) ? qty : 0) + item.amount
      }
      equipment.baitType = id
    }
    saveInventory(inventory)
    saveEquipment(equipment)
    this.scene.restart({ tab: this._tab, scroll: this._scroll })
  }

  _restock(id, item, qty) {
    const shopUnlock = getBaitShopUnlock(id)
    if (!shopUnlock.unlocked) return this._toast(`販売解放: ${shopUnlock.unlockedBy}`)
    if (!spendScore(item.cost)) return this._toast('ポイントが足りません')
    const inventory = getInventory()
    inventory.baits[id] = (Number.isFinite(qty) ? qty : 0) + item.amount
    saveInventory(inventory)
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
    bg.fillStyle(0x173248, 0.12)
    bg.fillRoundedRect(x - 86 + 2, y - 22 + 3, 172, 44, 15)
    bg.fillStyle(0xffd95a, 1)
    bg.lineStyle(2, 0x173248, 0.78)
    bg.fillRoundedRect(x - 86, y - 22, 172, 44, 15)
    bg.strokeRoundedRect(x - 86, y - 22, 172, 44, 15)
    const txt = this.add.text(x, y, label, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5)
    const hit = this.add.rectangle(x, y, 184, 52, 0x000000, 0).setInteractive({ useHandCursor: true }).on('pointerdown', onTap)
    c.add([bg, txt, hit])
    return c
  }

  _plainButton(x, y, label, onTap) {
    return this.add.text(x, y, label, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.inkSoft,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', onTap)
  }

  _toast(message) {
    this._modal?.destroy(true)
    const { width: W, height: H } = this.scale
    const bg = this.add.graphics().setDepth(120)
    bg.fillStyle(0x173248, 0.92)
    bg.fillRoundedRect(W / 2 - 112, H - 136, 224, 38, 15)
    const txt = this.add.text(W / 2, H - 117, message, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5).setDepth(121)
    this.tweens.add({ targets: [bg, txt], alpha: 0, y: '-=14', duration: 900, onComplete: () => { bg.destroy(); txt.destroy() } })
  }
}
