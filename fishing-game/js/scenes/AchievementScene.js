import Phaser from 'phaser'
import { FONT, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { ACHIEVEMENT_META, claimAchievement, getAchievementStates, getSelectedTitle, getUnlockedTitles, selectTitle } from '../game/retentionProgress.js'
import { showRewardBanner } from '../game/rewardPresentation.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export default class AchievementScene extends Phaser.Scene {
  constructor() { super({ key: 'AchievementScene' }) }
  preload() {
    const bg = ASSETS.backgrounds.townGrowing
    if (bg?.status === 'ready' && !this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
  }
  create() {
    const W = this.scale.width, H = this.scale.height
    addCoverImage(this, ASSETS.backgrounds.townGrowing.key, W, H, 0)
    this.add.rectangle(W / 2, H / 2, W, H, 0xf7fcff, 0.92).setDepth(1)
    this.add.text(24, 24, '実績・称号', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '25px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    const states = this._safeStates()
    states.slice(0, 7).forEach((a, i) => this._row(W, 72 + i * 72, a))
    const selectedTitle = this._safeSelectedTitle()
    this.add.text(24, 594, '称号: ' + selectedTitle, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.warning }).setDepth(5)
    const titles = this._safeTitles().slice(0, 3)
    titles.forEach((title, i) => {
      const t = this.add.text(24 + i * 116, 620, title, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: UI_COLORS.oceanDeep, backgroundColor: '#dff5ff', padding: { x: 7, y: 5 } }).setDepth(6)
      t.setInteractive({ useHandCursor: true }).on('pointerdown', () => { selectTitle(title); this.scene.restart() })
    })
    buildFooterNav(this, W, H, 'menu')
    const qa = new URLSearchParams(window.location.search)
    if (qa.get('qa') === '1' && qa.get('qaRewardBanner') === 'achievement') {
      showRewardBanner(this, {
        kind: 'achievement',
        detail: '実績を達成しました',
        persistent: true,
        y: 120,
      })
    }
  }
  _safeStates() {
    try {
      const states = getAchievementStates()
      if (Array.isArray(states) && states.length) return states
    } catch (error) {
      console.error('Achievement state read failed', error)
    }
    return ACHIEVEMENT_META.map(meta => ({ ...meta, value: 0, done: false, claimed: false }))
  }

  _safeTitles() {
    try {
      const titles = getUnlockedTitles()
      return Array.isArray(titles) ? titles.filter(title => typeof title === 'string') : []
    } catch (error) {
      console.error('Achievement titles read failed', error)
      return []
    }
  }

  _safeSelectedTitle() {
    try {
      const selected = getSelectedTitle()
      return typeof selected === 'string' && selected ? selected : '未設定'
    } catch (error) {
      console.error('Achievement selected title read failed', error)
      return '未設定'
    }
  }

  _row(W, y, a) {
    const x = 22, w = W - 44, h = 60, g = this.add.graphics().setDepth(4)
    g.fillStyle(0xffffff, 0.98); g.lineStyle(1.5, a.done ? 0xffd95a : 0xb9d4df, 0.86); g.fillRoundedRect(x, y, w, h, 16); g.strokeRoundedRect(x, y, w, h, 16)
    this.add.text(x + 14, y + 16, a.title, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    this.add.text(x + 14, y + 37, a.desc + '  ' + Math.min(a.value, a.target) + '/' + a.target, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '800', color: UI_COLORS.inkSoft }).setDepth(5)
    const reward = (a.rewardScore ? a.rewardScore + 'pt ' : '') + (a.rewardGems ? '◆' + a.rewardGems : '')
    const label = a.claimed ? '受取済' : a.done ? '受取' : reward
    const t = this.add.text(x + w - 14, y + 30, label, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: a.done && !a.claimed ? UI_COLORS.warning : UI_COLORS.inkSoft }).setOrigin(1, 0.5).setDepth(6)
    if (a.done && !a.claimed) t.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (!claimAchievement(a.id)) return
      t.disableInteractive()
      showRewardBanner(this, {
        kind: 'achievement',
        detail: a.title,
        feedback: true,
        duration: 650,
        onComplete: () => this.scene.restart(),
      })
    })
  }
}