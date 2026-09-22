
import Phaser from 'phaser'
import { FONT, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { FISH_META } from '../game/progress.js'
import { BOSS_META, claimBossReward, getBossStates } from '../game/midgameProgression.js'
import { getFishingPointUnlock } from '../game/townUnlocks.js'
import { isReducedMotion } from '../game/feedback.js'

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
    const ready = unlock.unlocked && !cleared
    const style = BOSS_STYLE[state.id] ?? BOSS_STYLE.harborRunner
    const status = !unlock.unlocked
      ? { label: 'LOCKED', color: 0x7f8c94, text: '#ffffff' }
      : cleared
        ? { label: '★ CLEARED', color: 0xffd95a, text: '#173248' }
        : { label: 'CHALLENGE READY', color: style.accent, text: '#ffffff' }
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(cleared ? 0xfffbec : ready ? 0xf9fdff : 0xf2f5f6, 0.98)
    g.lineStyle(cleared ? 3.2 : ready ? 2.8 : 2.2, cleared ? 0xffd95a : ready ? style.accent : 0x9aaab3, 0.96)
    g.fillRoundedRect(x, y, w, h, 22); g.strokeRoundedRect(x, y, w, h, 22)
    g.fillStyle(style.accent, unlock.unlocked ? 0.11 : 0.04)
    g.fillRoundedRect(x + 10, y + 10, 132, h - 20, 18)
    g.fillStyle(cleared ? 0xffd95a : style.accent, 0.96)
    g.fillRoundedRect(x + 10, y + 10, 82, 22, 9)
    g.fillStyle(cleared ? 0xffd95a : style.accent, cleared ? 0.20 : ready ? 0.15 : 0.05)
    g.fillCircle(x + 76, y + 84, 58)

    if (ready) {
      const glow = this.add.circle(x + 76, y + 84, 62, style.accent, 0.06)
        .setStrokeStyle(3, style.accent, 0.42)
        .setDepth(4.5)
      if (!isReducedMotion()) {
        this.tweens.add({
          targets: glow,
          alpha: { from: 0.18, to: 0.62 },
          scaleX: 1.08,
          scaleY: 1.08,
          duration: 820,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })
      }
    }

    const bossArt = ASSETS.bosses[state.id]
    if (bossArt?.key && this.textures.exists(bossArt.key)) {
      const image = this.add.image(x + 76, y + 86, bossArt.key).setDisplaySize(state.id === 'kue' ? 136 : 126, state.id === 'kue' ? 84 : 77).setDepth(5)
      if (!unlock.unlocked) image.setTint(0x617078).setAlpha(0.28)
      if (cleared) image.setAlpha(0.96)
    } else {
      this.add.text(x + 76, y + 86, fish.icon, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '24px', fontWeight: '900', color: cleared ? '#a97700' : UI_COLORS.oceanDeep }).setOrigin(0.5).setDepth(5)
    }
    this.add.text(x + 51, y + 21, style.tag, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '900', color: cleared ? '#173248' : '#ffffff' }).setOrigin(0.5).setDepth(6)

    const statusChip = this.add.text(x + w - 16, y + 18, status.label, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '900',
      color: status.text, backgroundColor: '#' + status.color.toString(16).padStart(6, '0'),
      padding: { x: 7, y: 4 },
    }).setOrigin(1, 0).setDepth(7)

    this.add.text(x + 154, y + 24, state.title, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    this.add.text(x + 154, y + 51, fish.name + '  ' + state.minSize + 'cm以上', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.warning }).setDepth(5)
    if (cleared) {
      const bestBg = this.add.graphics().setDepth(5)
      bestBg.fillStyle(0xffd95a, 0.16)
      bestBg.lineStyle(1.5, 0xe0b735, 0.72)
      bestBg.fillRoundedRect(x + 150, y + 68, 112, 26, 10)
      bestBg.strokeRoundedRect(x + 150, y + 68, 112, 26, 10)
      this.add.text(x + 206, y + 81, 'BEST  ' + state.sizeCm + 'cm', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: '#a97700',
      }).setOrigin(0.5).setDepth(6)
    } else {
      this.add.text(x + 154, y + 76, unlock.unlocked ? '記録更新を狙え' : '未解放: ' + unlock.unlockedBy, {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800',
        color: unlock.unlocked ? UI_COLORS.oceanDeep : UI_COLORS.inkSoft,
      }).setDepth(5)
    }
    this.add.text(x + 154, y + 100, style.sub, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '800', color: UI_COLORS.inkSoft }).setDepth(5)
    if (!unlock.unlocked) {
      const lockVeil = this.add.graphics().setDepth(6)
      lockVeil.fillStyle(0x173248, 0.08)
      lockVeil.fillRoundedRect(x + 10, y + 36, 132, h - 46, 16)
      lockVeil.lineStyle(1.5, 0xffffff, 0.20)
      for (let yy = y + 48; yy < y + h - 10; yy += 18) {
        lockVeil.lineBetween(x + 18, yy, x + 130, yy - 32)
      }
      this.add.text(x + 76, y + 118, 'SILHOUETTE', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '7px', fontWeight: '900',
        color: '#7d8b91', letterSpacing: 1,
      }).setOrigin(0.5).setDepth(7)
    }

    if (cleared) {
      const medal = this.add.circle(x + 116, y + 130, 16, 0xffd95a, 0.98)
        .setStrokeStyle(2, 0xffffff, 0.80).setDepth(6)
      this.add.text(x + 116, y + 130, '★', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: '#173248',
      }).setOrigin(0.5).setDepth(7)
    }

    this.add.text(x + 18, y + 133, '報酬  ' + state.rewardScore + 'pt' + (state.rewardGems ? ' + ◆' + state.rewardGems : ''), { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.inkSoft }).setDepth(5)

    let label = '挑戦する'
    let action = () => this.scene.start('GameScene', { point: state.pointId, bossId: state.id })
    if (!unlock.unlocked) { label = '町を育てる'; action = () => this.scene.start('TownScene') }
    if (cleared && !state.claimed) { label = '報酬を受け取る'; action = () => { if (claimBossReward(state.id)) this.scene.restart() } }
    if (cleared && state.claimed) { label = 'もう一度挑戦'; action = () => this.scene.start('GameScene', { point: state.pointId, bossId: state.id }) }

    const buttonBg = !unlock.unlocked ? '#dfe7ea' : cleared && !state.claimed ? '#ffd95a' : cleared ? '#fff0b8' : '#' + style.accent.toString(16).padStart(6, '0')
    const buttonFg = ready ? '#ffffff' : UI_COLORS.ink
    const btn = this.add.text(x + w - 18, y + 139, label, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900',
      color: action ? buttonFg : UI_COLORS.muted,
      backgroundColor: action ? buttonBg : '#edf2f4',
      padding: { x: 10, y: 6 },
    }).setOrigin(1, 0.5).setDepth(7)
    if (action) btn.setInteractive({ useHandCursor: true }).on('pointerdown', action)
  }
}
