import Phaser from 'phaser'
import { FONT, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { backupSave, exportSaveData, getBackupSummaries, importSaveData, restoreLatestBackup, SAVE_VERSION } from '../game/saveSystem.js'
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
    const backups = getBackupSummaries()
    const validBackups = backups.filter(item => item.exists && item.valid).length
    const cards = [
      ['サウンド', isSoundEnabled() ? 'ON' : 'OFF', () => { setSoundEnabled(!isSoundEnabled()); this.scene.restart() }],
      ['振動', isHapticsEnabled() ? 'ON' : 'OFF', () => { setHapticsEnabled(!isHapticsEnabled()); this.scene.restart() }],
      ['動きを減らす', isReducedMotion() ? 'ON' : 'OFF', () => { setReducedMotion(!isReducedMotion()); this.scene.restart() }],
      ['バックアップ', '3世代 / 有効 ' + validBackups, () => { backupSave(); this._toast('バックアップしました'); this.time.delayedCall(350, () => this.scene.restart()) }],
      ['最新を復旧', validBackups ? '復元可能' : 'バックアップなし', () => { if (restoreLatestBackup()) { this._toast('復元しました'); this.time.delayedCall(350, () => this.scene.start('HomeScene')) } else this._toast('復元できません') }],
      ['データを書き出す', 'JSONをコピー', () => this._export()],
      ['データを読み込む', 'JSONから復元', () => this._import()],
    ]
    cards.forEach((item, i) => this._card(W, 104 + i * 67, item[0], item[1], item[2]))
    this.add.text(30, 586, 'SAVE VERSION  ' + SAVE_VERSION, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: UI_COLORS.inkSoft }).setDepth(5)
    this.add.text(30, 606, '書き出しデータには端末内のゲーム進行だけが含まれます。', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '800', color: UI_COLORS.inkSoft, wordWrap: { width: W - 60 } }).setDepth(5)
    buildFooterNav(this, W, H, 'menu')
  }
  _header(W) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0xffffff, 0.97); g.lineStyle(2, 0x9bcfe5, 0.9); g.fillRoundedRect(16, 12, W - 32, 78, 22); g.strokeRoundedRect(16, 12, W - 32, 78, 22)
    this.add.text(30, 38, '設定・データ', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '24px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    this.add.text(30, 65, '音・振動・動き・3世代バックアップを管理', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '800', color: UI_COLORS.inkSoft }).setDepth(5)
  }
  _card(W, y, title, value, action) {
    const x = 24, w = W - 48, h = 56, g = this.add.graphics().setDepth(4)
    g.fillStyle(0xffffff, 0.98); g.lineStyle(1.4, 0xb9d4df, 0.86); g.fillRoundedRect(x, y, w, h, 15); g.strokeRoundedRect(x, y, w, h, 15)
    this.add.text(x + 16, y + 17, title, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    this.add.text(x + 16, y + 37, value, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '800', color: UI_COLORS.oceanDeep }).setDepth(5)
    const btn = this.add.text(x + w - 16, y + h / 2, '実行 ›', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.warning }).setOrigin(1, 0.5).setDepth(6)
    btn.setInteractive({ useHandCursor: true }).on('pointerdown', action)
  }
  async _export() {
    const value = exportSaveData()
    try {
      await navigator.clipboard?.writeText?.(value)
      this._toast('セーブJSONをコピーしました')
    } catch {
      window.prompt('このJSONを保存してください', value)
    }
  }
  _import() {
    const value = window.prompt('AINANのセーブJSONを貼り付けてください')
    if (!value) return
    if (importSaveData(value)) { this._toast('インポートしました'); this.time.delayedCall(350, () => this.scene.start('HomeScene')) }
    else this._toast('データが不正です')
  }
  _toast(message) {
    const W = this.scale.width, H = this.scale.height
    const g = this.add.graphics().setDepth(120); g.fillStyle(0x173248, 0.94); g.fillRoundedRect(W / 2 - 120, H - 145, 240, 38, 14)
    const t = this.add.text(W / 2, H - 126, message, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: '#ffffff' }).setOrigin(0.5).setDepth(121)
    this.tweens.add({ targets: [g, t], alpha: 0, delay: 650, duration: 400, onComplete: () => { g.destroy(); t.destroy() } })
  }
}