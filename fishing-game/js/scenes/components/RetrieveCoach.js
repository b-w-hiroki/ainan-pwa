import { FONT, SHADOW, UI_COLORS } from '../../config/fontStyles.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export class RetrieveCoach {
  constructor(scene) {
    this.scene = scene
    this.container = null
    this.stepText = null
    this.bodyText = null
  }

  build(W, H) {
    this.container = this.scene.add.container(W / 2, H * 0.235)
      .setDepth(96)
      .setScrollFactor(0)
      .setVisible(false)
      .setAlpha(0)

    const bg = this.scene.add.graphics().setScrollFactor(0)
    bg.fillStyle(0x173248, 0.16)
    bg.fillRoundedRect(-153, -27, 306, 58, 18)
    bg.fillStyle(0xf8fdff, 0.97)
    bg.lineStyle(2, 0x9bcfe5, 0.94)
    bg.fillRoundedRect(-153, -31, 306, 58, 18)
    bg.strokeRoundedRect(-153, -31, 306, 58, 18)
    bg.fillStyle(0xffd95a, 1)
    bg.fillRoundedRect(-143, -21, 46, 38, 13)

    this.stepText = this.scene.add.text(-120, -2, '1/3', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5).setScrollFactor(0)

    this.bodyText = this.scene.add.text(-85, -2, 'まず「ちょい巻き」でルアーを動かそう', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.ink,
      wordWrap: { width: 222 }, shadow: SHADOW.subtle,
    }).setOrigin(0, 0.5).setScrollFactor(0)

    this.container.add([bg, this.stepText, this.bodyText])
  }

  show(step, text) {
    if (!this.container) return
    this.stepText?.setText(`${step}/3`)
    this.bodyText?.setText(text)
    this.container.setVisible(true)
    if (this.container.alpha < 0.95) {
      this.scene.tweens.add({ targets: this.container, alpha: 1, y: this.container.y - 4, duration: 170, ease: 'Sine.easeOut' })
    }
  }

  pulse(text) {
    if (text) this.bodyText?.setText(text)
    if (!this.container?.visible) return
    this.scene.tweens.add({ targets: this.container, scaleX: 1.025, scaleY: 1.025, duration: 140, yoyo: true, ease: 'Sine.easeOut' })
  }

  hide() {
    if (!this.container?.visible) return
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 150,
      onComplete: () => this.container?.setVisible(false),
    })
  }

  destroy() {
    this.container?.destroy(true)
    this.container = null
  }
}
