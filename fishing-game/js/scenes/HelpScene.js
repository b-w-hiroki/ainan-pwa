import Phaser from 'phaser'
import { FONT, SHADOW, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const LOOP_STEPS = [
  { no: '1', title: '釣る', desc: '天候と時間を見て魚を狙う', accent: 0x5bb5d8 },
  { no: '2', title: '活かす', desc: '魚を売る・料理・素材に使う', accent: 0x71d6a2 },
  { no: '3', title: '育てる', desc: '工房で竿・帽子・バッグを強化', accent: 0xffb45d },
  { no: '4', title: '挑む', desc: '町を育て新しい海とボスへ', accent: 0x8f80e8 },
]

const CONTROL_STEPS = [
  { title: 'キャスト', key: 'HOLD → RELEASE', desc: '長押しで距離を狙って投げる。遠投ほど沖の魚影に届く。' },
  { title: '誘う', key: 'TAP / HOLD', desc: 'ちょい巻き・ゆっくり巻き・待つを使い分け、魚影をルアーへ寄せる。' },
  { title: '食わせる', key: 'TAP', desc: '魚が追ってきたら巻きすぎない。ぐんっと食った瞬間にタップ。' },
  { title: 'ファイト', key: 'SWIPE', desc: '落ち着いている時に下へスワイプ。暴れている時は待つ。' },
]

export default class HelpScene extends Phaser.Scene {
  constructor() { super({ key: 'HelpScene' }) }

  preload() {
    const bg = ASSETS.backgrounds.homeBase
    if (bg?.status === 'ready' && !this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
  }

  create() {
    const { width: W, height: H } = this.scale
    this._background(W, H)
    this._header(W)
    this._loopPanel(W)
    this._controls(W)
    buildFooterNav(this, W, H, 'menu')
  }

  _background(W, H) {
    addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillGradientStyle(0xf7fbff, 0xf7fbff, 0xeaf8ff, 0xeaf8ff, 0.90, 0.90, 0.96, 0.96)
    veil.fillRect(0, 0, W, H)
  }

  _header(W) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x173248, 0.10)
    g.fillRoundedRect(18, 18, W - 36, 82, 22)
    g.fillStyle(0xffffff, 0.96)
    g.lineStyle(2, 0x9bcfe5, 0.86)
    g.fillRoundedRect(18, 14, W - 36, 82, 22)
    g.strokeRoundedRect(18, 14, W - 36, 82, 22)
    g.fillStyle(0xdff5ff, 0.72)
    g.fillRoundedRect(30, 26, 62, 22, 10)
    this.add.text(61, 37, 'GUIDE', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: UI_COLORS.oceanDeep,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2, 56, 'AINANの遊び方', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '26px', fontWeight: '900', color: UI_COLORS.ink, shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2, 82, '釣る → 活かす → 育てる → 新しい海と大物へ', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '800', color: UI_COLORS.inkSoft,
    }).setOrigin(0.5).setDepth(5)
  }

  _loopPanel(W) {
    const x = 18, y = 112, w = W - 36, h = 260
    const panel = this.add.graphics().setDepth(3)
    panel.fillStyle(0xffffff, 0.96)
    panel.lineStyle(2, 0x9bcfe5, 0.82)
    panel.fillRoundedRect(x, y, w, h, 22)
    panel.strokeRoundedRect(x, y, w, h, 22)
    this.add.text(x + 18, y + 22, '基本ループ', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '17px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + w - 18, y + 22, 'FISH → SHOP → UPGRADE → BOSS', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '900', color: UI_COLORS.oceanDeep,
    }).setOrigin(1, 0.5).setDepth(5)

    LOOP_STEPS.forEach((step, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const cx = x + 18 + col * 174
      const cy = y + 50 + row * 94
      this._loopCard(cx, cy, 162, 82, step)
    })

    const foot = this.add.graphics().setDepth(4)
    foot.fillStyle(0xfff3d7, 1)
    foot.lineStyle(1.5, 0xffb45d, 0.72)
    foot.fillRoundedRect(x + 18, y + h - 42, w - 36, 28, 12)
    foot.strokeRoundedRect(x + 18, y + h - 42, w - 36, 28, 12)
    this.add.text(W / 2, y + h - 28, '魚市場Lv.2で魚屋 / 広場Lv.2で食堂 / 桟橋Lv.2で黒潮崎', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: '#b45d32',
    }).setOrigin(0.5).setDepth(5)
  }

  _loopCard(x, y, w, h, step) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(step.accent, 0.10)
    g.lineStyle(1.6, step.accent, 0.62)
    g.fillRoundedRect(x, y, w, h, 17)
    g.strokeRoundedRect(x, y, w, h, 17)
    g.fillStyle(step.accent, 0.96)
    g.fillCircle(x + 27, y + 28, 18)
    this.add.text(x + 27, y + 28, step.no, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5).setDepth(5)
    this.add.text(x + 53, y + 23, step.title, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + 18, y + 57, step.desc, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: UI_COLORS.inkSoft,
    }).setOrigin(0, 0.5).setDepth(5)
  }

  _controls(W) {
    const x = 18, y = 390, w = W - 36, h = 284
    const panel = this.add.graphics().setDepth(3)
    panel.fillStyle(0xffffff, 0.96)
    panel.lineStyle(2, 0x9bcfe5, 0.82)
    panel.fillRoundedRect(x, y, w, h, 22)
    panel.strokeRoundedRect(x, y, w, h, 22)
    this.add.text(x + 18, y + 22, '釣りの操作', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '17px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + w - 18, y + 22, 'CAST → RETRIEVE → BITE → BATTLE', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '900', color: UI_COLORS.oceanDeep,
    }).setOrigin(1, 0.5).setDepth(5)

    CONTROL_STEPS.forEach((item, i) => this._controlRow(x + 16, y + 48 + i * 50, w - 32, 44, item))

    this.add.text(W / 2, y + h - 20, '季節・時間帯・日替わり天候で魚の出やすさも変化。大物ほど沖を狙おう。', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: UI_COLORS.success,
    }).setOrigin(0.5).setDepth(5)
  }

  _controlRow(x, y, w, h, item) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0xf7fbff, 1)
    g.lineStyle(1.2, 0xc6dde8, 0.9)
    g.fillRoundedRect(x, y, w, h, 14)
    g.strokeRoundedRect(x, y, w, h, 14)
    g.fillStyle(0x173248, 0.92)
    g.fillRoundedRect(x + 8, y + 8, 96, 28, 10)
    this.add.text(x + 56, y + 22, item.key, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5).setDepth(5)
    this.add.text(x + 116, y + 13, item.title, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + 116, y + 29, item.desc, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '800', color: UI_COLORS.inkSoft,
      wordWrap: { width: w - 128 },
    }).setOrigin(0, 0.5).setDepth(5)
  }
}
