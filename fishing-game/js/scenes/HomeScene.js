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
    this._buildTopBar(W, H)
    this._buildHeader(W, H)
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
    veil.fillGradientStyle(0x1a2a3a, 0x1a2a3a, 0x1a2a3a, 0x1a2a3a, 0.22, 0.22, 0.02, 0.02)
    veil.fillRect(0, 0, W, H * 0.25)
    veil.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.18, 0.18, 0.38, 0.38)
    veil.fillRect(0, H * 0.22, W, H * 0.58)
    veil.fillGradientStyle(0x1a2a3a, 0x1a2a3a, 0x1a2a3a, 0x1a2a3a, 0.0, 0.0, 0.22, 0.22)
    veil.fillRect(0, H * 0.74, W, H * 0.26)
  }

  _buildTopBar(W) {
    const totalScore = parseInt(localStorage.getItem('ainan_score') ?? '0', 10)
    const catches = JSON.parse(localStorage.getItem('ainan_catches') ?? '[]')
    const g = this.add.graphics().setDepth(8)
    g.fillStyle(0xffffff, 0.92)
    g.lineStyle(2.5, 0x1a2a3a, 1)
    g.fillRoundedRect(14, 14, 150, 42, 14)
    g.strokeRoundedRect(14, 14, 150, 42, 14)
    g.fillStyle(0xffd900, 1)
    g.fillCircle(36, 35, 14)

    this.add.text(36, 35, ICONS.ROD, { fontSize: '18px', resolution: TEXT_RES })
      .setOrigin(0.5)
      .setDepth(9)
    this.add.text(56, 29, '港の釣り人', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0, 0.5).setDepth(9)
    this.add.text(56, 43, 'RANK 01', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '10px', fontWeight: '900', color: '#e07800',
    }).setOrigin(0, 0.5).setDepth(9)

    this._buildResourceChip(W - 110, 18, ICONS.SCORE, this._shortNum(totalScore))
    this._buildResourceChip(W - 58, 18, ICONS.FISH, this._shortNum(catches.length))
  }

  _buildResourceChip(x, y, icon, value) {
    const g = this.add.graphics().setDepth(8)
    g.fillStyle(0xffffff, 0.92)
    g.lineStyle(2, 0x1a2a3a, 0.9)
    g.fillRoundedRect(x, y, 46, 32, 12)
    g.strokeRoundedRect(x, y, 46, 32, 12)
    this.add.text(x + 14, y + 16, icon, { fontSize: '14px', resolution: TEXT_RES })
      .setOrigin(0.5).setDepth(9)
    this.add.text(x + 30, y + 16, value, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(9)
  }

  _buildHeader(W, H) {
    const logoGroup = this.add.container(W / 2, H * 0.125).setDepth(8)

    const logo = this.add.text(0, 0, '釣りゲーム', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '38px', fontWeight: '900',
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

    const tagBg = this.add.graphics().setDepth(7)
    tagBg.fillStyle(0x123a54, 0.30)
    tagBg.fillRoundedRect(W / 2 - 112, H * 0.185 - 15, 224, 30, 15)
    this.add.text(W / 2, H * 0.185, '釣って、集めて、港をにぎやかに', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900',
      color: '#ffffff', shadow: SHADOW.medium,
    }).setOrigin(0.5).setDepth(8)
  }

  _buildStatsCard(W, H) {
    const totalScore = parseInt(localStorage.getItem('ainan_score') ?? '0', 10)
    const catches = JSON.parse(localStorage.getItem('ainan_catches') ?? '[]')
    const catchCount = catches.length
    const uniqueFish = new Set(catches.map(c => c.fishId)).size

    const x = W * 0.08
    const y = H * 0.235
    const w = W * 0.84
    const h = 116

    this._card(x, y, w, h, 3)
    this._sectionBadge(x + 14, y + 12, 72, 'MY釣果')

    const cols = [
      { x: x + w * 0.18, icon: ICONS.SCORE, val: totalScore.toLocaleString(), label: 'スコア', color: '#e07800' },
      { x: x + w * 0.50, icon: ICONS.FISH, val: `${catchCount}`, label: '釣果', color: '#0077cc' },
      { x: x + w * 0.82, icon: ICONS.BOOK, val: `${uniqueFish}/5`, label: '図鑑', color: '#00aa66' },
    ]

    cols.forEach(c => {
      this.add.text(c.x, y + 46, c.icon, { fontSize: '22px', resolution: TEXT_RES })
        .setOrigin(0.5).setDepth(5)
      this.add.text(c.x, y + 72, c.val, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '23px', fontWeight: '900', color: c.color,
      }).setOrigin(0.5).setDepth(5)
      this.add.text(c.x, y + 94, c.label, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '12px', fontWeight: '900', color: '#365a78',
      }).setOrigin(0.5).setDepth(5)
    })
  }

  _buildMissionCard(W, H) {
    const catches = JSON.parse(localStorage.getItem('ainan_catches') ?? '[]')
    const progress = Math.min(catches.length, 1)
    const x = W * 0.08
    const y = H * 0.39
    const w = W * 0.84
    const h = 74

    this._card(x, y, w, h, 3)
    this._sectionBadge(x + 14, y + 12, 86, '本日の目標')
    this.add.text(x + 24, y + 40, 'まずは1匹釣って、図鑑を増やそう', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + w - 22, y + 40, `${progress}/1`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '16px', fontWeight: '900', color: '#e07800',
    }).setOrigin(1, 0.5).setDepth(5)

    const bar = this.add.graphics().setDepth(5)
    bar.fillStyle(0xeaf2f8, 1)
    bar.fillRoundedRect(x + 24, y + 55, w - 48, 10, 5)
    bar.fillStyle(progress >= 1 ? 0x00aa66 : 0xffd900, 1)
    bar.fillRoundedRect(x + 24, y + 55, Math.max(10, (w - 48) * progress), 10, 5)
  }

  _buildMainCTA(W, H) {
    new Button(this, {
      x: W / 2, y: H * 0.54,
      w: 306, h: 70,
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
    hintBg.fillRoundedRect(W / 2 - 120, H * 0.54 + 40, 240, 28, 14)
    hintBg.strokeRoundedRect(W / 2 - 120, H * 0.54 + 40, 240, 28, 14)
    this.add.text(W / 2, H * 0.54 + 54, '釣り場を選んで出発', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(10)
  }

  _buildSubMenu(W, H) {
    const panelX = W * 0.055
    const panelY = H * 0.642
    const panelW = W * 0.89
    const panelH = H * 0.245

    const panel = this.add.graphics().setDepth(2)
    panel.fillStyle(0xffffff, 0.74)
    panel.lineStyle(2, 0xffffff, 0.55)
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 18)
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 18)

    this.add.text(W / 2, H * 0.675, '港のメニュー', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '15px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(4)

    const items = [
      { icon: ICONS.BOOK, label: '図鑑', caption: '魚を集める', color: 0x5ebcff },
      { icon: ICONS.GEAR, label: 'タックル', caption: '竿・エサ強化', color: 0xa088ff },
      { icon: ICONS.GIFT, label: '交換所', caption: 'ポイント交換', color: 0xff9b5e },
    ]
    const itemW = 94
    const itemH = 108
    const gap = 9
    const startX = W / 2 - (items.length * itemW + (items.length - 1) * gap) / 2 + itemW / 2
    const cy = H * 0.79

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
      g.fillCircle(cx, y + 28, 22)

      this.add.text(cx, y + 28, it.icon, { fontSize: '27px', resolution: TEXT_RES })
        .setOrigin(0.5).setDepth(4)
      this.add.text(cx, y + 58, it.label, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '14px', fontWeight: '900', color: '#1a3a5a',
      }).setOrigin(0.5).setDepth(4)
      this.add.text(cx, y + 77, it.caption, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '10px', fontWeight: '900', color: '#5a7090',
      }).setOrigin(0.5).setDepth(4)

      const badge = this.add.graphics().setDepth(5)
      badge.fillStyle(0xff6a3d, 1)
      badge.fillRoundedRect(x + 10, y + itemH - 22, itemW - 20, 16, 5)
      this.add.text(cx, y + itemH - 14, '実装予定', {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '10px', fontWeight: '900', color: '#ffffff',
      }).setOrigin(0.5).setDepth(6)
    })
  }

  _buildFooter(W, H) {
    new Button(this, {
      x: W / 2, y: H * 0.94,
      w: 180, h: 42,
      label: 'タイトルへ戻る',
      variant: 'ghost',
      fontSize: 14,
      depth: 10,
      onClick: () => this.scene.start('TitleScene'),
    })
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
}
