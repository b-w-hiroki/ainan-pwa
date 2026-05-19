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
    this._background(W, H)
    this._header(W)
    this._buildRodSection(W)
    this._buildBaitSection(W)
    buildFooterNav(this, W, H, 'upgrade')
  }

  _background(W, H) {
    addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillStyle(0xfff7df, 0.80)
    veil.fillRect(0, 0, W, H)
  }

  _header(W) {
    const score = getScore()
    this.add.text(W / 2, 44, `${ICONS.GEAR} タックル強化`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '28px', fontWeight: '900',
      color: '#1a3a5a', shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2, 78, `所持ポイント ${score.toLocaleString()} pt`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900',
      color: '#e07800',
    }).setOrigin(0.5).setDepth(5)
  }

  _buildRodSection(W) {
    this._sectionTitle(24, 112, `${ICONS.ROD} 竿`)
    const inventory = getInventory()
    const equipment = getEquipment()
    Object.entries(ROD_META).forEach(([id, item], i) => {
      const owned = (inventory.rods?.[id] ?? 0) > 0
      const equipped = equipment.rodType === id
      this._row(24, 144 + i * 78, W - 48, 64, {
        title: item.name,
        desc: item.desc,
        sub: owned ? (equipped ? '装備中' : '所持済み') : `${item.cost} pt`,
        accent: 0x5ebcff,
        action: owned ? (equipped ? null : '装備') : '購入',
        onTap: () => {
          if (owned) {
            equipment.rodType = id
            saveEquipment(equipment)
            this.scene.restart()
            return
          }
          if (!spendScore(item.cost)) return this._toast('ポイントが足りません')
          inventory.rods[id] = 1
          equipment.rodType = id
          saveInventory(inventory)
          saveEquipment(equipment)
          this.scene.restart()
        },
      })
    })
  }

  _buildBaitSection(W) {
    this._sectionTitle(24, 390, `${ICONS.BAIT} エサ`)
    const inventory = getInventory()
    const equipment = getEquipment()
    Object.entries(BAIT_META).forEach(([id, item], i) => {
      const qty = inventory.baits?.[id] ?? 0
      const equipped = equipment.baitType === id
      this._row(24, 422 + i * 78, W - 48, 64, {
        title: item.name,
        desc: item.desc,
        sub: `在庫 ${qty} / ${item.cost} pt`,
        accent: 0xff9b5e,
        action: equipped ? `+${item.amount}` : '購入',
        onTap: () => {
          if (!spendScore(item.cost)) return this._toast('ポイントが足りません')
          inventory.baits[id] = qty + item.amount
          equipment.baitType = id
          saveInventory(inventory)
          saveEquipment(equipment)
          this.scene.restart()
        },
      })
    })
  }

  _sectionTitle(x, y, label) {
    this.add.text(x, y, label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '16px', fontWeight: '900',
      color: '#1a3a5a',
    }).setOrigin(0, 0).setDepth(5)
  }

  _row(x, y, w, h, cfg) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0xffffff, 0.96)
    g.lineStyle(2.5, 0x1a2a3a, 0.9)
    g.fillRoundedRect(x, y, w, h, 15)
    g.strokeRoundedRect(x, y, w, h, 15)
    g.fillStyle(cfg.accent, 1)
    g.fillRoundedRect(x, y, 9, h, { tl: 15, bl: 15, tr: 0, br: 0 })

    this.add.text(x + 20, y + 12, cfg.title, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '16px', fontWeight: '900', color: '#1a3a5a',
    }).setDepth(5)
    this.add.text(x + 20, y + 36, cfg.desc, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '11px', fontWeight: '800', color: '#4a7090',
    }).setDepth(5)
    this.add.text(x + w - 104, y + 14, cfg.sub, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '11px', fontWeight: '900', color: '#e07800',
    }).setOrigin(0.5, 0).setDepth(5)

    if (!cfg.action) return
    const b = this.add.graphics().setDepth(5)
    b.fillStyle(0xffd900, 1)
    b.lineStyle(2, 0x1a2a3a, 1)
    b.fillRoundedRect(x + w - 78, y + 31, 58, 25, 8)
    b.strokeRoundedRect(x + w - 78, y + 31, 58, 25, 8)
    this.add.text(x + w - 49, y + 43.5, cfg.action, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '11px', fontWeight: '900', color: '#1a2a3a',
    }).setOrigin(0.5).setDepth(6)
    this.add.rectangle(x + w - 49, y + 43.5, 66, 34, 0x000000, 0)
      .setDepth(7)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', cfg.onTap)
  }

  _toast(message) {
    const { width: W } = this.scale
    const bg = this.add.graphics().setDepth(80)
    bg.fillStyle(0x1a2a3a, 0.9)
    bg.fillRoundedRect(W / 2 - 112, 690, 224, 38, 15)
    const txt = this.add.text(W / 2, 709, message, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5).setDepth(81)
    this.tweens.add({ targets: [bg, txt], alpha: 0, y: '-=14', duration: 900, onComplete: () => { bg.destroy(); txt.destroy() } })
  }
}
