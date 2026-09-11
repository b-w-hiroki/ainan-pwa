import Phaser from 'phaser'
import { FONT, SHADOW, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import {
  TOWN_FACILITY_META,
  getCatches,
  getScore,
  getTownFacilityCost,
  getTownSummary,
  upgradeTownFacility,
} from '../game/progress.js'
import {
  getFacilityMilestoneRewards,
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

const FACILITY_ACCENT = {
  market: 0xff765a,
  pier: 0x5bb5d8,
  guide: 0x71d6a2,
  festival: 0xffd95a,
}

const NPC_POOL = [
  ASSETS.characters.fishmonger,
  ASSETS.characters.harborCaptain,
  ASSETS.characters.guideStaff,
  ASSETS.characters.youngFisher,
]

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
    this._hasKue = getCatches().some(c => c.fishId === 'kue')
    localStorage.setItem('ainan_seen_town', '1')
    this._background(W, H)
    this._header(W)
    this._livingTown(W)
    this._facilityGrid(W)
    buildFooterNav(this, W, H, 'town')
    this._maybeShowUnlockCelebration(W, H)
  }

  _stageAsset(bustle = this._summary?.bustle ?? 0) {
    if (this._hasKue || bustle >= 70) return ASSETS.backgrounds.townBustling
    if (bustle >= 28) return ASSETS.backgrounds.townGrowing
    return ASSETS.backgrounds.townQuiet
  }

  _stageLabel(bustle = this._summary?.bustle ?? 0) {
    if (this._hasKue) return '黒潮の主を迎えた港'
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
    veil.fillGradientStyle(0xf8fdff, 0xf8fdff, 0xf8fdff, 0xf8fdff, this._hasKue ? 0.03 : 0.08, this._hasKue ? 0.03 : 0.08, 0.52, 0.52)
    veil.fillRect(0, 0, W, H)
    veil.fillStyle(0x173248, 0.08)
    veil.fillRect(0, H * 0.72, W, H * 0.18)
    if (this._hasKue) this._legendFestivalBackdrop(W, H)
  }

  _legendFestivalBackdrop(W, H) {
    const g = this.add.graphics().setDepth(2)
    g.fillStyle(0xffd95a, 0.10)
    g.fillCircle(W / 2, 224, 176)
    g.lineStyle(2, 0xffd95a, 0.62)
    g.lineBetween(8, 94, W - 8, 94)

    const colors = [0xff765a, 0xffd95a, 0x71d6a2, 0x5bb5d8]
    for (let i = 0; i < 11; i++) {
      const px = 18 + i * ((W - 36) / 10)
      g.fillStyle(colors[i % colors.length], 0.94)
      g.fillTriangle(px - 8, 95, px + 8, 95, px, 111 + (i % 2) * 4)
    }

    const confetti = [
      [28, 138], [356, 150], [45, 236], [342, 258], [22, 365], [364, 402],
      [50, 522], [337, 544], [31, 612], [354, 626],
    ]
    confetti.forEach(([cx, cy], i) => {
      g.fillStyle(colors[i % colors.length], 0.72)
      if (i % 2 === 0) g.fillCircle(cx, cy, 4)
      else g.fillRoundedRect(cx - 4, cy - 2, 8, 4, 2)
    })
  }

  _header(W) {
    const g = this.add.graphics().setDepth(8)
    const border = this._hasKue ? 0xe5b83b : 0x9bcfe5
    g.fillStyle(0x173248, 0.12)
    g.fillRoundedRect(12, 14, W - 24, 74, 22)
    g.fillStyle(0xf8fdff, 0.96)
    g.lineStyle(2, border, 0.94)
    g.fillRoundedRect(12, 10, W - 24, 74, 22)
    g.strokeRoundedRect(12, 10, W - 24, 74, 22)
    g.fillStyle(this._hasKue ? 0xfff0b8 : 0xdff5ff, 0.78)
    g.fillRoundedRect(20, 18, W - 40, 14, 7)

    this.add.text(26, 45, 'みんなの港町', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '24px', fontWeight: '900',
      color: UI_COLORS.ink, shadow: SHADOW.subtle,
    }).setOrigin(0, 0.5).setDepth(10)

    if (this._hasKue) {
      g.fillStyle(0xffd95a, 1)
      g.lineStyle(1.4, 0x9a6b00, 0.72)
      g.fillRoundedRect(172, 34, 62, 23, 10)
      g.strokeRoundedRect(172, 34, 62, 23, 10)
      this.add.text(203, 45, 'LEGEND', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '900', color: UI_COLORS.ink,
        letterSpacing: 1,
      }).setOrigin(0.5).setDepth(10)
    }

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
    glass.fillStyle(this._hasKue ? 0xfffbeb : 0xffffff, this._hasKue ? 0.18 : 0.13)
    glass.lineStyle(this._hasKue ? 2.4 : 1.8, this._hasKue ? 0xffd95a : 0xffffff, this._hasKue ? 0.92 : 0.72)
    glass.fillRoundedRect(x, y, w, h, 24)
    glass.strokeRoundedRect(x, y, w, h, 24)

    const chip = this.add.graphics().setDepth(5)
    chip.fillStyle(this._hasKue ? 0xfff2c7 : 0xf8fdff, 0.96)
    chip.lineStyle(1.5, this._hasKue ? 0xe5b83b : 0x9bcfe5, 0.86)
    chip.fillRoundedRect(x + 14, y + 14, 158, 34, 14)
    chip.strokeRoundedRect(x + 14, y + 14, 158, 34, 14)
    this.add.text(x + 28, y + 31, this._stageLabel(bustle), {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: this._hasKue ? '10px' : '12px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(6)

    const catchChip = this.add.graphics().setDepth(5)
    catchChip.fillStyle(this._hasKue ? 0x8a6507 : 0x173248, 0.82)
    catchChip.fillRoundedRect(x + w - 112, y + 14, 96, 34, 14)
    this.add.text(x + w - 64, y + 31, `釣果 ${s.catches}匹`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5).setDepth(6)

    if (this._hasKue) this._legendPlaque(W / 2, y + 61)
    this._renderTownLineup(x, y, w, s)

    const rankBg = this.add.graphics().setDepth(8)
    rankBg.fillStyle(0xffffff, 0.94)
    rankBg.lineStyle(1.5, this._hasKue ? 0xe5b83b : 0x9bcfe5, 0.80)
    rankBg.fillRoundedRect(x + 18, y + h - 70, w - 36, 52, 17)
    rankBg.strokeRoundedRect(x + 18, y + h - 70, w - 36, 52, 17)
    this.add.text(x + 34, y + h - 54, this._hasKue ? '黒潮伝説の港' : s.rank, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(9)
    this.add.text(x + w - 34, y + h - 54, `${bustle}/100`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: this._hasKue ? '#a97700' : UI_COLORS.oceanDeep,
    }).setOrigin(1, 0.5).setDepth(9)
    rankBg.fillStyle(0xe8f4f8, 1)
    rankBg.fillRoundedRect(x + 34, y + h - 37, w - 68, 9, 5)
    rankBg.fillStyle(this._hasKue ? 0xffc933 : 0x2f9ed4, 1)
    rankBg.fillRoundedRect(x + 34, y + h - 37, Math.max(8, (w - 68) * (bustle / 100)), 9, 5)

    this._nextMilestoneCard(W, y + h + 10, s)
  }

  _legendPlaque(cx, y) {
    const g = this.add.graphics().setDepth(7)
    g.fillStyle(0x173248, 0.16)
    g.fillRoundedRect(cx - 83 + 2, y - 11 + 3, 166, 23, 9)
    g.fillStyle(0xffd95a, 0.98)
    g.lineStyle(1.4, 0x9a6b00, 0.68)
    g.fillRoundedRect(cx - 83, y - 11, 166, 23, 9)
    g.strokeRoundedRect(cx - 83, y - 11, 166, 23, 9)
    this.add.text(cx, y, '黒潮の主 クエ捕獲記念祭', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5).setDepth(8)
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
      const cy = y + (this._hasKue ? 113 : 110)

      this._drawFacilityGrowth(cx, cy, item.id, lv)

      const baseW = lv > 0 ? 68 + lv * 3 : 68
      const baseH = lv > 0 ? 53 + lv * 2 : 53
      const img = this.add.image(cx, cy, art.key)
        .setDisplaySize(baseW, baseH)
        .setDepth(6)
        .setAlpha(lv > 0 ? 1 : 0.32)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this._showFacility(meta, lv, getTownFacilityCost(item.id)))
      if (lv === 0) img.setTint(0x9aaab3)
      if (lv >= 5) this.tweens.add({ targets: img, scaleX: img.scaleX * 1.025, scaleY: img.scaleY * 1.025, duration: 1450 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

      const badge = this.add.graphics().setDepth(9)
      badge.fillStyle(lv >= 5 ? 0xb88700 : lv > 0 ? 0x173248 : 0x7b8991, 0.90)
      badge.fillCircle(cx + 27, y + 83, 11)
      this.add.text(cx + 27, y + 83, lv > 0 ? `${lv}` : '未', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: '#ffffff',
      }).setOrigin(0.5).setDepth(10)

      this._spawnFacilityCrowd(cx, y + 139, item.id, lv, i)

      this.add.text(cx, y + 157, item.label, {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: lv > 0 ? UI_COLORS.ink : UI_COLORS.muted,
      }).setOrigin(0.5).setDepth(10)
    })
  }

  _drawFacilityGrowth(cx, cy, id, lv) {
    const accent = FACILITY_ACCENT[id] ?? 0x5bb5d8
    const g = this.add.graphics().setDepth(5)

    g.fillStyle(0x173248, lv > 0 ? 0.13 : 0.06)
    g.fillEllipse(cx, cy + 29, 76 + Math.max(0, lv - 1) * 3, 13)

    if (lv <= 0) return

    g.fillStyle(accent, 0.22 + lv * 0.025)
    g.fillRoundedRect(cx - 34, cy + 20, 68, 9, 4)

    if (lv >= 2) {
      g.fillStyle(accent, 0.90)
      g.fillRoundedRect(cx - 29, cy - 31, 58, 5, 3)
      g.fillStyle(0xffffff, 0.88)
      for (let n = 0; n < 4; n++) g.fillRoundedRect(cx - 25 + n * 15, cy - 30, 8, 4, 2)
    }

    if (lv >= 3) {
      g.lineStyle(1.8, 0x173248, 0.70)
      g.lineBetween(cx - 31, cy - 31, cx - 31, cy - 46)
      g.lineBetween(cx + 31, cy - 31, cx + 31, cy - 46)
      g.fillStyle(0xff765a, 0.95)
      g.fillTriangle(cx - 31, cy - 46, cx - 31, cy - 36, cx - 20, cy - 41)
      g.fillStyle(0xffd95a, 0.95)
      g.fillTriangle(cx + 31, cy - 46, cx + 31, cy - 36, cx + 20, cy - 41)
    }

    if (lv >= 4) {
      g.lineStyle(1.2, 0xffffff, 0.72)
      g.lineBetween(cx - 34, cy - 35, cx + 34, cy - 35)
      for (let n = 0; n < 5; n++) {
        g.fillStyle(n % 2 === 0 ? 0xffd95a : 0xff765a, 0.98)
        g.fillCircle(cx - 28 + n * 14, cy - 34, 2.6)
      }
    }

    if (lv >= 5) {
      g.lineStyle(2.2, 0xffd95a, 0.44)
      g.strokeCircle(cx, cy - 2, 44)
      g.fillStyle(0xffd95a, 0.96)
      g.fillCircle(cx + 36, cy - 37, 8)
      this.add.text(cx + 36, cy - 37, '★', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '900', color: UI_COLORS.ink,
      }).setOrigin(0.5).setDepth(9)
    }
  }

  _spawnFacilityCrowd(cx, y, id, lv, index) {
    if (lv <= 0) return
    const baseCount = lv >= 5 ? 3 : lv >= 3 ? 2 : 1
    const count = Math.min(4, baseCount + (this._hasKue ? 1 : 0))
    const own = FACILITY_NPC[id]
    const poolStart = NPC_POOL.findIndex(asset => asset.key === own?.key)
    const positions = [-26, 26, -10, 12]

    for (let n = 0; n < count; n++) {
      const asset = n === 0 ? own : NPC_POOL[(Math.max(0, poolStart) + n) % NPC_POOL.length]
      if (!asset?.key || !this.textures.exists(asset.key)) continue
      const person = this.add.image(cx + positions[n], y - (n % 2) * 3, asset.key)
        .setDisplaySize(18 + (n === 0 ? 2 : 0), 29 + (n === 0 ? 3 : 0))
        .setDepth(8)
        .setAlpha(n === 0 ? 1 : 0.90)
      if (n % 2 === 1) person.setFlipX(true)
      this.tweens.add({
        targets: person,
        y: person.y - 1.8,
        duration: 1150 + index * 110 + n * 130,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    }
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
    const rewards = !maxed ? getFacilityMilestoneRewards(rec.id, rec.level + 1) : []
    const rewardText = rewards.length ? rewards.map(r => r.label).join(' / ') : ''
    const title = this._hasKue ? '伝説の釣果で港がお祭り状態' : rec.unlock ? `次の海　${rec.unlock.name}` : rewards.length ? `次の発展　${rec.meta.name}` : maxed ? '港はしっかり育ってきた' : `次のおすすめ　${rec.meta.name}`
    const body = this._hasKue
      ? '施設をさらに育てると、人と灯りが増えて港の景色が変わる。'
      : rewardText
        ? `Lv.${rec.level + 1}で ${rewardText}`
        : rec.unlock
          ? `${rec.unlock.unlockedBy}で「${rec.unlock.rewardText}」が解放される`
          : maxed ? '釣果を増やして、さらに町のにぎわいを広げよう。' : rec.level === 0 ? rec.meta.desc : `Lv.${rec.level + 1}で ${rec.meta.effect}`
    const x = 22, w = W - 44, h = 62
    const g = this.add.graphics().setDepth(6)
    g.fillStyle(0x173248, 0.08)
    g.fillRoundedRect(x + 2, y + 3, w, h, 18)
    g.fillStyle(this._hasKue ? 0xfffbec : 0xffffff, 0.98)
    g.lineStyle(1.6, this._hasKue ? 0xe5b83b : rewards.length || rec.unlock ? 0xffb45d : 0x9bcfe5, 0.90)
    g.fillRoundedRect(x, y, w, h, 18)
    g.strokeRoundedRect(x, y, w, h, 18)
    g.fillStyle(this._hasKue ? 0xfff0b8 : rewards.length || rec.unlock ? 0xfff1d0 : 0xdff5ff, 1)
    g.fillCircle(x + 31, y + h / 2, 22)

    if (rec.npc?.key && this.textures.exists(rec.npc.key)) this.add.image(x + 31, y + h / 2 + 5, rec.npc.key).setDisplaySize(34, 52).setDepth(7)
    this.add.text(x + 62, y + 21, title, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(7)
    this.add.text(x + 62, y + 43, body, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '800', color: this._hasKue ? '#9a6b00' : rewards.length || rec.unlock ? UI_COLORS.warning : UI_COLORS.inkSoft,
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
    const milestoneRewards = !maxed ? getFacilityMilestoneRewards(item.id, lv + 1) : []
    const hasMilestone = milestoneRewards.length > 0
    const accent = FACILITY_ACCENT[item.id] ?? 0x5bb5d8
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x173248, 0.08)
    g.fillRoundedRect(x + 2, y + 3, w, h, 17)
    g.fillStyle(maxed ? 0xfffbec : 0xffffff, 0.97)
    g.lineStyle(1.7, hasMilestone ? 0xffb45d : maxed ? 0xe2b94b : 0x9bcfe5, 0.92)
    g.fillRoundedRect(x, y, w, h, 17)
    g.strokeRoundedRect(x, y, w, h, 17)

    if (lv >= 3) {
      g.fillStyle(accent, 0.13)
      g.fillCircle(x + 31, y + 29, 25)
    }
    const art = FACILITY_ART[item.id]
    if (art?.key && this.textures.exists(art.key)) {
      const size = 44 + Math.min(5, lv) * 1.8
      const image = this.add.image(x + 30, y + 29, art.key).setDisplaySize(size + 8, size * 0.80).setDepth(5)
      if (lv === 0) image.setTint(0x9aaab3).setAlpha(0.48)
    }
    if (maxed) this.add.text(x + 46, y + 10, '★', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: '#c68a00' }).setOrigin(0.5).setDepth(7)

    this.add.text(x + 59, y + 19, item.name, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + 59, y + 39, hasMilestone ? `Lv.${lv} → 新要素` : maxed ? 'Lv.5 / 完成' : `Lv.${lv}/5`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: hasMilestone ? '#d06b3b' : maxed ? '#a97700' : UI_COLORS.oceanDeep,
    }).setOrigin(0, 0.5).setDepth(5)

    for (let i = 0; i < 5; i++) {
      g.fillStyle(i < lv ? (maxed ? 0xffd95a : accent) : 0xdfeaf0, 1)
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
    const milestoneRewards = lv < 5 ? getFacilityMilestoneRewards(item.id, lv + 1) : []
    const hasMilestone = milestoneRewards.length > 0
    const items = []
    items.push(this.add.rectangle(W / 2, H / 2, W, H, 0x173248, 0.44).setInteractive().on('pointerdown', () => this._modal?.destroy(true)))
    const x = 34, y = 166, w = W - 68, h = 364
    const bg = this.add.graphics()
    bg.fillStyle(0x173248, 0.14)
    bg.fillRoundedRect(x + 3, y + 5, w, h, 24)
    bg.fillStyle(0xf8fdff, 0.99)
    bg.lineStyle(2.2, hasMilestone ? 0xffb45d : 0x9bcfe5, 0.9)
    bg.fillRoundedRect(x, y, w, h, 24)
    bg.strokeRoundedRect(x, y, w, h, 24)
    bg.fillStyle(lv >= 5 ? 0xfff3c7 : 0xdff5ff, 1)
    bg.fillRoundedRect(x + 20, y + 22, w - 40, 108, 20)
    items.push(bg)

    const art = FACILITY_ART[item.id]
    const npc = FACILITY_NPC[item.id]
    if (art?.key && this.textures.exists(art.key)) items.push(this.add.image(W / 2 - 34, y + 74, art.key).setDisplaySize(106 + lv * 3, 82 + lv * 2))
    if (npc?.key && this.textures.exists(npc.key)) items.push(this.add.image(W / 2 + 74, y + 78, npc.key).setDisplaySize(53, 82))

    items.push(this.add.text(W / 2, y + 151, item.name, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '22px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 184, item.desc, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '800', color: UI_COLORS.inkSoft,
      align: 'center', wordWrap: { width: w - 50 },
    }).setOrigin(0.5, 0))
    items.push(this.add.text(W / 2, y + 228, `${item.effect} / Lv.${lv}/5`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: lv >= 5 ? '#a97700' : UI_COLORS.warning,
      align: 'center', wordWrap: { width: w - 50 },
    }).setOrigin(0.5))

    if (hasMilestone) {
      const rewardBg = this.add.graphics()
      rewardBg.fillStyle(0xfff1d0, 1)
      rewardBg.lineStyle(1.8, 0xffb45d, 0.9)
      rewardBg.fillRoundedRect(x + 28, y + 246, w - 56, 54, 14)
      rewardBg.strokeRoundedRect(x + 28, y + 246, w - 56, 54, 14)
      items.push(rewardBg)
      items.push(this.add.text(W / 2, y + 260, '次のLvで解放', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: '#9a5a34',
      }).setOrigin(0.5))
      items.push(this.add.text(W / 2, y + 281, milestoneRewards.map(r => r.label).join(' / '), {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: '#b85d2f',
        align: 'center', wordWrap: { width: w - 72 },
      }).setOrigin(0.5))
    } else if (lv >= 5) {
      items.push(this.add.text(W / 2, y + 271, 'MAX DEVELOPMENT / 外観完成', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: '#a97700',
      }).setOrigin(0.5))
    }

    if (lv < 5) items.push(this._actionButton(W / 2, y + 319, `${cost}ptで発展`, () => this._upgrade(item.id, lv)))
    items.push(this._plainButton(W / 2, y + h - 20, '閉じる', () => this._modal?.destroy(true)))
    this._modal = this.add.container(0, 18, items).setDepth(100).setAlpha(0)
    this.tweens.add({ targets: this._modal, y: 0, alpha: 1, duration: 160, ease: 'Sine.easeOut' })
  }

  _upgrade(id, currentLevel) {
    const milestoneRewards = getFacilityMilestoneRewards(id, currentLevel + 1)
    const result = upgradeTownFacility(id)
    if (!result.ok) return this._toast(result.reason === 'max' ? '最大レベルです' : 'ポイントが足りません')
    if (milestoneRewards.length) localStorage.setItem('ainan_pending_town_rewards', JSON.stringify(milestoneRewards))
    this.scene.restart()
  }

  _maybeShowUnlockCelebration(W, H) {
    let rewards = null
    try { rewards = JSON.parse(localStorage.getItem('ainan_pending_town_rewards') ?? 'null') } catch { rewards = null }

    if (!Array.isArray(rewards) || rewards.length === 0) {
      let legacy = null
      try { legacy = JSON.parse(localStorage.getItem('ainan_pending_sea_unlock') ?? 'null') } catch { legacy = null }
      if (legacy) rewards = [{ type: 'point', id: legacy.pointId, label: `${legacy.name} 解放`, detail: legacy.rewardText }]
    }
    if (!Array.isArray(rewards) || rewards.length === 0) return

    localStorage.removeItem('ainan_pending_town_rewards')
    localStorage.removeItem('ainan_pending_sea_unlock')

    const primary = rewards.find(r => r.type === 'challenge') ?? rewards.find(r => r.type === 'point') ?? rewards[0]
    const items = []
    items.push(this.add.rectangle(W / 2, H / 2, W, H, 0x102b42, 0.58).setInteractive())
    const x = 34, y = 210, w = W - 68, h = 304
    const bg = this.add.graphics()
    bg.fillStyle(0xffffff, 0.99)
    bg.lineStyle(3, 0xffb45d, 1)
    bg.fillRoundedRect(x, y, w, h, 26)
    bg.strokeRoundedRect(x, y, w, h, 26)
    bg.fillStyle(0xfff1d0, 1)
    bg.fillCircle(W / 2, y + 62, 46)
    bg.fillStyle(0xffd95a, 1)
    bg.fillCircle(W / 2, y + 62, 28)
    items.push(bg)
    items.push(this.add.text(W / 2, y + 62, 'OPEN', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 120, '町が発展した！', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '19px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 154, rewards.map(r => r.label).join('\n'), {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '17px', fontWeight: '900', color: UI_COLORS.oceanDeep,
      align: 'center', lineSpacing: 7, wordWrap: { width: w - 50 },
    }).setOrigin(0.5, 0))
    items.push(this.add.text(W / 2, y + 221, '町を育てると、釣りの選択肢も広がる', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.warning,
    }).setOrigin(0.5))

    const action = primary.type === 'challenge'
      ? () => this.scene.start('ChallengeScene')
      : primary.type === 'point'
        ? () => this.scene.start('MapScene')
        : () => this.scene.start('UpgradeScene', { tab: 'bait' })
    const label = primary.type === 'challenge' ? '大物挑戦を見る' : primary.type === 'point' ? 'マップで見る' : 'エサを確認する'
    items.push(this._actionButton(W / 2, y + 260, label, action))
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
