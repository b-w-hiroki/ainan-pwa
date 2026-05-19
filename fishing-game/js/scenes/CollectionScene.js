import Phaser from 'phaser'
import { FONT, SHADOW } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { ICONS } from '../config/icons.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { FISH_META, getCatches } from '../game/progress.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const RARITY_LABEL = {
  common: 'よく釣れる',
  uncommon: '少し珍しい',
  rare: 'レア',
  legendary: '伝説級',
}

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
    this._modal = null
    this._background(W, H)
    this._header(W)
    this._grid(W)
    buildFooterNav(this, W, H, 'book')
  }

  _background(W, H) {
    addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillStyle(0xeaf8ff, 0.78)
    veil.fillRect(0, 0, W, H)
  }

  _header(W) {
    const catches = getCatches()
    const found = new Set(catches.map(c => c.fishId)).size
    const total = Object.keys(FISH_META).length
    this.add.text(W / 2, 42, `${ICONS.BOOK} 魚図鑑`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '30px', fontWeight: '900',
      color: '#1a3a5a', shadow: SHADOW.subtle,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(W / 2, 78, `${String(found).padStart(3, '0')}/${String(total).padStart(3, '0')}`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '18px', fontWeight: '900',
      color: '#e07800',
    }).setOrigin(0.5).setDepth(5)
  }

  _grid(W) {
    const catches = getCatches()
    const counts = catches.reduce((acc, c) => {
      acc[c.fishId] = (acc[c.fishId] ?? 0) + 1
      return acc
    }, {})
    const best = catches.reduce((acc, c) => {
      acc[c.fishId] = Math.max(acc[c.fishId] ?? 0, c.score ?? 0)
      return acc
    }, {})

    const entries = Object.entries(FISH_META)
    const cols = 3
    const size = 100
    const gap = 14
    const startX = (W - (cols * size + (cols - 1) * gap)) / 2

    entries.forEach(([id, fish], i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = startX + col * (size + gap)
      const y = 122 + row * 130
      const caught = (counts[id] ?? 0) > 0
      this._fishTile(x, y, size, id, fish, counts[id] ?? 0, best[id] ?? 0, caught)
    })
  }

  _fishTile(x, y, size, id, fish, count, best, caught) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x000000, 0.12)
    g.fillRoundedRect(x + 3, y + 4, size, size, 18)
    g.fillStyle(0xffffff, caught ? 0.97 : 0.72)
    g.lineStyle(2.5, caught ? 0x1a2a3a : 0x9aa9b5, 0.9)
    g.fillRoundedRect(x, y, size, size, 18)
    g.strokeRoundedRect(x, y, size, size, 18)
    g.fillStyle(caught ? 0x5ebcff : 0xb9c5d1, 0.22)
    g.fillCircle(x + size / 2, y + 36, 27)

    this.add.text(x + size / 2, y + 36, caught ? fish.name.slice(0, 1) : '?', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '26px', fontWeight: '900',
      color: caught ? '#1a3a5a' : '#7b8794',
    }).setOrigin(0.5).setDepth(5)
    this.add.text(x + size / 2, y + 72, caught ? fish.name : '未発見', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '900',
      color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(5)
    this.add.text(x + size / 2, y + 89, `×${count}`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '11px', fontWeight: '900',
      color: caught ? '#e07800' : '#7b8794',
    }).setOrigin(0.5).setDepth(5)

    this.add.rectangle(x + size / 2, y + size / 2, size, size, 0x000000, 0)
      .setDepth(6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showFishModal(fish, count, best, caught))
  }

  _showFishModal(fish, count, best, caught) {
    const { width: W, height: H } = this.scale
    this._modal?.destroy(true)
    const items = []
    const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x1a2a3a, 0.42)
      .setInteractive()
    items.push(shade)

    const x = 30
    const y = 188
    const w = W - 60
    const h = 300
    const bg = this.add.graphics()
    bg.fillStyle(0xffffff, 0.98)
    bg.lineStyle(3, 0x1a2a3a, 1)
    bg.fillRoundedRect(x, y, w, h, 22)
    bg.strokeRoundedRect(x, y, w, h, 22)
    bg.fillStyle(caught ? 0x5ebcff : 0xb9c5d1, 0.22)
    bg.fillCircle(W / 2, y + 76, 48)
    items.push(bg)

    items.push(this.add.text(W / 2, y + 76, caught ? fish.name.slice(0, 1) : '?', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '42px', fontWeight: '900',
      color: caught ? '#1a3a5a' : '#7b8794',
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 138, caught ? fish.name : '未発見の魚', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '24px', fontWeight: '900',
      color: '#1a3a5a',
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 174, caught ? `${fish.habitat} / ${RARITY_LABEL[fish.rarity]}` : '釣ると詳しい情報が解放されます', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900',
      color: '#4a7090',
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 214, `釣果 ${count} 匹    BEST ${best} pt`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '16px', fontWeight: '900',
      color: '#e07800',
    }).setOrigin(0.5))

    items.push(this._closeButton(W / 2, y + h - 38, () => this._modal?.destroy(true)))
    this._modal = this.add.container(0, 18, items).setDepth(100).setAlpha(0)
    this.tweens.add({ targets: this._modal, y: 0, alpha: 1, duration: 160, ease: 'Sine.easeOut' })
  }

  _closeButton(x, y, onTap) {
    const c = this.add.container(0, 0)
    const bg = this.add.graphics()
    bg.fillStyle(0xffd900, 1)
    bg.lineStyle(2.5, 0x1a2a3a, 1)
    bg.fillRoundedRect(x - 58, y - 18, 116, 36, 12)
    bg.strokeRoundedRect(x - 58, y - 18, 116, 36, 12)
    const txt = this.add.text(x, y, '閉じる', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900', color: '#1a2a3a',
    }).setOrigin(0.5)
    const hit = this.add.rectangle(x, y, 124, 44, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onTap)
    c.add([bg, txt, hit])
    return c
  }
}
