import Phaser from 'phaser'
import { FONT, SHADOW } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { ICONS } from '../config/icons.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { getCatches, getPlayerRank, getRankBonuses, getScore } from '../game/progress.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export default class RankScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RankScene' })
  }

  preload() {
    const bg = ASSETS.backgrounds.homeBase
    if (!this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
  }

  create() {
    const { width: W, height: H } = this.scale
    this._background(W, H)
    this._header(W)
    this._rankPanel(W)
    this._skills(W)
    buildFooterNav(this, W, H, 'home')
  }

  _background(W, H) {
    addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillStyle(0xf7fbff, 0.86)
    veil.fillRect(0, 0, W, H)
  }

  _header(W) {
    this.add.text(W / 2, 42, `${ICONS.RANK} 釣り師ランク`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '29px', fontWeight: '900',
      color: '#1a3a5a', shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2, 76, '釣果でランクアップして能力を開放', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900',
      color: '#4a7090',
    }).setOrigin(0.5).setDepth(5)
  }

  _rankPanel(W) {
    const catches = getCatches().length
    const score = getScore()
    const rankInfo = getPlayerRank()
    const { rank, current, nextNeed, title } = rankInfo
    const x = 22
    const y = 116
    const w = W - 44
    const h = 154
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0xffffff, 0.96)
    g.lineStyle(3, 0x1a2a3a, 0.9)
    g.fillRoundedRect(x, y, w, h, 22)
    g.strokeRoundedRect(x, y, w, h, 22)
    g.fillStyle(0xffd900, 0.25)
    g.fillCircle(x + 62, y + 72, 44)
    this.add.text(x + 62, y + 72, `${rank}`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '40px', fontWeight: '900',
      color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(5)
    this.add.text(x + 124, y + 42, title, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '20px', fontWeight: '900',
      color: '#1a3a5a',
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + 124, y + 72, `釣果 ${catches}匹  /  ${score.toLocaleString()}pt`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900',
      color: '#4a7090',
    }).setOrigin(0, 0.5).setDepth(5)
    const bx = x + 124
    const by = y + 106
    g.fillStyle(0xd8e6ee, 1)
    g.fillRoundedRect(bx, by, 190, 14, 7)
    g.fillStyle(0x00aa66, 1)
    g.fillRoundedRect(bx, by, 190 * (current / 3), 14, 7)
    this.add.text(bx + 95, by + 27, `次のランクまで ${nextNeed}匹`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '11px', fontWeight: '900',
      color: '#e07800',
    }).setOrigin(0.5).setDepth(5)
  }

  _skills(W) {
    this.add.text(24, 304, '能力開放', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '18px', fontWeight: '900',
      color: '#1a3a5a',
    }).setDepth(5)
    const bonus = getRankBonuses()
    const skills = [
      { name: 'キャスト', desc: `飛距離 +${Math.round((bonus.castRangeMod - 1) * 100)}%`, lv: Math.max(1, Math.floor(bonus.skillLevel / 2)), icon: '🎯' },
      { name: '引き寄せ', desc: `魚影範囲 +${Math.round((bonus.attractRadiusMod - 1) * 100)}%`, lv: Math.max(1, Math.floor(bonus.skillLevel / 2)), icon: '🌀' },
      { name: '合わせ', desc: `食いつき +${Math.round(bonus.biteRateBonus * 100)}%`, lv: bonus.skillLevel >= 2 ? Math.floor(bonus.skillLevel / 2) : 0, icon: '✨' },
      { name: 'ファイト', desc: `引き寄せ力 +${Math.round((bonus.pullPowerMod - 1) * 100)}%`, lv: bonus.skillLevel >= 3 ? Math.floor(bonus.skillLevel / 3) : 0, icon: '💪' },
    ]
    skills.forEach((s, i) => {
      const x = 22 + (i % 2) * 176
      const y = 338 + Math.floor(i / 2) * 126
      this._skillCard(x, y, 160, 104, s)
    })
  }

  _skillCard(x, y, w, h, skill) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x000000, 0.12)
    g.fillRoundedRect(x + 3, y + 4, w, h, 18)
    g.fillStyle(skill.lv > 0 ? 0xffffff : 0xf3f5f8, 0.97)
    g.lineStyle(2.5, skill.lv > 0 ? 0x5ebcff : 0xaeb8c2, 0.9)
    g.fillRoundedRect(x, y, w, h, 18)
    g.strokeRoundedRect(x, y, w, h, 18)
    g.fillStyle(skill.lv > 0 ? 0xe1f5ff : 0xe8edf2, 1)
    g.fillCircle(x + 31, y + 31, 23)
    this.add.text(x + 31, y + 31, skill.icon, { fontSize: '20px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(5)
    this.add.text(x + 62, y + 24, skill.name, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900',
      color: '#1a3a5a',
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + 62, y + 47, `Lv.${skill.lv}`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '900',
      color: skill.lv > 0 ? '#e07800' : '#7b8794',
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + 16, y + 76, skill.desc, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '11px', fontWeight: '800',
      color: '#4a7090',
      wordWrap: { width: w - 32 },
    }).setOrigin(0, 0.5).setDepth(5)
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
