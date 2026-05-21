import Phaser from 'phaser'
import { FONT, SHADOW, uiText } from '../config/fontStyles.js'
import { ICONS } from '../config/icons.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const MENU_ITEMS = [
  { title: '図鑑', desc: '釣った魚の記録を見る', icon: ICONS.BOOK, color: 0x5ebcff, scene: 'CollectionScene' },
  { title: '交換', desc: '報酬やショップ品を確認', icon: ICONS.GIFT, color: 0xff6a9a, scene: 'ExchangeScene' },
  { title: 'ランク', desc: 'プレイヤー成長を確認', icon: ICONS.RANK, color: 0xffd900, scene: 'RankScene' },
  { title: 'プロフィール', desc: 'プレイヤー情報を見る', icon: ICONS.PROFILE, color: 0x8bcf52, scene: 'RankScene' },
  { title: 'ヘルプ', desc: '遊び方と操作を確認', icon: ICONS.HELP, color: 0xbc7cff, scene: 'HelpScene' },
]

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' })
  }

  preload() {
    const bg = ASSETS.backgrounds.homeBase
    if (!this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
  }

  create() {
    const { width: W, height: H } = this.scale
    addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillStyle(0xf4fbff, 0.88)
    veil.fillRect(0, 0, W, H)

    this.add.text(W / 2, 42, `${ICONS.MENU} メニュー`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '30px', fontWeight: '900',
      color: '#1a3a5a', shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2, 74, '確認・管理系の機能をまとめました', uiText('screenLead')).setOrigin(0.5).setDepth(5)

    MENU_ITEMS.forEach((item, i) => this._menuCard(24, 116 + i * 92, W - 48, 76, item))
    buildFooterNav(this, W, H, 'menu')
  }

  _menuCard(x, y, w, h, item) {
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0x000000, 0.12)
    g.fillRoundedRect(x + 3, y + 4, w, h, 20)
    g.fillStyle(0xffffff, 0.97)
    g.lineStyle(2.5, 0x1a2a3a, 0.85)
    g.fillRoundedRect(x, y, w, h, 20)
    g.strokeRoundedRect(x, y, w, h, 20)
    g.fillStyle(item.color, 0.22)
    g.fillCircle(x + 38, y + h / 2, 25)
    g.lineStyle(2, item.color, 0.8)
    g.strokeCircle(x + 38, y + h / 2, 25)

    this.add.text(x + 38, y + h / 2, item.icon, { fontSize: '24px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(6)
    this.add.text(x + 76, y + 27, item.title, uiText('cardTitle', { fontSize: '17px' })).setOrigin(0, 0.5).setDepth(6)
    this.add.text(x + 76, y + 51, item.desc, uiText('screenLead', { fontSize: '12px' })).setOrigin(0, 0.5).setDepth(6)
    this.add.text(x + w - 24, y + h / 2, ICONS.CHEVRON, uiText('cardTitle', { fontSize: '24px' })).setOrigin(0.5).setDepth(6)
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0).setDepth(7).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start(item.scene))
  }
}
