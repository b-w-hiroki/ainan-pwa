import Phaser from 'phaser'
import { ASSETS } from '../config/assetManifest.js'
import { RARITY_WATER_STYLE } from '../game/installRarityWaterReadability.js'

const LABEL = {
  common: 'COMMON',
  uncommon: 'UNCOMMON',
  rare: 'RARE',
  legendary: 'LEGENDARY',
}

export default class RarityQaScene extends Phaser.Scene {
  constructor() { super({ key: 'RarityQaScene' }) }

  preload() {
    const assets = [
      ASSETS.fishingField.waterBase,
      ASSETS.fishingField.waterPattern,
      ASSETS.fishingField.underwaterDepth,
      ASSETS.fishingField.locationHarbor,
      ASSETS.fishingField.fishShadowMediumIdle,
    ]
    assets.forEach(asset => {
      if (asset?.status === 'ready' && !this.textures.exists(asset.key)) this.load.image(asset.key, asset.path)
    })
  }

  create() {
    const { width: W, height: H } = this.scale
    const params = new URLSearchParams(window.location.search)
    const rarity = ['common','uncommon','rare','legendary'].includes(params.get('qaRarity'))
      ? params.get('qaRarity')
      : 'common'
    const style = RARITY_WATER_STYLE[rarity]

    const addLayer = (asset, alpha, depth) => {
      if (!asset?.key || !this.textures.exists(asset.key)) return null
      return this.add.image(W / 2, H / 2, asset.key)
        .setDisplaySize(W, H)
        .setAlpha(alpha)
        .setDepth(depth)
    }
    addLayer(ASSETS.fishingField.waterBase, 1, 0)
    addLayer(ASSETS.fishingField.waterPattern, 0.46, 1)
    addLayer(ASSETS.fishingField.underwaterDepth, 0.58, 2)
    addLayer(ASSETS.fishingField.locationHarbor, 0.40, 3)

    const veil = this.add.graphics().setDepth(4)
    veil.fillGradientStyle(0x45cce8, 0x45cce8, 0x07527d, 0x07527d, 0.10, 0.10, 0.24, 0.24)
    veil.fillRect(0, 0, W, H)

    const cx = W / 2, cy = 350
    if (style) {
      const aura = this.add.graphics().setDepth(9)
      aura.fillStyle(style.color, style.fill)
      aura.fillEllipse(cx, cy, 190 * style.scale, 108 * style.scale)
      aura.lineStyle(rarity === 'legendary' ? 4 : 3, style.color, style.ring)
      aura.strokeEllipse(cx, cy, 168 * style.scale, 92 * style.scale)
    }

    if (this.textures.exists(ASSETS.fishingField.fishShadowMediumIdle.key)) {
      const fish = this.add.image(cx, cy, ASSETS.fishingField.fishShadowMediumIdle.key)
        .setDisplaySize(150 * (style?.scale ?? 1), 75 * (style?.scale ?? 1))
        .setDepth(10)
      if (rarity === 'uncommon') fish.setTint(0xcff7df)
      if (rarity === 'rare') fish.setTint(0xe1d4ff)
      if (rarity === 'legendary') fish.setTint(0xffefad)
    }

    const panel = this.add.graphics().setDepth(20)
    const accent = style?.color ?? 0x8fd8e8
    panel.fillStyle(0x071a28, 0.90)
    panel.lineStyle(2, accent, 0.92)
    panel.fillRoundedRect(30, 92, W - 60, 76, 20)
    panel.strokeRoundedRect(30, 92, W - 60, 76, 20)
    this.add.text(W / 2, 116, 'RARITY VISUAL QA', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif',
      fontSize: '10px', fontStyle: 'bold', color: '#dff5ff', letterSpacing: 1.2,
    }).setOrigin(0.5).setDepth(21)
    this.add.text(W / 2, 143, LABEL[rarity], {
      fontFamily: 'M PLUS Rounded 1c, sans-serif',
      fontSize: '24px', fontStyle: 'bold',
      color: rarity === 'legendary' ? '#ffd95a' : '#ffffff',
    }).setOrigin(0.5).setDepth(21)

    const notes = {
      common: '標準シルエット / オーラなし',
      uncommon: '軽い緑オーラ / +5%サイズ',
      rare: '紫オーラ / +11%サイズ',
      legendary: '金オーラ / +18%サイズ',
    }
    this.add.text(W / 2, 438, notes[rarity], {
      fontFamily: 'M PLUS Rounded 1c, sans-serif',
      fontSize: '12px', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: 'rgba(7,26,40,.76)', padding: { x: 12, y: 7 },
    }).setOrigin(0.5).setDepth(21)
  }
}
