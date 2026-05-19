import Phaser from 'phaser'
import { FONT, SHADOW } from '../config/fontStyles.js'
import { ICONS } from '../config/icons.js'
import { ASSETS } from '../config/assetManifest.js'
import { Button } from '../ui/Button.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { MISSION_META, getMissionProgress } from '../game/progress.js'

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
    this._buildMainCTA(W, H)
    this._buildBanners(W, H)
    buildFooterNav(this, W, H, 'home')
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
    const logoGroup = this.add.container(W / 2, H * 0.18).setDepth(10)
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

    const tagBg = this.add.graphics().setDepth(9)
    tagBg.fillStyle(0x123a54, 0.34)
    tagBg.fillRoundedRect(W / 2 - 122, H * 0.247 - 15, 244, 30, 15)
    this.add.text(W / 2, H * 0.247, '釣って、集めて、港をにぎやかに', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900',
      color: '#ffffff', shadow: SHADOW.medium,
    }).setOrigin(0.5).setDepth(10)
  }

  _buildMainCTA(W, H) {
    new Button(this, {
      x: W / 2, y: H * 0.39,
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
    hintBg.fillRoundedRect(W / 2 - 120, H * 0.39 + 38, 240, 27, 14)
    hintBg.strokeRoundedRect(W / 2 - 120, H * 0.39 + 38, 240, 27, 14)
    this.add.text(W / 2, H * 0.39 + 52, '釣り場を選んで出発', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(10)
  }

  _buildBanners(W, H) {
    const progress = getMissionProgress()
    const firstMission = MISSION_META[0]
    const missionValue = Math.min(progress[firstMission.id] ?? 0, firstMission.target)
    const completedLicenses = this._licenseCount()
    this._banner(22, H * 0.50, W - 44, 70, '釣り免許', `進行度 ${completedLicenses}/9  遊び方を覚えよう`, 0xffd900, ICONS.LICENSE, () => this.scene.start('LicenseScene'))
    this._banner(22, H * 0.60, W - 44, 70, '今日のミッション', `${firstMission.title}  ${missionValue}/${firstMission.target}`, 0x5ebcff, ICONS.MISSION, () => this.scene.start('MissionScene'))
    this._banner(22, H * 0.70, W - 44, 62, '釣り師ランク', '釣果でランクアップして能力を開放', 0xff9b5e, ICONS.RANK, () => this.scene.start('RankScene'))
  }

  _licenseCount() {
    const catches = JSON.parse(localStorage.getItem('ainan_catches') ?? '[]')
    const checks = [
      localStorage.getItem('ainan_went_fishing') === '1',
      catches.length >= 1,
      localStorage.getItem('ainan_seen_book') === '1',
      localStorage.getItem('ainan_seen_upgrade') === '1',
      localStorage.getItem('ainan_touched_tackle') === '1',
      catches.length >= 3,
      localStorage.getItem('ainan_seen_spot') === '1',
      localStorage.getItem('ainan_seen_upgrade') === '1',
      catches.length >= 3 && localStorage.getItem('ainan_seen_book') === '1' && localStorage.getItem('ainan_seen_upgrade') === '1' && localStorage.getItem('ainan_seen_spot') === '1',
    ]
    return checks.filter(Boolean).length
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
    this.add.text(x + 74, y + 20, title, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '16px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0, 0.5).setDepth(13)
    this.add.text(x + 74, y + 45, desc, {
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
