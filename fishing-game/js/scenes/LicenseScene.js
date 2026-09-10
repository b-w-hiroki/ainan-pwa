import Phaser from 'phaser'
import { FONT, SHADOW, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import {
  LICENSE_SHEETS,
  claimAllLicenseRewards,
  claimLicenseBonus,
  claimLicenseReward,
  getClaimedLicenseBonuses,
  getClaimedLicenses,
  getLicenseProgress,
} from '../game/progress.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export default class LicenseScene extends Phaser.Scene {
  constructor() { super({ key: 'LicenseScene' }) }

  init(data = {}) { this._sheetIndex = data.sheetIndex ?? this._sheetIndex ?? 0 }

  preload() {
    const bg = ASSETS.backgrounds.townGrowing
    if (bg?.status === 'ready' && !this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
  }

  create() {
    const { width: W, height: H } = this.scale
    this._modal = null
    this._background(W, H)
    this._header(W)
    this._panel(W, H)
    this._sheetBanners(W, H)
    buildFooterNav(this, W, H, 'home')
  }

  _background(W, H) {
    addCoverImage(this, ASSETS.backgrounds.townGrowing.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillGradientStyle(0xfffbef, 0xfffbef, 0xf8fdff, 0xf8fdff, 0.83, 0.83, 0.95, 0.95)
    veil.fillRect(0, 0, W, H)
  }

  _header(W) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x173248, 0.10)
    g.fillRoundedRect(16, 15, W - 32, 68, 20)
    g.fillStyle(0xf8fdff, 0.97)
    g.lineStyle(1.8, 0x9bcfe5, 0.86)
    g.fillRoundedRect(16, 11, W - 32, 68, 20)
    g.strokeRoundedRect(16, 11, W - 32, 68, 20)
    g.fillStyle(0xfff1bd, 0.72)
    g.fillRoundedRect(24, 19, W - 48, 12, 6)

    this.add.text(30, 42, '釣り免許', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '24px', fontWeight: '900', color: UI_COLORS.ink, shadow: SHADOW.subtle,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(30, 65, '3×3の課題を埋めてランクアップ', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: UI_COLORS.inkSoft,
    }).setOrigin(0, 0.5).setDepth(5)
  }

  _panel(W, H) {
    const sheet = LICENSE_SHEETS[this._sheetIndex] ?? LICENSE_SHEETS[0]
    if (!sheet) return
    const progress = getLicenseProgress()
    const claimed = getClaimedLicenses()
    const claimedBonus = getClaimedLicenseBonuses()
    const completed = sheet.tasks.filter(m => progress[m.id]).length
    const claimedCount = sheet.tasks.filter(m => claimed[m.id]).length
    const claimableCount = sheet.tasks.filter(m => progress[m.id] && !claimed[m.id]).length

    const x = 16, y = 94, w = W - 32, h = 562
    const bg = this.add.graphics().setDepth(4)
    bg.fillStyle(0x173248, 0.11)
    bg.fillRoundedRect(x + 3, y + 5, w, h, 24)
    bg.fillStyle(0xf8fdff, 0.985)
    bg.lineStyle(1.8, 0x9bcfe5, 0.88)
    bg.fillRoundedRect(x, y, w, h, 24)
    bg.strokeRoundedRect(x, y, w, h, 24)
    bg.fillStyle(sheet.color, 0.14)
    bg.fillRoundedRect(x + 12, y + 12, w - 24, 62, 18)

    this.add.text(x + 26, y + 31, sheet.title, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '18px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + 26, y + 54, sheet.subtitle, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: UI_COLORS.inkSoft,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + w - 26, y + 32, `${completed}/9`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '20px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(1, 0.5).setDepth(5)
    this.add.text(x + w - 26, y + 55, `受取 ${claimedCount}/9`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: UI_COLORS.inkSoft,
    }).setOrigin(1, 0.5).setDepth(5)

    this._completeRewardCard(x + 18, y + 88, w - 36, 76, sheet, completed, claimedBonus)
    this._progressPanel(x + 18, y + 176, w - 36, sheet, completed, claimedBonus)

    const size = 68, gap = 12
    const startX = (W - (size * 3 + gap * 2)) / 2
    const startY = y + 246
    sheet.tasks.forEach((task, i) => {
      const col = i % 3, row = Math.floor(i / 3)
      this._tile(startX + col * (size + gap), startY + row * (size + gap), size, task, !!progress[task.id], !!claimed[task.id], i, sheet.color)
    })

    this._claimAllBar(x + 18, y + h - 50, w - 36, sheet, claimableCount, completed)
  }

  _tile(x, y, size, item, done, claimed, index, accent) {
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0x173248, 0.07)
    g.fillRoundedRect(x + 2, y + 3, size, size, 16)
    g.fillStyle(claimed ? 0xfffbeb : done ? 0xf0fbf5 : 0xffffff, 1)
    g.lineStyle(1.6, claimed ? 0xe8c254 : done ? 0x71d6a2 : 0xc6d9e2, 0.95)
    g.fillRoundedRect(x, y, size, size, 16)
    g.strokeRoundedRect(x, y, size, size, 16)
    g.fillStyle(claimed ? 0xffd95a : done ? 0x71d6a2 : accent, claimed || done ? 0.22 : 0.13)
    g.fillCircle(x + size / 2, y + 22, 17)

    this.add.text(x + size / 2, y + 22, claimed ? '✓' : done ? '!' : `${index + 1}`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900',
      color: claimed ? UI_COLORS.warning : done ? UI_COLORS.success : UI_COLORS.ink,
    }).setOrigin(0.5).setDepth(6)
    this.add.text(x + size / 2, y + 39, item.title, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '900', color: UI_COLORS.ink,
      wordWrap: { width: size - 8 }, align: 'center',
    }).setOrigin(0.5, 0).setDepth(6)
    this.add.text(x + size / 2, y + size - 7, item.reward, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '900',
      color: claimed ? UI_COLORS.warning : done ? UI_COLORS.success : UI_COLORS.inkSoft,
    }).setOrigin(0.5).setDepth(6)

    this.add.rectangle(x + size / 2, y + size / 2, size, size, 0x000000, 0).setDepth(7).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showDetail(item, done, claimed))
  }

  _completeRewardCard(x, y, w, h, sheet, completed, claimedBonus) {
    const done = completed >= sheet.tasks.length
    const claimed = !!claimedBonus[`${sheet.id}:complete`]
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0x173248, 0.95)
    g.lineStyle(1.8, sheet.color, 0.92)
    g.fillRoundedRect(x, y, w, h, 18)
    g.strokeRoundedRect(x, y, w, h, 18)
    g.fillStyle(sheet.color, 0.20)
    g.fillCircle(x + 39, y + h / 2, 27)
    this.add.text(x + 39, y + h / 2, done ? '★' : `${completed}`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '19px', fontWeight: '900', color: done ? '#ffd95a' : '#ffffff',
    }).setOrigin(0.5).setDepth(6)
    this.add.text(x + 77, y + 22, 'シート全達成報酬', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: '#cfefff',
    }).setOrigin(0, 0.5).setDepth(6)
    this.add.text(x + 77, y + 45, sheet.completeReward.text, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '17px', fontWeight: '900', color: '#ffffff', shadow: SHADOW.subtle,
    }).setOrigin(0, 0.5).setDepth(6)
    this.add.text(x + 77, y + 63, claimed ? '受取済み' : done ? '受取できます' : `あと ${sheet.tasks.length - completed} 件`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: done ? '#91edb7' : '#ffd982',
    }).setOrigin(0, 0.5).setDepth(6)

    if (done && !claimed) {
      const bx = x + w - 68, by = y + h / 2
      const btn = this.add.graphics().setDepth(6)
      btn.fillStyle(0xffd95a, 1)
      btn.fillRoundedRect(bx - 26, by - 15, 52, 30, 10)
      this.add.text(bx, by, '受取', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.ink,
      }).setOrigin(0.5).setDepth(7)
      this.add.rectangle(bx, by, 60, 38, 0x000000, 0).setDepth(8).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (claimLicenseBonus(sheet.id, 'complete')) this.scene.restart({ sheetIndex: this._sheetIndex })
      })
    }
  }

  _progressPanel(x, y, w, sheet, completed, claimedBonus) {
    const h = 54
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0xffffff, 0.94)
    g.lineStyle(1.3, 0x9bcfe5, 0.65)
    g.fillRoundedRect(x, y, w, h, 15)
    g.strokeRoundedRect(x, y, w, h, 15)
    const barX = x + 14, barY = y + 22, barW = w - 28
    g.fillStyle(0xe5eef2, 1)
    g.fillRoundedRect(barX, barY, barW, 10, 5)
    g.fillStyle(sheet.color, 1)
    g.fillRoundedRect(barX, barY, barW * Math.min(1, completed / sheet.tasks.length), 10, 5)

    ;(sheet.milestoneRewards ?? []).forEach(reward => {
      const px = barX + barW * (reward.count / sheet.tasks.length)
      const key = `${sheet.id}:${reward.id}`
      const done = completed >= reward.count
      const claimed = !!claimedBonus[key]
      const marker = this.add.graphics().setDepth(7)
      marker.fillStyle(claimed ? 0xffd95a : done ? 0x71d6a2 : 0xffffff, 1)
      marker.lineStyle(1.3, done ? 0x173248 : 0x9aa9b5, 0.8)
      marker.fillCircle(px, barY + 5, 9)
      marker.strokeCircle(px, barY + 5, 9)
      this.add.text(px, barY + 5, claimed ? '✓' : `${reward.count}`, {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '7px', fontWeight: '900', color: UI_COLORS.ink,
      }).setOrigin(0.5).setDepth(8)
      this.add.text(px, y + 45, reward.text, {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '7px', fontWeight: '900', color: done ? UI_COLORS.warning : UI_COLORS.muted,
      }).setOrigin(0.5).setDepth(8)
      if (done && !claimed) {
        this.add.rectangle(px, barY + 5, 44, 32, 0x000000, 0).setDepth(9).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          if (claimLicenseBonus(sheet.id, reward.id)) this.scene.restart({ sheetIndex: this._sheetIndex })
        })
      }
    })
  }

  _claimAllBar(x, y, w, sheet, claimableCount, completed) {
    const claimedBonus = getClaimedLicenseBonuses()
    const milestoneCount = (sheet.milestoneRewards ?? []).filter(reward => completed >= reward.count && !claimedBonus[`${sheet.id}:${reward.id}`]).length
    const completeCount = completed >= sheet.tasks.length && !claimedBonus[`${sheet.id}:complete`] ? 1 : 0
    const totalClaimable = claimableCount + milestoneCount + completeCount
    const active = totalClaimable > 0
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0xffffff, 0.95)
    g.lineStyle(1.4, 0x9bcfe5, 0.72)
    g.fillRoundedRect(x, y, w, 42, 14)
    g.strokeRoundedRect(x, y, w, 42, 14)
    this.add.text(x + 14, y + 13, `達成 ${completed}/${sheet.tasks.length}`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(6)
    this.add.text(x + 14, y + 29, active ? `未受取 ${totalClaimable}件` : '受取待ちはありません', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '800', color: active ? UI_COLORS.warning : UI_COLORS.inkSoft,
    }).setOrigin(0, 0.5).setDepth(6)

    const bx = x + w - 112, by = y + 7
    const btn = this.add.graphics().setDepth(6)
    btn.fillStyle(active ? 0xffd95a : 0xe4ecef, 1)
    btn.lineStyle(1.6, 0x173248, active ? 0.75 : 0.18)
    btn.fillRoundedRect(bx, by, 98, 28, 10)
    btn.strokeRoundedRect(bx, by, 98, 28, 10)
    this.add.text(bx + 49, by + 14, '一括受取', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: active ? UI_COLORS.ink : UI_COLORS.muted,
    }).setOrigin(0.5).setDepth(7)
    if (active) this.add.rectangle(bx + 49, by + 14, 106, 36, 0x000000, 0).setDepth(8).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      claimAllLicenseRewards(sheet.id)
      this.scene.restart({ sheetIndex: this._sheetIndex })
    })
  }

  _sheetBanners(W, H) {
    const y = H - 158
    this.add.text(24, y - 18, '免許シート', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.ink,
    }).setDepth(5)
    LICENSE_SHEETS.slice(0, 3).forEach((sheet, i) => this._sheetBanner(22 + i * 118, y, 108, 52, sheet, i))
  }

  _sheetBanner(x, y, w, h, sheet, index) {
    const active = index === this._sheetIndex
    const progress = getLicenseProgress()
    const done = sheet.tasks.filter(task => progress[task.id]).length
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0x173248, active ? 0.09 : 0.04)
    g.fillRoundedRect(x + 1, y + 3, w, h, 15)
    g.fillStyle(active ? sheet.color : 0xffffff, active ? 0.18 : 0.94)
    g.lineStyle(active ? 2 : 1.3, active ? sheet.color : 0xb7cbd5, 0.9)
    g.fillRoundedRect(x, y, w, h, 15)
    g.strokeRoundedRect(x, y, w, h, 15)
    this.add.text(x + 10, y + 16, sheet.title, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(6)
    this.add.text(x + 10, y + 37, `${done}/9`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: active ? UI_COLORS.ink : UI_COLORS.warning,
    }).setOrigin(0, 0.5).setDepth(6)
    this.add.text(x + w - 15, y + 27, '›', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '18px', fontWeight: '900', color: UI_COLORS.oceanDeep,
    }).setOrigin(0.5).setDepth(6)
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0).setDepth(7).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.restart({ sheetIndex: index }))
  }

  _showDetail(item, done, claimed) {
    const { width: W, height: H } = this.scale
    this._modal?.destroy(true)
    const items = []
    items.push(this.add.rectangle(W / 2, H / 2, W, H, 0x173248, 0.44).setInteractive().on('pointerdown', () => this._modal?.destroy(true)))
    const x = 36, y = 226, w = W - 72, h = 272
    const bg = this.add.graphics()
    bg.fillStyle(0x173248, 0.13)
    bg.fillRoundedRect(x + 3, y + 5, w, h, 22)
    bg.fillStyle(0xf8fdff, 0.99)
    bg.lineStyle(2, 0x9bcfe5, 0.88)
    bg.fillRoundedRect(x, y, w, h, 22)
    bg.strokeRoundedRect(x, y, w, h, 22)
    items.push(bg)

    const status = claimed ? '報酬受取済み' : done ? '達成済み' : '挑戦中'
    items.push(this.add.text(W / 2, y + 42, status, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: claimed ? UI_COLORS.warning : done ? UI_COLORS.success : UI_COLORS.oceanDeep,
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 83, item.title, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '21px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 121, item.desc, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '800', color: UI_COLORS.inkSoft,
      wordWrap: { width: w - 48 }, align: 'center',
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 166, `報酬 ${item.reward}`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.warning,
    }).setOrigin(0.5))

    if (done && !claimed) {
      const btn = this.add.graphics()
      btn.fillStyle(0xffd95a, 1)
      btn.lineStyle(1.8, 0x173248, 0.78)
      btn.fillRoundedRect(W / 2 - 72, y + 190, 144, 40, 13)
      btn.strokeRoundedRect(W / 2 - 72, y + 190, 144, 40, 13)
      items.push(btn)
      items.push(this.add.text(W / 2, y + 210, '報酬を受け取る', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.ink,
      }).setOrigin(0.5))
      items.push(this.add.rectangle(W / 2, y + 210, 154, 48, 0x000000, 0).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        claimLicenseReward(item.id)
        this.scene.restart({ sheetIndex: this._sheetIndex })
      }))
    }

    items.push(this.add.text(W / 2, y + h - 22, '閉じる', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.inkSoft,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this._modal?.destroy(true)))
    this._modal = this.add.container(0, 16, items).setDepth(100).setAlpha(0)
    this.tweens.add({ targets: this._modal, y: 0, alpha: 1, duration: 160, ease: 'Sine.easeOut' })
  }
}
