import Phaser from 'phaser'
import { FONT, SHADOW } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { ICONS } from '../config/icons.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { FISH_META, getCatches } from '../game/progress.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export default class CollectionScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CollectionScene' })
  }

  preload() {
    const bg = ASSETS.backgrounds.homeBase
    if (!this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
  }

  create() {
    const { width: W, height: H } = this.scale
    this._background(W, H)
    this._header(W)
    this._list(W)
    buildFooterNav(this, W, H, 'book')
  }

  _background(W, H) {
    addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillStyle(0xeaf8ff, 0.74)
    veil.fillRect(0, 0, W, H)
  }

  _header(W) {
    this.add.text(W / 2, 46, `${ICONS.BOOK} 魚図鑑`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '30px', fontWeight: '900',
      color: '#1a3a5a', shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2, 80, '釣った魚の記録を確認できます', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900',
      color: '#4a7090',
    }).setOrigin(0.5).setDepth(5)
  }

  _list(W) {
    const catches = getCatches()
    const counts = catches.reduce((acc, c) => {
      acc[c.fishId] = (acc[c.fishId] ?? 0) + 1
      return acc
    }, {})
    const best = catches.reduce((acc, c) => {
      acc[c.fishId] = Math.max(acc[c.fishId] ?? 0, c.score ?? 0)
      return acc
    }, {})

    Object.entries(FISH_META).forEach(([id, fish], i) => {
      const y = 122 + i * 104
      const caught = (counts[id] ?? 0) > 0
      const accent = caught ? 0x5ebcff : 0xb9c5d1
      this._card(22, y, W - 44, 88, accent)

      this.add.text(54, y + 44, caught ? fish.name.slice(0, 1) : '?', {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '25px', fontWeight: '900',
        color: caught ? '#1a3a5a' : '#7b8794',
      }).setOrigin(0.5).setDepth(6)

      this.add.text(88, y + 18, caught ? fish.name : '未発見の魚', {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '19px', fontWeight: '900',
        color: '#1a3a5a',
      }).setOrigin(0, 0).setDepth(6)
      this.add.text(88, y + 46, caught ? `${fish.habitat} / ${fish.rarity}` : '釣ると情報が解放されます', {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '12px', fontWeight: '900',
        color: '#4a7090',
      }).setOrigin(0, 0).setDepth(6)

      this.add.text(W - 30, y + 24, `×${counts[id] ?? 0}`, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '18px', fontWeight: '900',
        color: caught ? '#e07800' : '#7b8794',
      }).setOrigin(1, 0).setDepth(6)
      this.add.text(W - 30, y + 52, `BEST ${best[id] ?? 0}`, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '11px', fontWeight: '900',
        color: '#4a7090',
      }).setOrigin(1, 0).setDepth(6)
    })
  }

  _card(x, y, w, h, accent) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x000000, 0.12)
    g.fillRoundedRect(x + 3, y + 4, w, h, 16)
    g.fillStyle(0xffffff, 0.97)
    g.lineStyle(2.5, 0x1a2a3a, 0.9)
    g.fillRoundedRect(x, y, w, h, 16)
    g.strokeRoundedRect(x, y, w, h, 16)
    g.fillStyle(accent, 1)
    g.fillRoundedRect(x, y, 10, h, { tl: 16, bl: 16, tr: 0, br: 0 })
  }
}
