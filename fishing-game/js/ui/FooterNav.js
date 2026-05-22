import { FONT } from '../config/fontStyles.js'
import { ICONS } from '../config/icons.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const TABS = [
  { key: 'home', icon: ICONS.HOME, glyph: 'home', label: '\u30db\u30fc\u30e0', scene: 'HomeScene', x: 0.10 },
  { key: 'equip', icon: ICONS.GEAR, glyph: 'equip', label: '\u88c5\u5099', scene: 'UpgradeScene', x: 0.30 },
  { key: 'town', icon: ICONS.TOWN, glyph: 'town', label: '\u6295\u8cc7', scene: 'TownScene', x: 0.50 },
  { key: 'shop', icon: ICONS.GIFT, glyph: 'shop', label: '\u30b7\u30e7\u30c3\u30d7', scene: 'ExchangeScene', x: 0.70 },
  { key: 'menu', icon: ICONS.MENU, glyph: 'menu', label: '\u30e1\u30cb\u30e5\u30fc', scene: 'MenuScene', x: 0.90 },
]

export function buildFooterNav(scene, W, H, activeKey = 'home') {
  const y = H - 76
  const h = 70
  const bar = scene.add.graphics().setDepth(90)
  bar.fillStyle(0x173248, 0.24)
  bar.fillRoundedRect(8, y + 5, W - 16, h, 18)
  bar.fillGradientStyle(0xfff7df, 0xfff2cf, 0xe9d4a8, 0xe3c893, 0.97)
  bar.lineStyle(2, 0x9e7a43, 0.72)
  bar.fillRoundedRect(8, y, W - 16, h, 18)
  bar.strokeRoundedRect(8, y, W - 16, h, 18)
  bar.fillStyle(0xffffff, 0.32)
  bar.fillRoundedRect(18, y + 5, W - 36, 13, 7)
  bar.lineStyle(1.2, 0x8d6227, 0.13)
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
    activeBg.fillStyle(0xffffff, 0.42)
    activeBg.lineStyle(2, 0xf0c15c, 0.72)
    activeBg.fillRoundedRect(x - 32, y - 40, 64, 76, 18)
    activeBg.strokeRoundedRect(x - 32, y - 40, 64, 76, 18)
  }

  scene.add.rectangle(x, y - 5, 76, 92, 0x000000, 0)
    .setDepth(94)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => {
      if (!active) scene.scene.start(tab.scene)
    })

  addFooterIcon(scene, x, y - 22, tab, active)
  scene.add.text(x, y + 25, tab.label, {
    fontFamily: FONT, resolution: TEXT_RES,
    fontSize: '10.5px',
    fontWeight: '900',
    color: active ? '#20394d' : '#66707a',
    stroke: '#ffffff',
    strokeThickness: 2,
  }).setOrigin(0.5).setDepth(93)
}

function addFooterIcon(scene, x, y, tab, active) {
  const g = scene.add.graphics().setDepth(93)
  const s = active ? 1.08 : 1
  const bg = active ? 0xf7ddb0 : 0xf3ead9
  const fg = active ? 0x24445a : 0x6c7680
  const line = active ? 0xc89b47 : 0xb9a47d

  g.fillStyle(0x173248, 0.14)
  g.fillCircle(x + 1, y + 3, 28 * s)
  g.fillStyle(bg, 0.98)
  g.lineStyle(2, line, active ? 0.95 : 0.55)
  g.fillCircle(x, y, 28 * s)
  g.strokeCircle(x, y, 28 * s)
  g.fillStyle(fg, 1)
  g.lineStyle(3, fg, 1)
  drawGlyph(g, tab.glyph, x, y, s)
}

function drawGlyph(g, type, x, y, s) {
  if (type === 'home') {
    g.fillTriangle(x - 16 * s, y - 3 * s, x, y - 17 * s, x + 16 * s, y - 3 * s)
    g.fillRoundedRect(x - 12 * s, y - 3 * s, 24 * s, 18 * s, 2 * s)
    g.fillStyle(0xf3ead9, 1)
    g.fillRoundedRect(x - 4 * s, y + 5 * s, 8 * s, 10 * s, 1.5 * s)
    return
  }
  if (type === 'equip') {
    g.lineBetween(x - 14 * s, y + 14 * s, x + 14 * s, y - 15 * s)
    g.strokeCircle(x - 4 * s, y + 4 * s, 7 * s)
    g.fillCircle(x + 12 * s, y - 13 * s, 3 * s)
    g.lineStyle(2, 0xf3ead9, 1)
    g.strokeCircle(x - 4 * s, y + 4 * s, 3 * s)
    return
  }
  if (type === 'town') {
    g.fillRoundedRect(x - 15 * s, y - 4 * s, 30 * s, 18 * s, 2 * s)
    g.fillTriangle(x - 18 * s, y - 4 * s, x, y - 19 * s, x + 18 * s, y - 4 * s)
    g.fillStyle(0xf3ead9, 1)
    g.fillRect(x - 10 * s, y + 2 * s, 5 * s, 8 * s)
    g.fillRect(x - 2 * s, y + 2 * s, 5 * s, 8 * s)
    g.fillRect(x + 6 * s, y + 2 * s, 5 * s, 8 * s)
    return
  }
  if (type === 'shop') {
    g.fillRoundedRect(x - 14 * s, y - 3 * s, 28 * s, 18 * s, 3 * s)
    g.fillRoundedRect(x - 10 * s, y - 15 * s, 20 * s, 11 * s, 4 * s)
    g.fillStyle(0xf3ead9, 1)
    g.fillRoundedRect(x - 6 * s, y - 11 * s, 12 * s, 7 * s, 2 * s)
    return
  }
  g.fillRoundedRect(x - 14 * s, y - 15 * s, 28 * s, 30 * s, 3 * s)
  g.fillStyle(0xf3ead9, 1)
  g.fillRoundedRect(x - 8 * s, y - 8 * s, 16 * s, 3 * s, 1.5 * s)
  g.fillRoundedRect(x - 8 * s, y - 1 * s, 16 * s, 3 * s, 1.5 * s)
  g.fillRoundedRect(x - 8 * s, y + 6 * s, 16 * s, 3 * s, 1.5 * s)
}
