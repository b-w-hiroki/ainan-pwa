import { FONT } from '../config/fontStyles.js'
import { ICONS } from '../config/icons.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const TABS = [
  { key: 'home', icon: ICONS.HOME, label: '\u30db\u30fc\u30e0', scene: 'HomeScene', x: 0.10 },
  { key: 'equip', icon: ICONS.GEAR, label: '\u88c5\u5099', scene: 'UpgradeScene', x: 0.30 },
  { key: 'town', icon: ICONS.TOWN, label: '\u6295\u8cc7', scene: 'TownScene', x: 0.50 },
  { key: 'shop', icon: ICONS.GIFT, label: '\u30b7\u30e7\u30c3\u30d7', scene: 'ExchangeScene', x: 0.70 },
  { key: 'menu', icon: ICONS.MENU, label: '\u30e1\u30cb\u30e5\u30fc', scene: 'MenuScene', x: 0.90 },
]

export function buildFooterNav(scene, W, H, activeKey = 'home') {
  const y = H - 72
  const h = 62
  const bar = scene.add.graphics().setDepth(90)
  bar.fillStyle(0xffffff, 0.97)
  bar.lineStyle(2.5, 0x1a2a3a, 0.92)
  bar.fillRoundedRect(10, y, W - 20, h, 20)
  bar.strokeRoundedRect(10, y, W - 20, h, 20)
  bar.lineStyle(1.5, 0x1a2a3a, 0.14)
  ;[0.20, 0.40, 0.60, 0.80].forEach(f => {
    const x = W * f
    bar.lineBetween(x, y + 10, x, y + h - 10)
  })

  TABS.forEach(tab => buildTab(scene, W * tab.x, y + 31, tab, activeKey))
}

function buildTab(scene, x, y, tab, activeKey) {
  const active = tab.key === activeKey

  if (active) {
    const activeBg = scene.add.graphics().setDepth(91)
    activeBg.fillStyle(0xfff1c6, 1)
    activeBg.lineStyle(2, 0xffd900, 1)
    activeBg.fillRoundedRect(x - 32, y - 26, 64, 52, 16)
    activeBg.strokeRoundedRect(x - 32, y - 26, 64, 52, 16)
  }

  scene.add.rectangle(x, y, 70, 58, 0x000000, 0)
    .setDepth(94)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => {
      if (!active) scene.scene.start(tab.scene)
    })

  scene.add.text(x, y - 9, tab.icon, {
    fontSize: '23px',
    resolution: TEXT_RES,
  }).setOrigin(0.5).setDepth(93)
  scene.add.text(x, y + 16, tab.label, {
    fontFamily: FONT, resolution: TEXT_RES,
    fontSize: '10px',
    fontWeight: '900',
    color: active ? '#1a3a5a' : '#6b7f8f',
  }).setOrigin(0.5).setDepth(93)
}
