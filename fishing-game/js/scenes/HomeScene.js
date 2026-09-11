import Phaser from 'phaser'
import { UI_COLORS, uiText } from '../config/fontStyles.js'
import { ICONS } from '../config/icons.js'
import { ASSETS } from '../config/assetManifest.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { addCoverImage } from '../utils/imageLayout.js'
import {
  LICENSE_SHEETS,
  MISSION_META,
  claimDailyBonus,
  getCatches,
  getDailyBonusState,
  getLicenseProgress,
  getMissionProgress,
  getScore,
  getStaminaState,
  getTownSummary,
} from '../game/progress.js'
import { getNextTownUnlock, getTownUnlockState } from '../game/townUnlocks.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const T = {
  player: '港の釣り人',
  mission: 'ミッション',
  license: '釣り免許',
  goFishing: '釣りに行く',
  daily: 'デイリーボーナス',
  claim: '受け取る',
  later: 'あとで',
  day: '日',
  tenThousand: '万',
}

export default class HomeScene extends Phaser.Scene {
  constructor() { super({ key: 'HomeScene' }) }

  preload() {
    const wanted = [ASSETS.backgrounds.homeBase, ASSETS.characters.guideDefault]
    wanted.forEach(asset => {
      if (asset?.status === 'ready' && !this.textures.exists(asset.key)) this.load.image(asset.key, asset.path)
    })
  }

  create() {
    const { width: W, height: H } = this.scale
    this._unlocks = getTownUnlockState()
    this._nextUnlock = getNextTownUnlock()
    this._town = getTownSummary()
    this._catches = getCatches()
    this._hasKue = this._catches.some(c => c.fishId === 'kue')

    this._buildBackground(W, H)
    this._buildTownAtmosphere(W, H)
    this._buildHeader(W)
    this._buildGrowthBanner(W)
    this._buildTopShortcuts(W)
    this._buildGuideCharacter(W, H)
    this._buildGuideBubble(W, H)
    this._buildMainCTA(W, H)
    buildFooterNav(this, W, H, 'home')
    this._maybeShowDailyBonus(W, H)
  }

  _buildBackground(W, H) {
    const artBg = addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)
    if (!artBg) {
      const bg = this.add.graphics().setDepth(0)
      bg.fillGradientStyle(0xcff4ff, 0xcff4ff, 0xf8fdff, 0xf8fdff, 1)
      bg.fillRect(0, 0, W, H * 0.48)
      bg.fillGradientStyle(0x72d4f3, 0x72d4f3, 0x319ed2, 0x319ed2, 1)
      bg.fillRect(0, H * 0.48, W, H * 0.25)
      bg.fillStyle(0xe8c77d, 1)
      bg.fillRect(0, H * 0.73, W, H * 0.27)
    }
    const veil = this.add.graphics().setDepth(1)
    veil.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, this._hasKue ? 0.07 : 0.12, this._hasKue ? 0.07 : 0.12, 0.02, 0.02)
    veil.fillRect(0, 0, W, H * 0.72)
    veil.fillGradientStyle(0x173248, 0x173248, 0x173248, 0x173248, 0, 0, 0.12, 0.12)
    veil.fillRect(0, H * 0.72, W, H * 0.18)
  }

  _buildTownAtmosphere(W, H) {
    const g = this.add.graphics().setDepth(2)
    if (this._hasKue) {
      const colors = [0xff765a, 0xffd95a, 0x71d6a2, 0x5bb5d8]
      g.lineStyle(1.8, 0xffd95a, 0.58)
      g.lineBetween(14, H * 0.31, W - 14, H * 0.31)
      for (let i = 0; i < 10; i++) {
        const x = 20 + i * ((W - 40) / 9)
        g.fillStyle(colors[i % colors.length], 0.82)
        g.fillTriangle(x - 7, H * 0.31, x + 7, H * 0.31, x, H * 0.31 + 13 + (i % 2) * 3)
      }
      ;[[25, 295], [355, 312], [38, 430], [344, 462], [26, 570], [362, 600]].forEach(([x, y], i) => {
        g.fillStyle(colors[i % colors.length], 0.62)
        i % 2 ? g.fillCircle(x, y, 4) : g.fillRoundedRect(x - 4, y - 2, 8, 4, 2)
      })
      return
    }

    if ((this._town?.bustle ?? 0) >= 70) {
      g.fillStyle(0xffd95a, 0.10)
      g.fillCircle(W - 46, H * 0.37, 44)
      g.fillStyle(0x71d6a2, 0.12)
      g.fillCircle(42, H * 0.53, 34)
    }
  }

  _buildHeader(W) {
    const totalScore = getScore()
    const catches = this._catches
    const rank = Math.max(1, Math.floor(catches.length / 3) + 1)
    const shell = this.add.graphics().setDepth(20)
    shell.fillStyle(0x173248, 0.14)
    shell.fillRoundedRect(10, 14, W - 20, 88, 22)
    shell.fillStyle(0xf8fdff, 0.96)
    shell.lineStyle(2, this._hasKue ? 0xe5b83b : 0x9bcfe5, 0.88)
    shell.fillRoundedRect(10, 10, W - 20, 88, 22)
    shell.strokeRoundedRect(10, 10, W - 20, 88, 22)
    shell.fillStyle(this._hasKue ? 0xfff0b8 : 0xdff5ff, 0.68)
    shell.fillRoundedRect(18, 18, W - 36, 16, 8)

    const profile = this.add.graphics().setDepth(21)
    profile.fillStyle(0xffffff, 0.98)
    profile.lineStyle(1.8, this._hasKue ? 0xe5b83b : 0x9bcfe5, 0.9)
    profile.fillRoundedRect(18, 22, 154, 46, 15)
    profile.strokeRoundedRect(18, 22, 154, 46, 15)
    profile.fillStyle(0xffd95a, 1)
    profile.fillCircle(42, 45, 16)
    profile.lineStyle(2, 0xffffff, 0.75)
    profile.strokeCircle(42, 45, 16)

    this.add.text(42, 45, ICONS.ROD, { fontSize: '18px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(22)
    this.add.text(64, 38, T.player, uiText('cardTitle', { fontSize: '14px' })).setOrigin(0, 0.5).setDepth(22)
    this.add.text(64, 55, this._hasKue ? `RANK ${String(rank).padStart(2, '0')}  LEGEND` : `RANK ${String(rank).padStart(2, '0')}`, uiText('micro', { fontSize: '10px', color: UI_COLORS.warning })).setOrigin(0, 0.5).setDepth(22)
    this.add.rectangle(95, 45, 158, 50, 0x000000, 0).setDepth(23).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('RankScene'))

    this._buildResourceChip(W - 116, 26, ICONS.SCORE, this._shortNum(totalScore), 0xfff5d9)
    this._buildResourceChip(W - 62, 26, ICONS.FISH, this._shortNum(catches.length), 0xdff5ff)
    this._buildResourceBar(W)
  }

  _buildResourceBar(W) {
    const { current: stamina, max: staminaMax, nextRegenMs } = getStaminaState()
    const coins = getScore()
    const gems = parseInt(localStorage.getItem('ainan_gems') ?? '0', 10)
    const bar = this.add.graphics().setDepth(21)
    bar.fillStyle(0xffffff, 0.76)
    bar.fillRoundedRect(22, 73, W - 44, 18, 9)

    const staminaMaxW = W * 0.27
    const staminaW = staminaMaxW * Math.max(0, Math.min(1, stamina / staminaMax))
    bar.fillStyle(0xe9f6ee, 1)
    bar.fillRoundedRect(28, 76, staminaMaxW, 12, 6)
    bar.fillStyle(0x71d6a2, 1)
    bar.fillRoundedRect(28, 76, Math.max(6, staminaW), 12, 6)
    bar.fillStyle(0xffffff, 0.34)
    bar.fillRoundedRect(31, 78, Math.max(0, staminaW - 6), 3, 2)

    const staminaLabel = nextRegenMs > 0 ? `${stamina}/${staminaMax}  ${Math.ceil(nextRegenMs / 60000)}分` : `${stamina}/${staminaMax}`
    this.add.text(20, 82, 'ST', uiText('micro', { fontSize: '8px', color: UI_COLORS.success })).setOrigin(0.5).setDepth(22)
    this.add.text(32 + staminaMaxW, 82, staminaLabel, uiText('micro', { fontSize: '10px', color: UI_COLORS.success })).setOrigin(0, 0.5).setDepth(22)

    const coinX = W * 0.62
    this.add.text(coinX, 82, '●', uiText('micro', { fontSize: '11px', color: '#e5a51c' })).setOrigin(0.5).setDepth(22)
    this.add.text(coinX + 12, 82, this._shortNum(coins), uiText('micro', { fontSize: '11px', color: UI_COLORS.warning })).setOrigin(0, 0.5).setDepth(22)

    const gemX = W * 0.82
    this.add.text(gemX, 82, '◆', uiText('micro', { fontSize: '11px', color: '#58aee0' })).setOrigin(0.5).setDepth(22)
    this.add.text(gemX + 12, 82, this._shortNum(gems), uiText('micro', { fontSize: '11px', color: UI_COLORS.oceanDeep })).setOrigin(0, 0.5).setDepth(22)
  }

  _buildResourceChip(x, y, icon, value, tint) {
    const g = this.add.graphics().setDepth(21)
    g.fillStyle(0x173248, 0.09)
    g.fillRoundedRect(x + 1, y + 2, 48, 36, 13)
    g.fillStyle(0xffffff, 0.98)
    g.lineStyle(1.6, 0x9bcfe5, 0.9)
    g.fillRoundedRect(x, y, 48, 36, 13)
    g.strokeRoundedRect(x, y, 48, 36, 13)
    g.fillStyle(tint, 1)
    g.fillCircle(x + 14, y + 18, 11)
    this.add.text(x + 14, y + 18, icon, { fontSize: '12px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(22)
    this.add.text(x + 33, y + 18, value, uiText('chip', { fontSize: '13px', color: UI_COLORS.ink })).setOrigin(0.5).setDepth(22)
  }

  _buildGrowthBanner(W) {
    const x = 22, y = 108, w = W - 44, h = 54
    const next = this._nextUnlock
    let label = 'PORT GROWTH'
    let title = `${this._town.rank}になった`
    let lead = `にぎわい ${this._town.bustle}/100 ・ 施設Lv ${this._town.totalLevel}`
    let accent = 0x71d6a2
    let action = () => this.scene.start('TownScene')

    if (this._hasKue) {
      label = 'LEGEND PORT'
      title = '黒潮伝説の港になった！'
      lead = 'クエ捕獲記念祭を町で開催中'
      accent = 0xffd95a
    } else if (next) {
      label = 'NEXT SEA'
      title = `${next.name}を解放しよう`
      lead = `${next.unlockedBy}まで町を育てる`
      accent = 0xff765a
    } else if (this._unlocks.unlockedCount >= this._unlocks.totalCount) {
      label = 'ALL SEA OPEN'
      title = `${this._town.rank} ・ 海はすべて解放済み`
      lead = `町のにぎわい ${this._town.bustle}/100 をさらに伸ばそう`
    }

    const g = this.add.graphics().setDepth(10)
    g.fillStyle(0x173248, 0.1)
    g.fillRoundedRect(x + 2, y + 4, w, h, 18)
    g.fillGradientStyle(this._hasKue ? 0xfff0b8 : 0xfff7df, this._hasKue ? 0xfff7db : 0xfff7df, 0xe9f9ff, 0xe9f9ff, 1)
    g.lineStyle(1.8, this._hasKue ? 0xe5b83b : 0x9bcfe5, 0.9)
    g.fillRoundedRect(x, y, w, h, 18)
    g.strokeRoundedRect(x, y, w, h, 18)
    g.fillStyle(accent, 0.96)
    g.fillRoundedRect(x + 9, y + 10, 78, 34, 12)

    this.add.text(x + 48, y + 27, label, uiText('micro', { fontSize: label.length > 9 ? '7px' : '9px', color: this._hasKue ? UI_COLORS.ink : '#ffffff' })).setOrigin(0.5).setDepth(11)
    this.add.text(x + 98, y + 18, title, uiText('cardTitle', { fontSize: '13px' })).setOrigin(0, 0.5).setDepth(11)
    this.add.text(x + 98, y + 37, lead, uiText('micro', { fontSize: '10px', color: this._hasKue ? '#9a6b00' : UI_COLORS.inkSoft })).setOrigin(0, 0.5).setDepth(11)
    this.add.text(x + w - 20, y + h / 2, '›', uiText('cardTitle', { fontSize: '20px', color: UI_COLORS.oceanDeep })).setOrigin(0.5).setDepth(11)
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0).setDepth(12).setInteractive({ useHandCursor: true }).on('pointerdown', action)
  }

  _buildTopShortcuts(W) {
    const progress = getMissionProgress()
    const firstMission = MISSION_META[0]
    const missionValue = Math.min(progress[firstMission.id] ?? 0, firstMission.target)
    const license = this._licenseCount()
    const daily = getDailyBonusState()
    const items = [
      { icon: ICONS.MISSION, title: T.mission, sub: `${missionValue}/${firstMission.target}`, accent: 0x2f9ed4, action: () => this.scene.start('MissionScene') },
      { icon: ICONS.LICENSE, title: T.license, sub: `${license.done}/${license.total}`, accent: 0xffd95a, action: () => this.scene.start('LicenseScene') },
      { icon: ICONS.BONUS, title: T.daily, sub: daily.canClaim ? '受取可' : `${daily.streak}${T.day}`, accent: 0xff765a, action: () => this._showDailyBonus(this.scale.width, this.scale.height) },
    ]
    const gap = 8
    const w = (W - 44 - gap * 2) / 3
    items.forEach((item, i) => this._shortcutCard(22 + i * (w + gap), 170, w, 54, item))
  }

  _shortcutCard(x, y, w, h, item) {
    const g = this.add.graphics().setDepth(13)
    g.fillStyle(0x173248, 0.09)
    g.fillRoundedRect(x + 2, y + 3, w, h, 16)
    g.fillStyle(0xffffff, 0.95)
    g.lineStyle(1.5, 0x9bcfe5, 0.78)
    g.fillRoundedRect(x, y, w, h, 16)
    g.strokeRoundedRect(x, y, w, h, 16)
    g.fillStyle(item.accent, 0.16)
    g.fillCircle(x + 24, y + h / 2, 18)
    this.add.text(x + 24, y + h / 2, item.icon, { fontSize: '19px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(14)
    this.add.text(x + 47, y + 19, item.title, uiText('micro', { fontSize: '10px' })).setOrigin(0, 0.5).setDepth(14)
    this.add.text(x + 47, y + 36, item.sub, uiText('chip', { fontSize: '12px', color: UI_COLORS.ink })).setOrigin(0, 0.5).setDepth(14)
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0).setDepth(15).setInteractive({ useHandCursor: true }).on('pointerdown', item.action)
  }

  _buildGuideCharacter(W, H) {
    const c = this.add.container(W / 2 + 28, H * 0.57).setDepth(7)
    const aura = this.add.graphics()
    aura.fillStyle(0xffffff, 0.35)
    aura.fillEllipse(0, 84, 344, 470)
    aura.fillStyle(this._hasKue ? 0xfff0b8 : 0xdff5ff, this._hasKue ? 0.24 : 0.2)
    aura.fillEllipse(-30, 74, 264, 390)
    const shadow = this.add.graphics()
    shadow.fillStyle(0x173248, 0.14)
    shadow.fillEllipse(0, 316, 194, 28)
    const guide = this.add.image(0, 6, ASSETS.characters.guideDefault.key).setOrigin(0.5).setDisplaySize(438, 658)
    c.add([aura, shadow, guide])
    this.tweens.add({ targets: c, y: H * 0.57 - 5, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
  }

  _buildGuideBubble(W, H) {
    const x = 20, y = H * 0.365, w = 184, h = 74
    const next = this._nextUnlock
    let title = next ? `次は ${next.name}` : `${this._town.rank}になったよ`
    let body = next ? `${next.unlockedBy}で新しい海へ` : `にぎわい ${this._town.bustle}/100 ・ 町を見に行こう`
    let color = next ? UI_COLORS.warning : UI_COLORS.success

    if (this._hasKue) {
      title = '港中がクエの話でもちきり！'
      body = '記念祭の町を見に行こう'
      color = '#a97700'
    }

    const g = this.add.graphics().setDepth(14)
    g.fillStyle(0x173248, 0.12)
    g.fillRoundedRect(x + 2, y + 3, w, h, 18)
    g.fillStyle(this._hasKue ? 0xfffbec : 0xffffff, 0.97)
    g.lineStyle(1.8, this._hasKue ? 0xe5b83b : 0x9bcfe5, 0.9)
    g.fillRoundedRect(x, y, w, h, 18)
    g.strokeRoundedRect(x, y, w, h, 18)
    g.fillStyle(this._hasKue ? 0xfffbec : 0xffffff, 0.97)
    g.fillTriangle(x + w - 4, y + 42, x + w + 16, y + 52, x + w - 4, y + 60)
    this.add.text(x + 14, y + 15, title, uiText('cardTitle', { fontSize: this._hasKue ? '11px' : '13px' })).setDepth(15)
    this.add.text(x + 14, y + 41, body, uiText('micro', { fontSize: '11px', color })).setDepth(15)
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0).setDepth(16).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('TownScene'))
  }

  _buildMainCTA(W, H) {
    const x = W / 2, y = H * 0.805, w = 286, h = 66
    const c = this.add.container(x, y).setDepth(18)
    const g = this.add.graphics()
    const draw = press => {
      g.clear()
      const dy = press ? 2 : 0
      g.fillStyle(0x173248, 0.2)
      g.fillRoundedRect(-w / 2 + 3, -h / 2 + 6, w, h, 22)
      g.fillGradientStyle(0xffeb84, 0xffdf5c, 0xffcf31, 0xffc421, 1)
      g.lineStyle(2.5, 0x173248, 0.78)
      g.fillRoundedRect(-w / 2, -h / 2 + dy, w, h, 22)
      g.strokeRoundedRect(-w / 2, -h / 2 + dy, w, h, 22)
      g.fillStyle(0xffffff, 0.34)
      g.fillRoundedRect(-w / 2 + 14, -h / 2 + 8 + dy, w - 28, 12, 6)
      g.fillStyle(0x1f6f9f, 1)
      g.fillCircle(-w / 2 + 38, dy, 23)
      g.lineStyle(2, 0xffffff, 0.76)
      g.strokeCircle(-w / 2 + 38, dy, 23)
    }
    draw(false)
    const rod = this.add.text(-w / 2 + 38, 0, ICONS.ROD, { fontSize: '24px', resolution: TEXT_RES }).setOrigin(0.5)
    const title = this.add.text(18, -7, T.goFishing, uiText('button', { fontSize: '24px', color: UI_COLORS.ink })).setOrigin(0.5)
    const sub = this.add.text(18, 16, `海 ${this._unlocks.unlockedCount}/${this._unlocks.totalCount} ・ 町 ${this._town.bustle}/100`, uiText('micro', { fontSize: '11px', color: UI_COLORS.inkSoft })).setOrigin(0.5)
    const arrow = this.add.text(w / 2 - 28, 0, '›', uiText('button', { fontSize: '32px', color: UI_COLORS.ink })).setOrigin(0.5)
    const hit = this.add.rectangle(0, 0, w + 12, h + 12, 0x000000, 0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { draw(true); c.setScale(0.985) })
      .on('pointerup', () => this.scene.start('MapScene'))
      .on('pointerout', () => { draw(false); c.setScale(1) })
    c.add([g, rod, title, sub, arrow, hit])
    this.tweens.add({ targets: c, scaleX: 1.014, scaleY: 1.014, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
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
    items.push(this.add.rectangle(W / 2, H / 2, W, H, 0x173248, 0.42).setInteractive().on('pointerdown', () => this._dismissDailyBonus()))
    const x = 36, y = 238, w = W - 72, h = 250
    const bg = this.add.graphics()
    bg.fillStyle(0x173248, 0.14)
    bg.fillRoundedRect(x + 3, y + 5, w, h, 24)
    bg.fillStyle(0xf8fdff, 0.99)
    bg.lineStyle(2.2, 0x9bcfe5, 0.9)
    bg.fillRoundedRect(x, y, w, h, 24)
    bg.strokeRoundedRect(x, y, w, h, 24)
    bg.fillStyle(0xfff5d9, 1)
    bg.fillCircle(W / 2, y + 62, 43)
    items.push(bg)
    items.push(this.add.text(W / 2, y + 62, ICONS.BONUS, { fontSize: '40px', resolution: TEXT_RES }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 118, T.daily, uiText('panelTitle', { fontSize: '22px' })).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 150, `連続${state.streak}${T.day} / ${state.reward}pt`, uiText('chip', { fontSize: '14px', color: UI_COLORS.warning })).setOrigin(0.5))
    items.push(this._smallActionButton(W / 2, y + 196, T.claim, () => { claimDailyBonus(); this.scene.restart() }))
    items.push(this.add.text(W / 2, y + h - 24, T.later, uiText('chip', { fontSize: '13px', color: UI_COLORS.inkSoft })).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this._dismissDailyBonus()))
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
    bg.fillStyle(0x173248, 0.12)
    bg.fillRoundedRect(x - 66, y - 17, 136, 40, 14)
    bg.fillStyle(0xffd95a, 1)
    bg.lineStyle(2, 0x173248, 0.72)
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
    return { done: tasks.filter(task => progress[task.id]).length, total: tasks.length }
  }

  _shortNum(value) {
    if (value >= 10000) return `${Math.floor(value / 1000) / 10}${T.tenThousand}`
    if (value >= 1000) return `${Math.floor(value / 100) / 10}k`
    return `${value}`
  }
}
