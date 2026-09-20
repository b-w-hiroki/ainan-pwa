
import Phaser from 'phaser'
import { FONT, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { backupSave, restoreLatestBackup, SAVE_VERSION } from '../game/saveSystem.js'
import { isHapticsEnabled, isReducedMotion, isSoundEnabled, setHapticsEnabled, setReducedMotion, setSoundEnabled } from '../game/feedback.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export default class SettingsScene extends Phaser.Scene {
  constructor() { super({ key: 'SettingsScene' }) }

  preload() {
    const bg = ASSETS.backgrounds.townGrowing
    if (bg?.status === 'ready' && !this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
  }

  create() {
    const W = this.scale.width, H = this.scale.height
    addCoverImage(this, ASSETS.backgrounds.townGrowing.key, W, H, 0)
    this.add.rectangle(W / 2, H / 2, W, H, 0xf7fcff, 0.92).setDepth(1)
    this._header(W)
    this._card(W, 112, 'サウンド', isSoundEnabled() ? 'ON' : 'OFF', () => { setSoundEnabled(!isSoundEnabled()); this.scene.restart() })
    this._card(W, 190, '振動', isHapticsEnabled() ? 'ON' : 'OFF', () => { setHapticsEnabled(!isHapticsEnabled()); this.scene.restart() })
    this._card(W, 268, '動きを減らす', isReducedMotion() ? 'ON' : 'OFF', () => { setReducedMotion(!isReducedMotion()); this.scene.restart() })
    this._card(W, 346, 'セーブバックアップ', '今すぐ保存', () => { backupSave(); this._toast('バックアップしました') })
    this._card(W, 424, 'バックアップ復旧', '復元する', () => { if (restoreLatestBackup()) { this._toast('復元しました'); this.time.delayedCall(350, () => this.scene.start('HomeScene')) } else this._toast('バックアップがありません') })
    this.add.text(30, 522, 'SAVE VERSION  ' + SAVE_VERSION, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.inkSoft }).setDepth(5)
    this.add.text(30, 548, 'Reduced Motionは雨・光・常時ループ演出を抑えます。釣り操作は維持されます。', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '800', color: UI_COLORS.inkSoft, wordWrap: { width: W - 60 } }).setDepth(5)
    buildFooterNav(this, W, H, 'menu')
  }

  _header(W) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0xffffff, 0.97); g.lineStyle(2, 0x9bcfe5, 0.9)
    g.fillRoundedRect(16, 12, W - 32, 82, 22); g.strokeRoundedRect(16, 12, W - 32, 82, 22)
    this.add.text(30, 40, '設定・データ', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '25px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    this.add.text(30, 69, '音・振動・動き・セーブデータを管理', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: UI_COLORS.inkSoft }).setDepth(5)
  }

  _card(W, y, title, value, action) {
    const x = 24, w = W - 48, h = 72
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0xffffff, 0.98); g.lineStyle(1.6, 0xb9d4df, 0.88)
    g.fillRoundedRect(x, y, w, h, 18); g.strokeRoundedRect(x, y, w, h, 18)
    this.add.text(x + 18, y + 24, title, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    this.add.text(x + 18, y + 49, value, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: UI_COLORS.oceanDeep }).setDepth(5)
    const btn = this.add.text(x + w - 18, y + h / 2, '変更 ›', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.warning }).setOrigin(1, 0.5).setDepth(6)
    btn.setInteractive({ useHandCursor: true }).on('pointerdown', action)
  }

  _toast(message) {
    const W = this.scale.width, H = this.scale.height
    const g = this.add.graphics().setDepth(120); g.fillStyle(0x173248, 0.94); g.fillRoundedRect(W / 2 - 112, H - 145, 224, 38, 14)
    const t = this.add.text(W / 2, H - 126, message, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: '#ffffff' }).setOrigin(0.5).setDepth(121)
    this.tweens.add({ targets: [g, t], alpha: 0, delay: 650, duration: 400, onComplete: () => { g.destroy(); t.destroy() } })
  }
}
