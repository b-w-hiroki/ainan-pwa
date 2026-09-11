import Phaser from 'phaser'
import { FONT, SHADOW, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { getInventory, getScore, saveInventory, setScore } from '../game/progress.js'
import { getKueChallengeState } from '../game/townUnlocks.js'

const TEXT_RES = window.devicePixelRatio ?? 1
const CLAIM_KEY = 'ainan_challenge_kue_claimed'
const REWARD_SCORE = 800
const REWARD_SPECIAL = 3

export default class ChallengeScene extends Phaser.Scene {
  constructor() { super({ key: 'ChallengeScene' }) }

  preload() {
    const wanted = [ASSETS.backgrounds.fishingCape, ASSETS.fish.kueIcon]
    wanted.forEach(asset => {
      if (asset?.status === 'ready' && !this.textures.exists(asset.key)) this.load.image(asset.key, asset.path)
    })
  }

  create() {
    const { width: W, height: H } = this.scale
    this._state = getKueChallengeState()
    this._claimed = localStorage.getItem(CLAIM_KEY) === '1'
    this._background(W, H)
    this._header(W)
    this._challengeCard(W, H)
    buildFooterNav(this, W, H, 'menu')
  }

  _background(W, H) {
    addCoverImage(this, ASSETS.backgrounds.fishingCape.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillGradientStyle(0x102a3c, 0x102a3c, 0x0d2536, 0x0d2536, 0.36, 0.36, 0.68, 0.68)
    veil.fillRect(0, 0, W, H)
  }

  _header(W) {
    this.add.text(W / 2, 44, '大物挑戦', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '28px', fontWeight: '900', color: '#ffffff', shadow: SHADOW.medium,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2, 78, '港を育てた先に待つ、特別な一匹', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '800', color: '#dff5ff', shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(5)
  }

  _challengeCard(W, H) {
    const state = this._state
    const x = 24, y = 124, w = W - 48, h = 510
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x071a28, 0.28)
    g.fillRoundedRect(x + 4, y + 7, w, h, 26)
    g.fillStyle(0xf8fdff, 0.97)
    g.lineStyle(2, state.completed ? 0xffd95a : 0x9bcfe5, 0.95)
    g.fillRoundedRect(x, y, w, h, 26)
    g.strokeRoundedRect(x, y, w, h, 26)

    g.fillGradientStyle(0x173248, 0x173248, 0x2f6684, 0x2f6684, 1)
    g.fillRoundedRect(x + 14, y + 14, w - 28, 204, 22)
    g.fillStyle(0xffffff, 0.10)
    g.fillCircle(W / 2, y + 105, 78)

    if (this.textures.exists(ASSETS.fish.kueIcon.key)) {
      this.add.image(W / 2, y + 108, ASSETS.fish.kueIcon.key).setDisplaySize(164, 164).setDepth(6)
    }

    const statusLabel = this._claimed ? 'COMPLETE' : state.completed ? 'CLEAR' : state.unlocked ? 'CHALLENGE' : 'LOCKED'
    const statusColor = this._claimed || state.completed ? 0xffd95a : state.unlocked ? 0xff765a : 0x9aaab3
    g.fillStyle(statusColor, 1)
    g.fillRoundedRect(x + 26, y + 28, 94, 28, 12)
    this.add.text(x + 73, y + 42, statusLabel, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: state.completed ? UI_COLORS.ink : '#ffffff', letterSpacing: 1,
    }).setOrigin(0.5).setDepth(7)

    this.add.text(W / 2, y + 246, state.title, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '24px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5).setDepth(6)
    this.add.text(W / 2, y + 281, '伝説魚 クエ', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: UI_COLORS.warning,
    }).setOrigin(0.5).setDepth(6)

    const steps = [
      { label: '1. 町を育てる', value: state.unlocked ? '達成' : 'にぎわい桟橋 Lv.2', done: state.unlocked },
      { label: '2. 黒潮崎へ', value: state.unlocked ? '挑戦可能' : '未解放', done: state.unlocked },
      { label: '3. 特製まき餌でクエを釣る', value: state.completed ? '達成' : '未達成', done: state.completed },
    ]

    steps.forEach((step, i) => {
      const sy = y + 322 + i * 48
      g.fillStyle(step.done ? 0xe7f8ef : 0xf2f6f8, 1)
      g.lineStyle(1.4, step.done ? 0x71d6a2 : 0xc5d7df, 0.9)
      g.fillRoundedRect(x + 22, sy, w - 44, 38, 13)
      g.strokeRoundedRect(x + 22, sy, w - 44, 38, 13)
      this.add.text(x + 38, sy + 19, step.done ? '✓' : '•', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: step.done ? UI_COLORS.success : UI_COLORS.muted,
      }).setOrigin(0.5).setDepth(6)
      this.add.text(x + 56, sy + 13, step.label, {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.ink,
      }).setOrigin(0, 0.5).setDepth(6)
      this.add.text(x + w - 38, sy + 25, step.value, {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '800', color: step.done ? UI_COLORS.success : UI_COLORS.inkSoft,
      }).setOrigin(1, 0.5).setDepth(6)
    })

    this.add.text(W / 2, y + 474, `CLEAR REWARD  ${REWARD_SCORE}pt + 特製まき餌 x${REWARD_SPECIAL}`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.warning,
    }).setOrigin(0.5).setDepth(6)

    if (state.completed && !this._claimed) {
      this._button(W / 2, y + h - 18, '報酬を受け取る', () => this._claim(), true)
    } else if (this._claimed) {
      this._button(W / 2, y + h - 18, '黒潮崎でもう一度', () => this.scene.start('MapScene'), false)
    } else if (state.unlocked) {
      this._button(W / 2, y + h - 18, '黒潮崎へ向かう', () => this.scene.start('MapScene'), true)
    } else {
      this._button(W / 2, y + h - 18, '町を育てる', () => this.scene.start('TownScene'), true)
    }
  }

  _claim() {
    if (localStorage.getItem(CLAIM_KEY) === '1') return
    setScore(getScore() + REWARD_SCORE)
    const inventory = getInventory()
    inventory.baits.special = (inventory.baits.special ?? 0) + REWARD_SPECIAL
    saveInventory(inventory)
    localStorage.setItem(CLAIM_KEY, '1')
    this.scene.restart()
  }

  _button(x, y, label, action, primary) {
    const w = 218, h = 48
    const c = this.add.container(x, y).setDepth(9)
    const bg = this.add.graphics()
    bg.fillStyle(0x173248, 0.16)
    bg.fillRoundedRect(-w / 2 + 2, -h / 2 + 4, w, h, 16)
    bg.fillStyle(primary ? 0xffd95a : 0xdff5ff, 1)
    bg.lineStyle(2, 0x173248, 0.78)
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 16)
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 16)
    const text = this.add.text(0, 0, label, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5)
    const hit = this.add.rectangle(0, 0, w + 8, h + 8, 0x000000, 0).setInteractive({ useHandCursor: true }).on('pointerdown', action)
    c.add([bg, text, hit])
  }
}
