import Phaser from 'phaser'
import { FONT, SHADOW, uiText } from '../config/fontStyles.js'
import { ICONS } from '../config/icons.js'
import { ASSETS } from '../config/assetManifest.js'
import { Button } from '../ui/Button.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { LICENSE_SHEETS, MISSION_META, claimDailyBonus, getDailyBonusState, getLicenseProgress, getMissionProgress, getTownSummary } from '../game/progress.js'

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
    this._buildHeader(W)
    this._buildTitle(W, H)
    this._buildHomeCharacter(W, H)
    this._buildMainCTA(W, H)
    this._buildFloatingActions(W, H)
    this._buildEventBanner(W, H)
    this._buildHelpButton(W)
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
    veil.fillGradientStyle(0x1a2a3a, 0x1a2a3a, 0x1a2a3a, 0x1a2a3a, 0.18, 0.18, 0.02, 0.02)
    veil.fillRect(0, 0, W, H * 0.22)
    veil.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.10, 0.10, 0.38, 0.38)
    veil.fillRect(0, H * 0.20, W, H * 0.58)
    this._buildHarborAccents(W, H)
  }

  _buildHarborAccents(W, H) {
    const g = this.add.graphics().setDepth(2)
    g.lineStyle(2, 0xffffff, 0.34)
    g.lineBetween(W * 0.18, H * 0.48, W * 0.42, H * 0.47)
    g.lineBetween(W * 0.58, H * 0.51, W * 0.84, H * 0.50)
    g.lineBetween(W * 0.12, H * 0.62, W * 0.30, H * 0.61)
    this._drawTinySail(g, W * 0.78, H * 0.33, 0.78)
    this._drawTinySail(g, W * 0.26, H * 0.54, 0.60)
  }

  _drawTinySail(g, x, y, sc = 1) {
    g.fillStyle(0xffffff, 0.82)
    g.fillRoundedRect(x - 15 * sc, y + 7 * sc, 30 * sc, 7 * sc, 4 * sc)
    g.fillStyle(0x2a9bd6, 0.68)
    g.fillTriangle(x - 3 * sc, y + 6 * sc, x + 9 * sc, y - 15 * sc, x + 9 * sc, y + 6 * sc)
  }

  _buildHeader(W) {
    const totalScore = parseInt(localStorage.getItem('ainan_score') ?? '0', 10)
    const catches = JSON.parse(localStorage.getItem('ainan_catches') ?? '[]')
    const rank = Math.max(1, Math.floor(catches.length / 3) + 1)
    const bar = this.add.graphics().setDepth(20)
    bar.fillStyle(0xffffff, 0.82)
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
    this.add.text(42, 38, ICONS.ROD, { fontSize: '18px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(22)
    this.add.text(64, 31, '港の釣り人', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0, 0.5).setDepth(22)
    this.add.text(64, 46, `RANK ${String(rank).padStart(2, '0')}`, {
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
    this.add.text(x + 15, y + 18, icon, { fontSize: '14px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(22)
    this.add.text(x + 32, y + 18, value, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(22)
  }

  _buildTitle(W, H) {
    const logoGroup = this.add.container(W / 2, H * 0.145).setDepth(10)
    const logo = this.add.text(0, 0, '釣りゲーム', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '34px', fontWeight: '900',
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
    tagBg.fillStyle(0x123a54, 0.34)
    tagBg.fillRoundedRect(W / 2 - 122, H * 0.208 - 15, 244, 30, 15)
    this.add.text(W / 2, H * 0.208, '釣って、集めて、港をにぎやかに', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900',
      color: '#ffffff', shadow: SHADOW.medium,
    }).setOrigin(0.5).setDepth(10)
  }

  _buildHomeCharacter(W, H) {
    const c = this.add.container(W / 2, H * 0.47).setDepth(7)
    const aura = this.add.graphics()
    aura.fillStyle(0xffffff, 0.34)
    aura.fillCircle(0, 42, 118)
    aura.fillStyle(0x5ebcff, 0.18)
    aura.fillCircle(-36, 20, 82)
    aura.fillStyle(0xffd900, 0.20)
    aura.fillCircle(48, 44, 70)

    const shadow = this.add.graphics()
    shadow.fillStyle(0x1a2a3a, 0.18)
    shadow.fillEllipse(0, 122, 122, 24)

    const body = this.add.graphics()
    body.fillStyle(0x2b8fd0, 1)
    body.fillRoundedRect(-34, 34, 68, 76, 22)
    body.lineStyle(4, 0x1a2a3a, 1)
    body.strokeRoundedRect(-34, 34, 68, 76, 22)
    body.fillStyle(0xffd900, 1)
    body.fillRoundedRect(-22, 50, 44, 14, 7)
    body.fillStyle(0xffffff, 1)
    body.fillCircle(-18, 8, 19)
    body.fillCircle(18, 8, 19)
    body.fillStyle(0xffd7b5, 1)
    body.fillCircle(0, 18, 38)
    body.lineStyle(4, 0x1a2a3a, 1)
    body.strokeCircle(0, 18, 38)
    body.fillStyle(0x1a2a3a, 1)
    body.fillCircle(-13, 15, 4)
    body.fillCircle(13, 15, 4)
    body.lineStyle(3, 0x1a2a3a, 1)
    body.lineBetween(-9, 31, 9, 31)
    body.fillStyle(0x175d91, 1)
    body.fillRoundedRect(-34, -30, 68, 34, 16)
    body.lineStyle(4, 0x1a2a3a, 1)
    body.strokeRoundedRect(-34, -30, 68, 34, 16)
    body.fillStyle(0xffffff, 1)
    body.fillTriangle(-18, -30, 0, -60, 18, -30)
    body.lineStyle(5, 0x1a2a3a, 1)
    body.lineBetween(-58, 62, -92, 22)
    body.lineBetween(58, 62, 92, 26)
    body.lineStyle(4, 0x8b5a2b, 1)
    body.lineBetween(46, 70, 96, -76)
    body.fillStyle(0xfff1c6, 1)
    body.fillCircle(98, -82, 10)

    const sparkle = this.add.graphics()
    sparkle.fillStyle(0xffffff, 0.88)
    ;[
      [-82, -22, 5],
      [78, -4, 4],
      [-70, 82, 4],
      [88, 86, 5],
    ].forEach(([x, y, r]) => {
      sparkle.fillCircle(x, y, r)
      sparkle.fillTriangle(x, y - r * 2.5, x - r, y, x + r, y)
    })

    c.add([aura, shadow, body, sparkle])
    this.tweens.add({ targets: c, y: H * 0.47 - 6, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
  }

  _buildMainCTA(W, H) {
    new Button(this, {
      x: W / 2, y: H * 0.745,
      w: 248, h: 66,
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
    hintBg.fillRoundedRect(W / 2 - 112, H * 0.745 + 39, 224, 25, 13)
    hintBg.strokeRoundedRect(W / 2 - 112, H * 0.745 + 39, 224, 25, 13)
    this.add.text(W / 2, H * 0.745 + 52, '釣り場を選んで出発', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(10)
  }

  _buildFloatingActions(W, H) {
    const progress = getMissionProgress()
    const firstMission = MISSION_META[0]
    const missionValue = Math.min(progress[firstMission.id] ?? 0, firstMission.target)
    const license = this._licenseCount()
    const town = getTownSummary()

    const items = [
      { x: 38, y: H * 0.33, title: '町', sub: `${town.bustle}/100`, icon: ICONS.TOWN, accent: 0x8bcf52, scene: 'TownScene', badge: '町' },
      { x: 38, y: H * 0.43, title: '免許', sub: `${license.done}/${license.total}`, icon: ICONS.LICENSE, accent: 0xffd900, scene: 'LicenseScene', badge: '課題' },
      { x: 38, y: H * 0.53, title: 'ランク', sub: '成長', icon: ICONS.RANK, accent: 0xff9b5e, scene: 'RankScene', badge: '育成' },
      { x: W - 38, y: H * 0.33, title: 'ミッション', sub: `${missionValue}/${firstMission.target}`, icon: ICONS.MISSION, accent: 0x5ebcff, scene: 'MissionScene', badge: '今日' },
      { x: W - 38, y: H * 0.43, title: '報酬', sub: '受取', icon: ICONS.GIFT, accent: 0xff6a9a, scene: 'ExchangeScene', badge: '交換' },
      { x: W - 38, y: H * 0.53, title: '図鑑', sub: '魚', icon: ICONS.BOOK, accent: 0xbc7cff, scene: 'CollectionScene', badge: '本' },
    ]
    items.forEach(item => this._floatingIconButton(item))
  }

  _floatingIconButton(item) {
    const x = item.x
    const y = item.y
    const w = 70
    const h = 66
    const g = this.add.graphics().setDepth(12)
    g.fillStyle(0x000000, 0.16)
    g.fillRoundedRect(x - w / 2 + 3, y - h / 2 + 4, w, h, 18)
    g.fillStyle(0xffffff, 0.96)
    g.lineStyle(2.4, 0x1a2a3a, 0.78)
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 18)
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 18)
    g.fillStyle(item.accent, 0.22)
    g.fillCircle(x, y - 10, 23)
    g.lineStyle(2, item.accent, 0.85)
    g.strokeCircle(x, y - 10, 23)

    this.add.text(x, y - 10, item.icon, {
      fontSize: '22px',
      resolution: TEXT_RES,
    }).setOrigin(0.5).setDepth(13)
    this.add.text(x, y + 20, item.title, uiText('cardTitle', {
      fontSize: '10px',
      color: '#1a3a5a',
    })).setOrigin(0.5).setDepth(13)
    this.add.text(x, y + 34, item.sub, uiText('micro', {
      fontSize: '8px',
      color: '#d56f00',
    })).setOrigin(0.5).setDepth(13)

    const badge = this.add.graphics().setDepth(13)
    badge.fillStyle(item.accent, 0.92)
    badge.fillRoundedRect(x + 12, y - 34, 34, 17, 8)
    this.add.text(x + 29, y - 25.5, item.badge, uiText('micro', {
      fontSize: '8px',
      color: '#1a2a3a',
    })).setOrigin(0.5).setDepth(14)

    this.add.rectangle(x, y, w + 8, h + 8, 0x000000, 0)
      .setDepth(15)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start(item.scene))
      .on('pointerover', () => {
        this.tweens.add({ targets: badge, alpha: 0.72, duration: 80 })
      })
      .on('pointerout', () => {
        badge.setAlpha(1)
      })
  }

  _buildEventBanner(W, H) {
    const x = 24
    const y = H * 0.822
    const w = W - 48
    const h = 52
    const g = this.add.graphics().setDepth(10)
    g.fillStyle(0x000000, 0.14)
    g.fillRoundedRect(x + 3, y + 4, w, h, 16)
    g.fillGradientStyle(0xfff4ce, 0xfff4ce, 0xdff8ec, 0xdff8ec, 0.98)
    g.lineStyle(2.5, 0x1a2a3a, 0.82)
    g.fillRoundedRect(x, y, w, h, 16)
    g.strokeRoundedRect(x, y, w, h, 16)
    g.fillStyle(0xff6a3d, 0.94)
    g.fillRoundedRect(x + 10, y + 9, 66, 34, 12)
    this.add.text(x + 43, y + 26, 'イベント', uiText('micro', {
      fontSize: '10px',
      color: '#ffffff',
    })).setOrigin(0.5).setDepth(11)
    this.add.text(x + 88, y + 18, '港まつり準備 開催中', uiText('cardTitle', {
      fontSize: '13px',
    })).setOrigin(0, 0.5).setDepth(11)
    this.add.text(x + 88, y + 36, '期間限定ミッションで報酬を集めよう', uiText('micro', {
      fontSize: '9px',
      color: '#4a7090',
    })).setOrigin(0, 0.5).setDepth(11)
    this.add.text(x + w - 22, y + h / 2, ICONS.CHEVRON, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '22px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(11)
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0)
      .setDepth(12)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('MissionScene', { tab: 'limited', sheetIndex: 0 }))
  }

  _buildHelpButton(W) {
    const g = this.add.graphics().setDepth(23)
    g.fillStyle(0xffffff, 0.95)
    g.lineStyle(2, 0x1a2a3a, 0.72)
    g.fillCircle(W - 28, 82, 18)
    g.strokeCircle(W - 28, 82, 18)
    this.add.text(W - 28, 82, ICONS.HELP, {
      fontSize: '16px', resolution: TEXT_RES,
    }).setOrigin(0.5).setDepth(24)
    this.add.circle(W - 28, 82, 23, 0x000000, 0)
      .setDepth(25)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('HelpScene'))
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
    this.add.text(x, 82, ICONS.BONUS, {
      fontSize: '16px', resolution: TEXT_RES,
    }).setOrigin(0.5).setDepth(24)
    const dot = this.add.graphics().setDepth(25)
    dot.fillStyle(0xff4f4f, 1)
    dot.fillCircle(x + 12, 70, 5)
    this.add.circle(x, 82, 23, 0x000000, 0)
      .setDepth(26)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showDailyBonus(this.scale.width, this.scale.height))
  }

  _maybeShowDailyBonus(W, H) {
    const state = getDailyBonusState()
    if (!state.canClaim) return
    if (window.__ainanDailyBonusDismissed) return
    this._showDailyBonus(W, H)
  }

  _showDailyBonus(W, H) {
    const state = getDailyBonusState()
    if (!state.canClaim) return
    this._dailyModal?.destroy(true)
    const items = []
    items.push(this.add.rectangle(W / 2, H / 2, W, H, 0x1a2a3a, 0.38)
      .setInteractive()
      .on('pointerdown', () => this._dismissDailyBonus()))

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
    items.push(this.add.text(W / 2, y + 62, ICONS.BONUS, {
      fontSize: '40px', resolution: TEXT_RES,
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 118, 'デイリーボーナス', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '22px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 150, `連続 ${state.streak}日 / ${state.reward}pt`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900', color: '#e07800',
    }).setOrigin(0.5))
    items.push(this._smallActionButton(W / 2, y + 196, '受け取る', () => {
      claimDailyBonus()
      this.scene.restart()
    }))
    items.push(this.add.text(W / 2, y + h - 24, 'あとで', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: '#4a7090',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this._dismissDailyBonus()))

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
    const txt = this.add.text(x, y, label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900', color: '#1a2a3a',
    }).setOrigin(0.5)
    const hit = this.add.rectangle(x, y, 146, 48, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onTap)
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

  _banner(x, y, w, h, title, desc, accent, icon, onTap) {
    const g = this.add.graphics().setDepth(12)
    g.fillStyle(0x000000, 0.13)
    g.fillRoundedRect(x + 3, y + 4, w, h, 18)
    g.fillStyle(0xffffff, 0.93)
    g.lineStyle(2.5, 0x1a2a3a, 0.75)
    g.fillRoundedRect(x, y, w, h, 18)
    g.strokeRoundedRect(x, y, w, h, 18)
    g.fillStyle(accent, 0.22)
    g.fillCircle(x + 38, y + h / 2, 24)
    this.add.text(x + 38, y + h / 2, icon, { fontSize: '23px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(13)
    this.add.text(x + 74, y + h * 0.32, title, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '16px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0, 0.5).setDepth(13)
    this.add.text(x + 74, y + h * 0.68, desc, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '800', color: '#4a7090',
      wordWrap: { width: w - 128 },
    }).setOrigin(0, 0.5).setDepth(13)
    const chevronBg = this.add.graphics().setDepth(13)
    chevronBg.fillStyle(0xffffff, 0.94)
    chevronBg.lineStyle(2, accent, 0.8)
    chevronBg.fillCircle(x + w - 28, y + h / 2, 16)
    chevronBg.strokeCircle(x + w - 28, y + h / 2, 16)
    this.add.text(x + w - 28, y + h / 2 - 1, ICONS.CHEVRON, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '22px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(13)
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0)
      .setDepth(14)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onTap)
  }

  _shortNum(value) {
    if (value >= 10000) return `${Math.floor(value / 1000) / 10}万`
    if (value >= 1000) return `${Math.floor(value / 100) / 10}k`
    return `${value}`
  }
}
