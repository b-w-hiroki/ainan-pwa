import { FONT, UI_COLORS } from '../config/fontStyles.js'
import { ICONS } from '../config/icons.js'
import { getCatches, getTownFacilities } from '../game/progress.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const TABS = [
  { key: 'home', icon: ICONS.HOME, glyph: 'home', label: 'ホーム', scene: 'HomeScene', x: 0.10 },
  { key: 'equip', icon: ICONS.GEAR, glyph: 'equip', label: '装備', scene: 'UpgradeScene', x: 0.30 },
  { key: 'town', icon: ICONS.TOWN, glyph: 'town', label: 'まち', scene: 'TownScene', x: 0.50 },
  { key: 'shop', icon: ICONS.GIFT, glyph: 'shop', label: '交換', scene: 'ExchangeScene', x: 0.70 },
  { key: 'menu', icon: ICONS.MENU, glyph: 'menu', label: 'メニュー', scene: 'MenuScene', x: 0.90 },
]

export function buildFooterNav(scene, W, H, activeKey = 'home') {
  if (activeKey === 'town') buildTownReaction(scene, W, H)

  const y = H - 84
  const h = 78
  const bar = scene.add.graphics().setDepth(90)

  bar.fillStyle(0x173248, 0.16)
  bar.fillRoundedRect(8, y + 6, W - 16, h, 24)

  bar.fillStyle(0xf8fdff, 0.98)
  bar.lineStyle(2, 0x9bcfe5, 0.9)
  bar.fillRoundedRect(8, y, W - 16, h, 24)
  bar.strokeRoundedRect(8, y, W - 16, h, 24)

  bar.fillStyle(0xdff5ff, 0.72)
  bar.fillRoundedRect(16, y + 8, W - 32, 16, 10)

  bar.lineStyle(1, 0x9bcfe5, 0.28)
  ;[0.20, 0.40, 0.60, 0.80].forEach(f => {
    const x = W * f
    bar.lineBetween(x, y + 22, x, y + h - 14)
  })

  TABS.forEach(tab => drawTabWell(scene, W * tab.x, y + 38, tab.key === activeKey))
  TABS.forEach(tab => buildTab(scene, W * tab.x, y + 39, tab, activeKey))
}

function getTownReaction() {
  const catches = getCatches()
  const facilities = getTownFacilities()
  const count = id => catches.filter(c => c.fishId === id).length
  const caught = id => count(id) > 0
  const species = new Set(catches.map(c => c.fishId)).size

  if (caught('kue')) {
    return {
      speaker: '港の船長',
      mark: '船',
      message: '黒潮の主を本当に上げたのか。港中があんたの話でもちきりだ。',
      accent: 0xffd95a,
    }
  }
  if ((facilities.pier ?? 0) >= 2) {
    return {
      speaker: '港の船長',
      mark: '船',
      message: '黒潮崎まで出られるようになった。特製まき餌があれば、あの大物も狙えるぞ。',
      accent: 0xff765a,
    }
  }
  if ((facilities.festival ?? 0) >= 1) {
    return {
      speaker: '若い釣り人',
      mark: '若',
      message: '広場で特製まき餌が手に入るよ。次は大物を町へ持ち帰ってきて。',
      accent: 0xbc7cff,
    }
  }
  if ((facilities.market ?? 0) >= 1 && count('aji') >= 2) {
    return {
      speaker: '市場のおやじ',
      mark: '市',
      message: `アジが${count('aji')}匹も上がったか。市場に魚が並ぶと、町の空気が変わるな。`,
      accent: 0x5bb5d8,
    }
  }
  if ((facilities.market ?? 0) >= 1) {
    return {
      speaker: '市場のおやじ',
      mark: '市',
      message: '市場を開けたぞ。エビも仕入れた。レア魚を狙うなら試してみな。',
      accent: 0x5bb5d8,
    }
  }
  if (species >= 3) {
    return {
      speaker: '案内所スタッフ',
      mark: '案',
      message: `${species}種類も見つけたんですね。釣果が増えるほど、この町を紹介しやすくなります。`,
      accent: 0x71d6a2,
    }
  }
  if (catches.length >= 3) {
    return {
      speaker: '若い釣り人',
      mark: '若',
      message: '最近、魚を持って帰ってくるたびに人が増えてる。もう少しで町が動きそうだ。',
      accent: 0xff9b5e,
    }
  }
  return {
    speaker: '案内所スタッフ',
    mark: '案',
    message: '釣果を町へ持ち帰ってください。あなたの一匹が、港を少しずつ変えていきます。',
    accent: 0x71d6a2,
  }
}

function buildTownReaction(scene, W, H) {
  const reaction = getTownReaction()
  const x = 16, y = H - 142, w = W - 32, h = 50
  const g = scene.add.graphics().setDepth(86)
  g.fillStyle(0x173248, 0.14)
  g.fillRoundedRect(x + 2, y + 4, w, h, 16)
  g.fillStyle(0xf8fdff, 0.98)
  g.lineStyle(1.7, reaction.accent, 0.82)
  g.fillRoundedRect(x, y, w, h, 16)
  g.strokeRoundedRect(x, y, w, h, 16)
  g.fillStyle(reaction.accent, 0.18)
  g.fillCircle(x + 28, y + h / 2, 19)
  g.fillStyle(reaction.accent, 1)
  g.fillCircle(x + 28, y + h / 2, 13)

  scene.add.text(x + 28, y + h / 2, reaction.mark, {
    fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: '#ffffff',
  }).setOrigin(0.5).setDepth(87)

  scene.add.text(x + 54, y + 13, reaction.speaker, {
    fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: UI_COLORS.oceanDeep,
  }).setOrigin(0, 0.5).setDepth(87)

  scene.add.text(x + 54, y + 31, reaction.message, {
    fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '800', color: UI_COLORS.ink,
    wordWrap: { width: w - 70 },
  }).setOrigin(0, 0.5).setDepth(87)
}

function buildTab(scene, x, y, tab, activeKey) {
  const active = tab.key === activeKey

  scene.add.rectangle(x, y - 4, 76, 92, 0x000000, 0)
    .setDepth(94)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => {
      if (!active) scene.scene.start(tab.scene)
    })

  addFooterIcon(scene, x, y - 17, tab, active)
  scene.add.text(x, y + 25, tab.label, {
    fontFamily: FONT,
    resolution: TEXT_RES,
    fontSize: active ? '12px' : '11px',
    fontWeight: '900',
    color: active ? UI_COLORS.oceanDeep : UI_COLORS.muted,
  }).setOrigin(0.5).setDepth(93)
}

function drawTabWell(scene, x, y, active) {
  const g = scene.add.graphics().setDepth(91)
  const w = active ? 62 : 54
  const h = active ? 66 : 58

  if (active) {
    g.fillStyle(0x2f9ed4, 0.12)
    g.fillRoundedRect(x - 36, y - 37, 72, 74, 22)
    g.fillStyle(0xffd95a, 0.23)
    g.fillCircle(x + 22, y - 22, 7)
  }

  g.fillStyle(active ? 0xffffff : 0xf5fbfd, active ? 1 : 0.82)
  g.lineStyle(active ? 2.2 : 1.2, active ? 0x2f9ed4 : 0xc6e5f1, active ? 0.95 : 0.75)
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 18)
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 18)

  if (active) {
    g.fillStyle(0xdff5ff, 0.95)
    g.fillRoundedRect(x - w / 2 + 7, y - h / 2 + 7, w - 14, 12, 7)
  }
}

function addFooterIcon(scene, x, y, tab, active) {
  const g = scene.add.graphics().setDepth(93)
  const s = active ? 1.03 : 0.92
  const radius = active ? 22 : 20
  const fg = active ? 0x1f6f9f : 0x718392

  g.fillStyle(active ? 0xdff5ff : 0xf8fdff, 1)
  g.lineStyle(active ? 2 : 1.4, active ? 0x68bee3 : 0xc6dce6, 1)
  g.fillCircle(x, y, radius)
  g.strokeCircle(x, y, radius)

  if (active) {
    g.fillStyle(0xffffff, 0.72)
    g.fillEllipse(x - 6, y - 8, 18, 8)
  }

  g.fillStyle(fg, 1)
  g.lineStyle(2.7, fg, 1)
  drawGlyph(g, tab.glyph, x, y, s)
}

function drawGlyph(g, type, x, y, s) {
  if (type === 'home') {
    g.fillTriangle(x - 15 * s, y - 3 * s, x, y - 16 * s, x + 15 * s, y - 3 * s)
    g.fillRoundedRect(x - 11 * s, y - 3 * s, 22 * s, 17 * s, 3 * s)
    g.fillStyle(0xf8fdff, 1)
    g.fillRoundedRect(x - 3 * s, y + 5 * s, 6 * s, 9 * s, 1.5 * s)
    return
  }

  if (type === 'equip') {
    g.lineBetween(x - 13 * s, y + 13 * s, x + 13 * s, y - 14 * s)
    g.strokeCircle(x - 4 * s, y + 4 * s, 7 * s)
    g.fillCircle(x + 11 * s, y - 12 * s, 3 * s)
    g.lineStyle(2, 0xf8fdff, 1)
    g.strokeCircle(x - 4 * s, y + 4 * s, 3 * s)
    return
  }

  if (type === 'town') {
    g.fillRoundedRect(x - 14 * s, y - 3 * s, 28 * s, 17 * s, 3 * s)
    g.fillTriangle(x - 17 * s, y - 3 * s, x, y - 17 * s, x + 17 * s, y - 3 * s)
    g.fillStyle(0xf8fdff, 1)
    g.fillRect(x - 9 * s, y + 2 * s, 5 * s, 8 * s)
    g.fillRect(x - 2 * s, y + 2 * s, 5 * s, 8 * s)
    g.fillRect(x + 5 * s, y + 2 * s, 5 * s, 8 * s)
    return
  }

  if (type === 'shop') {
    g.fillRoundedRect(x - 14 * s, y - 3 * s, 28 * s, 17 * s, 4 * s)
    g.fillRoundedRect(x - 10 * s, y - 14 * s, 20 * s, 10 * s, 4 * s)
    g.fillStyle(0xf8fdff, 1)
    g.fillRoundedRect(x - 5 * s, y - 10 * s, 10 * s, 6 * s, 2 * s)
    return
  }

  g.fillRoundedRect(x - 13 * s, y - 14 * s, 26 * s, 28 * s, 4 * s)
  g.fillStyle(0xf8fdff, 1)
  g.fillRoundedRect(x - 7 * s, y - 7 * s, 14 * s, 3 * s, 1.5 * s)
  g.fillRoundedRect(x - 7 * s, y - 1 * s, 14 * s, 3 * s, 1.5 * s)
  g.fillRoundedRect(x - 7 * s, y + 5 * s, 14 * s, 3 * s, 1.5 * s)
}
