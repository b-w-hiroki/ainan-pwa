import Phaser from 'phaser'
import { FONT, SHADOW, UI_COLORS, uiText } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import {
  MISSION_SHEETS,
  MISSION_TABS,
  claimAllMissionRewards,
  claimMissionBonus,
  claimMissionReward,
  getClaimedMissionBonuses,
  getClaimedMissions,
  getMissionProgress,
  getTownBonuses,
} from '../game/progress.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export default class MissionScene extends Phaser.Scene {
  constructor() { super({ key: 'MissionScene' }) }

  init(data = {}) {
    this._tab = data.tab ?? this._tab ?? 'daily'
    this._sheetIndex = data.sheetIndex ?? this._sheetIndex ?? 0
    this._sheetScroll = data.sheetScroll ?? 0
    this._listScroll = data.listScroll ?? 0
  }

  preload() {
    const bg = ASSETS.backgrounds.townGrowing
    if (bg?.status === 'ready' && !this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
  }

  create() {
    const { width: W, height: H } = this.scale
    this._background(W, H)
    this._header(W)
    this._tabs(W)
    this._panel(W, H)
    this._sheetBanners(W, H)
    buildFooterNav(this, W, H, 'menu')
  }

  _background(W, H) {
    addCoverImage(this, ASSETS.backgrounds.townGrowing.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillGradientStyle(0xf8fdff, 0xf8fdff, 0xf4fbff, 0xf4fbff, 0.82, 0.82, 0.94, 0.94)
    veil.fillRect(0, 0, W, H)
  }

  _header(W) {
    const shell = this.add.graphics().setDepth(4)
    shell.fillStyle(0x173248, 0.10)
    shell.fillRoundedRect(16, 15, W - 32, 66, 20)
    shell.fillStyle(0xf8fdff, 0.97)
    shell.lineStyle(1.8, 0x9bcfe5, 0.86)
    shell.fillRoundedRect(16, 11, W - 32, 66, 20)
    shell.strokeRoundedRect(16, 11, W - 32, 66, 20)
    shell.fillStyle(0xdff5ff, 0.75)
    shell.fillRoundedRect(24, 19, W - 48, 12, 6)

    this.add.text(30, 42, 'ミッション', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '24px', fontWeight: '900',
      color: UI_COLORS.ink, shadow: SHADOW.subtle,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(30, 64, '釣りと町おこしの次の目標', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: UI_COLORS.inkSoft,
    }).setOrigin(0, 0.5).setDepth(5)

    const bonusPct = Math.round((getTownBonuses().missionRewardMod - 1) * 100)
    this.add.text(W - 30, 40, bonusPct > 0 ? `報酬 +${bonusPct}%` : '報酬ボーナス', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900',
      color: bonusPct > 0 ? UI_COLORS.success : UI_COLORS.inkSoft,
    }).setOrigin(1, 0.5).setDepth(5)
    this.add.text(W - 30, 60, bonusPct > 0 ? '案内所の効果' : '案内所を育てるとUP', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '800', color: UI_COLORS.inkSoft,
    }).setOrigin(1, 0.5).setDepth(5)
  }

  _tabs(W) {
    const y = 88
    const margin = 22
    const gap = 8
    const tabW = (W - margin * 2 - gap * 2) / 3
    MISSION_TABS.forEach((tab, i) => {
      const x = margin + i * (tabW + gap)
      const active = tab.id === this._tab
      const g = this.add.graphics().setDepth(6)
      g.fillStyle(0x173248, active ? 0.10 : 0.05)
      g.fillRoundedRect(x + 1, y + 3, tabW, 36, 13)
      g.fillStyle(active ? tab.color : 0xffffff, active ? 0.92 : 0.91)
      g.lineStyle(active ? 2 : 1.4, active ? 0x173248 : 0xabc5d2, active ? 0.72 : 0.72)
      g.fillRoundedRect(x, y, tabW, 36, 13)
      g.strokeRoundedRect(x, y, tabW, 36, 13)
      this.add.text(x + tabW / 2, y + 18, tab.label, {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.ink,
      }).setOrigin(0.5).setDepth(7)
      this.add.rectangle(x + tabW / 2, y + 18, tabW, 40, 0x000000, 0)
        .setDepth(8).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.scene.restart({ tab: tab.id, sheetIndex: 0, sheetScroll: 0, listScroll: 0 }))
    })
  }

  _activeSheets() { return MISSION_SHEETS.filter(sheet => sheet.tab === this._tab) }

  _activeSheet() {
    const sheets = this._activeSheets()
    return sheets[Math.min(this._sheetIndex, sheets.length - 1)] ?? sheets[0]
  }

  _panel(W, H) {
    const sheet = this._activeSheet()
    if (!sheet) return
    const progress = getMissionProgress()
    const claimed = getClaimedMissions()
    const claimedBonus = getClaimedMissionBonuses()
    const completed = sheet.tasks.filter(m => Math.min(progress[m.id] ?? 0, m.target) >= m.target).length
    const claimedCount = sheet.tasks.filter(m => claimed[m.id]).length
    const claimableCount = sheet.tasks.filter(m => Math.min(progress[m.id] ?? 0, m.target) >= m.target && !claimed[m.id]).length

    const x = 16, y = 136, w = W - 32, h = 482
    const bg = this.add.graphics().setDepth(4)
    bg.fillStyle(0x173248, 0.11)
    bg.fillRoundedRect(x + 3, y + 5, w, h, 24)
    bg.fillStyle(0xf8fdff, 0.985)
    bg.lineStyle(1.8, 0x9bcfe5, 0.88)
    bg.fillRoundedRect(x, y, w, h, 24)
    bg.strokeRoundedRect(x, y, w, h, 24)
    bg.fillStyle(sheet.color, 0.15)
    bg.fillRoundedRect(x + 12, y + 12, w - 24, 64, 18)

    this.add.text(x + 28, y + 31, sheet.title, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '18px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + 28, y + 55, sheet.subtitle, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: UI_COLORS.inkSoft,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + w - 28, y + 33, `${completed}/${sheet.tasks.length}`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '20px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(1, 0.5).setDepth(5)
    this.add.text(x + w - 28, y + 56, `受取 ${claimedCount}/${sheet.tasks.length}`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: UI_COLORS.inkSoft,
    }).setOrigin(1, 0.5).setDepth(5)

    this._progressPanel(x + 18, y + 88, w - 36, sheet, completed, claimedBonus)
    this._missionList(x + 18, y + 160, w - 36, 258, sheet, progress, claimed)
    this._claimAllBar(x + 18, y + h - 50, w - 36, sheet, claimableCount, completed)
  }

  _progressPanel(x, y, w, sheet, completed, claimedBonus) {
    const h = 58
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0xffffff, 0.92)
    g.lineStyle(1.3, 0x9bcfe5, 0.65)
    g.fillRoundedRect(x, y, w, h, 15)
    g.strokeRoundedRect(x, y, w, h, 15)

    this.add.text(x + 14, y + 14, 'シート進行', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: UI_COLORS.inkSoft,
    }).setOrigin(0, 0.5).setDepth(6)

    const barX = x + 14, barY = y + 30, barW = w - 28
    const fillW = Math.max(0, Math.min(1, completed / sheet.tasks.length)) * barW
    const bar = this.add.graphics().setDepth(6)
    bar.fillStyle(0xe5eef2, 1)
    bar.fillRoundedRect(barX, barY, barW, 11, 6)
    bar.fillStyle(sheet.color, 1)
    bar.fillRoundedRect(barX, barY, fillW, 11, 6)

    ;(sheet.milestoneRewards ?? []).forEach(reward => {
      const px = barX + barW * (reward.count / sheet.tasks.length)
      const key = `${sheet.id}:${reward.id}`
      const done = completed >= reward.count
      const claimed = !!claimedBonus[key]
      const marker = this.add.graphics().setDepth(7)
      marker.fillStyle(claimed ? 0xffd95a : done ? 0x71d6a2 : 0xffffff, 1)
      marker.lineStyle(1.5, done ? 0x173248 : 0x9aa9b5, 0.8)
      marker.fillCircle(px, barY + 5, 10)
      marker.strokeCircle(px, barY + 5, 10)
      this.add.text(px, barY + 5, claimed ? '✓' : `${reward.count}`, {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '900', color: UI_COLORS.ink,
      }).setOrigin(0.5).setDepth(8)
      this.add.text(px, y + 50, reward.text, {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '900', color: done ? UI_COLORS.warning : UI_COLORS.muted,
      }).setOrigin(0.5).setDepth(8)
      if (done && !claimed) {
        this.add.rectangle(px, barY + 7, 50, 36, 0x000000, 0).setDepth(9).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          if (claimMissionBonus(sheet.id, reward.id)) this._restartHere()
        })
      }
    })
  }

  _missionList(x, y, w, viewH, sheet, progress, claimed) {
    const cardH = 72, gap = 8
    const contentH = sheet.tasks.length * cardH + Math.max(0, sheet.tasks.length - 1) * gap
    const maxScroll = Math.max(0, contentH - viewH)
    this._listScroll = Phaser.Math.Clamp(this._listScroll, 0, maxScroll)

    const maskShape = this.add.graphics().setVisible(false)
    maskShape.fillStyle(0xffffff, 1)
    maskShape.fillRect(x - 2, y - 2, w + 4, viewH + 4)
    const list = this.add.container(0, -this._listScroll).setDepth(5).setMask(maskShape.createGeometryMask())

    sheet.tasks.forEach((mission, i) => {
      const value = Math.min(progress[mission.id] ?? 0, mission.target)
      const done = value >= mission.target
      this._card(list, x, y + i * (cardH + gap), w, cardH, mission, value, done, !!claimed[mission.id], sheet.color)
    })

    if (maxScroll <= 0) return
    const thumbH = Math.max(34, viewH * (viewH / contentH))
    const thumbY = y + (viewH - thumbH) * (this._listScroll / maxScroll)
    const rail = this.add.graphics().setDepth(8)
    rail.fillStyle(0x173248, 0.10)
    rail.fillRoundedRect(x + w + 4, y, 4, viewH, 2)
    rail.fillStyle(0x2f9ed4, 0.55)
    rail.fillRoundedRect(x + w + 3, thumbY, 6, thumbH, 3)

    this.input.on('wheel', (_pointer, _objects, _dx, dy) => {
      const next = Phaser.Math.Clamp(this._listScroll + dy * 0.55, 0, maxScroll)
      if (next === this._listScroll) return
      this.scene.restart({ tab: this._tab, sheetIndex: this._sheetIndex, sheetScroll: this._sheetScroll, listScroll: next })
    })
  }

  _card(parent, x, y, w, h, mission, value, done, claimed, accent) {
    const add = obj => { parent.add(obj); return obj }
    const g = add(this.add.graphics())
    g.fillStyle(claimed ? 0xfffbeb : done ? 0xf0fbf5 : 0xffffff, 1)
    g.lineStyle(1.5, claimed ? 0xe8c254 : done ? 0x71d6a2 : 0xc5d9e2, 0.95)
    g.fillRoundedRect(x, y, w, h, 15)
    g.strokeRoundedRect(x, y, w, h, 15)
    g.fillStyle(claimed ? 0xffd95a : done ? 0x71d6a2 : accent, claimed || done ? 0.22 : 0.13)
    g.fillCircle(x + 25, y + h / 2, 17)

    add(this.add.text(x + 25, y + h / 2, claimed ? '✓' : done ? '!' : '•', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: claimed ? UI_COLORS.warning : done ? UI_COLORS.success : UI_COLORS.ink,
    }).setOrigin(0.5))
    add(this.add.text(x + 50, y + 18, mission.title, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: UI_COLORS.ink,
      wordWrap: { width: w - 142 },
    }).setOrigin(0, 0.5))
    add(this.add.text(x + 50, y + h - 18, `${value}/${mission.target}   +${this._missionReward(mission)}pt`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: done ? UI_COLORS.success : UI_COLORS.inkSoft,
    }).setOrigin(0, 0.5))

    const label = claimed ? '受取済' : done ? '受取' : `${Math.round((value / Math.max(1, mission.target)) * 100)}%`
    const bx = x + w - 43
    const btn = add(this.add.graphics())
    btn.fillStyle(claimed ? 0xe8eef1 : done ? 0xffd95a : 0xeaf6fb, 1)
    btn.lineStyle(1.5, done && !claimed ? 0x173248 : 0xabc5d2, 0.75)
    btn.fillRoundedRect(bx - 31, y + h / 2 - 15, 62, 30, 10)
    btn.strokeRoundedRect(bx - 31, y + h / 2 - 15, 62, 30, 10)
    add(this.add.text(bx, y + h / 2, label, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: claimed ? UI_COLORS.muted : UI_COLORS.ink,
    }).setOrigin(0.5))
    if (done && !claimed) {
      add(this.add.rectangle(bx, y + h / 2, 70, 38, 0x000000, 0).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (claimMissionReward(mission.id)) this._restartHere()
      }))
    }
  }

  _claimAllBar(x, y, w, sheet, claimableCount, completed) {
    const claimedBonus = getClaimedMissionBonuses()
    const milestoneCount = (sheet.milestoneRewards ?? []).filter(reward => completed >= reward.count && !claimedBonus[`${sheet.id}:${reward.id}`]).length
    const completeClaimed = !!claimedBonus[`${sheet.id}:complete`]
    const completeCount = completed >= sheet.tasks.length && !completeClaimed ? 1 : 0
    const totalClaimable = claimableCount + milestoneCount + completeCount
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0xffffff, 0.95)
    g.lineStyle(1.4, 0x9bcfe5, 0.72)
    g.fillRoundedRect(x, y, w, 42, 14)
    g.strokeRoundedRect(x, y, w, 42, 14)
    this.add.text(x + 14, y + 13, `達成 ${completed}/${sheet.tasks.length}`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(6)
    this.add.text(x + 14, y + 29, totalClaimable > 0 ? `未受取 ${totalClaimable}件` : '受取待ちはありません', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '800', color: totalClaimable > 0 ? UI_COLORS.warning : UI_COLORS.inkSoft,
    }).setOrigin(0, 0.5).setDepth(6)

    const bx = x + w - 112, by = y + 7
    const btn = this.add.graphics().setDepth(6)
    btn.fillStyle(totalClaimable > 0 ? 0xffd95a : 0xe4ecef, 1)
    btn.lineStyle(1.7, 0x173248, totalClaimable > 0 ? 0.75 : 0.20)
    btn.fillRoundedRect(bx, by, 98, 28, 10)
    btn.strokeRoundedRect(bx, by, 98, 28, 10)
    this.add.text(bx + 49, by + 14, '一括受取', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: totalClaimable > 0 ? UI_COLORS.ink : UI_COLORS.muted,
    }).setOrigin(0.5).setDepth(7)
    if (totalClaimable > 0) {
      this.add.rectangle(bx + 49, by + 14, 106, 36, 0x000000, 0).setDepth(8).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        claimAllMissionRewards(sheet.id)
        this._restartHere()
      })
    }
  }

  _sheetBanners(W, H) {
    const sheets = this._activeSheets()
    if (!sheets.length) return
    const y = H - 158
    this.add.text(24, y - 18, 'ミッションシート', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.ink,
    }).setDepth(5)

    const visible = this._tab === 'limited' ? sheets.slice(this._sheetScroll, this._sheetScroll + 3) : sheets.slice(0, 3)
    visible.forEach((sheet, i) => {
      const realIndex = this._tab === 'limited' ? this._sheetScroll + i : i
      this._sheetBanner(22 + i * 118, y, 108, 52, sheet, realIndex)
    })

    if (this._tab === 'limited' && sheets.length > 3) {
      this._sheetArrow(8, y + 26, '‹', -1, sheets.length)
      this._sheetArrow(W - 8, y + 26, '›', 1, sheets.length)
    }
  }

  _sheetArrow(x, y, label, direction, total) {
    const canMove = direction < 0 ? this._sheetScroll > 0 : this._sheetScroll < total - 3
    const t = this.add.text(x, y, label, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '24px', fontWeight: '900', color: canMove ? UI_COLORS.oceanDeep : UI_COLORS.muted,
    }).setOrigin(0.5).setDepth(9).setAlpha(canMove ? 1 : 0.35)
    if (canMove) t.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      const next = Phaser.Math.Clamp(this._sheetScroll + direction, 0, Math.max(0, total - 3))
      const index = Phaser.Math.Clamp(this._sheetIndex, next, next + 2)
      this.scene.restart({ tab: this._tab, sheetIndex: index, sheetScroll: next, listScroll: 0 })
    })
  }

  _sheetBanner(x, y, w, h, sheet, index) {
    const active = index === this._sheetIndex
    const progress = getMissionProgress()
    const completed = sheet.tasks.filter(task => Math.min(progress[task.id] ?? 0, task.target) >= task.target).length
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0x173248, active ? 0.09 : 0.04)
    g.fillRoundedRect(x + 1, y + 3, w, h, 15)
    g.fillStyle(active ? sheet.color : 0xffffff, active ? 0.18 : 0.94)
    g.lineStyle(active ? 2 : 1.3, active ? sheet.color : 0xb7cbd5, 0.9)
    g.fillRoundedRect(x, y, w, h, 15)
    g.strokeRoundedRect(x, y, w, h, 15)
    this.add.text(x + 10, y + 16, sheet.title, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: UI_COLORS.ink,
      wordWrap: { width: w - 20 },
    }).setOrigin(0, 0.5).setDepth(6)
    this.add.text(x + 10, y + 37, `${completed}/${sheet.tasks.length}`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: active ? UI_COLORS.ink : UI_COLORS.warning,
    }).setOrigin(0, 0.5).setDepth(6)
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0).setDepth(7).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.scene.restart({ tab: this._tab, sheetIndex: index, sheetScroll: this._sheetScroll, listScroll: 0 })
    })
  }

  _restartHere() {
    this.scene.restart({ tab: this._tab, sheetIndex: this._sheetIndex, sheetScroll: this._sheetScroll, listScroll: this._listScroll })
  }

  _missionReward(mission) {
    return Math.round((mission.reward ?? mission.grant?.score ?? 0) * getTownBonuses().missionRewardMod)
  }
}
