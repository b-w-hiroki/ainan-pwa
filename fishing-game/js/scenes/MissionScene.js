import Phaser from 'phaser'
import { FONT, SHADOW } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { ICONS } from '../config/icons.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { MISSION_META, getMissionProgress, getClaimedMissions, saveClaimedMissions, getScore, setScore } from '../game/progress.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export default class MissionScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MissionScene' })
  }

  preload() {
    const bg = ASSETS.backgrounds.homeBase
    if (!this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
  }

  create() {
    const { width: W, height: H } = this.scale
    this._background(W, H)
    this._header(W)
    this._list(W)
    this._back(W)
    buildFooterNav(this, W, H, 'home')
  }

  _background(W, H) {
    addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillStyle(0xf4fbff, 0.86)
    veil.fillRect(0, 0, W, H)
  }

  _header(W) {
    this.add.text(W / 2, 42, `${ICONS.MISSION} 今日のミッション`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '28px', fontWeight: '900',
      color: '#1a3a5a', shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2, 76, '達成して釣果ポイントを集めよう', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900',
      color: '#4a7090',
    }).setOrigin(0.5).setDepth(5)
  }

  _list(W) {
    const progress = getMissionProgress()
    const claimed = getClaimedMissions()
    MISSION_META.forEach((m, i) => {
      const y = 118 + i * 118
      const value = Math.min(progress[m.id] ?? 0, m.target)
      const done = value >= m.target
      const isClaimed = !!claimed[m.id]
      this._card(22, y, W - 44, 96, m, value, done, isClaimed)
    })
  }

  _card(x, y, w, h, mission, value, done, claimed) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x000000, 0.12)
    g.fillRoundedRect(x + 3, y + 4, w, h, 18)
    g.fillStyle(0xffffff, 0.97)
    g.lineStyle(2.5, done ? 0x00aa66 : 0x1a2a3a, done ? 0.95 : 0.72)
    g.fillRoundedRect(x, y, w, h, 18)
    g.strokeRoundedRect(x, y, w, h, 18)
    g.fillStyle(done ? 0xdff8ec : 0xeaf4ff, 1)
    g.fillCircle(x + 38, y + 48, 26)

    this.add.text(x + 38, y + 48, done ? '✓' : ICONS.MISSION, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: done ? '25px' : '20px', fontWeight: '900',
      color: done ? '#00aa66' : '#1a3a5a',
    }).setOrigin(0.5).setDepth(5)
    this.add.text(x + 76, y + 24, mission.title, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '16px', fontWeight: '900',
      color: '#1a3a5a',
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + 76, y + 47, mission.desc, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '800',
      color: '#4a7090',
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + 76, y + 72, `${value}/${mission.target}   報酬 ${mission.reward}pt`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '900',
      color: '#e07800',
    }).setOrigin(0, 0.5).setDepth(5)

    const label = claimed ? '受取済' : done ? '受け取る' : '挑戦中'
    const bx = x + w - 72
    const by = y + 49
    const btn = this.add.graphics().setDepth(5)
    btn.fillStyle(claimed ? 0xd8e0e8 : done ? 0xffd900 : 0xf1f5f9, 1)
    btn.lineStyle(2, 0x1a2a3a, done && !claimed ? 1 : 0.35)
    btn.fillRoundedRect(bx - 50, by - 18, 100, 36, 13)
    btn.strokeRoundedRect(bx - 50, by - 18, 100, 36, 13)
    this.add.text(bx, by, label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900',
      color: claimed ? '#6b7f8f' : '#1a2a3a',
    }).setOrigin(0.5).setDepth(6)

    if (done && !claimed) {
      this.add.rectangle(bx, by, 108, 44, 0x000000, 0)
        .setDepth(7)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this._claim(mission))
    }
  }

  _claim(mission) {
    const claimed = getClaimedMissions()
    if (claimed[mission.id]) return
    claimed[mission.id] = true
    saveClaimedMissions(claimed)
    setScore(getScore() + mission.reward)
    this.scene.restart()
  }

  _back(W) {
    const txt = this.add.text(16, 16, `${ICONS.BACK} ホーム`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '15px', fontWeight: '900',
      color: '#1a3a5a',
      backgroundColor: '#ffffff',
      padding: { x: 14, y: 9 },
    }).setDepth(20).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('HomeScene'))
  }
}
