
import Phaser from 'phaser'
import { FONT, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { ROD_META, getEquipment, getInventory, getScore } from '../game/progress.js'
import { ACCESSORY_META, MATERIAL_META, equipAccessory, getAccessoryState, getMaterials, getRodLevels, getRodUpgradeCost, purchaseAccessory, upgradeRodLevel } from '../game/midgameProgression.js'
import { markWorkshopSeen } from '../game/retentionProgress.js'

const TEXT_RES = window.devicePixelRatio ?? 1
const ROD_ART = { basic: ASSETS.equipment.rodBasic, carbon: ASSETS.equipment.rodCarbon, premium: ASSETS.equipment.rodPremium }

export default class WorkshopScene extends Phaser.Scene {
  constructor() { super({ key: 'WorkshopScene' }) }

  preload() {
    const wanted = [ASSETS.backgrounds.townGrowing, ...Object.values(ROD_ART)]
    wanted.forEach(asset => {
      if (asset?.status === 'ready' && !this.textures.exists(asset.key)) this.load.image(asset.key, asset.path)
    })
  }

  create() {
    markWorkshopSeen()
    const W = this.scale.width, H = this.scale.height
    addCoverImage(this, ASSETS.backgrounds.townGrowing.key, W, H, 0)
    const veil = this.add.rectangle(W / 2, H / 2, W, H, 0xf4fbff, 0.9).setDepth(1)
    this._header(W)
    this._materials(W)
    this._rods(W)
    this._accessories(W)
    buildFooterNav(this, W, H, 'equip')
  }

  _header(W) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0xffffff, 0.97); g.lineStyle(2, 0x9bcfe5, 0.9)
    g.fillRoundedRect(16, 12, W - 32, 82, 22); g.strokeRoundedRect(16, 12, W - 32, 82, 22)
    this.add.text(30, 40, '港の工房', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '25px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    this.add.text(30, 69, '釣果素材で竿と装備を育てる', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: UI_COLORS.inkSoft }).setDepth(5)
    this.add.text(W - 30, 51, getScore().toLocaleString() + ' pt', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '16px', fontWeight: '900', color: UI_COLORS.warning }).setOrigin(1, 0.5).setDepth(5)
  }

  _materials(W) {
    const mats = getMaterials(), entries = Object.entries(MATERIAL_META)
    const x = 20, y = 108, w = W - 40, h = 54
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0xffffff, 0.96); g.lineStyle(1.4, 0xb9d4df, 0.86)
    g.fillRoundedRect(x, y, w, h, 16); g.strokeRoundedRect(x, y, w, h, 16)
    entries.forEach(([id, meta], i) => {
      const cx = x + 42 + i * ((w - 84) / Math.max(1, entries.length - 1))
      this.add.text(cx, y + 17, meta.mark, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.oceanDeep }).setOrigin(0.5).setDepth(5)
      this.add.text(cx, y + 37, String(mats[id] ?? 0), { fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: UI_COLORS.ink }).setOrigin(0.5).setDepth(5)
    })
  }

  _rods(W) {
    this.add.text(24, 180, '竿を強化', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '16px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    const inv = getInventory(), eq = getEquipment(), levels = getRodLevels()
    ;['basic','carbon','premium'].forEach((id, i) => this._rodCard(22 + i * 121, 211, 108, 178, id, levels[id] ?? 1, (inv.rods?.[id] ?? 0) > 0, eq.rodType === id))
  }

  _rodCard(x, y, w, h, id, level, owned, equipped) {
    const meta = ROD_META[id], cost = getRodUpgradeCost(id), g = this.add.graphics().setDepth(4)
    g.fillStyle(owned ? 0xffffff : 0xf0f3f5, 0.98); g.lineStyle(equipped ? 2.4 : 1.5, equipped ? 0xffd95a : 0x9bcfe5, owned ? 0.9 : 0.45)
    g.fillRoundedRect(x, y, w, h, 18); g.strokeRoundedRect(x, y, w, h, 18)
    const art = ROD_ART[id]
    if (art?.key && this.textures.exists(art.key)) this.add.image(x + w / 2, y + 42, art.key).setDisplaySize(60, 60).setDepth(5).setAlpha(owned ? 1 : 0.32)
    this.add.text(x + w / 2, y + 80, meta.name, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.ink }).setOrigin(0.5).setDepth(5)
    this.add.text(x + w / 2, y + 102, 'Lv.' + level + '/5', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: equipped ? UI_COLORS.warning : UI_COLORS.oceanDeep }).setOrigin(0.5).setDepth(5)
    this.add.text(x + w / 2, y + 124, level >= 5 ? 'MAX' : '引き +' + Math.round((level - 1) * 4.5) + '%', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '800', color: UI_COLORS.inkSoft }).setOrigin(0.5).setDepth(5)
    const label = !owned ? '未所持' : !cost ? '最大強化' : cost.score + 'ptで強化'
    const btn = this.add.text(x + w / 2, y + 151, label, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: owned && cost ? '#9a6500' : UI_COLORS.muted, backgroundColor: owned && cost ? '#fff0b8' : '#edf2f4', padding: { x: 7, y: 6 } }).setOrigin(0.5).setDepth(6)
    if (owned && cost) btn.setInteractive({ useHandCursor: true }).on('pointerdown', () => this._upgradeRod(id))
  }

  _accessories(W) {
    this.add.text(24, 408, 'アクセサリ', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '16px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    const state = getAccessoryState()
    Object.entries(ACCESSORY_META).forEach(([id, meta], i) => {
      const x = 22 + i * 177, y = 439, w = 166, h = 142
      const owned = !!state.owned[id], equipped = state.equipped[meta.slot] === id
      const g = this.add.graphics().setDepth(4)
      g.fillStyle(0xffffff, 0.98); g.lineStyle(equipped ? 2.4 : 1.5, equipped ? 0xffd95a : 0x9bcfe5, 0.88)
      g.fillRoundedRect(x, y, w, h, 18); g.strokeRoundedRect(x, y, w, h, 18)
      g.fillStyle(0xdff5ff, 0.8); g.fillCircle(x + 38, y + 38, 26)
      this.add.text(x + 38, y + 38, meta.mark, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '18px', fontWeight: '900', color: UI_COLORS.oceanDeep }).setOrigin(0.5).setDepth(5)
      this.add.text(x + 72, y + 25, meta.name, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
      this.add.text(x + 72, y + 49, equipped ? '装備中' : owned ? '所持済み' : meta.scoreCost + 'pt', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: equipped ? UI_COLORS.warning : UI_COLORS.inkSoft }).setDepth(5)
      this.add.text(x + 14, y + 78, meta.desc, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '800', color: UI_COLORS.inkSoft, wordWrap: { width: w - 28 } }).setDepth(5)
      const action = this.add.text(x + w / 2, y + h - 20, equipped ? '装備中' : owned ? '装備する' : '作成して装備', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: equipped ? UI_COLORS.muted : UI_COLORS.ink, backgroundColor: equipped ? '#edf2f4' : '#ffd95a', padding: { x: 10, y: 6 } }).setOrigin(0.5).setDepth(6)
      if (!equipped) action.setInteractive({ useHandCursor: true }).on('pointerdown', () => this._accessoryAction(id, owned))
    })
  }

  _upgradeRod(id) {
    const r = upgradeRodLevel(id)
    if (!r.ok) return this._toast(r.reason === 'score' ? 'ポイント不足' : r.reason === 'materials' ? '素材不足' : '最大レベルです')
    this._toast('Lv.' + r.level + ' に強化！')
    this.time.delayedCall(350, () => this.scene.restart())
  }

  _accessoryAction(id, owned) {
    const r = owned ? equipAccessory(id) : purchaseAccessory(id)
    if (!r.ok) return this._toast(r.reason === 'score' ? 'ポイント不足' : r.reason === 'materials' ? '素材不足' : '作成できません')
    this.scene.restart()
  }

  _toast(message) {
    const W = this.scale.width, H = this.scale.height
    const bg = this.add.graphics().setDepth(120)
    bg.fillStyle(0x173248, 0.94); bg.fillRoundedRect(W / 2 - 105, H - 144, 210, 38, 14)
    const txt = this.add.text(W / 2, H - 125, message, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: '#ffffff' }).setOrigin(0.5).setDepth(121)
    this.tweens.add({ targets: [bg, txt], alpha: 0, y: '-=12', delay: 550, duration: 450, onComplete: () => { bg.destroy(); txt.destroy() } })
  }
}
