const OUTLINE = '#1a2a3a'
const FONT = 'Nunito, "M PLUS Rounded 1c", system-ui, sans-serif'

export default class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' })
  }

  create() {
    const { width, height } = this.scale

    this.add
      .text(width / 2, height * 0.12, 'マップ', {
        fontFamily: FONT,
        fontSize: '32px',
        fontStyle: '900',
        color: '#ffffff',
        stroke: OUTLINE,
        strokeThickness: 5,
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, height * 0.22, '愛南の釣り場を選ぶ（仮）', {
        fontFamily: FONT,
        fontSize: '14px',
        fontStyle: '700',
        color: '#4a7090',
      })
      .setOrigin(0.5)

    const btn = this.add
      .container(width / 2, height * 0.48)
      .setSize(280, 56)
      .setInteractive({ useHandCursor: true })

    const g = this.add.graphics()
    g.fillStyle(0xffffff, 1)
    g.lineStyle(3, 0x1a2a3a, 1)
    g.fillRoundedRect(-140, -28, 280, 56, 18)
    g.strokeRoundedRect(-140, -28, 280, 56, 18)

    const label = this.add
      .text(0, 0, '釣り場へ（GameScene）', {
        fontFamily: FONT,
        fontSize: '17px',
        fontStyle: '800',
        color: '#1a3a5a',
        stroke: OUTLINE,
        strokeThickness: 3,
      })
      .setOrigin(0.5)

    btn.add([g, label])
    btn.on('pointerdown', () => {
      this.scene.start('GameScene')
    })

    const back = this.add
      .container(width / 2, height * 0.62)
      .setSize(200, 44)
      .setInteractive({ useHandCursor: true })

    const g2 = this.add.graphics()
    g2.fillStyle(0xd0f0ff, 1)
    g2.lineStyle(3, 0x1a2a3a, 1)
    g2.fillRoundedRect(-100, -22, 200, 44, 14)
    g2.strokeRoundedRect(-100, -22, 200, 44, 14)

    const label2 = this.add
      .text(0, 0, 'ホームへ戻る', {
        fontFamily: FONT,
        fontSize: '15px',
        fontStyle: '800',
        color: '#1a3a5a',
        stroke: OUTLINE,
        strokeThickness: 2,
      })
      .setOrigin(0.5)

    back.add([g2, label2])
    back.on('pointerdown', () => {
      this.scene.start('HomeScene')
    })
  }
}
