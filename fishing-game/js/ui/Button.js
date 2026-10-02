import { FONT, UI_COLORS } from '../config/fontStyles.js'
import { isReducedMotion, playSfx } from '../game/feedback.js'
import { drawGlyph } from './UiGlyph.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export const BUTTON_SPEC = Object.freeze({
  minHeight: 44,
  minHitHeight: 48,
  radius: 20,
  lockMs: 220,
})

const VARIANTS = {
  primary: { fill: 0xffd95a, hover: 0xffe78d, text: UI_COLORS.ink, border: 0x173248, glow: 0xffefb4, disc: 0x1f6f9f, icon: 0xffffff },
  secondary: { fill: 0xdff5ff, hover: 0xc8eeff, text: UI_COLORS.ink, border: 0x2f9ed4, glow: 0xffffff, disc: 0x2f9ed4, icon: 0xffffff },
  ghost: { fill: 0xf8fdff, hover: 0xeaf8ff, text: UI_COLORS.ink, border: 0x9bcfe5, glow: 0xffffff, disc: 0xdff5ff, icon: 0x1f6f9f },
  danger: { fill: 0xff765a, hover: 0xff927c, text: '#ffffff', border: 0x173248, glow: 0xffc0b4, disc: 0x173248, icon: 0xffffff },
}

export class Button {
  constructor(scene, {
    x, y, w = 260, h = 60, label, subLabel = '', icon, glyph, trailing = '', variant = 'primary',
    fontSize = 20, depth = 10, disabled = false, keyboard = false, pulse = false, artKeys = null, artIconKey = '', onClick,
  }) {
    h = Math.max(BUTTON_SPEC.minHeight, h)
    const v = VARIANTS[variant] ?? VARIANTS.primary
    const container = scene.add.container(x, y).setDepth(depth)
    const shadow = scene.add.graphics()
    const surface = scene.add.graphics()
    const artSurface = artKeys?.idle && scene.textures.exists(artKeys.idle)
      ? scene.add.image(0, 1, artKeys.idle).setDisplaySize(w + 18, h + 16)
      : null
    const glyphGfx = scene.add.graphics()
    const artIcon = artIconKey && scene.textures.exists(artIconKey)
      ? scene.add.image(-w / 2 + 39, 0, artIconKey).setDisplaySize(36, 49)
      : null
    const labelX = glyph || icon ? 15 : 0
    const titleY = subLabel ? -8 : 0
    const title = scene.add.text(labelX, titleY, label, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: `${fontSize}px`, fontWeight: '900', color: v.text,
      stroke: variant === 'danger' ? '#173248' : '#ffffff', strokeThickness: variant === 'danger' ? 2 : 1,
      align: 'center', wordWrap: { width: w - (glyph || icon ? 104 : 48), useAdvancedWrap: true },
    }).setOrigin(0.5)
    const sub = subLabel ? scene.add.text(labelX, 15, subLabel, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.inkSoft,
      align: 'center', wordWrap: { width: w - 100, useAdvancedWrap: true },
    }).setOrigin(0.5) : null
    const trail = trailing ? scene.add.text(w / 2 - 27, 0, trailing, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '25px', fontWeight: '900', color: v.text,
    }).setOrigin(0.5) : null
    const iconText = icon && !glyph ? scene.add.text(-w / 2 + 39, 0, icon, { fontSize: '23px', resolution: TEXT_RES }).setOrigin(0.5) : null
    let isDisabled = Boolean(disabled)
    let isPressed = false
    let locked = false

    const draw = (mode = 'idle') => {
      const pressed = mode === 'pressed' && !isDisabled
      const hover = mode === 'hover' && !isDisabled
      const focused = mode === 'focus' && !isDisabled
      const dy = pressed ? 2 : 0
      surface.clear(); shadow.clear(); glyphGfx.clear()
      if (artSurface) {
        const texture = isDisabled ? artKeys.disabled : pressed ? artKeys.pressed : artKeys.idle
        if (texture && scene.textures.exists(texture)) artSurface.setTexture(texture)
        artSurface.setY(dy).setTint(focused ? 0xffffff : 0xffffff).setAlpha(isDisabled ? 0.82 : 1)
      } else {
        shadow.fillStyle(0x173248, isDisabled ? 0.08 : pressed ? 0.10 : 0.20)
        shadow.fillRoundedRect(-w / 2 + 2, -h / 2 + (pressed ? 3 : 6), w, h, BUTTON_SPEC.radius)
        surface.fillStyle(isDisabled ? 0xdce8ed : hover || focused ? v.hover : v.fill, 1)
        surface.lineStyle(focused ? 3 : pressed ? 2 : 2.5, isDisabled ? 0xa9bdc7 : v.border, isDisabled ? 0.62 : pressed ? 0.68 : 0.92)
        surface.fillRoundedRect(-w / 2, -h / 2 + dy, w, h, BUTTON_SPEC.radius)
        surface.strokeRoundedRect(-w / 2, -h / 2 + dy, w, h, BUTTON_SPEC.radius)
        surface.fillStyle(isDisabled ? 0xffffff : v.glow, isDisabled ? 0.20 : pressed ? 0.20 : 0.44)
        surface.fillRoundedRect(-w / 2 + 13, -h / 2 + 8 + dy, w - 26, 9, 5)
      }
      if (glyph || icon) {
        if (!artIcon) {
          glyphGfx.fillStyle(isDisabled ? 0xa9bdc7 : v.disc, 1)
          glyphGfx.lineStyle(2, 0xffffff, 0.74)
          glyphGfx.fillCircle(-w / 2 + 39, dy, 23)
          glyphGfx.strokeCircle(-w / 2 + 39, dy, 23)
        }
        if (glyph && !artIcon) {
          glyphGfx.fillStyle(isDisabled ? 0xeaf0f2 : v.icon, 1)
          glyphGfx.lineStyle(2.5, isDisabled ? 0xeaf0f2 : v.icon, 1)
          drawGlyph(glyphGfx, glyph, -w / 2 + 39, dy, 0.9)
        }
      }
      artIcon?.setY(dy).setAlpha(isDisabled ? 0.55 : 1)
      title.setY(titleY + dy); sub?.setY(15 + dy); trail?.setY(dy); iconText?.setY(dy)
      const alpha = isDisabled ? 0.68 : 1
      title.setAlpha(alpha); sub?.setAlpha(alpha); trail?.setAlpha(alpha); iconText?.setAlpha(alpha)
    }

    const hit = scene.add.rectangle(0, 0, w + 8, Math.max(BUTTON_SPEC.minHitHeight, h + 8), 0x000000, 0)
    const activate = () => {
      if (isDisabled || locked) return
      locked = true
      playSfx('select')
      onClick?.()
      scene.time.delayedCall(BUTTON_SPEC.lockMs, () => { locked = false })
    }
    const bindPointer = () => hit.setInteractive({ useHandCursor: !isDisabled })
      .on('pointerdown', () => { if (isDisabled) return; isPressed = true; draw('pressed'); if (!isReducedMotion()) container.setScale(0.985) })
      .on('pointerup', () => { if (!isPressed) return; isPressed = false; draw('hover'); container.setScale(1); activate() })
      .on('pointerover', () => draw('hover'))
      .on('pointerout', () => { isPressed = false; draw(); container.setScale(1) })
    bindPointer()

    const keyActivate = event => {
      if (!keyboard || isDisabled || event.repeat || scene._footerKeyboardFocus) return
      event.preventDefault?.()
      draw('pressed')
      if (!isReducedMotion()) container.setScale(0.985)
      scene.time.delayedCall(70, () => { draw('focus'); container.setScale(1); activate() })
    }
    if (keyboard) {
      scene.input.keyboard?.on('keydown-ENTER', keyActivate)
      scene.input.keyboard?.on('keydown-SPACE', keyActivate)
      scene.events.once('shutdown', () => {
        scene.input.keyboard?.off('keydown-ENTER', keyActivate)
        scene.input.keyboard?.off('keydown-SPACE', keyActivate)
      })
    }

    container.add([shadow, ...(artSurface ? [artSurface] : []), surface, glyphGfx, ...(artIcon ? [artIcon] : []), title, ...(sub ? [sub] : []), ...(trail ? [trail] : []), ...(iconText ? [iconText] : []), hit])
    container.setData('uiRole', 'button').setData('minHitHeight', Math.max(BUTTON_SPEC.minHitHeight, h + 8)).setData('state', isDisabled ? 'disabled' : 'idle')
    draw()
    if (pulse && !isReducedMotion() && !isDisabled) scene.tweens.add({ targets: container, scaleX: 1.012, scaleY: 1.012, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    this.container = container
    this.hit = hit
    this.setDisabled = value => {
      isDisabled = Boolean(value)
      container.setData('state', isDisabled ? 'disabled' : 'idle')
      hit.disableInteractive(); hit.removeAllListeners(); bindPointer(); draw()
      return this
    }
  }
}

export function createBackButton(scene, { x = 50, y = 35, label = '戻る', onClick, depth = 200 } = {}) {
  return new Button(scene, {
    x, y, w: 76, h: 44, label: `‹ ${label}`, variant: 'ghost', fontSize: 14, depth, onClick,
  })
}
