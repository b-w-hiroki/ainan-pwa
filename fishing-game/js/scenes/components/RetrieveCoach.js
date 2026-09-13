import { FONT, SHADOW, UI_COLORS } from '../../config/fontStyles.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export class RetrieveCoach {
  constructor(scene) {
    this.scene = scene
    this.container = null
    this.stepText = null
    this.bodyText = null
    this.baseY = 82
    this._hideTimer = null
  }

  build(W) {
    // First-session guidance is a temporary chip, never a second HUD band.
    // It sits immediately below the fixed top bar and dismisses itself.
    this.baseY = 82
    this.container = this.scene.add.container(W / 2, this.baseY)
      .setDepth(96)
      .setScrollFactor(0)
      .setVisible(false)
      .setAlpha(0)

    const bg = this.scene.add.graphics().setScrollFactor(0)
    bg.fillStyle(0x071a28, 0.14)
    bg.fillRoundedRect(-124, -13, 248, 34, 12)
    bg.fillStyle(0x173248, 0.88)
    bg.lineStyle(1.2, 0x9bcfe5, 0.66)
    bg.fillRoundedRect(-124, -17, 248, 34, 12)
    bg.strokeRoundedRect(-124, -17, 248, 34, 12)
    bg.fillStyle(0xffd95a, 1)
    bg.fillRoundedRect(-116, -11, 34, 22, 8)

    this.stepText = this.scene.add.text(-99, 0, '1/3', {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '9px',
      fontWeight: '900',
      color: UI_COLORS.ink,
    }).setOrigin(0.5).setScrollFactor(0)

    this.bodyText = this.scene.add.text(-73, 0, 'まず「ちょい巻き」でルアーを動かそう', {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '9px',
      fontWeight: '900',
      color: '#ffffff',
      wordWrap: { width: 188 },
      shadow: SHADOW.subtle,
    }).setOrigin(0, 0.5).setScrollFactor(0)

    this.container.add([bg, this.stepText, this.bodyText])
  }

  show(step, text) {
    if (!this.container) return
    this._hideTimer?.remove?.(false)
    this._hideTimer = null
    this.stepText?.setText(`${step}/3`)
    this.bodyText?.setText(text)
    this.container.setVisible(true)
    this.container.setY(this.baseY + 3)
    this.scene.tweens.killTweensOf(this.container)
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0.94,
      y: this.baseY,
      duration: 150,
      ease: 'Sine.easeOut',
    })

    // The field should reclaim the space without waiting for the entire tutorial.
    this._hideTimer = this.scene.time.delayedCall(step === 1 ? 3000 : 2200, () => this.hide())
  }

  pulse(text) {
    if (text) this.bodyText?.setText(text)
    if (!this.container?.visible) return
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.015,
      scaleY: 1.015,
      duration: 115,
      yoyo: true,
      ease: 'Sine.easeOut',
    })
  }

  hide() {
    this._hideTimer?.remove?.(false)
    this._hideTimer = null
    if (!this.container?.visible) return
    this.scene.tweens.killTweensOf(this.container)
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 130,
      onComplete: () => {
        this.container?.setVisible(false)
        this.container?.setY(this.baseY)
      },
    })
  }

  destroy() {
    this._hideTimer?.remove?.(false)
    this._hideTimer = null
    this.scene.tweens.killTweensOf(this.container)
    this.container?.destroy(true)
    this.container = null
  }
}
