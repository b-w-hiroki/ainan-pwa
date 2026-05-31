import { FONT, SHADOW } from '../../config/fontStyles.js'
import { C, CS, COLOR } from '../../config/palette.js'
import { ICONS } from '../../config/icons.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export class ResultUI {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene
  }

  buildResultOverlay(W, H) {
    const scene = this.scene
    scene.resultOverlay = scene.add
      .container(W / 2, H * 0.42)
      .setDepth(120)
      .setVisible(false)

    // カード本体
    const card = scene.add.graphics()
    card.fillStyle(0xffffff, 1)
    card.lineStyle(4, C.OUTLINE, 1)
    card.fillRoundedRect(-150, -100, 300, 200, 18)
    card.strokeRoundedRect(-150, -100, 300, 200, 18)

    // カラーヘッダーストライプ（catch=緑 / escape=赤）
    scene.resStripe = scene.add.graphics()

    scene.resLabel = scene.add.text(0, -78, '', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: '#ffffff',
      shadow: SHADOW.medium,
    }).setOrigin(0.5)

    scene.resEmoji = scene.add.text(0, -24, '', { fontSize: '52px' }).setOrigin(0.5)

    scene.resName = scene.add.text(0, 34, '', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '22px', fontWeight: '700', color: '#1a3a5a',
    }).setOrigin(0.5)

    scene.resPts = scene.add.text(0, 64, '', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '16px', fontWeight: '700', color: '#00aa44',
    }).setOrigin(0.5)

    scene.resHint = scene.add.text(0, 88, 'または下のボタンから選ぶ', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '700', color: '#8aa5bb',
    }).setOrigin(0.5)

    // ─── 3択ボタン ────────────────────────────────────────────
    const BTN_W = 84, BTN_H = 36, BTN_GAP = 8
    const totalBtnW = BTN_W * 3 + BTN_GAP * 2
    const btnStartX = -totalBtnW / 2
    const btnY = 108

    const makeNavBtn = (x, emoji, label, action) => {
      const bg = scene.add.graphics()
      const drawBg = (hover) => {
        bg.clear()
        bg.fillStyle(hover ? 0xd0f0ff : 0xffffff, 0.97)
        bg.lineStyle(2, C.OUTLINE, 0.75)
        bg.fillRoundedRect(x, btnY, BTN_W, BTN_H, 10)
        bg.strokeRoundedRect(x, btnY, BTN_W, BTN_H, 10)
      }
      drawBg(false)
      const txt = scene.add.text(x + BTN_W / 2, btnY + BTN_H / 2, `${emoji}\n${label}`, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '11px', fontWeight: '700', color: '#1a3a5a',
        align: 'center', lineSpacing: 2,
      }).setOrigin(0.5)
      const hit = scene.add.rectangle(x + BTN_W / 2, btnY + BTN_H / 2, BTN_W + 4, BTN_H + 4, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { scene._skipNextDown = true; action() })
        .on('pointerover', () => drawBg(true))
        .on('pointerout',  () => drawBg(false))
      return [bg, txt, hit]
    }

    const b1 = makeNavBtn(btnStartX,                    '🔁', 'もう一度', () => { scene.resultOverlay.setVisible(false); scene._enterCast() })
    const b2 = makeNavBtn(btnStartX + BTN_W + BTN_GAP,  '🗺', 'マップへ', () => { scene._cleanup(); scene.scene.start('MapScene') })
    const b3 = makeNavBtn(btnStartX + (BTN_W + BTN_GAP) * 2, '🏠', 'ホームへ', () => { scene._cleanup(); scene.scene.start('HomeScene') })

    scene.resultOverlay.add([card, scene.resStripe, scene.resLabel, scene.resEmoji, scene.resName, scene.resPts, scene.resHint, ...b1, ...b2, ...b3])
  }

  /** ヘッダーストライプを描画する（caught=green / escaped=red） */
  drawResultStripe(outcome) {
    const g = this.scene.resStripe
    if (!g) return
    g.clear()
    const color = outcome === 'caught' ? 0x00aa44 : 0xcc2222
    g.fillStyle(color, 1)
    g.fillRoundedRect(-150, -100, 300, 42, { tl: 18, tr: 18, bl: 0, br: 0 })
  }

  toast(msg) {
    const { width: W, height: H } = this.scene.scale
    const t = this.scene.add.text(W / 2, H * 0.38, msg, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '22px', fontWeight: '700',
      color: '#ffffff',
      shadow: SHADOW.strong,
    }).setOrigin(0.5).setDepth(100)
    this.scene.tweens.add({
      targets: t, alpha: 0, y: t.y - 30, duration: 700, onComplete: () => t.destroy(),
    })
  }

  buildBackBtn(W, H) {
    const scene = this.scene
    const btn = scene.add.text(16, H - 16, `${ICONS.BACK} マップへ`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '700',
      color: CS, backgroundColor: COLOR.WHITE,
      padding: { x: 14, y: 9 },
      shadow: { offsetX: 1, offsetY: 1, color: 'rgba(0,0,0,0.3)', blur: 0, fill: true },
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
