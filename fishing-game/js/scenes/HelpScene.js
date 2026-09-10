import Phaser from 'phaser'
import { FONT, SHADOW, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const LOOP_STEPS = [
  { no: '1', title: '釣る', desc: '海へ出て魚を釣る', accent: 0x5bb5d8 },
  { no: '2', title: '持ち帰る', desc: '釣果とポイントを集める', accent: 0x71d6a2 },
  { no: '3', title: '町を育てる', desc: '施設を発展させる', accent: 0xffb45d },
  { no: '4', title: '海が広がる', desc: '新しい釣り場と魚が開く', accent: 0x8f80e8 },
]

const CONTROL_STEPS = [
  { title: 'キャスト', key: 'HOLD → RELEASE', desc: '長押しでパワーをため、離して浮きを投げる。' },
  { title: 'ヒット', key: 'TAP', desc: '浮きが大きく沈んだ瞬間にタップする。' },
  { title: 'ファイト', key: 'SWIPE', desc: '魚が落ち着いている時に下へスワイプ。暴れている時は待つ。' },
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
    this.add.text(W / 2, 82, '釣るほど町が育ち、町が育つほど海が広がる', {
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
    this.add.text(x + w - 18, y + 22, 'FISHING → TOWN → FISHING', {
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
    this.add.text(W / 2, y + h - 28, '魚市場 Lv.1 → 蒼海湾 / 桟橋 Lv.2 → 黒潮崎', {
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
    const x = 18, y = 390, w = W - 36, h = 238
    const panel = this.add.graphics().setDepth(3)
    panel.fillStyle(0xffffff, 0.96)
    panel.lineStyle(2, 0x9bcfe5, 0.82)
    panel.fillRoundedRect(x, y, w, h, 22)
    panel.strokeRoundedRect(x, y, w, h, 22)
    this.add.text(x + 18, y + 24, '釣りの操作', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '17px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(5)

    CONTROL_STEPS.forEach((item, i) => this._controlRow(x + 16, y + 52 + i * 58, w - 32, 48, item))

    this.add.text(W / 2, y + h - 18, '釣れたらリザルトの「町へ」で、そのまま町おこしへ戻れる', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: UI_COLORS.success,
    }).setOrigin(0.5).setDepth(5)
  }

  _controlRow(x, y, w, h, item) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0xf7fbff, 1)
    g.lineStyle(1.2, 0xc6dde8, 0.9)
    g.fillRoundedRect(x, y, w, h, 14)
    g.strokeRoundedRect(x, y, w, h, 14)
    g.fillStyle(0x173248, 0.92)
    g.fillRoundedRect(x + 10, y + 10, 92, 28, 10)
    this.add.text(x + 56, y + 24, item.key, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5).setDepth(5)
    this.add.text(x + 116, y + 16, item.title, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + 116, y + 33, item.desc, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '800', color: UI_COLORS.inkSoft,
      wordWrap: { width: w - 128 },
    }).setOrigin(0, 0.5).setDepth(5)
  }
}
