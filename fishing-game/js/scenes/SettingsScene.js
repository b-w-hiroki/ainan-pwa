import { characterAppearanceCard } from '../game/characterAppearance.js'
import Phaser from 'phaser'
import { FONT, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { backupSave, exportSaveData, getBackupSummaries, importSaveData, restoreLatestBackup, SAVE_VERSION } from '../game/saveSystem.js'
import { isHapticsEnabled, isReducedMotion, isSoundEnabled, setHapticsEnabled, setReducedMotion, setSoundEnabled, supportsHaptics } from '../game/feedback.js'
import { exportDiagnostics } from '../game/diagnostics.js'
import { buildSettingsCards } from '../game/settingsEntries.js'

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
    const cards = [...buildSettingsCards(this), characterAppearanceCard(this)]
    cards.forEach((item, i) => this._card(W, 96 + i * 61, item[0], item[1], item[2]))
    this.add.text(30, 653, 'SAVE VERSION  ' + SAVE_VERSION, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: UI_COLORS.inkSoft }).setDepth(5)
    this.add.text(30, 673, '書き出しデータには端末内のゲーム進行だけが含まれます。', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '800', color: UI_COLORS.inkSoft, wordWrap: { width: W - 60 } }).setDepth(5)
    buildFooterNav(this, W, H, 'menu')
  }
  _header(W) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0xffffff, 0.97); g.lineStyle(2, 0x9bcfe5, 0.9); g.fillRoundedRect(16, 12, W - 32, 78, 22); g.strokeRoundedRect(16, 12, W - 32, 78, 22)
    this.add.text(30, 38, '設定・データ', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '24px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    this.add.text(30, 65, '音・振動・動き・3世代バックアップを管理', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '800', color: UI_COLORS.inkSoft }).setDepth(5)
  }
  _card(W, y, title, value, action) {
    const x = 24, w = W - 48, h = 52, g = this.add.graphics().setDepth(4)
    g.fillStyle(0xffffff, 0.98); g.lineStyle(1.4, 0xb9d4df, 0.86); g.fillRoundedRect(x, y, w, h, 15); g.strokeRoundedRect(x, y, w, h, 15)
    this.add.text(x + 16, y + 17, title, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    this.add.text(x + 16, y + 37, value, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '800', color: UI_COLORS.oceanDeep }).setDepth(5)
    const btn = this.add.text(x + w - 16, y + h / 2, '実行 ›', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.warning }).setOrigin(1, 0.5).setDepth(6)
    // The original 10px text alone was the hit target. Give every Settings
    // action a 96×52 CSS-pixel touch zone without creating two listeners.
    this.add.rectangle(x + w - 96, y, 96, h, 0x000000, 0.001)
      .setOrigin(0).setDepth(7).setInteractive({ useHandCursor: true })
      .on('pointerdown', action)
  }
  async _export() {
    const value = exportSaveData()
    // Optional chaining used to report success even when clipboard.writeText
    // was absent (notably on some standalone/Safari contexts).
    if (typeof navigator.clipboard?.writeText !== 'function') {
      window.prompt('このJSONを保存してください', value)
      return
    }
    try {
      await navigator.clipboard.writeText(value)
      this._toast('セーブJSONをコピーしました')
    } catch {
      window.prompt('このJSONを保存してください', value)
    }
  }
  async _exportDiagnostics() {
    const value = exportDiagnostics()
    if (typeof navigator.clipboard?.writeText !== 'function') {
      window.prompt('この診断JSONを保存してください', value)
      return
    }
    try {
      await navigator.clipboard.writeText(value)
      this._toast('診断ログをコピーしました')
    } catch {
      window.prompt('この診断JSONを保存してください', value)
    }
  }
  _import() {
    const value = window.prompt('AINANのセーブJSONを貼り付けてください')
    if (!value) return
    if (importSaveData(value)) { this._toast('インポートしました'); this.time.delayedCall(350, () => this.scene.start('HomeScene')) }
    else this._toast('読み込みに失敗しました')
  }
  _toast(message) {
    const W = this.scale.width, H = this.scale.height
    const g = this.add.graphics().setDepth(120); g.fillStyle(0x173248, 0.94); g.fillRoundedRect(W / 2 - 120, H - 145, 240, 38, 14)
    const t = this.add.text(W / 2, H - 126, message, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: '#ffffff' }).setOrigin(0.5).setDepth(121)
    this.tweens.add({ targets: [g, t], alpha: 0, delay: 650, duration: 400, onComplete: () => { g.destroy(); t.destroy() } })
  }
}