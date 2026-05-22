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
  const y = H - 82
  const h = 76
  const bar = scene.add.graphics().setDepth(90)
  bar.fillStyle(0x173248, 0.28)
  bar.fillRoundedRect(7, y + 6, W - 14, h, 18)
  bar.fillGradientStyle(0x7f5622, 0x7f5622, 0x3f2b16, 0x3f2b16, 0.98)
  bar.fillRoundedRect(7, y + 41, W - 14, 36, 16)
  bar.fillGradientStyle(0xfff6dd, 0xffe9ae, 0xe2bd75, 0xc9964a, 1)
  bar.lineStyle(2.4, 0x7f5622, 0.92)
  bar.fillRoundedRect(8, y, W - 16, h, 18)
  bar.strokeRoundedRect(8, y, W - 16, h, 18)
  bar.fillGradientStyle(0xffffff, 0xffffff, 0xffe9a6, 0xffe9a6, 0.44, 0.28, 0.10, 0.08)
  bar.fillRoundedRect(18, y + 6, W - 36, 15, 8)
  bar.lineStyle(1.2, 0x80551d, 0.22)
  ;[0.20, 0.40, 0.60, 0.80].forEach(f => {
    const x = W * f
    bar.lineBetween(x, y + 19, x, y + h - 10)
  })

  TABS.forEach(tab => drawTabWell(scene, W * tab.x, y + 37, tab.key === activeKey))
  TABS.forEach(tab => buildTab(scene, W * tab.x, y + 38, tab, activeKey))
}

function buildTab(scene, x, y, tab, activeKey) {
  const active = tab.key === activeKey

  scene.add.rectangle(x, y - 5, 76, 92, 0x000000, 0)
    .setDepth(94)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => {
      if (!active) scene.scene.start(tab.scene)
    })

  addFooterIcon(scene, x, y - 18, tab, active)
  scene.add.text(x, y + 25, tab.label, {
    fontFamily: FONT, resolution: TEXT_RES,
    fontSize: '10.5px',
    fontWeight: '900',
    color: active ? '#20394d' : '#66707a',
    stroke: '#ffffff',
    strokeThickness: 2,
  }).setOrigin(0.5).setDepth(93)
}

function drawTabWell(scene, x, y, active) {
  const g = scene.add.graphics().setDepth(91)
  const w = active ? 64 : 58
  const h = active ? 66 : 60
  const rx = 16
  if (active) {
    g.fillStyle(0xffdf6d, 0.28)
    g.fillRoundedRect(x - w / 2 - 4, y - h / 2 - 3, w + 8, h + 8, rx + 3)
  }
  g.fillStyle(0x3d2a16, active ? 0.28 : 0.20)
  g.fillRoundedRect(x - w / 2, y - h / 2 + 4, w, h, rx)
  g.fillGradientStyle(
    active ? 0xfff7d8 : 0xf4e7d1,
    active ? 0xffedb0 : 0xe9d7b8,
    active ? 0xd9a450 : 0xc3aa7d,
    active ? 0xb87a27 : 0xa99168,
    active ? 0.99 : 0.90,
  )
  g.lineStyle(active ? 2.4 : 1.5, active ? 0x7f5622 : 0x9c835a, active ? 0.92 : 0.55)
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, rx)
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, rx)
  g.fillStyle(0xffffff, active ? 0.36 : 0.18)
  g.fillRoundedRect(x - w / 2 + 7, y - h / 2 + 6, w - 14, 8, 5)
  g.fillStyle(active ? 0x24445a : 0x8f7653, active ? 0.20 : 0.12)
  g.fillRoundedRect(x - 22, y + 17, 44, 5, 3)
  if (active) {
    g.fillStyle(0xffffff, 0.52)
    g.fillCircle(x - 18, y - 22, 3)
    g.fillCircle(x + 18, y - 22, 3)
  }
}

function addFooterIcon(scene, x, y, tab, active) {
  const g = scene.add.graphics().setDepth(93)
  const s = active ? 1.06 : 0.92
  const bg = active ? 0xfff0c4 : 0xf3ead9
  const fg = active ? 0x163a54 : 0x6c7680
  const line = active ? 0xc89b47 : 0xb9a47d

  g.fillStyle(0x173248, active ? 0.14 : 0.05)
  g.fillCircle(x, y + 2, 23 * s)
  g.fillGradientStyle(bg, bg, active ? 0xe8bd69 : 0xe2d6c1, active ? 0xd4a24d : 0xd4c7b2, active ? 0.98 : 0.52)
  g.lineStyle(1.6, line, active ? 0.72 : 0.25)
  g.fillCircle(x, y, 22 * s)
  g.strokeCircle(x, y, 22 * s)
  if (active) {
    g.fillStyle(0xffffff, 0.38)
    g.fillEllipse(x - 7, y - 8, 18, 8)
  }
  g.fillStyle(fg, 1)
  g.lineStyle(2.8, fg, 1)
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
