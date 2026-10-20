
import Phaser from 'phaser'
import { FONT, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { loadGameTexture } from '../utils/loadGameTexture.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { ROD_META, getEquipment, getInventory, getScore } from '../game/progress.js'
import { ACCESSORY_META, MATERIAL_META, equipAccessory, unequipAccessory, getAccessoryState, getMaterials, getRodLevels, getRodUpgradeCost, purchaseAccessory, upgradeRodLevel } from '../game/midgameProgression.js'
import { markWorkshopSeen } from '../game/retentionProgress.js'
import { getWorkshopCostState } from '../presentation/workshopCosts.js'

const TEXT_RES = window.devicePixelRatio ?? 1
const ROD_ART = { basic: ASSETS.equipment.rodBasicPartV1, carbon: ASSETS.equipment.rodCarbonPartV1, premium: ASSETS.equipment.rodPremiumPartV1 }

export default class WorkshopScene extends Phaser.Scene {
  constructor() { super({ key: 'WorkshopScene' }) }

  preload() {
    const wanted = [ASSETS.backgrounds.townGrowing, ...Object.values(ROD_ART)]
    wanted.forEach(asset => {
      if (asset?.status === 'ready' && !this.textures.exists(asset.key)) loadGameTexture(this, asset)
    })
  }

  create() {
    this._upgradePending = false
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
    this.add.text(W - 24, 180, '素材：所持 / 必要', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: UI_COLORS.inkSoft }).setOrigin(1, 0).setDepth(5)
    const inv = getInventory(), eq = getEquipment(), levels = getRodLevels()
    ;['basic','carbon','premium'].forEach((id, i) => this._rodCard(22 + i * 121, 211, 108, 222, id, levels[id] ?? 1, (inv.rods?.[id] ?? 0) > 0, eq.rodType === id))
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
    const recipe = cost ? getWorkshopCostState(cost, getScore(), getMaterials()) : null
    if (owned && recipe) this._recipe(x + w / 2, y + 140, recipe, `rod:${id}`)
    const ready = owned && recipe?.affordable
    const label = !owned ? '未所持' : !cost ? '最大強化' : cost.score + 'ptで強化'
    this.add.text(x + w / 2, y + h - 24, label, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: ready ? '#9a6500' : UI_COLORS.muted, backgroundColor: ready ? '#fff0b8' : '#edf2f4', padding: { x: 7, y: 10 } }).setOrigin(0.5).setDepth(6)
    if (owned && cost) this.add.rectangle(x + w / 2, y + h - 24, w - 8, 44, 0xffffff, 0.001).setDepth(7)
      .setData('rodUpgradeId', id).setInteractive({ useHandCursor: true }).on('pointerdown', () => this._upgradeRod(id))
  }

  _recipe(x, y, recipe, id) {
    recipe.rows.forEach((row, i) => this.add.text(x, y + i * 14, row.label, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800',
      color: row.missing ? UI_COLORS.coral : UI_COLORS.oceanDeep,
    }).setOrigin(0.5).setDepth(5).setData('workshopRecipe', id).setData('materialId', row.id))
  }

  _accessories(W) {
    this.add.text(24, 456, 'アクセサリ', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '16px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    const state = getAccessoryState()
    Object.entries(ACCESSORY_META).forEach(([id, meta], i) => {
      const x = 22 + i * 177, y = 483, w = 166, h = 202
      const owned = !!state.owned[id], equipped = state.equipped[meta.slot] === id
      const g = this.add.graphics().setDepth(4)
      g.fillStyle(0xffffff, 0.98); g.lineStyle(equipped ? 2.4 : 1.5, equipped ? 0xffd95a : 0x9bcfe5, 0.88)
      g.fillRoundedRect(x, y, w, h, 18); g.strokeRoundedRect(x, y, w, h, 18)
      g.fillStyle(0xdff5ff, 0.8); g.fillCircle(x + 38, y + 38, 26)
      this.add.text(x + 38, y + 38, meta.mark, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '18px', fontWeight: '900', color: UI_COLORS.oceanDeep }).setOrigin(0.5).setDepth(5)
      this.add.text(x + 72, y + 25, meta.name, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
      this.add.text(x + 72, y + 49, equipped ? '装備中' : owned ? '所持済み' : meta.scoreCost + 'pt', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: equipped ? UI_COLORS.warning : UI_COLORS.inkSoft }).setDepth(5)
      this.add.text(x + 14, y + 78, meta.desc, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '800', color: UI_COLORS.inkSoft, wordWrap: { width: w - 28, useAdvancedWrap: true } }).setDepth(5).setData('accessoryDescription', id)
      const recipe = getWorkshopCostState({ score: meta.scoreCost, materials: meta.materials }, getScore(), getMaterials())
      if (!owned) this._recipe(x + w / 2, y + 120, recipe, `accessory:${id}`)
      const action = this.add.text(x + w / 2, y + h - 24, equipped ? '外す' : owned ? '装備する' : '作成して装備', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.ink, backgroundColor: equipped ? '#dff5ff' : owned || recipe.affordable ? '#ffd95a' : '#edf2f4', padding: { x: 10, y: 10 } }).setOrigin(0.5).setDepth(6)
      this.add.rectangle(x+w/2,y+h-24,132,44,0xffffff,0.001).setDepth(7)
        .setData('accessoryId',id).setInteractive({useHandCursor:true})
        .on('pointerdown',()=>this._accessoryAction(id,owned,equipped))
    })
  }

  _upgradeRod(id) {
    if (this._upgradePending) return
    const r = upgradeRodLevel(id)
    if (!r.ok) return this._toast(r.cost ? getWorkshopCostState(r.cost, getScore(), getMaterials()).shortage : '最大レベルです')
    this._upgradePending = true
    this._toast('Lv.' + r.level + ' に強化！')
    this.time.delayedCall(350, () => this.scene.restart())
  }

  _accessoryAction(id, owned, equipped = false) {
    const r = equipped ? unequipAccessory(id) : owned ? equipAccessory(id) : purchaseAccessory(id)
    if (!r.ok) {
      const meta = ACCESSORY_META[id]
      return this._toast(['score', 'materials'].includes(r.reason)
        ? getWorkshopCostState({ score: meta.scoreCost, materials: meta.materials }, getScore(), getMaterials()).shortage
        : '作成できません')
    }
    this.scene.restart()
  }

  _toast(message) {
    const W = this.scale.width, H = this.scale.height
    const bg = this.add.graphics().setDepth(120)
    bg.fillStyle(0x173248, 0.94); bg.fillRoundedRect(24, H - 144, W - 48, 44, 14)
    const txt = this.add.text(W / 2, H - 122, message, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: '#ffffff', wordWrap: { width: W - 72 }, align: 'center' }).setOrigin(0.5).setDepth(121).setData('workshopNotice', true)
    this.tweens.add({ targets: [bg, txt], alpha: 0, y: '-=12', delay: 1400, duration: 350, onComplete: () => { bg.destroy(); txt.destroy() } })
  }
}
