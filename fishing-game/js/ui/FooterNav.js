import { FONT } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { ICONS } from '../config/icons.js'

const TEXT_RES = window.devicePixelRatio ?? 1
const loadingTextureKeys = new Set()

const TABS = [
  { key: 'home', icon: ICONS.HOME, asset: ASSETS.ui.footerHome, label: '\u30db\u30fc\u30e0', scene: 'HomeScene', x: 0.10 },
  { key: 'equip', icon: ICONS.GEAR, asset: ASSETS.ui.footerEquip, label: '\u88c5\u5099', scene: 'UpgradeScene', x: 0.30 },
  { key: 'town', icon: ICONS.TOWN, asset: ASSETS.ui.footerTown, label: '\u6295\u8cc7', scene: 'TownScene', x: 0.50 },
  { key: 'shop', icon: ICONS.GIFT, asset: ASSETS.ui.footerShop, label: '\u30b7\u30e7\u30c3\u30d7', scene: 'ExchangeScene', x: 0.70 },
  { key: 'menu', icon: ICONS.MENU, asset: ASSETS.ui.footerMenu, label: '\u30e1\u30cb\u30e5\u30fc', scene: 'MenuScene', x: 0.90 },
]

export function buildFooterNav(scene, W, H, activeKey = 'home') {
  const y = H - 76
  const h = 70
  const bar = scene.add.graphics().setDepth(90)
  bar.fillStyle(0x2d2115, 0.22)
  bar.fillRoundedRect(8, y + 6, W - 16, h, 18)
  bar.fillGradientStyle(0xfff7dd, 0xfff1c0, 0xf4d48b, 0xf2cc78, 0.98)
  bar.lineStyle(2.2, 0xb5792d, 0.92)
  bar.fillRoundedRect(8, y, W - 16, h, 18)
  bar.strokeRoundedRect(8, y, W - 16, h, 18)
  bar.fillStyle(0xffffff, 0.38)
  bar.fillRoundedRect(18, y + 5, W - 36, 13, 7)
  bar.lineStyle(1.2, 0x8d6227, 0.16)
  ;[0.20, 0.40, 0.60, 0.80].forEach(f => {
    const x = W * f
    bar.lineBetween(x, y + 18, x, y + h - 9)
  })

  TABS.forEach(tab => buildTab(scene, W * tab.x, y + 36, tab, activeKey))
}

function buildTab(scene, x, y, tab, activeKey) {
  const active = tab.key === activeKey

  if (active) {
    const activeBg = scene.add.graphics().setDepth(91)
    activeBg.fillStyle(0xffffff, 0.32)
    activeBg.lineStyle(2, 0xffe080, 0.78)
    activeBg.fillRoundedRect(x - 35, y - 44, 70, 82, 18)
    activeBg.strokeRoundedRect(x - 35, y - 44, 70, 82, 18)
  }

  scene.add.rectangle(x, y - 5, 76, 92, 0x000000, 0)
    .setDepth(94)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => {
      if (!active) scene.scene.start(tab.scene)
    })

  addFooterIcon(scene, x, y - 20, tab, active)
  scene.add.text(x, y + 25, tab.label, {
    fontFamily: FONT, resolution: TEXT_RES,
    fontSize: '10.5px',
    fontWeight: '900',
    color: active ? '#3d260d' : '#6a4f2b',
    stroke: '#ffffff',
    strokeThickness: 2,
  }).setOrigin(0.5).setDepth(93)
}

function addFooterIcon(scene, x, y, tab, active) {
  const asset = tab.asset
  if (asset && scene.textures.exists(asset.key)) {
    addImageIcon(scene, x, y, asset.key, active)
    return
  }

  const fallback = scene.add.text(x, y, tab.icon, {
    fontSize: active ? '27px' : '24px',
    resolution: TEXT_RES,
  }).setOrigin(0.5).setDepth(93)

  if (asset && !loadingTextureKeys.has(asset.key)) {
    loadingTextureKeys.add(asset.key)
    const img = new Image()
    img.onload = () => {
      if (!scene.textures.exists(asset.key)) scene.textures.addImage(asset.key, img)
      loadingTextureKeys.delete(asset.key)
      if (fallback.scene) {
        fallback.destroy()
        addImageIcon(scene, x, y, asset.key, active)
      }
    }
    img.onerror = () => loadingTextureKeys.delete(asset.key)
    img.src = asset.path
  }
}

function addImageIcon(scene, x, y, key, active) {
  scene.add.image(x, y, key)
    .setOrigin(0.5)
    .setDisplaySize(active ? 66 : 60, active ? 68 : 62)
    .setDepth(93)
}
