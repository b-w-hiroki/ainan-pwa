import Phaser from 'phaser'
import { uiText } from '../config/fontStyles.js'
import { ICONS } from '../config/icons.js'
import { ASSETS } from '../config/assetManifest.js'
import { Button } from '../ui/Button.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { LICENSE_SHEETS, MISSION_META, claimDailyBonus, getDailyBonusState, getLicenseProgress, getMissionProgress } from '../game/progress.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const T = {
  player: '\u6e2f\u306e\u91e3\u308a\u4eba',
  title: '\u753a\u304a\u3053\u3057\u91e3\u308a',
  tagline: '\u91e3\u3063\u3066\u3001\u96c6\u3081\u3066\u3001\u6e2f\u3092\u306b\u304e\u3084\u304b\u306b',
  mission: '\u30df\u30c3\u30b7\u30e7\u30f3',
  license: '\u91e3\u308a\u514d\u8a31',
  event: '\u30a4\u30d9\u30f3\u30c8',
  eventTitle: '\u6e2f\u307e\u3064\u308a\u6e96\u5099 \u958b\u50ac\u4e2d',
  eventLead: '\u671f\u9593\u9650\u5b9a\u30df\u30c3\u30b7\u30e7\u30f3\u3067\u5831\u916c\u3092\u96c6\u3081\u3088\u3046',
  goFishing: '\u91e3\u308a\u306b\u884c\u304f',
  goLead: '\u91e3\u308a\u5834\u3092\u9078\u3093\u3067\u51fa\u767a',
  daily: '\u30c7\u30a4\u30ea\u30fc\u30dc\u30fc\u30ca\u30b9',
  claim: '\u53d7\u3051\u53d6\u308b',
  later: '\u3042\u3068\u3067',
  day: '\u65e5',
  tenThousand: '\u4e07',
}

export default class HomeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HomeScene' })
  }

  preload() {
    const bg = ASSETS.backgrounds.homeBase
    if (!this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
    const guide = ASSETS.characters.guideDefault
    if (!this.textures.exists(guide.key)) this.load.image(guide.key, guide.path)
  }

  create() {
    const { width: W, height: H } = this.scale
    this._buildBackground(W, H)
    this._buildHeader(W)
    this._buildEventBanner(W, H)
    this._buildTopShortcuts(W, H)
    this._buildGuideCharacter(W, H)
    this._buildMainCTA(W, H)
    this._buildDailyButton(W)
    buildFooterNav(this, W, H, 'home')
    this._maybeShowDailyBonus(W, H)
  }

  _buildBackground(W, H) {
    const artBg = addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)
    if (!artBg) {
      const bg = this.add.graphics().setDepth(0)
      bg.fillGradientStyle(0xbfefff, 0xbfefff, 0xffffff, 0xffffff, 1)
      bg.fillRect(0, 0, W, H * 0.48)
      bg.fillGradientStyle(0x71d9ff, 0x71d9ff, 0x2e9bd2, 0x2e9bd2, 1)
      bg.fillRect(0, H * 0.48, W, H * 0.25)
      bg.fillGradientStyle(0xf0d878, 0xf0d878, 0xc69a52, 0xc69a52, 1)
      bg.fillRect(0, H * 0.73, W, H * 0.27)
    }

    const veil = this.add.graphics().setDepth(1)
    veil.fillGradientStyle(0x0f5e91, 0x0f5e91, 0xffffff, 0xffffff, 0.20, 0.20, 0.02, 0.02)
    veil.fillRect(0, 0, W, H * 0.25)
    veil.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.05, 0.05, 0.20, 0.20)
    veil.fillRect(0, H * 0.24, W, H * 0.55)
  }

  _buildHeader(W) {
    const totalScore = parseInt(localStorage.getItem('ainan_score') ?? '0', 10)
    const catches = JSON.parse(localStorage.getItem('ainan_catches') ?? '[]')
    const rank = Math.max(1, Math.floor(catches.length / 3) + 1)

    const bar = this.add.graphics().setDepth(20)
    bar.fillStyle(0xffffff, 0.90)
    bar.lineStyle(2, 0x1a2a3a, 0.28)
    bar.fillRoundedRect(10, 10, W - 20, 56, 18)
    bar.strokeRoundedRect(10, 10, W - 20, 56, 18)

    const profile = this.add.graphics().setDepth(21)
    profile.fillStyle(0xffffff, 0.98)
    profile.lineStyle(2.5, 0x1a2a3a, 0.9)
    profile.fillRoundedRect(18, 16, 148, 44, 16)
    profile.strokeRoundedRect(18, 16, 148, 44, 16)
    profile.fillStyle(0xffd900, 1)
    profile.fillCircle(42, 38, 15)
    this.add.text(42, 38, ICONS.ROD, { fontSize: '18px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(22)
    this.add.text(64, 31, T.player, uiText('cardTitle', { fontSize: '13px' })).setOrigin(0, 0.5).setDepth(22)
    this.add.text(64, 46, `RANK ${String(rank).padStart(2, '0')}`, uiText('micro', { fontSize: '10px', color: '#e07800' })).setOrigin(0, 0.5).setDepth(22)
    this.add.rectangle(92, 38, 152, 48, 0x000000, 0)
      .setDepth(23)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('RankScene'))

    this._buildResourceChip(W - 116, 19, ICONS.SCORE, this._shortNum(totalScore))
    this._buildResourceChip(W - 62, 19, ICONS.FISH, this._shortNum(catches.length))
  }

  _buildResourceChip(x, y, icon, value) {
    const g = this.add.graphics().setDepth(21)
    g.fillStyle(0xffffff, 0.98)
    g.lineStyle(2, 0x1a2a3a, 0.75)
    g.fillRoundedRect(x, y, 48, 36, 13)
    g.strokeRoundedRect(x, y, 48, 36, 13)
    this.add.text(x + 15, y + 18, icon, { fontSize: '14px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(22)
    this.add.text(x + 32, y + 18, value, uiText('chip', { fontSize: '13px', color: '#1a3a5a' })).setOrigin(0.5).setDepth(22)
  }

  _buildEventBanner(W, H) {
    const x = 24
    const y = 82
    const w = W - 48
    const h = 58
    const g = this.add.graphics().setDepth(10)
    g.fillStyle(0x000000, 0.12)
    g.fillRoundedRect(x + 3, y + 4, w, h, 16)
    g.fillGradientStyle(0xfff4ce, 0xfff4ce, 0xdff8ec, 0xdff8ec, 0.98)
    g.lineStyle(2.5, 0x1a2a3a, 0.75)
    g.fillRoundedRect(x, y, w, h, 16)
    g.strokeRoundedRect(x, y, w, h, 16)
    g.fillStyle(0xff6a3d, 0.94)
    g.fillRoundedRect(x + 10, y + 10, 66, 36, 12)
    this.add.text(x + 43, y + 28, T.event, uiText('micro', { fontSize: '10px', color: '#ffffff' })).setOrigin(0.5).setDepth(11)
    this.add.text(x + 88, y + 21, T.eventTitle, uiText('cardTitle', { fontSize: '13px' })).setOrigin(0, 0.5).setDepth(11)
    this.add.text(x + 88, y + 40, T.eventLead, uiText('micro', { fontSize: '9.5px', color: '#4a7090' })).setOrigin(0, 0.5).setDepth(11)
    this.add.text(x + w - 22, y + h / 2, ICONS.CHEVRON, uiText('cardTitle', { fontSize: '22px' })).setOrigin(0.5).setDepth(11)
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0)
      .setDepth(12)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('MissionScene', { tab: 'limited', sheetIndex: 0 }))
  }

  _buildTopShortcuts(W, H) {
    const progress = getMissionProgress()
    const firstMission = MISSION_META[0]
    const missionValue = Math.min(progress[firstMission.id] ?? 0, firstMission.target)
    const license = this._licenseCount()
    this._iconShortcut(24, 154, 58, ICONS.MISSION, T.mission, `${missionValue}/${firstMission.target}`, 0x5ebcff, () => this.scene.start('MissionScene'))
    this._iconShortcut(94, 154, 58, ICONS.LICENSE, T.license, `${license.done}/${license.total}`, 0xffd900, () => this.scene.start('LicenseScene'))
  }

  _iconShortcut(x, y, size, icon, title, sub, accent, onTap) {
    const cx = x + size / 2
    const cy = y + size / 2
    const g = this.add.graphics().setDepth(13)
    g.fillStyle(0x000000, 0.12)
    g.fillRoundedRect(x + 3, y + 4, size, size, 18)
    g.fillStyle(0xffffff, 0.97)
    g.lineStyle(2.4, 0x1a2a3a, 0.76)
    g.fillRoundedRect(x, y, size, size, 18)
    g.strokeRoundedRect(x, y, size, size, 18)
    g.fillStyle(accent, 0.22)
    g.fillCircle(cx, cy - 4, 22)
    this.add.text(cx, cy - 4, icon, { fontSize: '24px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(14)
    this.add.text(cx, cy + 19, sub, uiText('micro', {
      fontSize: '8px',
      color: '#d56f00',
      backgroundColor: '#ffffff',
      padding: { x: 3, y: 1 },
    })).setOrigin(0.5).setDepth(14)
    this.add.rectangle(cx, cy, size + 8, size + 8, 0x000000, 0)
      .setDepth(15)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onTap)
  }

  _buildGuideCharacter(W, H) {
    const c = this.add.container(W / 2 + 8, H * 0.595).setDepth(7)
    const aura = this.add.graphics()
    aura.fillStyle(0xffffff, 0.44)
    aura.fillEllipse(0, 76, 376, 502)
    aura.fillStyle(0x5ebcff, 0.12)
    aura.fillEllipse(-42, 82, 286, 420)
    aura.fillStyle(0xffd900, 0.12)
    aura.fillEllipse(62, 126, 238, 316)

    const shadow = this.add.graphics()
    shadow.fillStyle(0x1a2a3a, 0.16)
    shadow.fillEllipse(0, 342, 214, 32)

    const guide = this.add.image(0, 10, ASSETS.characters.guideDefault.key)
      .setOrigin(0.5)
      .setDisplaySize(475, 713)
    c.add([aura, shadow, guide])
    this.tweens.add({ targets: c, y: H * 0.595 - 6, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
  }

  _buildMainCTA(W, H) {
    new Button(this, {
      x: W / 2,
      y: H * 0.812,
      w: 258,
      h: 62,
      label: T.goFishing,
      icon: ICONS.ROD,
      variant: 'primary',
      fontSize: 23,
      depth: 16,
      onClick: () => this.scene.start('MapScene'),
    })
    const hintBg = this.add.graphics().setDepth(15)
    hintBg.fillStyle(0xffffff, 0.90)
    hintBg.lineStyle(1.5, 0x1a2a3a, 0.18)
    hintBg.fillRoundedRect(W / 2 - 112, H * 0.812 + 36, 224, 24, 12)
    hintBg.strokeRoundedRect(W / 2 - 112, H * 0.812 + 36, 224, 24, 12)
    this.add.text(W / 2, H * 0.812 + 48, T.goLead, uiText('chip', { fontSize: '13px', color: '#1a3a5a' })).setOrigin(0.5).setDepth(16)
  }

  _buildDailyButton(W) {
    const state = getDailyBonusState()
    if (!state.canClaim) return
    const x = W - 72
    const g = this.add.graphics().setDepth(23)
    g.fillStyle(0xfff4ce, 0.98)
    g.lineStyle(2, 0xe07800, 0.86)
    g.fillCircle(x, 82, 18)
    g.strokeCircle(x, 82, 18)
    this.add.text(x, 82, ICONS.BONUS, { fontSize: '16px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(24)
    const dot = this.add.graphics().setDepth(25)
    dot.fillStyle(0xff4f4f, 1)
    dot.fillCircle(x + 12, 70, 5)
    this.add.circle(x, 82, 23, 0x000000, 0).setDepth(26).setInteractive({ useHandCursor: true }).on('pointerdown', () => this._showDailyBonus(this.scale.width, this.scale.height))
  }

  _maybeShowDailyBonus(W, H) {
    const state = getDailyBonusState()
    if (!state.canClaim || window.__ainanDailyBonusDismissed) return
    this._showDailyBonus(W, H)
  }

  _showDailyBonus(W, H) {
    const state = getDailyBonusState()
    if (!state.canClaim) return
    this._dailyModal?.destroy(true)
    const items = []
    items.push(this.add.rectangle(W / 2, H / 2, W, H, 0x1a2a3a, 0.38).setInteractive().on('pointerdown', () => this._dismissDailyBonus()))
    const x = 36
    const y = 238
    const w = W - 72
    const h = 250
    const bg = this.add.graphics()
    bg.fillStyle(0xffffff, 0.98)
    bg.lineStyle(3, 0x1a2a3a, 1)
    bg.fillRoundedRect(x, y, w, h, 22)
    bg.strokeRoundedRect(x, y, w, h, 22)
    bg.fillStyle(0xffd900, 0.24)
    bg.fillCircle(W / 2, y + 62, 42)
    items.push(bg)
    items.push(this.add.text(W / 2, y + 62, ICONS.BONUS, { fontSize: '40px', resolution: TEXT_RES }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 118, T.daily, uiText('panelTitle', { fontSize: '22px' })).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 150, `\u9023\u7d9a${state.streak}${T.day} / ${state.reward}pt`, uiText('chip', { fontSize: '14px', color: '#e07800' })).setOrigin(0.5))
    items.push(this._smallActionButton(W / 2, y + 196, T.claim, () => {
      claimDailyBonus()
      this.scene.restart()
    }))
    items.push(this.add.text(W / 2, y + h - 24, T.later, uiText('chip', { fontSize: '13px', color: '#4a7090' })).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this._dismissDailyBonus()))
    this._dailyModal = this.add.container(0, 18, items).setDepth(120).setAlpha(0)
    this.tweens.add({ targets: this._dailyModal, y: 0, alpha: 1, duration: 160, ease: 'Sine.easeOut' })
  }

  _dismissDailyBonus() {
    window.__ainanDailyBonusDismissed = true
    this._dailyModal?.destroy(true)
    this._dailyModal = null
  }

  _smallActionButton(x, y, label, onTap) {
    const c = this.add.container(0, 0)
    const bg = this.add.graphics()
    bg.fillStyle(0xffd900, 1)
    bg.lineStyle(2.5, 0x1a2a3a, 1)
    bg.fillRoundedRect(x - 68, y - 20, 136, 40, 14)
    bg.strokeRoundedRect(x - 68, y - 20, 136, 40, 14)
    const txt = this.add.text(x, y, label, uiText('button', { fontSize: '14px' })).setOrigin(0.5)
    const hit = this.add.rectangle(x, y, 146, 48, 0x000000, 0).setInteractive({ useHandCursor: true }).on('pointerdown', onTap)
    c.add([bg, txt, hit])
    return c
  }

  _licenseCount() {
    const progress = getLicenseProgress()
    const tasks = LICENSE_SHEETS.flatMap(sheet => sheet.tasks)
    return {
      done: tasks.filter(task => progress[task.id]).length,
      total: tasks.length,
    }
  }

  _shortNum(value) {
    if (value >= 10000) return `${Math.floor(value / 1000) / 10}${T.tenThousand}`
    if (value >= 1000) return `${Math.floor(value / 100) / 10}k`
    return `${value}`
  }
}
