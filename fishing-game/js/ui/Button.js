import { FONT } from '../config/fontStyles.js'
import { C } from '../config/palette.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const VARIANTS = {
  primary: { fill: 0xffe000, hover: 0xffd000, text: '#1a2a3a', border: 0x1a2a3a },
  ghost:   { fill: 0xffffff, hover: 0xd0f0ff, text: '#1a3a5a', border: 0x1a2a3a },
}

export class Button {
  constructor(scene, { x, y, w = 260, h = 60, label, icon, variant = 'primary', fontSize = 20, depth = 10, onClick }) {
    const v = VARIANTS[variant] ?? VARIANTS.primary

    const shadow = scene.add.graphics()
    shadow.fillStyle(C.OUTLINE, 0.15)
    shadow.fillRoundedRect(-w / 2 + 3, -h / 2 + 4, w, h, 16)

    const g = scene.add.graphics()
    const draw = (fill) => {
      g.clear()
      g.fillStyle(fill, 1)
      g.lineStyle(3, v.border, 1)
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 16)
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 16)
    }
    draw(v.fill)

    const txt = scene.add.text(0, 0, icon ? `${icon}  ${label}` : label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: `${fontSize}px`, fontStyle: '900',
      color: v.text,
    }).setOrigin(0.5)

    const hit = scene.add.rectangle(0, 0, w, h)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick)
      .on('pointerover', () => draw(v.hover))
      .on('pointerout',  () => draw(v.fill))

    this.container = scene.add.container(x, y, [shadow, g, txt, hit]).setDepth(depth)
  }
}
