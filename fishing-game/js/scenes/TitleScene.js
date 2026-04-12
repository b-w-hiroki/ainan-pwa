const OUTLINE = '#1a2a3a'
const FONT = 'Nunito, "M PLUS Rounded 1c", system-ui, sans-serif'

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' })
  }

  create() {
    const { width, height } = this.scale

    this.add
      .text(width / 2, height * 0.28, 'AINAN', {
        fontFamily: FONT,
        fontSize: '52px',
        fontStyle: '900',
        color: '#ffffff',
        stroke: OUTLINE,
        strokeThickness: 6,
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, height * 0.38, '釣りゲーム', {
        fontFamily: FONT,
        fontSize: '28px',
        fontStyle: '800',
        color: '#1a3a5a',
        stroke: OUTLINE,
        strokeThickness: 4,
      })
      .setOrigin(0.5)

    const btn = this.add
      .container(width / 2, height * 0.62)
      .setSize(240, 56)
      .setInteractive({ useHandCursor: true })

    const g = this.add.graphics()
    g.fillStyle(0xffffff, 1)
    g.lineStyle(3, 0x1a2a3a, 1)
    g.fillRoundedRect(-120, -28, 240, 56, 18)
    g.strokeRoundedRect(-120, -28, 240, 56, 18)
    g.fillStyle(0x000000, 0.12)
    g.fillRoundedRect(-117, -25, 237, 53, 16)

    const label = this.add
      .text(0, 0, 'タップでスタート', {
        fontFamily: FONT,
        fontSize: '18px',
        fontStyle: '800',
        color: '#1a3a5a',
        stroke: OUTLINE,
        strokeThickness: 3,
      })
      .setOrigin(0.5)

    btn.add([g, label])

    btn.on('pointerdown', () => {
      this.scene.start('HomeScene')
    })

    this.add
      .text(width / 2, height * 0.92, 'Phase 1 — Phaser 3', {
        fontFamily: FONT,
        fontSize: '12px',
        fontStyle: '700',
        color: '#4a7090',
      })
      .setOrigin(0.5)
  }
}
