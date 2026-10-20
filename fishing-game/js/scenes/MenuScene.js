import Phaser from 'phaser'
import { FONT, SHADOW, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { loadGameTexture } from '../utils/loadGameTexture.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { drawUiGlyph } from '../ui/UiGlyph.js'
import { addArtCard, addArtPanel, loadUiArt } from '../ui/UiArt.js'
import { getMenuEntries } from '../game/menuEntries.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export default class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }) }

  preload() {
    loadUiArt(this)
    const bg = ASSETS.backgrounds.townGrowing
    if (bg?.status === 'ready' && !this.textures.exists(bg.key)) loadGameTexture(this, bg)
  }

  create() {
    const { width: W, height: H } = this.scale
    const menuItems = getMenuEntries()

    addCoverImage(this, ASSETS.backgrounds.townGrowing.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillGradientStyle(0xf8fdff, 0xf8fdff, 0xf1f9fc, 0xf1f9fc, 0.80, 0.80, 0.94, 0.94)
    veil.fillRect(0, 0, W, H)

    this._header(W)
    menuItems.forEach((item, i) => this._menuCard(22, 100 + i * 78, W - 44, 64, item, i))
    buildFooterNav(this, W, H, 'menu')
  }

  _header(W) {
    const art = addArtPanel(this, { x: 16, y: 11, w: W - 32, h: 76, depth: 4 })
    const shell = this.add.graphics().setDepth(4)
    if (!art) {
      shell.fillStyle(0x173248, 0.10)
      shell.fillRoundedRect(16, 15, W - 32, 72, 21)
      shell.fillStyle(0xf8fdff, 0.97)
      shell.lineStyle(1.8, 0x9bcfe5, 0.86)
      shell.fillRoundedRect(16, 11, W - 32, 72, 21)
      shell.strokeRoundedRect(16, 11, W - 32, 72, 21)
      shell.fillStyle(0xdff5ff, 0.72)
      shell.fillRoundedRect(24, 19, W - 48, 12, 6)
    }

    this.add.text(30, 44, 'メニュー', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '25px', fontWeight: '900', color: UI_COLORS.ink, shadow: SHADOW.subtle,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(30, 68, '港でできることをまとめて確認', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: UI_COLORS.inkSoft,
    }).setOrigin(0, 0.5).setDepth(5)
  }

  _menuCard(x, y, w, h, item, index) {
    const art = addArtCard(this, { x, y, w, h, state: item.badge === 'LOCK' ? 'disabled' : item.badge === 'NEW' ? 'selected' : 'idle', depth: 5 })
    const g = this.add.graphics().setDepth(5)
    if (!art) {
      g.fillStyle(0x173248, 0.09)
      g.fillRoundedRect(x + 3, y + 4, w, h, 19)
      g.fillStyle(0xffffff, 0.98)
      g.lineStyle(1.6, item.badge === 'NEW' ? 0xff765a : 0xb9d4df, item.badge === 'NEW' ? 1 : 0.88)
      g.fillRoundedRect(x, y, w, h, 19)
      g.strokeRoundedRect(x, y, w, h, 19)
    }
    g.fillStyle(item.color, item.badge === 'LOCK' ? 0.08 : 0.16)
    g.fillRoundedRect(x + 10, y + 10, 58, h - 20, 15)
    g.fillStyle(item.color, item.badge === 'LOCK' ? 0.45 : 1)
    g.fillRoundedRect(x, y + 15, 5, h - 30, 3)

    drawUiGlyph(this, x + 39, y + h / 2, item.glyph, {
      size: 13,
      disc: false,
      fg: item.badge === 'LOCK' ? 0x718392 : 0x173248,
      depth: 6,
    })
    this.add.text(x + 82, y + 25, item.title, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0, 0.5).setDepth(6)
    this.add.text(x + 82, y + 48, item.desc, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: UI_COLORS.inkSoft,
    }).setOrigin(0, 0.5).setDepth(6)

    if (item.badge) {
      const badgeW = item.badge === 'CLEAR' ? 46 : 38
      g.fillStyle(item.badge === 'CLEAR' ? 0x71d6a2 : item.badge === 'NEW' ? 0xff765a : 0xcbd6dc, 1)
      g.fillRoundedRect(x + w - badgeW - 16, y + 8, badgeW, 18, 7)
      this.add.text(x + w - 16 - badgeW / 2, y + 17, item.badge, {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '7px', fontWeight: '900', color: item.badge === 'LOCK' ? UI_COLORS.inkSoft : '#ffffff',
      }).setOrigin(0.5).setDepth(7)
    }

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
