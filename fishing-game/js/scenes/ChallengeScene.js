
import Phaser from 'phaser'
import { FONT, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { FISH_META } from '../game/progress.js'
import { BOSS_META, claimBossReward, getBossStates } from '../game/midgameProgression.js'
import { getFishingPointUnlock } from '../game/townUnlocks.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export default class ChallengeScene extends Phaser.Scene {
  constructor() { super({ key: 'ChallengeScene' }) }

  preload() {
    const wanted = [ASSETS.backgrounds.fishingCape, ...Object.values(ASSETS.bosses)]
    wanted.forEach(asset => {
      if (asset?.status === 'ready' && !this.textures.exists(asset.key)) this.load.image(asset.key, asset.path)
    })
  }

  create() {
    const W = this.scale.width, H = this.scale.height
    addCoverImage(this, ASSETS.backgrounds.fishingCape.key, W, H, 0)
    this.add.rectangle(W / 2, H / 2, W, H, 0x08283a, 0.58).setDepth(1)
    this._header(W)
    const states = getBossStates()
    Object.values(BOSS_META).forEach((meta, i) => this._bossCard(22, 112 + i * 177, W - 44, 158, states[meta.id]))
    buildFooterNav(this, W, H, 'menu')
  }

  _header(W) {
    this.add.text(W / 2, 36, '大物挑戦', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '27px', fontWeight: '900', color: '#ffffff' }).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2, 70, '各海の主を記録サイズで仕留める', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '800', color: '#dff5ff' }).setOrigin(0.5).setDepth(5)
  }

  _bossCard(x, y, w, h, state) {
    const unlock = getFishingPointUnlock(state.pointId)
    const fish = FISH_META[state.fishId] ?? { name: state.fishId, icon: '魚' }
    const cleared = state.cleared
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(cleared ? 0xfffbec : 0xf8fdff, 0.98)
    g.lineStyle(2.4, cleared ? 0xffd95a : unlock.unlocked ? 0xff765a : 0x9aaab3, 0.92)
    g.fillRoundedRect(x, y, w, h, 20); g.strokeRoundedRect(x, y, w, h, 20)
    g.fillStyle(cleared ? 0xffd95a : 0x173248, cleared ? 0.18 : 0.08)
    g.fillCircle(x + 58, y + 62, 48)
    const bossArt = ASSETS.bosses[state.id]
    if (bossArt?.key && this.textures.exists(bossArt.key)) {
      const image = this.add.image(x + 59, y + 62, bossArt.key).setDisplaySize(state.id === 'kue' ? 116 : 108, state.id === 'kue' ? 72 : 66).setDepth(5)
      if (!unlock.unlocked) image.setTint(0x87939a).setAlpha(0.42)
    } else {
      this.add.text(x + 58, y + 62, fish.icon, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '24px', fontWeight: '900', color: cleared ? '#a97700' : UI_COLORS.oceanDeep }).setOrigin(0.5).setDepth(5)
    }
    this.add.text(x + 18, y + 16, 'BOSS', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '900', color: cleared ? '#a97700' : '#d65d47' }).setDepth(6)
    this.add.text(x + 100, y + 25, state.title, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    this.add.text(x + 100, y + 51, fish.name + '  ' + state.minSize + 'cm以上', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.warning }).setDepth(5)
    this.add.text(x + 100, y + 76, cleared ? 'BEST ' + state.sizeCm + 'cm' : unlock.unlocked ? '挑戦可能' : '未解放: ' + unlock.unlockedBy, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: cleared ? UI_COLORS.success : UI_COLORS.inkSoft }).setDepth(5)
    this.add.text(x + 18, y + 111, '報酬  ' + state.rewardScore + 'pt' + (state.rewardGems ? ' + ◆' + state.rewardGems : ''), { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.inkSoft }).setDepth(5)

    let label = '釣り場へ'
    let action = () => this.scene.start('MapScene')
    if (!unlock.unlocked) { label = '町を育てる'; action = () => this.scene.start('TownScene') }
    if (cleared && !state.claimed) { label = '報酬を受け取る'; action = () => { if (claimBossReward(state.id)) this.scene.restart() } }
    if (cleared && state.claimed) { label = 'TROPHY 獲得済み'; action = null }

    const btn = this.add.text(x + w - 18, y + 126, label, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: action ? UI_COLORS.ink : UI_COLORS.muted, backgroundColor: action ? '#ffd95a' : '#edf2f4', padding: { x: 10, y: 6 } }).setOrigin(1, 0.5).setDepth(6)
    if (action) btn.setInteractive({ useHandCursor: true }).on('pointerdown', action)
  }
}
