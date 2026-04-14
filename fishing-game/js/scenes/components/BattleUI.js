import { FONT } from '../../config/fontStyles.js'
import { C, CS, COLOR } from '../../config/palette.js'

const TEXT_RES = window.devicePixelRatio ?? 1

/**
 * バトル中のUI（逃走ゲージ・巻き取りゲージ・赤フラッシュ・CTAなど）を管理するクラス。
 */
export class BattleUI {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene
  }

  /** 逃走ゲージ（画面最上部）を生成する */
  buildEscapeBar(W) {
    const scene = this.scene
    scene.escapeBar = scene.add.container(0, 0).setDepth(65).setVisible(false)

    const bg = scene.add.graphics()
    bg.fillGradientStyle(0xff283c, 0xff283c, 0xc81428, 0xc81428, 0.95)
    bg.fillRect(0, 0, W, 72)
    bg.lineStyle(4, C.OUTLINE, 1)
    bg.strokeRect(2, 2, W - 4, 68)

    const title = scene.add.text(14, 18, '逃走ゲージ', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '18px', fontStyle: '700',
      color: '#ffffff', stroke: CS, strokeThickness: 2,
    }).setOrigin(0, 0.5)

    scene.ebarFill = scene.add.graphics()
    scene.ebarNum  = scene.add.text(W - 12, 18, '0', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '22px', fontStyle: '700',
      color: '#ffffff', stroke: CS, strokeThickness: 2,
    }).setOrigin(1, 0.5)

    scene.escapeBar.add([bg, title, scene.ebarFill, scene.ebarNum])
    scene._ebarW = W - 28
  }

  /** 巻き取りゲージパネル（画面下部）を生成する */
  buildBattlePanel(W, H) {
    const scene = this.scene
    scene.battlePanel = scene.add.container(0, 0).setDepth(60).setVisible(false)

    const panW = Math.min(340, W * 0.9)
    const px   = (W - panW) / 2
    const py   = H * 0.79

    const bg = scene.add.graphics()
    bg.fillStyle(0xffffff, 0.92)
    bg.lineStyle(3, C.OUTLINE, 1)
    bg.fillRoundedRect(px, py, panW, 60, 16)
    bg.strokeRoundedRect(px, py, panW, 60, 16)

    const lbl = scene.add.text(px + 14, py + 14, '🌀 巻き取り', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontStyle: '700', color: '#4a7090',
    })

    scene.reelFill    = scene.add.graphics()
    scene.reelValText = scene.add.text(px + panW - 12, py + 30, '0', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontStyle: '700', color: '#1a3a5a',
    }).setOrigin(1, 0.5)

    scene.battlePanel.add([bg, lbl, scene.reelFill, scene.reelValText])
    scene._reel = { x: px + 76, y: py + 22, w: panW - 96, h: 18 }
  }

  /** 「釣り上げろ！」CTAを生成する */
  buildReelCTA(W, H) {
    const scene = this.scene
    scene.reelCTA = scene.add.container(W / 2, H * 0.69).setDepth(67).setVisible(false)

    const t1 = scene.add.text(0, -28, '釣り上げろ！', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '36px', fontStyle: '700',
      color: '#ff6600', stroke: CS, strokeThickness: 2,
    }).setOrigin(0.5)

    const t2 = scene.add.text(0, 10, '👇', { fontSize: '26px' }).setOrigin(0.5)

    const t3 = scene.add.text(0, 40, '下にスワイプ！', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontStyle: '700',
      color: CS, backgroundColor: '#ffee00',
      padding: { x: 10, y: 3 },
    }).setOrigin(0.5)

    scene.reelCTA.add([t1, t2, t3])
    scene.tweens.add({ targets: t1, y: '-=6', duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
    scene.tweens.add({ targets: t2, y: '+=8', duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
  }

  /** バトルUIの値を battleState に同期する */
  sync(battleState, reel, ebarW) {
    const scene = this.scene
    const st = battleState
    if (!st) return
    const tw = ebarW

    scene.ebarFill.clear()
    scene.ebarFill.fillGradientStyle(0x88ff44, 0x88ff44, 0xff0000, 0xff0000, 1)
    scene.ebarFill.fillRoundedRect(14, 38, tw * (st.escape / 100), 22, 10)
    scene.ebarFill.fillStyle(0xffffff, 0.45)
    scene.ebarFill.fillRect(14 + tw * 0.70, 36, 3, 26)
    scene.ebarNum.setText(String(Math.round(st.escape)))

    const rw = Math.max(4, reel.w * (st.reel / 100))
    scene.reelFill.clear()
    scene.reelFill.fillStyle(0x0088dd, 1)
    scene.reelFill.lineStyle(2.5, C.OUTLINE, 1)
    scene.reelFill.fillRoundedRect(reel.x, reel.y, rw, reel.h, 8)
    scene.reelFill.strokeRoundedRect(reel.x, reel.y, reel.w, reel.h, 8)
    scene.reelFill.fillStyle(0xffffff, 0.3)
    scene.reelFill.fillRoundedRect(reel.x + 4, reel.y + 2, Math.max(0, rw - 8), 4, 3)
    scene.reelValText.setText(String(Math.round(st.reel)))

    scene.rageTag.setVisible(st.isRaging)
    scene.reelCTA.setVisible(!st.isRaging)
  }

  /** スコアバー（ヘッダーHUD）を生成する */
  buildScoreBar(initialScore) {
    const scene   = this.scene
    const W       = scene.scale.width          // ② scene から取得
    const CHIP_W  = W * 0.38
    const CHIP_H  = 44
    const CHIP_CY = CHIP_H / 2
    const SCORE_X = W * 0.25
    const TIME_X  = W * 0.75

    scene.scoreBar = scene.add.container(0, 0).setDepth(70)

    const chip = (cx, icon, val, lbl, valColor) => {
      const x = cx - CHIP_W / 2

      const shadow = scene.add.graphics()
      shadow.fillStyle(C.OUTLINE, 0.18)        // ③ C.OUTLINE を使用
      shadow.fillRoundedRect(x + 3, 3, CHIP_W, CHIP_H, 12)

      const bg = scene.add.graphics()
      bg.fillStyle(0xffffff, 0.95)
      bg.lineStyle(2.5, C.OUTLINE, 1)
      bg.fillRoundedRect(x, 0, CHIP_W, CHIP_H, 12)
      bg.strokeRoundedRect(x, 0, CHIP_W, CHIP_H, 12)

      const ic = scene.add.text(x + 12, CHIP_CY - 7, icon, {
        fontSize: '18px', resolution: TEXT_RES,
      }).setOrigin(0, 0.5)

      const v = scene.add.text(x + 38, CHIP_CY - 6, val, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '22px', fontStyle: '700', color: valColor,
      }).setOrigin(0, 0.5)

      const l = scene.add.text(x + 38, CHIP_CY + 10, lbl, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '10px', fontStyle: '700', color: COLOR.TEXT2, // ③
      }).setOrigin(0, 0.5)

      return { els: [shadow, bg, ic, v, l], valText: v }
    }

    const sc = chip(SCORE_X, '🏆', String(initialScore), 'SCORE', COLOR.GOLD) // ③
    const ti = chip(TIME_X,  '⏱',  '00:00',              'TIME',  COLOR.BLUE) // ③

    scene.scoreValText = sc.valText
    scene.scoreBar.add([...sc.els, ...ti.els])
  }

  /** hitHint（「🎣 タップ！」）と rageTag（「⚡ 暴れてる！」）を生成する */
  buildHitHUD(W, H) {
    const scene = this.scene

    scene.hitHint = scene.add.text(W / 2, H * 0.36, '🎣 タップ！', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '30px', fontStyle: '700',
      color: COLOR.WARN, stroke: CS, strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50).setVisible(false)

    scene._hitHintBaseY = scene.hitHint.y

    scene.rageTag = scene.add.text(W / 2, 50, '⚡ 暴れてる！', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontStyle: '700',
      color: CS, backgroundColor: COLOR.ACCENT,
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(68).setVisible(false)
  }

  destroy() {
    this.scene.hitHint?.destroy()
    this.scene.rageTag?.destroy()
  }
}
