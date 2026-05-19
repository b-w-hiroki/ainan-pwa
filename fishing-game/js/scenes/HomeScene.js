import { FONT, SHADOW } from '../config/fontStyles.js'
import { ICONS } from '../config/icons.js'
import { ASSETS } from '../config/assetManifest.js'
import { Button } from '../ui/Button.js'
import { addCoverImage } from '../utils/imageLayout.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export default class HomeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HomeScene' })
  }

  preload() {
    const bg = ASSETS.backgrounds.homeBase
    if (!this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
  }

  create() {
    const { width: W, height: H } = this.scale

    this._buildBackground(W, H)
    this._buildHeader(W, H)
    this._buildTitle(W, H)
    this._buildMainCTA(W, H)
    this._buildFooter(W, H)
  }

  _buildBackground(W, H) {
    const artBg = addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)

    if (!artBg) {
      const bg = this.add.graphics().setDepth(0)
      bg.fillGradientStyle(0xfff0bf, 0xfff0bf, 0xbfe8f7, 0xbfe8f7, 1)
      bg.fillRect(0, 0, W, H * 0.50)
      bg.fillGradientStyle(0x8bd3e8, 0x8bd3e8, 0x4ba9cc, 0x4ba9cc, 1)
      bg.fillRect(0, H * 0.50, W, H * 0.22)
      bg.fillGradientStyle(0xe8c982, 0xe8c982, 0xbf8b45, 0xbf8b45, 1)
      bg.fillRect(0, H * 0.72, W, H * 0.28)
    }

    const veil = this.add.graphics().setDepth(1)
    veil.fillGradientStyle(0x1a2a3a, 0x1a2a3a, 0x1a2a3a, 0x1a2a3a, 0.24, 0.24, 0.04, 0.04)
    veil.fillRect(0, 0, W, H * 0.24)
    veil.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.16, 0.16, 0.40, 0.40)
    veil.fillRect(0, H * 0.22, W, H * 0.58)
    veil.fillGradientStyle(0x1a2a3a, 0x1a2a3a, 0x1a2a3a, 0x1a2a3a, 0.0, 0.0, 0.22, 0.22)
    veil.fillRect(0, H * 0.74, W, H * 0.26)
  }

  _buildHeader(W, H) {
    const totalScore = parseInt(localStorage.getItem('ainan_score') ?? '0', 10)
    const catches = JSON.parse(localStorage.getItem('ainan_catches') ?? '[]')

    const bar = this.add.graphics().setDepth(20)
    bar.fillStyle(0xffffff, 0.78)
    bar.lineStyle(2, 0xffffff, 0.65)
    bar.fillRoundedRect(10, 10, W - 20, 56, 18)
    bar.strokeRoundedRect(10, 10, W - 20, 56, 18)

    const profile = this.add.graphics().setDepth(21)
    profile.fillStyle(0xffffff, 0.95)
    profile.lineStyle(2.5, 0x1a2a3a, 1)
    profile.fillRoundedRect(18, 16, 148, 44, 16)
    profile.strokeRoundedRect(18, 16, 148, 44, 16)
    profile.fillStyle(0xffd900, 1)
    profile.fillCircle(42, 38, 15)

    this.add.text(42, 38, ICONS.ROD, { fontSize: '18px', resolution: TEXT_RES })
      .setOrigin(0.5)
      .setDepth(22)
    this.add.text(64, 31, '港の釣り人', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0, 0.5).setDepth(22)
    this.add.text(64, 46, 'RANK 01', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '10px', fontWeight: '900', color: '#e07800',
    }).setOrigin(0, 0.5).setDepth(22)

    this._buildResourceChip(W - 116, 19, ICONS.SCORE, this._shortNum(totalScore))
    this._buildResourceChip(W - 62, 19, ICONS.FISH, this._shortNum(catches.length))
  }

  _buildResourceChip(x, y, icon, value) {
    const g = this.add.graphics().setDepth(21)
    g.fillStyle(0xffffff, 0.95)
    g.lineStyle(2, 0x1a2a3a, 0.9)
    g.fillRoundedRect(x, y, 48, 36, 13)
    g.strokeRoundedRect(x, y, 48, 36, 13)
    this.add.text(x + 15, y + 18, icon, { fontSize: '14px', resolution: TEXT_RES })
      .setOrigin(0.5).setDepth(22)
    this.add.text(x + 32, y + 18, value, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(22)
  }

  _buildTitle(W, H) {
    const logoGroup = this.add.container(W / 2, H * 0.19).setDepth(10)

    const logo = this.add.text(0, 0, '釣りゲーム', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '37px', fontWeight: '900',
      color: '#ffffff',
      shadow: SHADOW.strong,
    }).setOrigin(0.5)

    const kariBg = this.add.graphics()
    kariBg.fillStyle(0xff6a3d, 1)
    kariBg.fillRoundedRect(-25, -46, 50, 22, 7)
    const kariTxt = this.add.text(0, -35, '（仮）', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5)

    logoGroup.add([logo, kariBg, kariTxt])

    const tagBg = this.add.graphics().setDepth(9)
    tagBg.fillStyle(0x123a54, 0.32)
    tagBg.fillRoundedRect(W / 2 - 118, H * 0.255 - 15, 236, 30, 15)
    this.add.text(W / 2, H * 0.255, '釣って、集めて、港をにぎやかに', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900',
      color: '#ffffff', shadow: SHADOW.medium,
    }).setOrigin(0.5).setDepth(10)
  }

  _buildMainCTA(W, H) {
    new Button(this, {
      x: W / 2, y: H * 0.42,
      w: 306, h: 66,
      label: '釣りに行く',
      icon: ICONS.ROD,
      variant: 'primary',
      fontSize: 24,
      depth: 10,
      onClick: () => this.scene.start('MapScene'),
    })

    const hintBg = this.add.graphics().setDepth(9)
    hintBg.fillStyle(0xffffff, 0.88)
    hintBg.lineStyle(1.5, 0x1a2a3a, 0.18)
    hintBg.fillRoundedRect(W / 2 - 120, H * 0.42 + 38, 240, 27, 14)
    hintBg.strokeRoundedRect(W / 2 - 120, H * 0.42 + 38, 240, 27, 14)
    this.add.text(W / 2, H * 0.42 + 52, '釣り場を選んで出発', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(10)
  }

  _buildFooter(W, H) {
    const y = H - 60
    const bar = this.add.graphics().setDepth(30)
    bar.fillStyle(0xffffff, 0.96)
    bar.lineStyle(2.5, 0x1a2a3a, 1)
    bar.fillRoundedRect(12, y, W - 24, 50, 18)
    bar.strokeRoundedRect(12, y, W - 24, 50, 18)

    const tabs = [
      { x: W * 0.16, icon: '⌂', label: 'ホーム', active: true, onTap: null },
      { x: W * 0.34, icon: ICONS.BOOK, label: '図鑑', active: false, onTap: null },
      { x: W * 0.50, icon: ICONS.ROD, label: '釣り', active: true, primary: true, onTap: () => this.scene.start('MapScene') },
      { x: W * 0.66, icon: ICONS.GEAR, label: '強化', active: false, onTap: null },
      { x: W * 0.84, icon: ICONS.GIFT, label: '交換', active: false, onTap: null },
    ]

    tabs.forEach(tab => this._footerTab(tab.x, y + 25, tab))
  }

  _footerTab(x, y, tab) {
    if (tab.primary) {
      const g = this.add.graphics().setDepth(31)
      g.fillStyle(0xffd900, 1)
      g.lineStyle(3, 0x1a2a3a, 1)
      g.fillCircle(x, y - 8, 30)
      g.strokeCircle(x, y - 8, 30)
      this.add.rectangle(x, y - 8, 60, 60, 0x000000, 0)
        .setDepth(34)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', tab.onTap)
    } else {
      this.add.rectangle(x, y, 52, 44, 0x000000, 0)
        .setDepth(34)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this._toast(`${tab.label}は今後追加予定です`))
    }

    const iconY = tab.primary ? y - 16 : y - 9
    const labelY = tab.primary ? y + 7 : y + 11
    this.add.text(x, iconY, tab.icon, {
      fontSize: tab.primary ? '23px' : '19px',
      resolution: TEXT_RES,
    }).setOrigin(0.5).setDepth(33)
    this.add.text(x, labelY, tab.label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: tab.primary ? '11px' : '10px',
      fontWeight: '900',
      color: tab.active ? '#1a3a5a' : '#6b7f8f',
    }).setOrigin(0.5).setDepth(33)
  }

  _shortNum(value) {
    if (value >= 10000) return `${Math.floor(value / 1000) / 10}万`
    if (value >= 1000) return `${Math.floor(value / 100) / 10}k`
    return `${value}`
  }

  _toast(message) {
    const { width: W, height: H } = this.scale
    const y = H - 142
    const bg = this.add.graphics().setDepth(80)
    bg.fillStyle(0x1a2a3a, 0.88)
    bg.fillRoundedRect(W / 2 - 126, y, 252, 38, 16)

    const txt = this.add.text(W / 2, y + 19, message, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(81)

    this.tweens.add({
      targets: [bg, txt],
      alpha: 0,
      y: '-=16',
      duration: 900,
      ease: 'Sine.easeIn',
      onComplete: () => {
        bg.destroy()
        txt.destroy()
      },
    })
  }
}
