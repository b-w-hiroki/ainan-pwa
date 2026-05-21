import Phaser from 'phaser'
import { FONT, SHADOW } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { ICONS } from '../config/icons.js'
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
  constructor() {
    super({ key: 'LicenseScene' })
  }

  init(data = {}) {
    this._sheetIndex = data.sheetIndex ?? this._sheetIndex ?? 0
  }

  preload() {
    const bg = ASSETS.backgrounds.homeBase
    if (!this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
  }

  create() {
    const { width: W, height: H } = this.scale
    this._modal = null
    this._background(W, H)
    this._header(W)
    this._panel(W, H)
    this._sheetBanners(W, H)
    this._back()
    buildFooterNav(this, W, H, 'home')
  }

  _background(W, H) {
    addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillStyle(0xfff8e6, 0.88)
    veil.fillRect(0, 0, W, H)
  }

  _header(W) {
    this.add.text(W / 2, 38, `${ICONS.LICENSE} 釣り免許`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '28px', fontWeight: '900',
      color: '#1a3a5a', shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2, 70, '3×3の課題を達成して報酬を集めよう', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '900',
      color: '#4a7090',
    }).setOrigin(0.5).setDepth(5)
  }

  _panel(W, H) {
    const sheet = LICENSE_SHEETS[this._sheetIndex] ?? LICENSE_SHEETS[0]
    const progress = getLicenseProgress()
    const claimed = getClaimedLicenses()
    const claimedBonus = getClaimedLicenseBonuses()
    const completed = sheet.tasks.filter(m => progress[m.id]).length
    const claimedCount = sheet.tasks.filter(m => claimed[m.id]).length
    const claimableCount = sheet.tasks.filter(m => progress[m.id] && !claimed[m.id]).length

    const x = 18
    const y = 94
    const w = W - 36
    const h = 526
    const bg = this.add.graphics().setDepth(4)
    bg.fillStyle(0xffffff, 0.97)
    bg.lineStyle(3, 0x1a2a3a, 0.9)
    bg.fillRoundedRect(x, y, w, h, 24)
    bg.strokeRoundedRect(x, y, w, h, 24)
    bg.fillStyle(sheet.color, 0.22)
    bg.fillRoundedRect(x + 16, y + 16, w - 32, 66, 18)

    this.add.text(W / 2, y + 34, sheet.title, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '20px', fontWeight: '900',
      color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2, y + 58, `${sheet.subtitle}  進行度 ${completed}/9  報酬 ${claimedCount}/9`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '11px', fontWeight: '900',
      color: '#e07800',
    }).setOrigin(0.5).setDepth(5)

    this._completeRewardCard(x + 18, y + 96, w - 36, 98, sheet, completed, claimedBonus)

    const size = 74
    const gap = 13
    const startX = (W - (size * 3 + gap * 2)) / 2
    const startY = y + 216
    sheet.tasks.forEach((m, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      this._tile(startX + col * (size + gap), startY + row * (size + gap), size, m, !!progress[m.id], !!claimed[m.id], i, sheet.color)
    })

    this._claimAllBar(x + 18, y + h - 58, w - 36, sheet, claimableCount, completed)
  }

  _tile(x, y, size, item, done, claimed, index, accent) {
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0x000000, 0.10)
    g.fillRoundedRect(x + 3, y + 4, size, size, 16)
    g.fillStyle(claimed ? 0xfff4ce : done ? 0xe3f8ee : 0xf6f7fb, 1)
    g.lineStyle(2.5, claimed ? 0xffb000 : done ? 0x00aa66 : 0xb7c4cf, 1)
    g.fillRoundedRect(x, y, size, size, 16)
    g.strokeRoundedRect(x, y, size, size, 16)
    g.fillStyle(claimed ? 0xffb000 : done ? 0x00aa66 : accent, done || claimed ? 1 : 0.20)
    g.fillCircle(x + size / 2, y + 23, 18)

    this.add.text(x + size / 2, y + 23, claimed ? ICONS.GIFT : done ? '✓' : `${index + 1}`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: claimed ? '15px' : done ? '20px' : '13px', fontWeight: '900',
      color: done || claimed ? '#ffffff' : '#1a3a5a',
    }).setOrigin(0.5).setDepth(6)
    this.add.text(x + size / 2, y + 45, item.title, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '9px', fontWeight: '900',
      color: '#1a3a5a',
      wordWrap: { width: size - 8 },
      align: 'center',
    }).setOrigin(0.5, 0).setDepth(6)
    this.add.text(x + size / 2, y + size - 8, item.reward, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '8px', fontWeight: '900',
      color: claimed ? '#cc7700' : done ? '#00aa66' : '#e07800',
    }).setOrigin(0.5).setDepth(6)

    this.add.rectangle(x + size / 2, y + size / 2, size, size, 0x000000, 0)
      .setDepth(7)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showDetail(item, done, claimed))
  }

  _completeRewardCard(x, y, w, h, sheet, completed, claimedBonus) {
    const completeDone = completed >= sheet.tasks.length
    const completeKey = `${sheet.id}:complete`
    const completeClaimed = !!claimedBonus[completeKey]
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0x2b2015, 0.92)
    g.lineStyle(2.5, sheet.color, 0.95)
    g.fillRoundedRect(x, y, w, h, 18)
    g.strokeRoundedRect(x, y, w, h, 18)
    g.fillStyle(sheet.color, 0.25)
    g.fillCircle(x + 54, y + 50, 36)
    g.fillStyle(0xffffff, 0.12)
    g.fillCircle(x + 75, y + 26, 12)
    g.fillCircle(x + 28, y + 74, 9)

    this.add.text(x + 54, y + 50, ICONS.GIFT, {
      fontSize: '36px', resolution: TEXT_RES,
    }).setOrigin(0.5).setDepth(6)
    this.add.text(x + 104, y + 25, 'シート全達成報酬', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900',
      color: '#ffe7a3',
    }).setOrigin(0, 0.5).setDepth(6)
    this.add.text(x + 104, y + 53, sheet.completeReward.text, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '25px', fontWeight: '900',
      color: '#ffffff', shadow: SHADOW.medium,
    }).setOrigin(0, 0.5).setDepth(6)
    this.add.text(x + 104, y + 78, completeClaimed ? '受取済み' : `あと ${Math.max(0, sheet.tasks.length - completed)} 件`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '900',
      color: completeDone ? '#8ff0aa' : '#ffd980',
    }).setOrigin(0, 0.5).setDepth(6)

    const label = completeClaimed ? '済' : completeDone ? '受取' : '未達成'
    const bx = x + w - 78
    const by = y + 60
    const active = completeDone && !completeClaimed
    const btn = this.add.graphics().setDepth(6)
    btn.fillStyle(active ? 0xffd900 : 0x8b8f96, 1)
    btn.lineStyle(2, 0xffffff, 0.75)
    btn.fillRoundedRect(bx, by, 58, 26, 10)
    btn.strokeRoundedRect(bx, by, 58, 26, 10)
    this.add.text(bx + 29, by + 13, label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '11px', fontWeight: '900',
      color: active ? '#1a2a3a' : '#ffffff',
    }).setOrigin(0.5).setDepth(7)
    if (active) {
      this.add.rectangle(bx + 29, by + 13, 66, 34, 0x000000, 0)
        .setDepth(8)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (claimLicenseBonus(sheet.id, 'complete')) this.scene.restart({ sheetIndex: this._sheetIndex })
        })
    }
  }

  _claimAllBar(x, y, w, sheet, claimableCount, completed) {
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0xffffff, 0.94)
    g.lineStyle(2, 0x1a2a3a, 0.28)
    g.fillRoundedRect(x, y, w, 42, 14)
    g.strokeRoundedRect(x, y, w, 42, 14)
    this.add.text(x + 14, y + 13, `進行度 ${completed}/${sheet.tasks.length}`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0, 0.5).setDepth(6)
    this.add.text(x + 14, y + 29, claimableCount > 0 ? `未受取 ${claimableCount}件` : '未受取なし', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '10px', fontWeight: '900',
      color: claimableCount > 0 ? '#e07800' : '#7b8794',
    }).setOrigin(0, 0.5).setDepth(6)

    const completeClaimed = !!getClaimedLicenseBonuses()[`${sheet.id}:complete`]
    const active = claimableCount > 0 || (completed >= sheet.tasks.length && !completeClaimed)
    const bx = x + w - 118
    const by = y + 7
    const btn = this.add.graphics().setDepth(6)
    btn.fillStyle(active ? 0xffd900 : 0xdce3ea, 1)
    btn.lineStyle(2.5, 0x1a2a3a, active ? 0.95 : 0.35)
    btn.fillRoundedRect(bx, by, 104, 28, 11)
    btn.strokeRoundedRect(bx, by, 104, 28, 11)
    this.add.text(bx + 52, by + 14, '一括受取', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '900',
      color: active ? '#1a2a3a' : '#7b8794',
    }).setOrigin(0.5).setDepth(7)
    if (active) {
      this.add.rectangle(bx + 52, by + 14, 112, 36, 0x000000, 0)
        .setDepth(8)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          claimAllLicenseRewards(sheet.id)
          this.scene.restart({ sheetIndex: this._sheetIndex })
        })
    }
  }

  _sheetBanners(W, H) {
    const y = H - 174
    this.add.text(24, y - 18, '免許シート', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#1a3a5a',
    }).setDepth(5)
    LICENSE_SHEETS.forEach((sheet, i) => {
      const x = 22 + i * 118
      this._sheetBanner(x, y, 108, 52, sheet, i)
    })
  }

  _sheetBanner(x, y, w, h, sheet, index) {
    const active = index === this._sheetIndex
    const progress = getLicenseProgress()
    const done = sheet.tasks.filter(task => progress[task.id]).length
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(active ? sheet.color : 0xffffff, active ? 0.92 : 0.94)
    g.lineStyle(active ? 3 : 2, active ? 0x1a2a3a : 0xb7c4cf, 1)
    g.fillRoundedRect(x, y, w, h, 16)
    g.strokeRoundedRect(x, y, w, h, 16)
    this.add.text(x + 12, y + 17, sheet.title, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '11px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0, 0.5).setDepth(6)
    this.add.text(x + 12, y + 36, `${done}/9`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '900', color: active ? '#1a3a5a' : '#e07800',
    }).setOrigin(0, 0.5).setDepth(6)
    this.add.text(x + w - 14, y + 27, ICONS.CHEVRON, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '18px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(6)
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0)
      .setDepth(7)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.restart({ sheetIndex: index }))
  }

  _showDetail(item, done, claimed) {
    const { width: W, height: H } = this.scale
    this._modal?.destroy(true)
    const items = []
    items.push(this.add.rectangle(W / 2, H / 2, W, H, 0x1a2a3a, 0.42)
      .setInteractive()
      .on('pointerdown', () => this._modal?.destroy(true)))
    const x = 36
    const y = 232
    const w = W - 72
    const h = 266
    const bg = this.add.graphics()
    bg.fillStyle(0xffffff, 0.98)
    bg.lineStyle(3, 0x1a2a3a, 1)
    bg.fillRoundedRect(x, y, w, h, 22)
    bg.strokeRoundedRect(x, y, w, h, 22)
    items.push(bg)
    const status = claimed ? '報酬受け取り済み' : done ? '達成済み' : '挑戦中'
    items.push(this.add.text(W / 2, y + 48, status, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '15px', fontWeight: '900',
      color: claimed ? '#cc7700' : done ? '#00aa66' : '#e07800',
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 88, item.title, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '23px', fontWeight: '900',
      color: '#1a3a5a',
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 130, item.desc, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900',
      color: '#4a7090',
      wordWrap: { width: w - 48 },
      align: 'center',
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 170, `報酬: ${item.reward}`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900',
      color: '#e07800',
    }).setOrigin(0.5))
    if (done && !claimed) {
      items.push(this.add.text(W / 2, y + 212, '報酬を受け取る', {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '14px', fontWeight: '900',
        color: '#1a3a5a',
        backgroundColor: '#ffd900',
        padding: { x: 22, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        claimLicenseReward(item.id)
        this.scene.restart({ sheetIndex: this._sheetIndex })
      }))
    }
    items.push(this.add.text(W / 2, y + h - 28, '閉じる', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900',
      color: '#4a7090',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this._modal?.destroy(true)))
    this._modal = this.add.container(0, 16, items).setDepth(100).setAlpha(0)
    this.tweens.add({ targets: this._modal, y: 0, alpha: 1, duration: 160, ease: 'Sine.easeOut' })
  }

  _back() {
    this.add.text(16, 16, `${ICONS.BACK} ホーム`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '15px', fontWeight: '900',
      color: '#1a3a5a',
      backgroundColor: '#ffffff',
      padding: { x: 14, y: 9 },
    }).setDepth(20).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('HomeScene'))
  }
}
