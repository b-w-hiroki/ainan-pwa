import Phaser from 'phaser'
import { FONT, SHADOW, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import {
  TOWN_FACILITY_META,
  getScore,
  getTownFacilityCost,
  getTownSummary,
  upgradeTownFacility,
} from '../game/progress.js'
import {
  getFacilityUnlockReward,
  getNextTownUnlock,
  getTownUnlockState,
} from '../game/townUnlocks.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const FACILITY_ART = {
  market: ASSETS.facilities.market,
  pier: ASSETS.facilities.pier,
  guide: ASSETS.facilities.guide,
  festival: ASSETS.facilities.festival,
}

const FACILITY_NPC = {
  market: ASSETS.characters.fishmonger,
  pier: ASSETS.characters.harborCaptain,
  guide: ASSETS.characters.guideStaff,
  festival: ASSETS.characters.youngFisher,
}

export default class TownScene extends Phaser.Scene {
  constructor() { super({ key: 'TownScene' }) }

  preload() {
    const assets = [
      ASSETS.backgrounds.townQuiet,
      ASSETS.backgrounds.townGrowing,
      ASSETS.backgrounds.townBustling,
      ...Object.values(FACILITY_ART),
      ...Object.values(FACILITY_NPC),
    ]
    assets.forEach(asset => {
      if (asset?.status === 'ready' && !this.textures.exists(asset.key)) this.load.image(asset.key, asset.path)
    })
  }

  create() {
    const { width: W, height: H } = this.scale
    this._modal = null
    this._summary = getTownSummary()
    this._unlocks = getTownUnlockState()
    this._nextUnlock = getNextTownUnlock()
    localStorage.setItem('ainan_seen_town', '1')
    this._background(W, H)
    this._header(W)
    this._livingTown(W)
    this._facilityGrid(W)
    buildFooterNav(this, W, H, 'town')
    this._maybeShowUnlockCelebration(W, H)
  }

  _stageAsset(bustle = this._summary?.bustle ?? 0) {
    if (bustle >= 70) return ASSETS.backgrounds.townBustling
    if (bustle >= 28) return ASSETS.backgrounds.townGrowing
    return ASSETS.backgrounds.townQuiet
  }

  _stageLabel(bustle = this._summary?.bustle ?? 0) {
    if (bustle >= 90) return '港は大にぎわい'
    if (bustle >= 70) return 'にぎわう港町'
    if (bustle >= 48) return '評判が広がる町'
    if (bustle >= 28) return '育ちはじめた港'
    if (bustle >= 12) return '人が戻りはじめた町'
    return '静かな港町'
  }

  _background(W, H) {
    const asset = this._stageAsset()
    addCoverImage(this, asset.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillGradientStyle(0xf8fdff, 0xf8fdff, 0xf8fdff, 0xf8fdff, 0.08, 0.08, 0.52, 0.52)
    veil.fillRect(0, 0, W, H)
    veil.fillStyle(0x173248, 0.08)
    veil.fillRect(0, H * 0.72, W, H * 0.18)
  }

  _header(W) {
    const g = this.add.graphics().setDepth(8)
    g.fillStyle(0x173248, 0.12)
    g.fillRoundedRect(12, 14, W - 24, 74, 22)
    g.fillStyle(0xf8fdff, 0.96)
    g.lineStyle(2, 0x9bcfe5, 0.9)
    g.fillRoundedRect(12, 10, W - 24, 74, 22)
    g.strokeRoundedRect(12, 10, W - 24, 74, 22)
    g.fillStyle(0xdff5ff, 0.68)
    g.fillRoundedRect(20, 18, W - 40, 14, 7)

    this.add.text(26, 45, 'みんなの港町', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '24px', fontWeight: '900',
      color: UI_COLORS.ink, shadow: SHADOW.subtle,
    }).setOrigin(0, 0.5).setDepth(10)

    this.add.text(W - 26, 36, `${getScore().toLocaleString()} pt`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: UI_COLORS.warning,
    }).setOrigin(1, 0.5).setDepth(10)
    this.add.text(W - 26, 56, `海 ${this._unlocks.unlockedCount}/${this._unlocks.totalCount}`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.oceanDeep,
    }).setOrigin(1, 0.5).setDepth(10)
  }

  _livingTown(W) {
    const s = this._summary
    const bustle = s.bustle
    const x = 14, y = 100, w = W - 28, h = 244

    const glass = this.add.graphics().setDepth(3)
    glass.fillStyle(0x173248, 0.12)
    glass.fillRoundedRect(x + 3, y + 5, w, h, 24)
    glass.fillStyle(0xffffff, 0.13)
    glass.lineStyle(1.8, 0xffffff, 0.72)
    glass.fillRoundedRect(x, y, w, h, 24)
    glass.strokeRoundedRect(x, y, w, h, 24)

    const chip = this.add.graphics().setDepth(5)
    chip.fillStyle(0xf8fdff, 0.94)
    chip.lineStyle(1.5, 0x9bcfe5, 0.82)
    chip.fillRoundedRect(x + 14, y + 14, 158, 34, 14)
    chip.strokeRoundedRect(x + 14, y + 14, 158, 34, 14)
    this.add.text(x + 28, y + 31, this._stageLabel(bustle), {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(6)

    const catchChip = this.add.graphics().setDepth(5)
    catchChip.fillStyle(0x173248, 0.68)
    catchChip.fillRoundedRect(x + w - 112, y + 14, 96, 34, 14)
    this.add.text(x + w - 64, y + 31, `釣果 ${s.catches}匹`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5).setDepth(6)

    this._renderTownLineup(x, y, w, s)

    const rankBg = this.add.graphics().setDepth(8)
    rankBg.fillStyle(0xffffff, 0.92)
    rankBg.lineStyle(1.5, 0x9bcfe5, 0.75)
    rankBg.fillRoundedRect(x + 18, y + h - 70, w - 36, 52, 17)
    rankBg.strokeRoundedRect(x + 18, y + h - 70, w - 36, 52, 17)
    this.add.text(x + 34, y + h - 54, s.rank, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(9)
    this.add.text(x + w - 34, y + h - 54, `${bustle}/100`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.oceanDeep,
    }).setOrigin(1, 0.5).setDepth(9)
    rankBg.fillStyle(0xe8f4f8, 1)
    rankBg.fillRoundedRect(x + 34, y + h - 37, w - 68, 9, 5)
    rankBg.fillStyle(0x2f9ed4, 1)
    rankBg.fillRoundedRect(x + 34, y + h - 37, Math.max(8, (w - 68) * (bustle / 100)), 9, 5)

    this._nextMilestoneCard(W, y + h + 10, s)
  }

  _renderTownLineup(x, y, w, summary) {
    const items = [
      { id: 'market', label: '魚市場' },
      { id: 'pier', label: '桟橋' },
      { id: 'guide', label: '案内所' },
      { id: 'festival', label: '広場' },
    ]
    const startX = x + 49
    const gap = (w - 98) / 3

    items.forEach((item, i) => {
      const cx = startX + gap * i
      const lv = summary.facilities[item.id] ?? 0
      const art = FACILITY_ART[item.id]
      const meta = TOWN_FACILITY_META.find(f => f.id === item.id)
      const img = this.add.image(cx, y + 111, art.key)
        .setDisplaySize(78, 61)
        .setDepth(6)
        .setAlpha(lv > 0 ? 1 : 0.34)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this._showFacility(meta, lv, getTownFacilityCost(item.id)))
      if (lv === 0) img.setTint(0x9aaab3)

      const badge = this.add.graphics().setDepth(7)
      badge.fillStyle(lv > 0 ? 0x173248 : 0x7b8991, 0.86)
      badge.fillCircle(cx + 27, y + 83, 11)
      this.add.text(cx + 27, y + 83, lv > 0 ? `${lv}` : '未', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: '#ffffff',
      }).setOrigin(0.5).setDepth(8)
      this.add.text(cx, y + 148, item.label, {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: lv > 0 ? UI_COLORS.ink : UI_COLORS.muted,
      }).setOrigin(0.5).setDepth(8)

      if (lv >= 2) {
        const npc = FACILITY_NPC[item.id]
        const person = this.add.image(cx + 27, y + 137, npc.key).setDisplaySize(29, 45).setDepth(7)
        this.tweens.add({ targets: person, y: person.y - 2, duration: 1400 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
      }
    })
  }

  _recommendedFacility(summary) {
    if (this._nextUnlock?.facilityId) {
      const id = this._nextUnlock.facilityId
      const meta = TOWN_FACILITY_META.find(f => f.id === id)
      return { id, meta, npc: FACILITY_NPC[id], level: summary.facilities[id] ?? 0, unlock: this._nextUnlock }
    }
    const order = ['market', 'pier', 'guide', 'festival']
    const zero = order.find(id => (summary.facilities[id] ?? 0) === 0)
    const id = zero ?? order.reduce((best, current) => (summary.facilities[current] ?? 0) < (summary.facilities[best] ?? 0) ? current : best, order[0])
    const meta = TOWN_FACILITY_META.find(f => f.id === id)
    return { id, meta, npc: FACILITY_NPC[id], level: summary.facilities[id] ?? 0, unlock: null }
  }

  _nextMilestoneCard(W, y, summary) {
    const rec = this._recommendedFacility(summary)
    const maxed = rec.level >= 5
    const title = rec.unlock ? `次の海　${rec.unlock.name}` : maxed ? '港はしっかり育ってきた' : `次のおすすめ　${rec.meta.name}`
    const body = rec.unlock
      ? `${rec.unlock.unlockedBy}で「${rec.unlock.rewardText}」が解放される`
      : maxed ? '釣果を増やして、さらに町のにぎわいを広げよう。' : rec.level === 0 ? rec.meta.desc : `Lv.${rec.level + 1}で ${rec.meta.effect}`
    const x = 22, w = W - 44, h = 62
    const g = this.add.graphics().setDepth(6)
    g.fillStyle(0x173248, 0.08)
    g.fillRoundedRect(x + 2, y + 3, w, h, 18)
    g.fillStyle(0xffffff, 0.97)
    g.lineStyle(1.6, rec.unlock ? 0xffb45d : 0x9bcfe5, 0.88)
    g.fillRoundedRect(x, y, w, h, 18)
    g.strokeRoundedRect(x, y, w, h, 18)
    g.fillStyle(rec.unlock ? 0xfff1d0 : 0xdff5ff, 1)
    g.fillCircle(x + 31, y + h / 2, 22)

    if (rec.npc?.key && this.textures.exists(rec.npc.key)) this.add.image(x + 31, y + h / 2 + 5, rec.npc.key).setDisplaySize(34, 52).setDepth(7)
    this.add.text(x + 62, y + 21, title, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(7)
    this.add.text(x + 62, y + 43, body, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: rec.unlock ? UI_COLORS.warning : UI_COLORS.inkSoft,
      wordWrap: { width: w - 80 },
    }).setOrigin(0, 0.5).setDepth(7)
  }

  _facilityGrid(W) {
    const s = this._summary
    const top = 426
    this.add.text(24, top, '町を育てる', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '17px', fontWeight: '900', color: UI_COLORS.ink,
    }).setDepth(5)
    this.add.text(W - 24, top + 3, `施設Lv 合計 ${s.totalFacilityLevel}`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.inkSoft,
    }).setOrigin(1, 0).setDepth(5)

    TOWN_FACILITY_META.forEach((item, i) => {
      const x = 22 + (i % 2) * 176
      const y = 454 + Math.floor(i / 2) * 102
      this._facilityCard(x, y, 160, 86, item)
    })
  }

  _facilityCard(x, y, w, h, item) {
    const lv = this._summary.facilities[item.id] ?? 0
    const maxed = lv >= 5
    const cost = getTownFacilityCost(item.id)
    const unlockReward = !maxed ? getFacilityUnlockReward(item.id, lv + 1) : null
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x173248, 0.08)
    g.fillRoundedRect(x + 2, y + 3, w, h, 17)
    g.fillStyle(maxed ? 0xfffbec : 0xffffff, 0.97)
    g.lineStyle(1.7, unlockReward ? 0xffb45d : maxed ? 0xe2b94b : 0x9bcfe5, 0.92)
    g.fillRoundedRect(x, y, w, h, 17)
    g.strokeRoundedRect(x, y, w, h, 17)

    const art = FACILITY_ART[item.id]
    if (art?.key && this.textures.exists(art.key)) this.add.image(x + 30, y + 29, art.key).setDisplaySize(51, 40).setDepth(5)
    this.add.text(x + 59, y + 19, item.name, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + 59, y + 39, unlockReward ? `Lv.${lv} → 海解放` : `Lv.${lv}/5`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: unlockReward ? '#d06b3b' : maxed ? UI_COLORS.warning : UI_COLORS.oceanDeep,
    }).setOrigin(0, 0.5).setDepth(5)

    for (let i = 0; i < 5; i++) {
      g.fillStyle(i < lv ? (maxed ? 0xffd95a : 0x2f9ed4) : 0xdfeaf0, 1)
      g.fillCircle(x + 18 + i * 18, y + 66, 4)
    }
    this.add.text(x + w - 12, y + 66, maxed ? '発展済み' : `${cost}pt`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: maxed ? UI_COLORS.success : UI_COLORS.warning,
    }).setOrigin(1, 0.5).setDepth(5)
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0)
      .setDepth(6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showFacility(item, lv, cost))
  }

  _showFacility(item, lv, cost) {
    const { width: W, height: H } = this.scale
    this._modal?.destroy(true)
    const unlockReward = lv < 5 ? getFacilityUnlockReward(item.id, lv + 1) : null
    const items = []
    items.push(this.add.rectangle(W / 2, H / 2, W, H, 0x173248, 0.44).setInteractive().on('pointerdown', () => this._modal?.destroy(true)))
    const x = 34, y = 166, w = W - 68, h = 364
    const bg = this.add.graphics()
    bg.fillStyle(0x173248, 0.14)
    bg.fillRoundedRect(x + 3, y + 5, w, h, 24)
    bg.fillStyle(0xf8fdff, 0.99)
    bg.lineStyle(2.2, unlockReward ? 0xffb45d : 0x9bcfe5, 0.9)
    bg.fillRoundedRect(x, y, w, h, 24)
    bg.strokeRoundedRect(x, y, w, h, 24)
    bg.fillStyle(0xdff5ff, 1)
    bg.fillRoundedRect(x + 20, y + 22, w - 40, 108, 20)
    items.push(bg)

    const art = FACILITY_ART[item.id]
    const npc = FACILITY_NPC[item.id]
    if (art?.key && this.textures.exists(art.key)) items.push(this.add.image(W / 2 - 34, y + 74, art.key).setDisplaySize(116, 90))
    if (npc?.key && this.textures.exists(npc.key)) items.push(this.add.image(W / 2 + 74, y + 78, npc.key).setDisplaySize(53, 82))

    items.push(this.add.text(W / 2, y + 151, item.name, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '22px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 184, item.desc, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '800', color: UI_COLORS.inkSoft,
      align: 'center', wordWrap: { width: w - 50 },
    }).setOrigin(0.5, 0))
    items.push(this.add.text(W / 2, y + 228, `${item.effect} / Lv.${lv}/5`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: UI_COLORS.warning,
      align: 'center', wordWrap: { width: w - 50 },
    }).setOrigin(0.5))

    if (unlockReward) {
      const rewardBg = this.add.graphics()
      rewardBg.fillStyle(0xfff1d0, 1)
      rewardBg.lineStyle(1.8, 0xffb45d, 0.9)
      rewardBg.fillRoundedRect(x + 38, y + 250, w - 76, 42, 14)
      rewardBg.strokeRoundedRect(x + 38, y + 250, w - 76, 42, 14)
      items.push(rewardBg)
      items.push(this.add.text(W / 2, y + 271, `次のLvで ${unlockReward.name} 解放`, {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: '#b85d2f',
      }).setOrigin(0.5))
    }

    if (lv < 5) items.push(this._actionButton(W / 2, y + 315, `${cost}ptで発展`, () => this._upgrade(item.id, lv)))
    items.push(this._plainButton(W / 2, y + h - 22, '閉じる', () => this._modal?.destroy(true)))
    this._modal = this.add.container(0, 18, items).setDepth(100).setAlpha(0)
    this.tweens.add({ targets: this._modal, y: 0, alpha: 1, duration: 160, ease: 'Sine.easeOut' })
  }

  _upgrade(id, currentLevel) {
    const unlockReward = getFacilityUnlockReward(id, currentLevel + 1)
    const result = upgradeTownFacility(id)
    if (!result.ok) return this._toast(result.reason === 'max' ? '最大レベルです' : 'ポイントが足りません')
    if (unlockReward) localStorage.setItem('ainan_pending_sea_unlock', JSON.stringify(unlockReward))
    this.scene.restart()
  }

  _maybeShowUnlockCelebration(W, H) {
    let unlock = null
    try { unlock = JSON.parse(localStorage.getItem('ainan_pending_sea_unlock') ?? 'null') } catch { unlock = null }
    if (!unlock) return
    localStorage.removeItem('ainan_pending_sea_unlock')

    const items = []
    items.push(this.add.rectangle(W / 2, H / 2, W, H, 0x102b42, 0.58).setInteractive())
    const x = 34, y = 222, w = W - 68, h = 280
    const bg = this.add.graphics()
    bg.fillStyle(0xffffff, 0.99)
    bg.lineStyle(3, 0xffb45d, 1)
    bg.fillRoundedRect(x, y, w, h, 26)
    bg.strokeRoundedRect(x, y, w, h, 26)
    bg.fillStyle(0xfff1d0, 1)
    bg.fillCircle(W / 2, y + 68, 48)
    bg.fillStyle(0xffd95a, 1)
    bg.fillCircle(W / 2, y + 68, 30)
    items.push(bg)
    items.push(this.add.text(W / 2, y + 68, 'OPEN', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 132, '新しい海が開いた', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '18px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 168, unlock.name, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '28px', fontWeight: '900', color: UI_COLORS.oceanDeep,
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 202, unlock.rewardText, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: UI_COLORS.warning,
    }).setOrigin(0.5))
    items.push(this._actionButton(W / 2, y + 242, 'マップで見る', () => this.scene.start('MapScene')))
    const c = this.add.container(0, 18, items).setDepth(180).setAlpha(0)
    this.tweens.add({ targets: c, y: 0, alpha: 1, duration: 220, ease: 'Back.easeOut' })
  }

  _actionButton(x, y, label, onTap) { return this._button(x, y, label, 0xffd95a, UI_COLORS.ink, onTap) }
  _plainButton(x, y, label, onTap) { return this._button(x, y, label, 0xdff5ff, UI_COLORS.oceanDeep, onTap, 126, 36) }

  _button(x, y, label, fill, color, onTap, w = 210, h = 46) {
    const c = this.add.container(x, y)
    const bg = this.add.graphics()
    bg.fillStyle(0x173248, 0.12)
    bg.fillRoundedRect(-w / 2 + 2, -h / 2 + 3, w, h, 15)
    bg.fillStyle(fill, 1)
    bg.lineStyle(2, 0x173248, 0.7)
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 15)
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 15)
    const t = this.add.text(0, 0, label, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color,
    }).setOrigin(0.5)
    c.add([bg, t])
    c.setSize(w, h).setInteractive({ useHandCursor: true }).on('pointerdown', onTap)
    return c
  }

  _toast(message) {
    const { width: W, height: H } = this.scale
    const t = this.add.text(W / 2, H - 126, message, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: '#ffffff',
      backgroundColor: UI_COLORS.ink, padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setDepth(150)
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 12, delay: 900, duration: 260, onComplete: () => t.destroy() })
  }
}
