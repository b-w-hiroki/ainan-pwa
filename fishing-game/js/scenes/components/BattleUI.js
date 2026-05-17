import { FONT, SHADOW } from '../../config/fontStyles.js'
import { C, CS, COLOR } from '../../config/palette.js'
import { ICONS } from '../../config/icons.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export class BattleUI {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene
  }

  buildEscapeBar(W) {
    const scene = this.scene
    scene.escapeBar = scene.add.container(0, 0).setDepth(65).setVisible(false)

    const bg = scene.add.graphics()
    bg.fillGradientStyle(0xff283c, 0xff283c, 0xc81428, 0xc81428, 0.95)
    bg.fillRect(0, 0, W, 72)
    bg.lineStyle(4, C.OUTLINE, 1)
    bg.strokeRect(2, 2, W - 4, 68)

    const title = scene.add.text(14, 18, '逃走ゲージ', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '18px', fontWeight: '700',
      color: '#ffffff',
      shadow: SHADOW.medium,
    }).setOrigin(0, 0.5)

    scene.ebarFill = scene.add.graphics()
    scene.ebarNum  = scene.add.text(W - 12, 18, '0', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '22px', fontWeight: '700',
      color: '#ffffff',
      shadow: SHADOW.medium,
    }).setOrigin(1, 0.5)

    scene.escapeBar.add([bg, title, scene.ebarFill, scene.ebarNum])
    scene._ebarW = W - 28
  }

  buildBattlePanel(W, H) {
    const scene = this.scene
    scene.battlePanel = scene.add.container(0, 0).setDepth(60).setVisible(false)

    const panW = Math.min(340, W * 0.9)
    const px   = (W - panW) / 2
    const py   = H * 0.79

    const bg = scene.add.graphics()
    bg.fillStyle(0xffffff, 0.94)
    bg.lineStyle(3, C.OUTLINE, 1)
    bg.fillRoundedRect(px, py, panW, 62, 16)
    bg.strokeRoundedRect(px, py, panW, 62, 16)

    const lbl = scene.add.text(px + 14, py + 14, `${ICONS.REEL} 巻き取り`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '700', color: '#4a7090',
    })

    scene.reelFill    = scene.add.graphics()
    scene.reelValText = scene.add.text(px + panW - 12, py + 31, '0', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '700', color: '#1a3a5a',
    }).setOrigin(1, 0.5)

    scene.battlePanel.add([bg, lbl, scene.reelFill, scene.reelValText])
    scene._reel = { x: px + 78, y: py + 22, w: panW - 98, h: 18 }
  }

  buildReelCTA(W, H) {
    const scene = this.scene
    scene.reelCTA = scene.add.container(W / 2, H * 0.69).setDepth(67).setVisible(false)

    const t1 = scene.add.text(0, -28, '釣り上げろ！', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '36px', fontWeight: '700',
      color: '#ff6600',
      shadow: SHADOW.medium,
    }).setOrigin(0.5)

    const t2 = scene.add.text(0, 10, ICONS.SWIPE_DN, { fontSize: '28px' }).setOrigin(0.5)

    const t3 = scene.add.text(0, 44, '下にスワイプ！', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '700',
      color: CS, backgroundColor: '#ffee00',
      padding: { x: 12, y: 4 },
    }).setOrigin(0.5)

    scene.reelCTA.add([t1, t2, t3])
    scene.tweens.add({ targets: t1, y: '-=6', duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
    scene.tweens.add({ targets: t2, y: '+=8', duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
  }

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

  buildScoreBar(initialScore) {
    const scene   = this.scene
    const W       = scene.scale.width
    // 左上ボタン（幅 ~130px）と重ならないよう、チップは画面右 45% に配置する
    const CHIP_W  = W * 0.26
    const CHIP_H  = 44
    const CHIP_CY = CHIP_H / 2
    const SCORE_X = W * 0.55
    const TIME_X  = W * 0.82

    scene.scoreBar = scene.add.container(0, 0).setDepth(70)

    const chip = (cx, icon, val, lbl, valColor) => {
      const x = cx - CHIP_W / 2

      const shadow = scene.add.graphics()
      shadow.fillStyle(C.OUTLINE, 0.18)
      shadow.fillRoundedRect(x + 2, 2, CHIP_W, CHIP_H, 10)

      const bg = scene.add.graphics()
      bg.fillStyle(0xffffff, 0.97)
      bg.lineStyle(2, C.OUTLINE, 1)
      bg.fillRoundedRect(x, 0, CHIP_W, CHIP_H, 10)
      bg.strokeRoundedRect(x, 0, CHIP_W, CHIP_H, 10)

      const ic = scene.add.text(x + 8, CHIP_CY - 6, icon, {
        fontSize: '18px', resolution: TEXT_RES,
      }).setOrigin(0, 0.5)

      const v = scene.add.text(x + 34, CHIP_CY - 6, val, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '18px', fontWeight: '700', color: valColor,
      }).setOrigin(0, 0.5)

      const l = scene.add.text(x + 34, CHIP_CY + 10, lbl, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '11px', fontWeight: '700', color: COLOR.TEXT2,
      }).setOrigin(0, 0.5)

      return { els: [shadow, bg, ic, v, l], valText: v }
    }

    const sc = chip(SCORE_X, ICONS.SCORE, String(initialScore), 'SCORE', COLOR.GOLD)
    const ti = chip(TIME_X,  ICONS.TIMER, '00:00',             'TIME',  COLOR.BLUE)

    scene.scoreValText = sc.valText
    scene.timeValText  = ti.valText
    scene.scoreBar.add([...sc.els, ...ti.els])

    scene._sessionStartedAt = scene.time.now
    scene._timeChipEvent = scene.time.addEvent({
      delay: 1000, loop: true,
      callback: () => {
        const elapsed = Math.floor((scene.time.now - scene._sessionStartedAt) / 1000)
        const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
        const ss = String(elapsed % 60).padStart(2, '0')
        scene.timeValText?.setText(`${mm}:${ss}`)
      },
    })
  }

  buildHitHUD(W, H) {
    const scene = this.scene

    scene.hitHint = scene.add.text(W / 2, H * 0.36, `${ICONS.ROD} タップ！`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '32px', fontWeight: '700',
      color: COLOR.WARN,
      shadow: SHADOW.strong,
    }).setOrigin(0.5).setDepth(50).setVisible(false)

    scene._hitHintBaseY = scene.hitHint.y

    scene.rageTag = scene.add.text(W / 2, 50, `${ICONS.RAGE} 暴れてる！`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '700',
      color: CS, backgroundColor: COLOR.ACCENT,
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setDepth(68).setVisible(false)
  }

  destroy() {
    this.scene._timeChipEvent?.remove(false)
    this.scene._timeChipEvent = undefined
    this.scene.hitHint?.destroy()
    this.scene.rageTag?.destroy()
  }
}
