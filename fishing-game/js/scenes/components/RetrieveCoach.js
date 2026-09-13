import { FONT, SHADOW, UI_COLORS } from '../../config/fontStyles.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export class RetrieveCoach {
  constructor(scene) {
    this.scene = scene
    this.container = null
    this.stepText = null
    this.bodyText = null
    this.baseY = 96
  }

  build(W) {
    // First-session guidance must not become another large overlay. Keep it in
    // a compact fixed chip above the active water field and leave the lure / fish
    // relationship readable underneath.
    this.baseY = 96
    this.container = this.scene.add.container(W / 2, this.baseY)
      .setDepth(96)
      .setScrollFactor(0)
      .setVisible(false)
      .setAlpha(0)

    const bg = this.scene.add.graphics().setScrollFactor(0)
    bg.fillStyle(0x071a28, 0.16)
    bg.fillRoundedRect(-143, -18, 286, 42, 15)
    bg.fillStyle(0x173248, 0.90)
    bg.lineStyle(1.5, 0x9bcfe5, 0.76)
    bg.fillRoundedRect(-143, -22, 286, 42, 15)
    bg.strokeRoundedRect(-143, -22, 286, 42, 15)
    bg.fillStyle(0xffd95a, 1)
    bg.fillRoundedRect(-134, -14, 42, 26, 9)

    this.stepText = this.scene.add.text(-113, -1, '1/3', {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '11px',
      fontWeight: '900',
      color: UI_COLORS.ink,
    }).setOrigin(0.5).setScrollFactor(0)

    this.bodyText = this.scene.add.text(-82, -1, 'まず「ちょい巻き」でルアーを動かそう', {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '10px',
      fontWeight: '900',
      color: '#ffffff',
      wordWrap: { width: 212 },
      shadow: SHADOW.subtle,
    }).setOrigin(0, 0.5).setScrollFactor(0)

    this.container.add([bg, this.stepText, this.bodyText])
  }

  show(step, text) {
    if (!this.container) return
    this.stepText?.setText(`${step}/3`)
    this.bodyText?.setText(text)
    this.container.setVisible(true)

    // Always animate from the same base position. The previous implementation
    // subtracted 4px from the current Y each show, slowly drifting upward.
    if (this.container.alpha < 0.95) {
      this.container.setY(this.baseY + 4)
      this.scene.tweens.killTweensOf(this.container)
      this.scene.tweens.add({
        targets: this.container,
        alpha: 1,
        y: this.baseY,
        duration: 170,
        ease: 'Sine.easeOut',
      })
    }
  }

  pulse(text) {
    if (text) this.bodyText?.setText(text)
    if (!this.container?.visible) return
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 130,
      yoyo: true,
      ease: 'Sine.easeOut',
    })
  }

  hide() {
    if (!this.container?.visible) return
    this.scene.tweens.killTweensOf(this.container)
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 140,
      onComplete: () => {
        this.container?.setVisible(false)
        this.container?.setY(this.baseY)
      },
    })
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.container)
    this.container?.destroy(true)
    this.container = null
  }
}
