import Phaser from 'phaser'
import { FONT, SHADOW, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const MENU_ITEMS = [
  { title: '魚図鑑', desc: '釣った魚と未発見の魚を確認', mark: '魚', color: 0x5bb5d8, scene: 'CollectionScene' },
  { title: '交換所', desc: 'ポイントを港の記念品と交換', mark: '換', color: 0xff765a, scene: 'ExchangeScene' },
  { title: 'ランク', desc: '釣り人としての成長を確認', mark: '級', color: 0xffd95a, scene: 'RankScene' },
  { title: 'プロフィール', desc: 'これまでの釣果と実績を見る', mark: '人', color: 0x71d6a2, scene: 'RankScene' },
  { title: '遊び方', desc: '釣りと町おこしの基本を確認', mark: '?', color: 0x8f80e8, scene: 'HelpScene' },
]

export default class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }) }

  preload() {
    const bg = ASSETS.backgrounds.townGrowing
    if (bg?.status === 'ready' && !this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
  }

  create() {
    const { width: W, height: H } = this.scale
    addCoverImage(this, ASSETS.backgrounds.townGrowing.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillGradientStyle(0xf8fdff, 0xf8fdff, 0xf1f9fc, 0xf1f9fc, 0.80, 0.80, 0.94, 0.94)
    veil.fillRect(0, 0, W, H)

    this._header(W)
    MENU_ITEMS.forEach((item, i) => this._menuCard(22, 112 + i * 94, W - 44, 78, item, i))
    buildFooterNav(this, W, H, 'menu')
  }

  _header(W) {
    const shell = this.add.graphics().setDepth(4)
    shell.fillStyle(0x173248, 0.10)
    shell.fillRoundedRect(16, 15, W - 32, 72, 21)
    shell.fillStyle(0xf8fdff, 0.97)
    shell.lineStyle(1.8, 0x9bcfe5, 0.86)
    shell.fillRoundedRect(16, 11, W - 32, 72, 21)
    shell.strokeRoundedRect(16, 11, W - 32, 72, 21)
    shell.fillStyle(0xdff5ff, 0.72)
    shell.fillRoundedRect(24, 19, W - 48, 12, 6)

    this.add.text(30, 44, 'メニュー', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '25px', fontWeight: '900', color: UI_COLORS.ink, shadow: SHADOW.subtle,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(30, 68, '港でできることをまとめて確認', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: UI_COLORS.inkSoft,
    }).setOrigin(0, 0.5).setDepth(5)
  }

  _menuCard(x, y, w, h, item, index) {
    const g = this.add.graphics().setDepth(5)
    g.fillStyle(0x173248, 0.09)
    g.fillRoundedRect(x + 3, y + 4, w, h, 19)
    g.fillStyle(0xffffff, 0.98)
    g.lineStyle(1.6, 0xb9d4df, 0.88)
    g.fillRoundedRect(x, y, w, h, 19)
    g.strokeRoundedRect(x, y, w, h, 19)
    g.fillStyle(item.color, 0.16)
    g.fillRoundedRect(x + 10, y + 10, 58, h - 20, 15)
    g.fillStyle(item.color, 1)
    g.fillRoundedRect(x, y + 15, 5, h - 30, 3)

    this.add.text(x + 39, y + h / 2, item.mark, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '19px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5).setDepth(6)
    this.add.text(x + 82, y + 27, item.title, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(6)
    this.add.text(x + 82, y + 51, item.desc, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: UI_COLORS.inkSoft,
    }).setOrigin(0, 0.5).setDepth(6)

    const badge = this.add.graphics().setDepth(6)
    badge.fillStyle(0xeaf6fb, 1)
    badge.fillCircle(x + w - 28, y + h / 2, 17)
    this.add.text(x + w - 28, y + h / 2 - 1, '›', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '23px', fontWeight: '900', color: UI_COLORS.oceanDeep,
    }).setOrigin(0.5).setDepth(7)

    const hit = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0).setDepth(8).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start(item.scene))
      .on('pointerover', () => hit.setScale(1.005))
      .on('pointerout', () => hit.setScale(1))
    this.tweens.add({ targets: badge, alpha: 0.78 + (index % 2) * 0.1, duration: 1200 + index * 90, yoyo: true, repeat: -1 })
  }
}
