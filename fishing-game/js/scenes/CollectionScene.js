import Phaser from 'phaser'
import { FONT, SHADOW, UI_COLORS } from '../config/fontStyles.js'
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

const FISH_ART = {
  aji: ASSETS.fish.ajiIcon,
  tai: ASSETS.fish.madaiIcon,
  bass: ASSETS.fish.blackBassIcon,
  buri: ASSETS.fish.buriIcon,
  kue: ASSETS.fish.kueIcon,
}

export default class CollectionScene extends Phaser.Scene {
  constructor() { super({ key: 'CollectionScene' }) }

  preload() {
    const bg = ASSETS.backgrounds.homeBase
    if (!this.textures.exists(bg.key)) this.load.image(bg.key, bg.path)
    Object.values(FISH_ART).forEach(asset => {
      if (asset?.status === 'ready' && !this.textures.exists(asset.key)) this.load.image(asset.key, asset.path)
    })
  }

  create() {
    const { width: W, height: H } = this.scale
    this._modal = null
    markBookSeen()
    this._background(W, H)
    this._header(W)
    this._grid(W)
    buildFooterNav(this, W, H, 'menu')
  }

  _background(W, H) {
    addCoverImage(this, ASSETS.backgrounds.homeBase.key, W, H, 0)
    const veil = this.add.graphics().setDepth(1)
    veil.fillStyle(0xeaf8ff, 0.84)
    veil.fillRect(0, 0, W, H)
  }

  _header(W) {
    const catches = getCatches()
    const found = new Set(catches.map(c => c.fishId)).size
    const total = Object.keys(FISH_META).length

    const shell = this.add.graphics().setDepth(4)
    shell.fillStyle(0x173248, 0.10)
    shell.fillRoundedRect(18, 16, W - 36, 78, 22)
    shell.fillStyle(0xf8fdff, 0.96)
    shell.lineStyle(2, 0x9bcfe5, 0.88)
    shell.fillRoundedRect(18, 12, W - 36, 78, 22)
    shell.strokeRoundedRect(18, 12, W - 36, 78, 22)

    this.add.text(32, 39, `${ICONS.BOOK} 魚図鑑`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '25px', fontWeight: '900',
      color: UI_COLORS.ink, shadow: SHADOW.subtle,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(32, 67, '釣った魚がここに記録される', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '11px', fontWeight: '800', color: UI_COLORS.inkSoft,
    }).setOrigin(0, 0.5).setDepth(5)
    this.add.text(W - 34, 50, `${String(found).padStart(2, '0')}/${String(total).padStart(2, '0')}`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '20px', fontWeight: '900', color: UI_COLORS.warning,
    }).setOrigin(1, 0.5).setDepth(5)
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
      const y = 116 + row * 130
      const caught = (counts[id] ?? 0) > 0
      this._fishTile(x, y, size, id, fish, counts[id] ?? 0, bestScore[id] ?? 0, bestSize[id] ?? 0, caught)
    })
  }

  _fishTile(x, y, size, id, fish, count, bestScore, bestSize, caught) {
    const accent = RARITY_COLOR[fish.rarity] ?? 0x5ebcff
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0x173248, 0.10)
    g.fillRoundedRect(x + 3, y + 4, size, size, 18)
    g.fillStyle(0xffffff, caught ? 0.98 : 0.76)
    g.lineStyle(2.2, caught ? accent : 0xaab7bf, 0.9)
    g.fillRoundedRect(x, y, size, size, 18)
    g.strokeRoundedRect(x, y, size, size, 18)
    g.fillStyle(caught ? accent : 0xb9c5d1, caught ? 0.15 : 0.20)
    g.fillCircle(x + size / 2, y + 36, 29)

    const art = FISH_ART[id]
    if (caught && art?.key && this.textures.exists(art.key)) {
      this.add.image(x + size / 2, y + 36, art.key).setDisplaySize(58, 58).setDepth(5)
    } else {
      this.add.text(x + size / 2, y + 36, '?', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '28px', fontWeight: '900', color: '#7b8794',
      }).setOrigin(0.5).setDepth(5)
    }

    this.add.text(x + size / 2, y + 71, caught ? fish.name : '未発見', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5).setDepth(5)
    this.add.text(x + size / 2, y + 89, caught ? `x${count}` : fish.habitat, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '11px', fontWeight: '900', color: caught ? UI_COLORS.warning : UI_COLORS.muted,
    }).setOrigin(0.5).setDepth(5)

    this.add.rectangle(x + size / 2, y + size / 2, size, size, 0x000000, 0)
      .setDepth(6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showFishModal(id, fish, count, bestScore, bestSize, caught))
  }

  _showFishModal(id, fish, count, bestScore, bestSize, caught) {
    const { width: W, height: H } = this.scale
    this._modal?.destroy(true)
    const items = []
    const accent = RARITY_COLOR[fish.rarity] ?? 0x5ebcff
    items.push(this.add.rectangle(W / 2, H / 2, W, H, 0x173248, 0.44)
      .setInteractive()
      .on('pointerdown', () => this._modal?.destroy(true)))

    const x = 30
    const y = 156
    const w = W - 60
    const h = 376
    const bg = this.add.graphics()
    bg.fillStyle(0x173248, 0.13)
    bg.fillRoundedRect(x + 3, y + 5, w, h, 24)
    bg.fillStyle(0xf8fdff, 0.99)
    bg.lineStyle(2.4, 0x9bcfe5, 0.92)
    bg.fillRoundedRect(x, y, w, h, 24)
    bg.strokeRoundedRect(x, y, w, h, 24)
    bg.fillStyle(caught ? accent : 0xb9c5d1, 0.16)
    bg.fillCircle(W / 2, y + 78, 55)
    items.push(bg)

    const art = FISH_ART[id]
    if (caught && art?.key && this.textures.exists(art.key)) {
      items.push(this.add.image(W / 2, y + 78, art.key).setDisplaySize(104, 104))
    } else {
      items.push(this.add.text(W / 2, y + 78, '?', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '44px', fontWeight: '900', color: UI_COLORS.muted,
      }).setOrigin(0.5))
    }

    items.push(this.add.text(W / 2, y + 145, caught ? fish.name : '未発見の魚', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '24px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 178, caught ? `${fish.habitat} / ${RARITY_LABEL[fish.rarity]}` : fish.hint, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900', color: UI_COLORS.inkSoft,
      align: 'center', wordWrap: { width: w - 48 },
    }).setOrigin(0.5, 0))
    items.push(this.add.text(W / 2, y + 236, caught ? `釣果 ${count}匹   最大 ${bestSize || '--'}cm   BEST ${bestScore}pt` : 'まずは釣り場で魚影を探してみよう', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900', color: UI_COLORS.warning,
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2, y + 272, caught ? fish.encounter : `ヒント: ${fish.habitat}にいるらしい`, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '800', color: UI_COLORS.ink,
      align: 'center', wordWrap: { width: w - 48 },
    }).setOrigin(0.5, 0))

    items.push(this._closeButton(W / 2, y + h - 37, () => this._modal?.destroy(true)))
    this._modal = this.add.container(0, 18, items).setDepth(100).setAlpha(0)
    this.tweens.add({ targets: this._modal, y: 0, alpha: 1, duration: 160, ease: 'Sine.easeOut' })
  }

  _closeButton(x, y, onTap) {
    const c = this.add.container(0, 0)
    const bg = this.add.graphics()
    bg.fillStyle(0x173248, 0.12)
    bg.fillRoundedRect(x - 58 + 2, y - 18 + 3, 116, 36, 12)
    bg.fillStyle(0xffd95a, 1)
    bg.lineStyle(2, 0x173248, 0.82)
    bg.fillRoundedRect(x - 58, y - 18, 116, 36, 12)
    bg.strokeRoundedRect(x - 58, y - 18, 116, 36, 12)
    const txt = this.add.text(x, y, '閉じる', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5)
    const hit = this.add.rectangle(x, y, 124, 44, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onTap)
    c.add([bg, txt, hit])
    return c
  }
}
