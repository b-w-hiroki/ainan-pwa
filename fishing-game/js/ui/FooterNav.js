import { FONT } from '../config/fontStyles.js'
import { ICONS } from '../config/icons.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const TABS = [
  { key: 'home', icon: ICONS.HOME, label: 'ホーム', scene: 'HomeScene', x: 0.09 },
  { key: 'equip', icon: ICONS.GEAR, label: '装備', scene: 'UpgradeScene', x: 0.255 },
  { key: 'fish', icon: ICONS.ROD, label: '釣り', scene: 'MapScene', x: 0.42, primary: true },
  { key: 'town', icon: ICONS.TOWN, label: '投資', scene: 'TownScene', x: 0.585 },
  { key: 'shop', icon: ICONS.GIFT, label: 'ショップ', scene: 'ExchangeScene', x: 0.75 },
  { key: 'menu', icon: ICONS.MENU, label: 'メニュー', scene: 'MenuScene', x: 0.91 },
]

export function buildFooterNav(scene, W, H, activeKey = 'home') {
  const y = H - 60
  const bar = scene.add.graphics().setDepth(90)
  bar.fillStyle(0xffffff, 0.96)
  bar.lineStyle(2.5, 0x1a2a3a, 1)
  bar.fillRoundedRect(10, y, W - 20, 50, 18)
  bar.strokeRoundedRect(10, y, W - 20, 50, 18)

  TABS.forEach(tab => buildTab(scene, W * tab.x, y + 25, tab, activeKey))
}

function buildTab(scene, x, y, tab, activeKey) {
  const active = tab.key === activeKey

  if (tab.primary) {
    const g = scene.add.graphics().setDepth(91)
    g.fillStyle(active ? 0xffd900 : 0xffffff, 1)
    g.lineStyle(3, 0x1a2a3a, 1)
    g.fillCircle(x, y - 8, 30)
    g.strokeCircle(x, y - 8, 30)
    scene.add.rectangle(x, y - 8, 60, 60, 0x000000, 0)
      .setDepth(94)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (!active) scene.scene.start(tab.scene)
      })
  } else {
    scene.add.rectangle(x, y, 52, 44, 0x000000, 0)
      .setDepth(94)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (!active) scene.scene.start(tab.scene)
      })
  }

  const iconY = tab.primary ? y - 16 : y - 9
  const labelY = tab.primary ? y + 7 : y + 11
  scene.add.text(x, iconY, tab.icon, {
    fontSize: tab.primary ? '23px' : '18px',
    resolution: TEXT_RES,
  }).setOrigin(0.5).setDepth(93)
  scene.add.text(x, labelY, tab.label, {
    fontFamily: FONT, resolution: TEXT_RES,
    fontSize: tab.primary ? '11px' : '9px',
    fontWeight: '900',
    color: active ? '#1a3a5a' : '#6b7f8f',
  }).setOrigin(0.5).setDepth(93)
}
