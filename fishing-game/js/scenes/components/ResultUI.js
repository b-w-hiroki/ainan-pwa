import { FONT } from '../../config/fontStyles.js'
import { C, CS, COLOR } from '../../config/palette.js'

const TEXT_RES = window.devicePixelRatio ?? 1

/**
 * キャッチ/逃げた結果オーバーレイと、トーストメッセージを管理するUI。
 */
export class ResultUI {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene
  }

  /** 結果オーバーレイを生成する（初期は非表示） */
  buildResultOverlay(W, H) {
    const scene = this.scene
    scene.resultOverlay = scene.add
      .container(W / 2, H * 0.42)
      .setDepth(120)
      .setVisible(false)

    const card = scene.add.graphics()
    card.fillStyle(0xffffff, 1)
    card.lineStyle(4, C.OUTLINE, 1)
    card.fillRoundedRect(-150, -100, 300, 200, 18)
    card.strokeRoundedRect(-150, -100, 300, 200, 18)

    scene.resLabel = scene.add.text(0, -72, '', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontStyle: '700', color: '#ff6600',
    }).setOrigin(0.5)

    scene.resEmoji = scene.add.text(0, -28, '', { fontSize: '52px' }).setOrigin(0.5)

    scene.resName = scene.add.text(0, 30, '', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '22px', fontStyle: '700', color: '#1a3a5a',
    }).setOrigin(0.5)

    scene.resPts = scene.add.text(0, 62, '', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontStyle: '700', color: '#00aa44',
    }).setOrigin(0.5)

    scene.resHint = scene.add.text(0, 84, 'タップで続ける', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontStyle: '700', color: '#4a7090',
    }).setOrigin(0.5)

    scene.resultOverlay.add([card, scene.resLabel, scene.resEmoji, scene.resName, scene.resPts, scene.resHint])
  }

  /**
   * フローティングトーストメッセージを表示する
   * @param {string} msg
   */
  toast(msg) {
    const { width: W, height: H } = this.scene.scale
    const t = this.scene.add.text(W / 2, H * 0.38, msg, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '20px', fontStyle: '700',
      color: '#ffffff', stroke: CS, strokeThickness: 2,
    }).setOrigin(0.5).setDepth(100)
    this.scene.tweens.add({
      targets: t, alpha: 0, y: t.y - 30, duration: 700, onComplete: () => t.destroy(),
    })
  }

  /** 「← マップへ」ボタンを生成する */
  buildBackBtn(W, H) {
    const scene = this.scene
    const btn = scene.add.text(16, H - 16, '← マップへ', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '16px', fontStyle: '700',
      color: CS, backgroundColor: COLOR.WHITE,
      padding: { x: 14, y: 8 },
      shadow: { offsetX: 1, offsetY: 1, color: 'rgba(0,0,0,0.3)', blur: 2, fill: true },
    })
      .setOrigin(0, 1)
      .setDepth(200)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', (p) => {
        p.event.stopPropagation()
        scene._cleanup()
        scene.scene.start('MapScene')
      })
      .on('pointerover', () => btn.setStyle({ backgroundColor: '#d0f0ff' }))
      .on('pointerout',  () => btn.setStyle({ backgroundColor: COLOR.WHITE }))

    this._backBtn = btn
  }

  destroy() {
    this._backBtn?.destroy()
  }
}
