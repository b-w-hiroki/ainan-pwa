import Phaser from 'phaser'
import { FONT, SHADOW } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { ICONS } from '../config/icons.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const HELP_ITEMS = [
  { icon: ICONS.ROD, title: '釣りに行く', desc: 'ホームの大きなボタンから釣り場を選びます。釣り場ごとに出る魚が変わります。' },
  { icon: '👇', title: 'キャスト', desc: '釣り画面を長押ししてパワーをため、離すと浮きを投げます。下の竿・エサUIはキャストに干渉しません。' },
  { icon: '🎯', title: 'ヒット', desc: '浮きが大きく沈んだらタップ。早すぎても遅すぎてもチャンスを逃します。' },
  { icon: ICONS.REEL, title: 'ファイト', desc: '魚が落ち着いている時に下へスワイプ。暴れている時は待つのが安全です。' },
  { icon: ICONS.BOOK, title: '集める', desc: '釣った魚は図鑑に記録されます。未発見の魚はヒントから狙い方を探せます。' },
  { icon: ICONS.TOWN, title: '町おこし', desc: '釣果ポイントで施設を育てると、町のにぎわいが上がります。' },
]

export default class HelpScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HelpScene' })
  }

  preload() {
    const bg = ASSETS.backgrounds.homeBase
    if (!this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
  }

  create() {
    const { width: W, height: H } = this.scale
    this._background(W, H)
    this._header(W)
    this._items(W)
    this._back()
    buildFooterNav(this, W, H, 'home')
  }

  _background(W, H) {
    addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillStyle(0xf7fbff, 0.88)
    veil.fillRect(0, 0, W, H)
  }

  _header(W) {
    this.add.text(W / 2, 42, `${ICONS.HELP} 遊び方`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '30px', fontWeight: '900',
      color: '#1a3a5a', shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2, 78, '釣って、集めて、町をにぎやかにしよう', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900',
      color: '#4a7090',
    }).setOrigin(0.5).setDepth(5)
  }

  _items(W) {
    HELP_ITEMS.forEach((item, i) => {
      const y = 114 + i * 82
      this._card(22, y, W - 44, 68, item)
    })
  }

  _card(x, y, w, h, item) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x000000, 0.10)
    g.fillRoundedRect(x + 3, y + 4, w, h, 17)
    g.fillStyle(0xffffff, 0.96)
    g.lineStyle(2.5, 0x1a2a3a, 0.72)
    g.fillRoundedRect(x, y, w, h, 17)
    g.strokeRoundedRect(x, y, w, h, 17)
    g.fillStyle(0xe1f5ff, 1)
    g.fillCircle(x + 34, y + h / 2, 23)

    this.add.text(x + 34, y + h / 2, item.icon, {
      fontSize: '22px', resolution: TEXT_RES,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(x + 68, y + 20, item.title, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '15px', fontWeight: '900', color: '#1a3a5a',
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(x + 68, y + 44, item.desc, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '11px', fontWeight: '800', color: '#4a7090',
      wordWrap: { width: w - 88 },
    }).setOrigin(0, 0.5).setDepth(5)
  }

  _back() {
    this.add.text(16, 16, `${ICONS.BACK} ホーム`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '15px', fontWeight: '900',
      color: '#1a3a5a',
      backgroundColor: '#ffffff',
      padding: { x: 14, y: 9 },
    }).setDepth(20).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('HomeScene'))
  }
}
