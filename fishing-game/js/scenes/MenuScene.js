import Phaser from 'phaser'
import { FONT, SHADOW, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { getBossStates } from '../game/midgameProgression.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export default class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }) }

  preload() {
    const bg = ASSETS.backgrounds.townGrowing
    if (bg?.status === 'ready' && !this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
  }

  create() {
    const { width: W, height: H } = this.scale
    const bosses = Object.values(getBossStates())
    const clearedBosses = bosses.filter(item => item.cleared).length
    const claimableBoss = bosses.some(item => item.cleared && !item.claimed)
    const challengeDesc = 'エリアボス ' + clearedBosses + '/' + bosses.length + '　記録サイズに挑戦'
    const menuItems = [
      { title: '魚図鑑', desc: '釣った魚と未発見の魚を確認', mark: '魚', color: 0x5bb5d8, scene: 'CollectionScene' },
      { title: '大物挑戦', desc: challengeDesc, mark: '主', color: 0x173248, scene: 'ChallengeScene', badge: claimableBoss ? 'GET' : clearedBosses === bosses.length ? 'CLEAR' : 'NEW' },
      { title: '交換所', desc: 'ポイントを港の記念品と交換', mark: '換', color: 0xff765a, scene: 'ExchangeScene' },
      { title: '魚屋・食堂', desc: '釣果を売って料理バフを受ける', mark: '店', color: 0xff9b5e, scene: 'HarborServicesScene' },
      { title: 'ランク', desc: '釣り人としての成長を確認', mark: '級', color: 0xffd95a, scene: 'RankScene' },
      { title: 'プロフィール', desc: '釣果・実績・育成状況をまとめて確認', mark: '人', color: 0x71d6a2, scene: 'ProfileScene' },
      { title: '遊び方', desc: '釣りと町おこしの基本を確認', mark: '?', color: 0x8f80e8, scene: 'HelpScene' },
      { title: '設定・データ', desc: 'サウンド・バックアップ・復旧', mark: '設', color: 0x5bb5d8, scene: 'SettingsScene' },
    ]

    addCoverImage(this, ASSETS.backgrounds.townGrowing.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillGradientStyle(0xf8fdff, 0xf8fdff, 0xf1f9fc, 0xf1f9fc, 0.80, 0.80, 0.94, 0.94)
    veil.fillRect(0, 0, W, H)

    this._header(W)
    menuItems.forEach((item, i) => this._menuCard(22, 100 + i * 78, W - 44, 64, item, i))
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
    g.lineStyle(1.6, item.badge === 'NEW' ? 0xff765a : 0xb9d4df, item.badge === 'NEW' ? 1 : 0.88)
    g.fillRoundedRect(x, y, w, h, 19)
    g.strokeRoundedRect(x, y, w, h, 19)
    g.fillStyle(item.color, item.badge === 'LOCK' ? 0.08 : 0.16)
    g.fillRoundedRect(x + 10, y + 10, 58, h - 20, 15)
    g.fillStyle(item.color, item.badge === 'LOCK' ? 0.45 : 1)
    g.fillRoundedRect(x, y + 15, 5, h - 30, 3)

    this.add.text(x + 39, y + h / 2, item.mark, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '19px', fontWeight: '900', color: item.badge === 'LOCK' ? UI_COLORS.muted : UI_COLORS.ink,
    }).setOrigin(0.5).setDepth(6)
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
