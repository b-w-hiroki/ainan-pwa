const OUTLINE = '#1a2a3a'
const FONT = 'Nunito, "M PLUS Rounded 1c", system-ui, sans-serif'

export default class HomeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HomeScene' })
  }

  create() {
    const { width, height } = this.scale

    this.add
      .text(width / 2, height * 0.12, 'ホーム', {
        fontFamily: FONT,
        fontSize: '32px',
        fontStyle: '900',
        color: '#ffffff',
        stroke: OUTLINE,
        strokeThickness: 5,
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, height * 0.22, 'クーラー・ショップ等は後続', {
        fontFamily: FONT,
        fontSize: '14px',
        fontStyle: '700',
        color: '#4a7090',
      })
      .setOrigin(0.5)

    this.makeNavButton(width / 2, height * 0.5, 'マップへ', () => {
      this.scene.start('MapScene')
    })

    this.makeNavButton(width / 2, height * 0.62, 'タイトルへ戻る', () => {
      this.scene.start('TitleScene')
    })
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {string} text
   * @param {() => void} onClick
   */
  makeNavButton(x, y, text, onClick) {
    const btn = this.add.container(x, y).setSize(260, 52).setInteractive({ useHandCursor: true })

    const g = this.add.graphics()
    g.fillStyle(0xffe000, 1)
    g.lineStyle(3, 0x1a2a3a, 1)
    g.fillRoundedRect(-130, -26, 260, 52, 16)
    g.strokeRoundedRect(-130, -26, 260, 52, 16)

    const label = this.add
      .text(0, 0, text, {
        fontFamily: FONT,
        fontSize: '17px',
        fontStyle: '800',
        color: '#1a3a5a',
        stroke: OUTLINE,
        strokeThickness: 3,
      })
      .setOrigin(0.5)

    btn.add([g, label])
    btn.on('pointerdown', onClick)
  }
}
