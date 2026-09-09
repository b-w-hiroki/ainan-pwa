import { FONT, UI_COLORS } from '../config/fontStyles.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const VARIANTS = {
  primary: { fill: 0xffd95a, hover: 0xffe78d, text: UI_COLORS.ink, border: 0x173248, glow: 0xffefb4 },
  secondary: { fill: 0xdff5ff, hover: 0xc8eeff, text: UI_COLORS.ink, border: 0x2f9ed4, glow: 0xffffff },
  ghost: { fill: 0xf8fdff, hover: 0xeaf8ff, text: UI_COLORS.ink, border: 0x9bcfe5, glow: 0xffffff },
  danger: { fill: 0xff765a, hover: 0xff927c, text: '#ffffff', border: 0x173248, glow: 0xffc0b4 },
}

export class Button {
  constructor(scene, { x, y, w = 260, h = 60, label, icon, variant = 'primary', fontSize = 20, depth = 10, onClick }) {
    const v = VARIANTS[variant] ?? VARIANTS.primary
    const container = scene.add.container(x, y).setDepth(depth)

    const shadow = scene.add.graphics()
    const g = scene.add.graphics()
    const draw = (mode = 'idle') => {
      const pressed = mode === 'pressed'
      const hover = mode === 'hover'
      g.clear()
      shadow.clear()

      shadow.fillStyle(0x173248, pressed ? 0.10 : 0.18)
      shadow.fillRoundedRect(-w / 2 + 2, -h / 2 + (pressed ? 3 : 6), w, h, 20)

      g.fillStyle(hover ? v.hover : v.fill, 1)
      g.lineStyle(pressed ? 2 : 2.5, v.border, pressed ? 0.68 : 0.92)
      g.fillRoundedRect(-w / 2, -h / 2 + (pressed ? 2 : 0), w, h, 20)
      g.strokeRoundedRect(-w / 2, -h / 2 + (pressed ? 2 : 0), w, h, 20)

      g.fillStyle(v.glow, pressed ? 0.22 : 0.42)
      g.fillRoundedRect(-w / 2 + 12, -h / 2 + 8 + (pressed ? 2 : 0), w - 24, 10, 6)
    }
    draw()

    const txt = scene.add.text(0, 0, icon ? `${icon}  ${label}` : label, {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: `${fontSize}px`,
      fontWeight: '900',
      color: v.text,
      stroke: variant === 'danger' ? '#173248' : '#ffffff',
      strokeThickness: variant === 'danger' ? 2 : 1,
    }).setOrigin(0.5)

    const hit = scene.add.rectangle(0, 0, w, h, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { draw('pressed'); container.setScale(0.985) })
      .on('pointerup', () => { draw('hover'); container.setScale(1); onClick?.() })
      .on('pointerover', () => draw('hover'))
      .on('pointerout', () => { draw(); container.setScale(1) })

    container.add([shadow, g, txt, hit])
    this.container = container
  }
}
