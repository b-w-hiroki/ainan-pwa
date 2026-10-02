import { FONT, UI_COLORS } from '../config/fontStyles.js'
import { ICONS } from '../config/icons.js'
import { getCatches, getTownFacilities } from '../game/progress.js'
import { isReducedMotion, playSfx } from '../game/feedback.js'
import { drawGlyph } from './UiGlyph.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export const FOOTER_TABS = [
  { key: 'home', icon: ICONS.HOME, glyph: 'home', label: 'ホーム', scene: 'HomeScene', x: 0.10 },
  { key: 'equip', icon: ICONS.GEAR, glyph: 'equip', label: '装備', scene: 'UpgradeScene', x: 0.30 },
  { key: 'town', icon: ICONS.TOWN, glyph: 'town', label: 'まち', scene: 'TownScene', x: 0.50 },
  { key: 'shop', icon: ICONS.GIFT, glyph: 'shop', label: '交換', scene: 'ExchangeScene', x: 0.70 },
  { key: 'menu', icon: ICONS.MENU, glyph: 'menu', label: 'メニュー', scene: 'MenuScene', x: 0.90 },
]

export const FOOTER_NAV_SPEC = Object.freeze({
  height: 80,
  bottomInset: 6,
  minHitWidth: 68,
  hitHeight: 72,
  iconRadius: 20,
  labelBaseline: 55,
})

export function buildFooterNav(scene, W, H, activeKey = 'home', options = {}) {
  if (activeKey === 'town') buildTownReaction(scene, W, H)

  const disabledKeys = new Set(options.disabledKeys ?? [])
  const h = FOOTER_NAV_SPEC.height
  const y = H - h - FOOTER_NAV_SPEC.bottomInset
  const bar = scene.add.graphics().setDepth(90)
  const useArt = Boolean(options.useArt && scene.textures.exists('ui_art_footer_shell'))

  if (useArt) {
    scene.add.image(W / 2, y + h / 2 + 2, 'ui_art_footer_shell').setDisplaySize(W - 8, h + 13).setDepth(90)
  } else {
    bar.fillStyle(0x173248, 0.24)
    bar.fillRoundedRect(8, y + 7, W - 16, h, 24)

    bar.fillStyle(0xf8fdff, 0.985)
    bar.lineStyle(2, 0x68bee3, 0.94)
    bar.fillRoundedRect(8, y, W - 16, h, 24)
    bar.strokeRoundedRect(8, y, W - 16, h, 24)

    bar.fillStyle(0xffffff, 0.92)
    bar.fillRoundedRect(18, y + 7, W - 36, 9, 5)
    bar.fillStyle(0xdff5ff, 0.70)
    bar.fillRoundedRect(16, y + 17, W - 32, 5, 3)

    bar.lineStyle(1, 0x9bcfe5, 0.28)
    ;[0.20, 0.40, 0.60, 0.80].forEach(f => {
      const x = W * f
      bar.lineBetween(x, y + 22, x, y + h - 14)
    })
  }

  const tabs = FOOTER_TABS.map(tab => createFooterTab(scene, W * tab.x, y, tab, {
    active: tab.key === activeKey,
    disabled: disabledKeys.has(tab.key),
    useArt,
  }))
  scene._footerKeyboardFocus = false
  let focusIndex = Math.max(0, FOOTER_TABS.findIndex(tab => tab.key === activeKey))
  const setFocus = index => {
    scene._footerKeyboardFocus = true
    focusIndex = (index + tabs.length) % tabs.length
    tabs.forEach((tab, tabIndex) => tab.render(tabIndex === focusIndex ? 'focus' : 'idle'))
  }
  const activateFocus = () => { if (scene._footerKeyboardFocus) tabs[focusIndex]?.activate() }
  const clearFocus = () => {
    scene._footerKeyboardFocus = false
    tabs.forEach(tab => tab.render('idle'))
  }
  const onLeft = () => setFocus(focusIndex - 1)
  const onRight = () => setFocus(focusIndex + 1)
  scene.input.keyboard?.on('keydown-LEFT', onLeft)
  scene.input.keyboard?.on('keydown-RIGHT', onRight)
  scene.input.keyboard?.on('keydown-ENTER', activateFocus)
  scene.input.keyboard?.on('keydown-SPACE', activateFocus)
  scene.input.keyboard?.on('keydown-ESC', clearFocus)
  scene.events.once('shutdown', () => {
    scene.input.keyboard?.off('keydown-LEFT', onLeft)
    scene.input.keyboard?.off('keydown-RIGHT', onRight)
    scene.input.keyboard?.off('keydown-ENTER', activateFocus)
    scene.input.keyboard?.off('keydown-SPACE', activateFocus)
    scene.input.keyboard?.off('keydown-ESC', clearFocus)
  })
  scene._footerMetrics = Object.freeze({
    y, height: h, bottomInset: H - (y + h),
    hitWidth: Math.max(FOOTER_NAV_SPEC.minHitWidth, W / FOOTER_TABS.length),
    hitHeight: FOOTER_NAV_SPEC.hitHeight,
    states: Object.freeze(['idle', 'focus', 'pressed', 'selected', 'disabled']),
  })
  scene._footerTabs = tabs
}
function createFooterTab(scene, x, y, tab, { active, disabled, useArt }) {
  const width = 68
  const centerY = y + 38
  const surface = scene.add.graphics().setDepth(91)
  const icon = scene.add.graphics().setDepth(93)
  const artKey = `ui_art_icon_${tab.key === 'shop' ? 'exchange' : tab.key}`
  const selectedArt = useArt && active
    ? scene.add.image(x, y + 37, 'ui_art_tab_selected').setDisplaySize(64, 72).setDepth(91)
    : null
  const artIcon = useArt && scene.textures.exists(artKey)
    ? scene.add.image(x, y + 28, artKey).setDisplaySize(tab.key === 'town' ? 39 : 35, tab.key === 'equip' ? 42 : 35).setDepth(93)
    : null
  const label = scene.add.text(x, y + FOOTER_NAV_SPEC.labelBaseline, tab.label, {
    fontFamily: FONT, resolution: TEXT_RES, fontSize: active ? '12px' : '11px', fontWeight: '900',
    color: active ? UI_COLORS.oceanDeep : disabled ? '#a9b9c3' : UI_COLORS.muted,
  }).setOrigin(0.5).setDepth(93)
  const hit = scene.add.rectangle(x, centerY, width, FOOTER_NAV_SPEC.hitHeight, 0x000000, 0).setDepth(94)
  if (!disabled) hit.setInteractive({ useHandCursor: !active })
  let locked = false

  const render = (mode = 'idle') => {
    const pressed = mode === 'pressed'
    const focused = mode === 'focus'
    const dy = pressed ? 2 : 0
    surface.clear(); icon.clear()
    if (!useArt && (active || focused)) {
      surface.fillStyle(active ? 0x2f9ed4 : 0xffd95a, active ? 0.14 : 0.13)
      surface.fillRoundedRect(x - 32, y + 6 + dy, 64, 66, 20)
      surface.lineStyle(2, active ? 0x2f9ed4 : 0xe5b83b, focused ? 0.92 : 0.74)
      surface.strokeRoundedRect(x - 32, y + 6 + dy, 64, 66, 20)
      surface.fillStyle(active ? 0xffd95a : 0xffffff, 1)
      surface.fillRoundedRect(x - 13, y + 68 + dy, 26, 4, 2)
    }
    if (!artIcon) {
      const radius = active ? 21 : 19
      icon.fillStyle(disabled ? 0xe9f0f3 : active ? 0xdff5ff : 0xffffff, disabled ? 0.72 : 1)
      icon.lineStyle(active ? 2.2 : 1.4, disabled ? 0xcbd6db : active ? 0x2f9ed4 : 0xb9dce9, 1)
      icon.fillCircle(x, y + 29 + dy, radius)
      icon.strokeCircle(x, y + 29 + dy, radius)
      if (active) {
        icon.fillStyle(0xffffff, 0.78)
        icon.fillEllipse(x - 6, y + 22 + dy, 17, 7)
      }
      const fg = disabled ? 0x9baab3 : active ? 0x1f6f9f : 0x718392
      icon.fillStyle(fg, 1); icon.lineStyle(2.7, fg, 1)
      drawGlyph(icon, tab.glyph, x, y + 29 + dy, active ? 1.02 : 0.9)
    }
    artIcon?.setY(y + 28 + dy).setAlpha(disabled ? 0.34 : active ? 1 : focused ? 0.9 : 0.68)
    selectedArt?.setY(y + 37 + dy)
    if (useArt && focused && !active) {
      surface.lineStyle(2, 0xffd95a, 0.92)
      surface.strokeRoundedRect(x - 29, y + 7 + dy, 58, 64, 18)
    }
    label.setY(y + FOOTER_NAV_SPEC.labelBaseline + dy)
  }
  const activate = () => {
    if (disabled || active || locked) return
    locked = true
    playSfx('select')
    scene.time.delayedCall(180, () => { if (scene.sys?.isActive?.()) scene.scene.start(tab.scene) })
  }
  hit.on('pointerdown', () => { render('pressed'); if (!isReducedMotion()) label.setScale(0.98) })
    .on('pointerup', () => { render('focus'); label.setScale(1); activate() })
    .on('pointerover', () => render('focus'))
    .on('pointerout', () => { render('idle'); label.setScale(1) })
  render(disabled ? 'disabled' : 'idle')
  return { key: tab.key, active, disabled, hit, render, activate }
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
