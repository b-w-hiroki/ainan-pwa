import Phaser from 'phaser'
import { FONT, SHADOW } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { ICONS } from '../config/icons.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { LICENSE_META, claimLicenseReward, getClaimedLicenses, getLicenseProgress } from '../game/progress.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export default class LicenseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LicenseScene' })
  }

  preload() {
    const bg = ASSETS.backgrounds.homeBase
    if (!this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
  }

  create() {
    const { width: W, height: H } = this.scale
    this._background(W, H)
    this._header(W)
    this._panel(W)
    this._back()
    buildFooterNav(this, W, H, 'home')
  }

  _background(W, H) {
    addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillStyle(0xfff8e6, 0.86)
    veil.fillRect(0, 0, W, H)
  }

  _header(W) {
    this.add.text(W / 2, 42, `${ICONS.LICENSE} 釣り免許`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '30px', fontWeight: '900',
      color: '#1a3a5a', shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2, 78, '9つの課題で遊び方を覚えよう', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900',
      color: '#4a7090',
    }).setOrigin(0.5).setDepth(5)
  }

  _panel(W) {
    const progress = getLicenseProgress()
    const claimed = getClaimedLicenses()
    const completed = LICENSE_META.filter(m => progress[m.id]).length
    const claimedCount = LICENSE_META.filter(m => claimed[m.id]).length

    const x = 20
    const y = 116
    const w = W - 40
    const h = 520
    const bg = this.add.graphics().setDepth(4)
    bg.fillStyle(0xffffff, 0.96)
    bg.lineStyle(3, 0x1a2a3a, 0.9)
    bg.fillRoundedRect(x, y, w, h, 24)
    bg.strokeRoundedRect(x, y, w, h, 24)
    bg.fillStyle(0xffd900, 0.22)
    bg.fillRoundedRect(x + 18, y + 18, w - 36, 54, 18)

    this.add.text(W / 2, y + 38, `進行度 ${completed}/9`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '20px', fontWeight: '900',
      color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2, y + 60, completed >= 9 ? `免許皆伝！ 報酬 ${claimedCount}/9` : `報酬 ${claimedCount}/9  クリアすると受け取れる`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '900',
      color: '#e07800',
    }).setOrigin(0.5).setDepth(5)

    const size = 92
    const gap = 18
    const startX = x + 27
    const startY = y + 96
    LICENSE_META.forEach((m, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      this._tile(startX + col * (size + gap), startY + row * (size + gap), size, m, !!progress[m.id], !!claimed[m.id], i)
    })
  }

  _tile(x, y, size, item, done, claimed, index) {
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0x000000, 0.12)
    g.fillRoundedRect(x + 3, y + 4, size, size, 18)
    g.fillStyle(claimed ? 0xfff4ce : done ? 0xe3f8ee : 0xf6f7fb, 1)
    g.lineStyle(2.5, claimed ? 0xffb000 : done ? 0x00aa66 : 0xb7c4cf, 1)
    g.fillRoundedRect(x, y, size, size, 18)
    g.strokeRoundedRect(x, y, size, size, 18)
    g.fillStyle(claimed ? 0xffb000 : done ? 0x00aa66 : 0xffffff, 0.9)
    g.fillCircle(x + size / 2, y + 28, 21)

    this.add.text(x + size / 2, y + 28, claimed ? ICONS.GIFT : done ? '✓' : `${index + 1}`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: claimed ? '17px' : done ? '22px' : '15px', fontWeight: '900',
      color: done ? '#ffffff' : '#1a3a5a',
    }).setOrigin(0.5).setDepth(6)
    this.add.text(x + size / 2, y + 55, item.title, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '10px', fontWeight: '900',
      color: '#1a3a5a',
      wordWrap: { width: size - 10 },
      align: 'center',
    }).setOrigin(0.5, 0).setDepth(6)
    this.add.text(x + size / 2, y + size - 10, item.reward, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '9px', fontWeight: '900',
      color: claimed ? '#cc7700' : done ? '#00aa66' : '#e07800',
    }).setOrigin(0.5).setDepth(6)

    this.add.rectangle(x + size / 2, y + size / 2, size, size, 0x000000, 0)
      .setDepth(7)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showDetail(item, done, claimed))
  }

  _showDetail(item, done, claimed) {
    const { width: W, height: H } = this.scale
    this._modal?.destroy(true)
    const items = []
    items.push(this.add.rectangle(W / 2, H / 2, W, H, 0x1a2a3a, 0.42)
      .setInteractive()
      .on('pointerdown', () => this._modal?.destroy(true)))
    const x = 36
    const y = 240
    const w = W - 72
    const h = 252
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
    items.push(this.add.text(W / 2, y + 86, item.title, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '23px', fontWeight: '900',
      color: '#1a3a5a',
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 126, item.desc, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900',
      color: '#4a7090',
      wordWrap: { width: w - 48 },
      align: 'center',
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 162, `報酬: ${item.reward}`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900',
      color: '#e07800',
    }).setOrigin(0.5))
    if (done && !claimed) {
      items.push(this.add.text(W / 2, y + 202, '報酬を受け取る', {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '14px', fontWeight: '900',
        color: '#1a3a5a',
        backgroundColor: '#ffd900',
        padding: { x: 22, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        claimLicenseReward(item.id)
        this.scene.restart()
      }))
    }
    items.push(this.add.text(W / 2, y + h - 30, '閉じる', {
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
