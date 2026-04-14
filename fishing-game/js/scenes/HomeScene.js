import { FONT, TITLE_SHADOW } from '../config/fontStyles.js'

export default class HomeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HomeScene' })
  }

  create() {
    const { width, height } = this.scale

    this.add
      .text(width / 2, height * 0.12, 'ホーム', {
        fontFamily: FONT,
        fontSize: '42px',
        fontStyle: '700',
        color: '#1a3a5a',
        shadow: TITLE_SHADOW,
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
    const btnW = 280
    const btnH = 56
    const btn = this.add.container(x, y).setSize(btnW, btnH).setInteractive({ useHandCursor: true })

    const g = this.add.graphics()
    g.fillStyle(0xffe000, 1)
    g.lineStyle(3, 0x1a2a3a, 1)
    g.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16)
    g.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16)

    const label = this.add
      .text(0, 0, text, {
        fontFamily: FONT,
        fontSize: '22px',
        fontStyle: '700',
        color: '#1a2a3a',
      })
      .setOrigin(0.5)

    btn.add([g, label])
    btn.on('pointerdown', onClick)
    btn.on('pointerover', () => { g.clear(); g.fillStyle(0xffd000, 1); g.lineStyle(3, 0x1a2a3a, 1); g.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16); g.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16) })
    btn.on('pointerout',  () => { g.clear(); g.fillStyle(0xffe000, 1); g.lineStyle(3, 0x1a2a3a, 1); g.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16); g.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 16) })
  }
}
