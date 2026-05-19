import Phaser from 'phaser'
import { FONT, SHADOW } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { ICONS } from '../config/icons.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { FISH_META, getCatches, markBookSeen } from '../game/progress.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const RARITY_LABEL = {
  common: 'よく釣れる',
  uncommon: '少し珍しい',
  rare: 'レア',
  legendary: '伝説級',
}

const RARITY_COLOR = {
  common: 0x5ebcff,
  uncommon: 0x8bcf52,
  rare: 0xa088ff,
  legendary: 0xffa13d,
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
    markBookSeen()
    this._background(W, H)
    this._header(W)
    this._grid(W)
    buildFooterNav(this, W, H, 'book')
  }

  _background(W, H) {
    addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillStyle(0xeaf8ff, 0.82)
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
    const bestScore = catches.reduce((acc, c) => {
      acc[c.fishId] = Math.max(acc[c.fishId] ?? 0, c.score ?? 0)
      return acc
    }, {})
    const bestSize = catches.reduce((acc, c) => {
      acc[c.fishId] = Math.max(acc[c.fishId] ?? 0, c.sizeCm ?? 0)
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
      this._fishTile(x, y, size, id, fish, counts[id] ?? 0, bestScore[id] ?? 0, bestSize[id] ?? 0, caught)
    })
  }

  _fishTile(x, y, size, id, fish, count, bestScore, bestSize, caught) {
    const accent = RARITY_COLOR[fish.rarity] ?? 0x5ebcff
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x000000, 0.12)
    g.fillRoundedRect(x + 3, y + 4, size, size, 18)
    g.fillStyle(0xffffff, caught ? 0.97 : 0.72)
    g.lineStyle(2.5, caught ? accent : 0x9aa9b5, 0.9)
    g.fillRoundedRect(x, y, size, size, 18)
    g.strokeRoundedRect(x, y, size, size, 18)
    g.fillStyle(caught ? accent : 0xb9c5d1, 0.22)
    g.fillCircle(x + size / 2, y + 36, 27)

    this.add.text(x + size / 2, y + 36, caught ? fish.icon : '?', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '25px', fontWeight: '900',
      color: caught ? '#1a3a5a' : '#7b8794',
    }).setOrigin(0.5).setDepth(5)
    this.add.text(x + size / 2, y + 71, caught ? fish.name : '未発見', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '900',
      color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(5)
    this.add.text(x + size / 2, y + 89, caught ? `x${count}` : fish.habitat, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '10px', fontWeight: '900',
      color: caught ? '#e07800' : '#7b8794',
    }).setOrigin(0.5).setDepth(5)

    this.add.rectangle(x + size / 2, y + size / 2, size, size, 0x000000, 0)
      .setDepth(6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showFishModal(fish, count, bestScore, bestSize, caught))
  }

  _showFishModal(fish, count, bestScore, bestSize, caught) {
    const { width: W, height: H } = this.scale
    this._modal?.destroy(true)
    const items = []
    const accent = RARITY_COLOR[fish.rarity] ?? 0x5ebcff
    items.push(this.add.rectangle(W / 2, H / 2, W, H, 0x1a2a3a, 0.42).setInteractive())

    const x = 30
    const y = 164
    const w = W - 60
    const h = 360
    const bg = this.add.graphics()
    bg.fillStyle(0xffffff, 0.98)
    bg.lineStyle(3, 0x1a2a3a, 1)
    bg.fillRoundedRect(x, y, w, h, 22)
    bg.strokeRoundedRect(x, y, w, h, 22)
    bg.fillStyle(caught ? accent : 0xb9c5d1, 0.22)
    bg.fillCircle(W / 2, y + 72, 48)
    items.push(bg)

    items.push(this.add.text(W / 2, y + 72, caught ? fish.icon : '?', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '42px', fontWeight: '900',
      color: caught ? '#1a3a5a' : '#7b8794',
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 132, caught ? fish.name : '未発見の魚', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '24px', fontWeight: '900',
      color: '#1a3a5a',
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 165, caught ? `${fish.habitat} / ${RARITY_LABEL[fish.rarity]}` : fish.hint, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900',
      color: '#4a7090',
      align: 'center',
      wordWrap: { width: w - 48 },
    }).setOrigin(0.5, 0))
    items.push(this.add.text(W / 2, y + 222, caught ? `釣果 ${count}匹   最大 ${bestSize || '--'}cm   BEST ${bestScore}pt` : 'まずは釣り場で魚影を探してみよう', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900',
      color: '#e07800',
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 258, caught ? fish.encounter : `ヒント: ${fish.habitat}にいるらしい`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '800',
      color: '#1a3a5a',
      align: 'center',
      wordWrap: { width: w - 48 },
    }).setOrigin(0.5, 0))

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
