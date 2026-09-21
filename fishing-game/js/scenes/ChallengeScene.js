
import Phaser from 'phaser'
import { FONT, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { FISH_META } from '../game/progress.js'
import { BOSS_META, claimBossReward, getBossStates } from '../game/midgameProgression.js'
import { getFishingPointUnlock } from '../game/townUnlocks.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const BOSS_STYLE = {
  harborRunner: { accent: 0x5bb5d8, tag: 'SPEED', sub: '高速で海面を切り裂く' },
  bayHunter: { accent: 0x8f80e8, tag: 'HUNTER', sub: '急な切り返しで揺さぶる' },
  kue: { accent: 0xff765a, tag: 'HEAVY', sub: '深場から重量で押し返す' },
}

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
    Object.values(BOSS_META).forEach((meta, i) => this._bossCard(18, 108 + i * 180, W - 36, 166, states[meta.id]))
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
    const style = BOSS_STYLE[state.id] ?? BOSS_STYLE.harborRunner
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(cleared ? 0xfffbec : 0xf8fdff, 0.98)
    g.lineStyle(2.6, cleared ? 0xffd95a : unlock.unlocked ? style.accent : 0x9aaab3, 0.94)
    g.fillRoundedRect(x, y, w, h, 22); g.strokeRoundedRect(x, y, w, h, 22)
    g.fillStyle(style.accent, unlock.unlocked ? 0.11 : 0.04)
    g.fillRoundedRect(x + 10, y + 10, 132, h - 20, 18)
    g.fillStyle(cleared ? 0xffd95a : style.accent, 0.96)
    g.fillRoundedRect(x + 10, y + 10, 82, 22, 9)
    g.fillStyle(cleared ? 0xffd95a : style.accent, cleared ? 0.18 : 0.10)
    g.fillCircle(x + 76, y + 84, 58)
    const bossArt = ASSETS.bosses[state.id]
    if (bossArt?.key && this.textures.exists(bossArt.key)) {
      const image = this.add.image(x + 76, y + 86, bossArt.key).setDisplaySize(state.id === 'kue' ? 136 : 126, state.id === 'kue' ? 84 : 77).setDepth(5)
      if (!unlock.unlocked) image.setTint(0x87939a).setAlpha(0.42)
    } else {
      this.add.text(x + 76, y + 86, fish.icon, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '24px', fontWeight: '900', color: cleared ? '#a97700' : UI_COLORS.oceanDeep }).setOrigin(0.5).setDepth(5)
    }
    this.add.text(x + 51, y + 21, style.tag, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '900', color: cleared ? '#173248' : '#ffffff' }).setOrigin(0.5).setDepth(6)
    this.add.text(x + 154, y + 24, state.title, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    this.add.text(x + 154, y + 51, fish.name + '  ' + state.minSize + 'cm以上', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.warning }).setDepth(5)
    this.add.text(x + 154, y + 76, cleared ? 'BEST ' + state.sizeCm + 'cm' : unlock.unlocked ? '挑戦可能' : '未解放: ' + unlock.unlockedBy, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: cleared ? UI_COLORS.success : UI_COLORS.inkSoft }).setDepth(5)
    this.add.text(x + 154, y + 100, style.sub, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '800', color: UI_COLORS.inkSoft }).setDepth(5)
    this.add.text(x + 18, y + 133, '報酬  ' + state.rewardScore + 'pt' + (state.rewardGems ? ' + ◆' + state.rewardGems : ''), { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.inkSoft }).setDepth(5)

    let label = '挑戦する'
    let action = () => this.scene.start('GameScene', { point: state.pointId, bossId: state.id })
    if (!unlock.unlocked) { label = '町を育てる'; action = () => this.scene.start('TownScene') }
    if (cleared && !state.claimed) { label = '報酬を受け取る'; action = () => { if (claimBossReward(state.id)) this.scene.restart() } }
    if (cleared && state.claimed) { label = 'もう一度挑戦'; action = () => this.scene.start('GameScene', { point: state.pointId, bossId: state.id }) }

    const btn = this.add.text(x + w - 18, y + 139, label, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: action ? UI_COLORS.ink : UI_COLORS.muted, backgroundColor: action ? '#ffd95a' : '#edf2f4', padding: { x: 10, y: 6 } }).setOrigin(1, 0.5).setDepth(6)
    if (action) btn.setInteractive({ useHandCursor: true }).on('pointerdown', action)
  }
}
