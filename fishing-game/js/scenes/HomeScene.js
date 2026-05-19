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
    this._buildStatsCard(W, H)
    this._buildMissionCard(W, H)
    this._buildMainCTA(W, H)
    this._buildSubMenu(W, H)
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
    const logoGroup = this.add.container(W / 2, H * 0.145).setDepth(10)

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
    tagBg.fillRoundedRect(W / 2 - 118, H * 0.202 - 15, 236, 30, 15)
    this.add.text(W / 2, H * 0.202, '釣って、集めて、港をにぎやかに', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900',
      color: '#ffffff', shadow: SHADOW.medium,
    }).setOrigin(0.5).setDepth(10)
  }

  _buildStatsCard(W, H) {
    const totalScore = parseInt(localStorage.getItem('ainan_score') ?? '0', 10)
    const catches = JSON.parse(localStorage.getItem('ainan_catches') ?? '[]')
    const catchCount = catches.length
    const uniqueFish = new Set(catches.map(c => c.fishId)).size

    const x = W * 0.08
    const y = H * 0.258
    const w = W * 0.84
    const h = 108

    this._card(x, y, w, h, 3)
    this._sectionBadge(x + 14, y + 12, 72, 'MY釣果')

    const cols = [
      { x: x + w * 0.18, icon: ICONS.SCORE, val: totalScore.toLocaleString(), label: 'スコア', color: '#e07800' },
      { x: x + w * 0.50, icon: ICONS.FISH, val: `${catchCount}`, label: '釣果', color: '#0077cc' },
      { x: x + w * 0.82, icon: ICONS.BOOK, val: `${uniqueFish}/5`, label: '図鑑', color: '#00aa66' },
    ]

    cols.forEach(c => {
      this.add.text(c.x, y + 43, c.icon, { fontSize: '21px', resolution: TEXT_RES })
        .setOrigin(0.5).setDepth(5)
      this.add.text(c.x, y + 67, c.val, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '22px', fontWeight: '900', color: c.color,
      }).setOrigin(0.5).setDepth(5)
      this.add.text(c.x, y + 89, c.label, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '12px', fontWeight: '900', color: '#365a78',
      }).setOrigin(0.5).setDepth(5)
    })
  }

  _buildMissionCard(W, H) {
    const catches = JSON.parse(localStorage.getItem('ainan_catches') ?? '[]')
    const progress = Math.min(catches.length, 1)
    const x = W * 0.08
    const y = H * 0.397
    const w = W * 0.84
    const h = 68

    this._card(x, y, w, h, 3)
    this._sectionBadge(x + 14, y + 10, 86, '本日の目標')
    this.add.text(x + 24, y + 38, 'まずは1匹釣って、図鑑を増やそう', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + w - 22, y + 38, `${progress}/1`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '15px', fontWeight: '900', color: '#e07800',
    }).setOrigin(1, 0.5).setDepth(5)

    const bar = this.add.graphics().setDepth(5)
    bar.fillStyle(0xeaf2f8, 1)
    bar.fillRoundedRect(x + 24, y + 52, w - 48, 9, 5)
    bar.fillStyle(progress >= 1 ? 0x00aa66 : 0xffd900, 1)
    bar.fillRoundedRect(x + 24, y + 52, Math.max(9, (w - 48) * progress), 9, 5)
  }

  _buildMainCTA(W, H) {
    new Button(this, {
      x: W / 2, y: H * 0.542,
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
    hintBg.fillRoundedRect(W / 2 - 120, H * 0.542 + 38, 240, 27, 14)
    hintBg.strokeRoundedRect(W / 2 - 120, H * 0.542 + 38, 240, 27, 14)
    this.add.text(W / 2, H * 0.542 + 52, '釣り場を選んで出発', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(10)
  }

  _buildSubMenu(W, H) {
    const panelX = W * 0.055
    const panelY = H * 0.632
    const panelW = W * 0.89
    const panelH = H * 0.208

    const panel = this.add.graphics().setDepth(2)
    panel.fillStyle(0xffffff, 0.74)
    panel.lineStyle(2, 0xffffff, 0.55)
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 18)
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 18)

    this.add.text(W / 2, H * 0.662, '港のメニュー', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '15px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(4)

    const items = [
      { icon: ICONS.BOOK, label: '図鑑', caption: '魚を集める', color: 0x5ebcff },
      { icon: ICONS.GEAR, label: 'タックル', caption: '竿・エサ強化', color: 0xa088ff },
      { icon: ICONS.GIFT, label: '交換所', caption: 'ポイント交換', color: 0xff9b5e },
    ]
    const itemW = 94
    const itemH = 90
    const gap = 9
    const startX = W / 2 - (items.length * itemW + (items.length - 1) * gap) / 2 + itemW / 2
    const cy = H * 0.756

    items.forEach((it, i) => {
      const cx = startX + i * (itemW + gap)
      const x = cx - itemW / 2
      const y = cy - itemH / 2
      const g = this.add.graphics().setDepth(3)
      g.fillStyle(0x000000, 0.10)
      g.fillRoundedRect(x + 2, y + 3, itemW, itemH, 14)
      g.fillStyle(0xffffff, 0.96)
      g.lineStyle(2.5, it.color, 0.95)
      g.fillRoundedRect(x, y, itemW, itemH, 14)
      g.strokeRoundedRect(x, y, itemW, itemH, 14)
      g.fillStyle(it.color, 0.18)
      g.fillCircle(cx, y + 24, 20)

      this.add.text(cx, y + 24, it.icon, { fontSize: '25px', resolution: TEXT_RES })
        .setOrigin(0.5).setDepth(4)
      this.add.text(cx, y + 51, it.label, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '13px', fontWeight: '900', color: '#1a3a5a',
      }).setOrigin(0.5).setDepth(4)
      this.add.text(cx, y + 68, it.caption, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '10px', fontWeight: '900', color: '#5a7090',
      }).setOrigin(0.5).setDepth(4)

      const badge = this.add.graphics().setDepth(5)
      badge.fillStyle(0xff6a3d, 1)
      badge.fillRoundedRect(x + 10, y + itemH - 19, itemW - 20, 15, 5)
      this.add.text(cx, y + itemH - 11.5, '実装予定', {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '9px', fontWeight: '900', color: '#ffffff',
      }).setOrigin(0.5).setDepth(6)
    })
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

  _card(x, y, w, h, depth) {
    const sh = this.add.graphics().setDepth(depth - 1)
    sh.fillStyle(0x000000, 0.16)
    sh.fillRoundedRect(x + 3, y + 4, w, h, 18)

    const g = this.add.graphics().setDepth(depth)
    g.fillStyle(0xffffff, 0.96)
    g.lineStyle(2.5, 0x1a2a3a, 1)
    g.fillRoundedRect(x, y, w, h, 18)
    g.strokeRoundedRect(x, y, w, h, 18)
    return g
  }

  _sectionBadge(x, y, w, label) {
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0xffd900, 1)
    g.fillRoundedRect(x, y, w, 20, 7)
    this.add.text(x + w / 2, y + 10, label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '11px', fontWeight: '900', color: '#1a2a3a',
    }).setOrigin(0.5).setDepth(6)
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
