import Phaser from 'phaser'
import { FONT, SHADOW, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { getCatches, getPlayerRank, getRankBonuses, getScore } from '../game/progress.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export default class RankScene extends Phaser.Scene {
  constructor() { super({ key: 'RankScene' }) }

  preload() {
    const bg = ASSETS.backgrounds.townGrowing
    if (bg?.status === 'ready' && !this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
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
    addCoverImage(this, ASSETS.backgrounds.townGrowing.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillGradientStyle(0xf8fdff, 0xf8fdff, 0xf3f9fc, 0xf3f9fc, 0.80, 0.80, 0.95, 0.95)
    veil.fillRect(0, 0, W, H)
  }

  _header(W) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x173248, 0.10)
    g.fillRoundedRect(16, 15, W - 32, 68, 20)
    g.fillStyle(0xf8fdff, 0.97)
    g.lineStyle(1.8, 0x9bcfe5, 0.86)
    g.fillRoundedRect(16, 11, W - 32, 68, 20)
    g.strokeRoundedRect(16, 11, W - 32, 68, 20)
    g.fillStyle(0xdff5ff, 0.72)
    g.fillRoundedRect(24, 19, W - 48, 12, 6)
    this.add.text(30, 42, '釣り師ランク', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '24px', fontWeight: '900', color: UI_COLORS.ink, shadow: SHADOW.subtle,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(30, 65, '釣果がそのまま釣り人の力になる', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: UI_COLORS.inkSoft,
    }).setOrigin(0, 0.5).setDepth(5)
  }

  _rankPanel(W) {
    const catches = getCatches().length
    const score = getScore()
    const { rank, current, nextNeed, title } = getPlayerRank()
    const x = 20, y = 102, w = W - 40, h = 176
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x173248, 0.12)
    g.fillRoundedRect(x + 3, y + 5, w, h, 22)
    g.fillStyle(0xf8fdff, 0.98)
    g.lineStyle(1.8, 0x9bcfe5, 0.9)
    g.fillRoundedRect(x, y, w, h, 22)
    g.strokeRoundedRect(x, y, w, h, 22)
    g.fillGradientStyle(0xfff1bd, 0xfff1bd, 0xdff5ff, 0xdff5ff, 0.85, 0.85, 0.85, 0.85)
    g.fillRoundedRect(x + 12, y + 12, w - 24, 86, 18)

    g.fillStyle(0x173248, 0.95)
    g.fillCircle(x + 58, y + 55, 34)
    g.lineStyle(3, 0xffd95a, 0.95)
    g.strokeCircle(x + 58, y + 55, 34)
    this.add.text(x + 58, y + 45, `${rank}`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '28px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5).setDepth(5)
    this.add.text(x + 58, y + 70, 'RANK', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '900', color: '#ffd95a', letterSpacing: 1,
    }).setOrigin(0.5).setDepth(5)

    this.add.text(x + 106, y + 38, title, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '18px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + 106, y + 65, `釣果 ${catches}匹`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.inkSoft,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + w - 22, y + 65, `${score.toLocaleString()} pt`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.warning,
    }).setOrigin(1, 0.5).setDepth(5)

    const bx = x + 24, by = y + 122, bw = w - 48
    g.fillStyle(0xe5eef2, 1)
    g.fillRoundedRect(bx, by, bw, 13, 7)
    const ratio = nextNeed <= 0 ? 1 : Phaser.Math.Clamp(current / Math.max(1, current + nextNeed), 0, 1)
    g.fillStyle(0x71d6a2, 1)
    g.fillRoundedRect(bx, by, Math.max(8, bw * ratio), 13, 7)
    g.fillStyle(0xffffff, 0.32)
    g.fillRoundedRect(bx + 4, by + 2, Math.max(0, bw * ratio - 8), 3, 2)
    this.add.text(bx, by - 8, 'NEXT RANK', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '900', color: UI_COLORS.inkSoft,
    }).setOrigin(0, 1).setDepth(5)
    this.add.text(x + w - 24, by + 31, nextNeed > 0 ? `あと ${nextNeed}匹` : '最高ランク到達', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: nextNeed > 0 ? UI_COLORS.warning : UI_COLORS.success,
    }).setOrigin(1, 0.5).setDepth(5)
  }

  _skills(W) {
    this.add.text(24, 306, 'ランク能力', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '16px', fontWeight: '900', color: UI_COLORS.ink,
    }).setDepth(5)
    this.add.text(W - 24, 310, '自動で強化', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: UI_COLORS.inkSoft,
    }).setOrigin(1, 0).setDepth(5)

    const bonus = getRankBonuses()
    const skills = [
      { name: 'キャスト', desc: `飛距離 +${Math.round((bonus.castRangeMod - 1) * 100)}%`, lv: Math.max(1, Math.floor(bonus.skillLevel / 2)), mark: '距', accent: 0x5bb5d8 },
      { name: '引き寄せ', desc: `魚影範囲 +${Math.round((bonus.attractRadiusMod - 1) * 100)}%`, lv: Math.max(1, Math.floor(bonus.skillLevel / 2)), mark: '影', accent: 0x8f80e8 },
      { name: '合わせ', desc: `食いつき +${Math.round(bonus.biteRateBonus * 100)}%`, lv: bonus.skillLevel >= 2 ? Math.floor(bonus.skillLevel / 2) : 0, mark: '合', accent: 0xffd95a },
      { name: 'ファイト', desc: `引き寄せ力 +${Math.round((bonus.pullPowerMod - 1) * 100)}%`, lv: bonus.skillLevel >= 3 ? Math.floor(bonus.skillLevel / 3) : 0, mark: '力', accent: 0xff765a },
    ]
    skills.forEach((skill, i) => {
      const x = 22 + (i % 2) * 176
      const y = 338 + Math.floor(i / 2) * 126
      this._skillCard(x, y, 160, 106, skill)
    })
  }

  _skillCard(x, y, w, h, skill) {
    const active = skill.lv > 0
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x173248, 0.08)
    g.fillRoundedRect(x + 2, y + 3, w, h, 18)
    g.fillStyle(active ? 0xffffff : 0xf0f3f5, 0.98)
    g.lineStyle(1.6, active ? skill.accent : 0xb7c4ca, active ? 0.82 : 0.55)
    g.fillRoundedRect(x, y, w, h, 18)
    g.strokeRoundedRect(x, y, w, h, 18)
    g.fillStyle(active ? skill.accent : 0xc7d1d6, active ? 0.16 : 0.14)
    g.fillCircle(x + 31, y + 31, 22)
    this.add.text(x + 31, y + 31, skill.mark, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: active ? UI_COLORS.ink : UI_COLORS.muted,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(x + 62, y + 24, skill.name, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + 62, y + 45, active ? `Lv.${skill.lv}` : '未開放', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: active ? UI_COLORS.warning : UI_COLORS.muted,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + 16, y + 78, skill.desc, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: UI_COLORS.inkSoft,
      wordWrap: { width: w - 32 },
    }).setOrigin(0, 0.5).setDepth(5)
  }
}
