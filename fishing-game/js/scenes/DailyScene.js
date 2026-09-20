import Phaser from 'phaser'
import { FONT, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { claimDailyChallenge, getDailyChallengeState } from '../game/retentionProgress.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export default class DailyScene extends Phaser.Scene {
  constructor() { super({ key: 'DailyScene' }) }
  preload() {
    const bg = ASSETS.backgrounds.homeBase
    if (bg?.status === 'ready' && !this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
  }
  create() {
    const W = this.scale.width, H = this.scale.height
    addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)
    this.add.rectangle(W / 2, H / 2, W, H, 0xf7fcff, 0.9).setDepth(1)
    const s = getDailyChallengeState()
    this.add.text(24, 28, '今日の釣り', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '26px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    this.add.text(24, 62, s.focus.fishName + ' は今日 +15%', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.warning }).setDepth(5)
    this._task(W, 118, s.focusTask, 0x5bb5d8)
    this._task(W, 238, s.bigTask, 0xff765a)
    const go = this.add.text(W / 2, 390, '釣り場へ ›', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: UI_COLORS.ink, backgroundColor: '#ffd95a', padding: { x: 20, y: 10 } }).setOrigin(0.5).setDepth(6)
    go.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('MapScene'))
    this.add.text(24, 448, '毎日0:00に更新。天候・時間帯と合わせて狙いを変えよう。', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: UI_COLORS.inkSoft, wordWrap: { width: W - 48 } }).setDepth(5)
    buildFooterNav(this, W, H, 'home')
  }
  _task(W, y, task, accent) {
    const x = 22, w = W - 44, h = 92, g = this.add.graphics().setDepth(4)
    g.fillStyle(0xffffff, 0.98); g.lineStyle(2, accent, 0.85); g.fillRoundedRect(x, y, w, h, 18); g.strokeRoundedRect(x, y, w, h, 18)
    this.add.text(x + 16, y + 20, task.title, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    this.add.text(x + 16, y + 49, Math.floor(task.progress) + '/' + task.target, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.oceanDeep }).setDepth(5)
    const reward = (task.rewardScore ? task.rewardScore + 'pt ' : '') + (task.rewardGems ? '◆' + task.rewardGems : '')
    const label = task.claimed ? '受取済' : task.done ? '受け取る' : reward
    const t = this.add.text(x + w - 16, y + 47, label, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: task.done && !task.claimed ? UI_COLORS.warning : UI_COLORS.inkSoft }).setOrigin(1, 0.5).setDepth(6)
    if (task.done && !task.claimed) t.setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (claimDailyChallenge(task.id)) this.scene.restart() })
  }
}