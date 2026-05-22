import Phaser from 'phaser'
import { FONT, SHADOW, uiText } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { ICONS } from '../config/icons.js'
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
  constructor() {
    super({ key: 'MissionScene' })
  }

  init(data = {}) {
    this._tab = data.tab ?? this._tab ?? 'daily'
    this._sheetIndex = data.sheetIndex ?? this._sheetIndex ?? 0
    this._sheetScroll = data.sheetScroll ?? 0
    this._listScroll = data.listScroll ?? 0
  }

  preload() {
    const bg = ASSETS.backgrounds.homeBase
    if (!this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
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
    addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillStyle(0xf4fbff, 0.88)
    veil.fillRect(0, 0, W, H)
  }

  _header(W) {
    this.add.text(W / 2, 36, `${ICONS.MISSION} ミッション`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '28px', fontWeight: '900',
      color: '#1a3a5a', shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2, 66, 'シートを進めて追加報酬を集めよう', uiText('screenLead')).setOrigin(0.5).setDepth(5)
  }

  _tabs(W) {
    const y = 86
    const tabW = 106
    MISSION_TABS.forEach((tab, i) => {
      const x = 28 + i * 112
      const active = tab.id === this._tab
      const g = this.add.graphics().setDepth(6)
      g.fillStyle(active ? tab.color : 0xffffff, active ? 0.96 : 0.88)
      g.lineStyle(active ? 3 : 2, active ? 0x1a2a3a : 0xb7c4cf, 1)
      g.fillRoundedRect(x, y, tabW, 34, 13)
      g.strokeRoundedRect(x, y, tabW, 34, 13)
      this.add.text(x + tabW / 2, y + 17, tab.label, uiText('chip')).setOrigin(0.5).setDepth(7)
      this.add.rectangle(x + tabW / 2, y + 17, tabW, 38, 0x000000, 0)
        .setDepth(8)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.scene.restart({ tab: tab.id, sheetIndex: 0, sheetScroll: 0, listScroll: 0 }))
    })
  }

  _activeSheets() {
    return MISSION_SHEETS.filter(sheet => sheet.tab === this._tab)
  }

  _activeSheet() {
    const sheets = this._activeSheets()
    return sheets[Math.min(this._sheetIndex, sheets.length - 1)] ?? sheets[0]
  }

  _panel(W, H) {
    const sheet = this._activeSheet()
    const progress = getMissionProgress()
    const claimed = getClaimedMissions()
    const claimedBonus = getClaimedMissionBonuses()
    const completed = sheet.tasks.filter(m => Math.min(progress[m.id] ?? 0, m.target) >= m.target).length
    const claimedCount = sheet.tasks.filter(m => claimed[m.id]).length
    const claimableCount = sheet.tasks.filter(m => Math.min(progress[m.id] ?? 0, m.target) >= m.target && !claimed[m.id]).length

    const x = 18
    const y = 136
    const w = W - 36
    const h = 480
    const bg = this.add.graphics().setDepth(4)
    bg.fillStyle(0xffffff, 0.97)
    bg.lineStyle(3, 0x1a2a3a, 0.9)
    bg.fillRoundedRect(x, y, w, h, 24)
    bg.strokeRoundedRect(x, y, w, h, 24)
    bg.fillStyle(sheet.color, 0.22)
    bg.fillRoundedRect(x + 16, y + 14, w - 32, 58, 18)

    this.add.text(W / 2, y + 31, sheet.title, uiText('panelTitle')).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2, y + 55, `${sheet.subtitle}  進行 ${completed}/${sheet.tasks.length}  報酬 ${claimedCount}/${sheet.tasks.length}`, uiText('panelMeta')).setOrigin(0.5).setDepth(5)

    this._progressPanel(x + 18, y + 86, w - 36, sheet, completed, claimedBonus)
    this._missionList(x + 18, y + 162, w - 36, 250, sheet, progress, claimed)
    this._claimAllBar(x + 18, y + h - 50, w - 36, sheet, claimableCount, completed)
  }

  _progressPanel(x, y, w, sheet, completed, claimedBonus) {
    const h = 62
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0xffffff, 0.96)
    g.lineStyle(2, 0x1a2a3a, 0.22)
    g.fillRoundedRect(x, y, w, h, 16)
    g.strokeRoundedRect(x, y, w, h, 16)
    this.add.text(x + 16, y + 17, `進行度 ${completed}/${sheet.tasks.length}`, uiText('chip')).setOrigin(0, 0.5).setDepth(6)

    const barX = x + 18
    const barY = y + 34
    const barW = w - 36
    const fillW = Math.max(0, Math.min(1, completed / sheet.tasks.length)) * barW
    const bar = this.add.graphics().setDepth(6)
    bar.fillStyle(0xdce8ef, 1)
    bar.fillRoundedRect(barX, barY, barW, 12, 6)
    bar.fillStyle(sheet.color, 1)
    bar.fillRoundedRect(barX, barY, fillW, 12, 6)

    ;(sheet.milestoneRewards ?? []).forEach(reward => {
      const px = barX + barW * (reward.count / sheet.tasks.length)
      const key = `${sheet.id}:${reward.id}`
      const done = completed >= reward.count
      const claimed = !!claimedBonus[key]
      const marker = this.add.graphics().setDepth(7)
      marker.fillStyle(claimed ? 0xffd900 : done ? 0x00aa66 : 0xffffff, 1)
      marker.lineStyle(2, done ? 0x1a2a3a : 0x9aa9b5, 0.95)
      marker.fillCircle(px, barY + 6, 12)
      marker.strokeCircle(px, barY + 6, 12)
    this.add.text(px, barY + 6, claimed ? ICONS.GIFT : `${reward.count}`, uiText('chip', { fontSize: '14px' })).setOrigin(0.5).setDepth(8)
      this.add.text(px, y + 53, reward.text, uiText('micro', { color: done ? '#d56f00' : '#6d7f8e' })).setOrigin(0.5).setDepth(8)
      if (done && !claimed) {
        this.add.rectangle(px, barY + 9, 54, 42, 0x000000, 0).setDepth(9).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          if (claimMissionBonus(sheet.id, reward.id)) this.scene.restart({ tab: this._tab, sheetIndex: this._sheetIndex, sheetScroll: this._sheetScroll, listScroll: this._listScroll })
        })
      }
    })
  }

  _missionList(x, y, w, viewH, sheet, progress, claimed) {
    const cardH = 76
    const gap = 10
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
      const isClaimed = !!claimed[mission.id]
      this._card(list, x, y + i * (cardH + gap), w, cardH, mission, value, done, isClaimed, sheet.color)
    })

    if (maxScroll <= 0) return
    const thumbH = Math.max(36, viewH * (viewH / contentH))
    const thumbY = y + (viewH - thumbH) * (this._listScroll / maxScroll)
    const rail = this.add.graphics().setDepth(8)
    rail.fillStyle(0x1a2a3a, 0.12)
    rail.fillRoundedRect(x + w + 5, y, 4, viewH, 2)
    rail.fillStyle(0x1a2a3a, 0.48)
    rail.fillRoundedRect(x + w + 4, thumbY, 6, thumbH, 3)

    this.input.on('wheel', (_pointer, _objects, _dx, dy) => {
      const next = Phaser.Math.Clamp(this._listScroll + dy * 0.55, 0, maxScroll)
      if (next === this._listScroll) return
      this.scene.restart({ tab: this._tab, sheetIndex: this._sheetIndex, sheetScroll: this._sheetScroll, listScroll: next })
    })
  }

  _card(parent, x, y, w, h, mission, value, done, claimed, accent) {
    const add = obj => {
      parent.add(obj)
      return obj
    }
    const g = add(this.add.graphics())
    g.fillStyle(claimed ? 0xfff4ce : done ? 0xe3f8ee : 0xf7fbff, 1)
    g.lineStyle(2, claimed ? 0xffb000 : done ? 0x00aa66 : 0xb7c4cf, 1)
    g.fillRoundedRect(x, y, w, h, 14)
    g.strokeRoundedRect(x, y, w, h, 14)
    g.fillStyle(done || claimed ? 0xffd900 : accent, done || claimed ? 1 : 0.20)
    g.fillCircle(x + 28, y + h / 2, 17)

    add(this.add.text(x + 28, y + h / 2, claimed ? ICONS.GIFT : done ? '✓' : ICONS.MISSION, uiText('chip', { fontSize: done && !claimed ? '20px' : '16px' })).setOrigin(0.5))
    add(this.add.text(x + 56, y + 18, mission.title, uiText('cardTitle', { fontSize: '16px', wordWrap: { width: w - 158 } })).setOrigin(0, 0.5))
    add(this.add.text(x + 56, y + h - 17, `${value}/${mission.target}  ${this._missionReward(mission)}pt`, uiText('cardMeta', { fontSize: '14px' })).setOrigin(0, 0.5))

    const label = claimed ? '済' : done ? '受取' : '進行中'
    const bx = x + w - 48
    const btn = add(this.add.graphics())
    btn.fillStyle(claimed ? 0xdce3ea : done ? 0xffd900 : 0xffffff, 1)
    btn.lineStyle(2, 0x1a2a3a, done && !claimed ? 0.95 : 0.30)
    btn.fillRoundedRect(bx - 33, y + h / 2 - 15, 66, 30, 10)
    btn.strokeRoundedRect(bx - 33, y + h / 2 - 15, 66, 30, 10)
    add(this.add.text(bx, y + h / 2, label, uiText('button', { fontSize: '15px', color: claimed ? '#7b8794' : '#1a2a3a' })).setOrigin(0.5))
    if (done && !claimed) {
      add(this.add.rectangle(bx, y + h / 2, 74, 38, 0x000000, 0).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (claimMissionReward(mission.id)) this.scene.restart({ tab: this._tab, sheetIndex: this._sheetIndex, sheetScroll: this._sheetScroll, listScroll: this._listScroll })
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
    g.fillStyle(0xffffff, 0.94)
    g.lineStyle(2, 0x1a2a3a, 0.28)
    g.fillRoundedRect(x, y, w, 42, 14)
    g.strokeRoundedRect(x, y, w, 42, 14)
    this.add.text(x + 14, y + 13, `進行度 ${completed}/${sheet.tasks.length}`, uiText('chip')).setOrigin(0, 0.5).setDepth(6)
    this.add.text(x + 14, y + 29, totalClaimable > 0 ? `未受取 ${totalClaimable}件` : '未受取なし', uiText('micro', { fontSize: '13px', color: totalClaimable > 0 ? '#d56f00' : '#6d7f8e' })).setOrigin(0, 0.5).setDepth(6)

    const bx = x + w - 118
    const by = y + 7
    const btn = this.add.graphics().setDepth(6)
    btn.fillStyle(totalClaimable > 0 ? 0xffd900 : 0xdce3ea, 1)
    btn.lineStyle(2.5, 0x1a2a3a, totalClaimable > 0 ? 0.95 : 0.35)
    btn.fillRoundedRect(bx, by, 104, 28, 11)
    btn.strokeRoundedRect(bx, by, 104, 28, 11)
    this.add.text(bx + 52, by + 14, '一括受取', uiText('button', { fontSize: '15px', color: totalClaimable > 0 ? '#1a2a3a' : '#7b8794' })).setOrigin(0.5).setDepth(7)
    if (totalClaimable > 0) {
      this.add.rectangle(bx + 52, by + 14, 112, 36, 0x000000, 0).setDepth(8).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        claimAllMissionRewards(sheet.id)
        this.scene.restart({ tab: this._tab, sheetIndex: this._sheetIndex, sheetScroll: this._sheetScroll, listScroll: this._listScroll })
      })
    }
  }

  _sheetBanners(W, H) {
    const sheets = this._activeSheets()
    const y = H - 158
    this.add.text(24, y - 18, 'ミッションシート', uiText('cardTitle', { fontSize: '15px' })).setDepth(5)

    const visible = this._tab === 'limited' ? sheets.slice(this._sheetScroll, this._sheetScroll + 3) : sheets.slice(0, 3)
    visible.forEach((sheet, i) => {
      const realIndex = this._tab === 'limited' ? this._sheetScroll + i : i
      this._sheetBanner(22 + i * 118, y, 108, 52, sheet, realIndex)
    })
  }

  _sheetBanner(x, y, w, h, sheet, index) {
    const active = index === this._sheetIndex
    const completed = sheet.tasks.filter(task => Math.min(getMissionProgress()[task.id] ?? 0, task.target) >= task.target).length
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(active ? sheet.color : 0xffffff, active ? 0.92 : 0.94)
    g.lineStyle(active ? 3 : 2, active ? 0x1a2a3a : 0xb7c4cf, 1)
    g.fillRoundedRect(x, y, w, h, 16)
    g.strokeRoundedRect(x, y, w, h, 16)
    this.add.text(x + 10, y + 17, sheet.title, uiText('micro', { fontSize: '13px', color: '#1a3a5a', wordWrap: { width: w - 28 } })).setOrigin(0, 0.5).setDepth(6)
    this.add.text(x + 12, y + 36, `${completed}/${sheet.tasks.length}`, uiText('chip', { fontSize: '15px', color: active ? '#1a3a5a' : '#e07800' })).setOrigin(0, 0.5).setDepth(6)
    this.add.text(x + w - 14, y + 27, ICONS.CHEVRON, uiText('cardTitle', { fontSize: '18px' })).setOrigin(0.5).setDepth(6)
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0).setDepth(7).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.restart({ tab: this._tab, sheetIndex: index, sheetScroll: this._sheetScroll, listScroll: 0 }))
  }

  _missionReward(mission) {
    return Math.round((mission.reward ?? mission.grant?.score ?? 0) * getTownBonuses().missionRewardMod)
  }
}
