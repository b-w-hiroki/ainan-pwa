import { FONT, SHADOW, UI_COLORS } from '../../config/fontStyles.js'
import { ICONS } from '../../config/icons.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export class BattleUI {
  constructor(scene) {
    this.scene = scene
  }

  buildEscapeBar(W) {
    const scene = this.scene
    scene.escapeBar = scene.add.container(0, 0).setDepth(65).setVisible(false)

    const bg = scene.add.graphics()
    bg.fillStyle(0x173248, 0.13)
    bg.fillRoundedRect(18, 10, W - 36, 54, 18)
    bg.fillStyle(0xf8fdff, 0.95)
    bg.lineStyle(2, 0x9bcfe5, 0.88)
    bg.fillRoundedRect(18, 6, W - 36, 54, 18)
    bg.strokeRoundedRect(18, 6, W - 36, 54, 18)

    const title = scene.add.text(30, 23, '魚の逃走', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900',
      color: UI_COLORS.inkSoft,
    }).setOrigin(0, 0.5)

    scene.ebarFill = scene.add.graphics()
    scene.ebarNum = scene.add.text(W - 30, 23, '0', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900',
      color: UI_COLORS.coral,
    }).setOrigin(1, 0.5)

    scene.ebarFishIcon = scene.add.text(30, 45, '🐟', {
      fontSize: '15px', resolution: TEXT_RES,
    }).setOrigin(0.5)

    scene.escapeBar.add([bg, title, scene.ebarFill, scene.ebarNum, scene.ebarFishIcon])
    scene._ebarW = W - 60
  }

  buildBattlePanel(W, H) {
    const scene = this.scene
    scene.battlePanel = scene.add.container(0, 0).setDepth(60).setVisible(false)

    const panW = Math.min(330, W * 0.88)
    const px = (W - panW) / 2
    const py = H * 0.80

    const bg = scene.add.graphics()
    bg.fillStyle(0x173248, 0.12)
    bg.fillRoundedRect(px + 2, py + 4, panW, 54, 18)
    bg.fillStyle(0xf8fdff, 0.94)
    bg.lineStyle(2, 0x9bcfe5, 0.88)
    bg.fillRoundedRect(px, py, panW, 54, 18)
    bg.strokeRoundedRect(px, py, panW, 54, 18)

    const lbl = scene.add.text(px + 16, py + 17, `${ICONS.REEL} 巻き取り`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.inkSoft,
    }).setOrigin(0, 0.5)

    scene.reelFill = scene.add.graphics()
    scene.reelValText = scene.add.text(px + panW - 14, py + 17, '0', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(1, 0.5)

    scene.battlePanel.add([bg, lbl, scene.reelFill, scene.reelValText])
    scene._reel = { x: px + 16, y: py + 30, w: panW - 32, h: 14 }
  }

  buildReelCTA(W, H) {
    const scene = this.scene
    scene.reelCTA = scene.add.container(W / 2, H * 0.70).setDepth(67).setVisible(false)

    const shadow = scene.add.graphics()
    shadow.fillStyle(0x173248, 0.16)
    shadow.fillRoundedRect(-102, -19, 204, 42, 17)

    const pill = scene.add.graphics()
    pill.fillStyle(0xffd95a, 0.96)
    pill.lineStyle(2, 0x173248, 0.82)
    pill.fillRoundedRect(-102, -23, 204, 42, 17)
    pill.strokeRoundedRect(-102, -23, 204, 42, 17)
    pill.fillStyle(0xffffff, 0.28)
    pill.fillRoundedRect(-88, -17, 176, 7, 4)

    const arrow = scene.add.text(-70, -2, ICONS.SWIPE_DN, {
      fontSize: '20px', resolution: TEXT_RES,
    }).setOrigin(0.5)

    const text = scene.add.text(16, -2, '下へスワイプで巻く', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900',
      color: UI_COLORS.ink,
    }).setOrigin(0.5)

    scene.reelCTA.add([shadow, pill, arrow, text])
    scene.tweens.add({ targets: arrow, y: '+=5', duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
  }

  sync(battleState, reel, ebarW) {
    const scene = this.scene
    const st = battleState
    if (!st) return
    const tw = ebarW

    scene.ebarFill.clear()
    scene.ebarFill.fillStyle(0xe8f6fb, 1)
    scene.ebarFill.fillRoundedRect(30, 38, tw, 12, 6)
    const escapeColor = st.escape >= 72 ? 0xff765a : st.escape >= 42 ? 0xffc857 : 0x71d6a2
    scene.ebarFill.fillStyle(escapeColor, 1)
    scene.ebarFill.fillRoundedRect(30, 38, tw * (st.escape / 100), 12, 6)
    scene.ebarFill.fillStyle(0xffffff, 0.32)
    scene.ebarFill.fillRoundedRect(34, 40, Math.max(0, tw * (st.escape / 100) - 8), 3, 2)
    scene.ebarFill.fillStyle(0x173248, 0.16)
    scene.ebarFill.fillRect(30 + tw * 0.70, 36, 2, 16)
    scene.ebarNum.setText(String(Math.round(st.escape)))
    const fishX = 30 + Math.max(8, tw * (st.escape / 100))
    scene.ebarFishIcon?.setX(fishX)

    const rw = Math.max(4, reel.w * (st.reel / 100))
    scene.reelFill.clear()
    scene.reelFill.fillStyle(0xe8f6fb, 1)
    scene.reelFill.fillRoundedRect(reel.x, reel.y, reel.w, reel.h, 7)
    scene.reelFill.fillStyle(0x2f9ed4, 1)
    scene.reelFill.fillRoundedRect(reel.x, reel.y, rw, reel.h, 7)
    scene.reelFill.fillStyle(0xffffff, 0.33)
    scene.reelFill.fillRoundedRect(reel.x + 4, reel.y + 3, Math.max(0, rw - 8), 3, 2)
    scene.reelFill.lineStyle(1.3, 0x1f6f9f, 0.72)
    scene.reelFill.strokeRoundedRect(reel.x, reel.y, reel.w, reel.h, 7)
    scene.reelValText.setText(String(Math.round(st.reel)))

    const wasRaging = scene.rageTag.visible
    scene.rageTag.setVisible(st.isRaging)
    scene.reelCTA.setVisible(!st.isRaging)
    if (st.isRaging && !wasRaging) scene.cameras.main.shake(180, 0.009)
  }

  buildScoreBar(initialScore) {
    const scene = this.scene
    const W = scene.scale.width
    const CHIP_W = W * 0.26
    const CHIP_H = 44
    const CHIP_CY = CHIP_H / 2
    const SCORE_X = W * 0.55
    const TIME_X = W * 0.82

    scene.scoreBar = scene.add.container(0, 0).setDepth(70)

    const chip = (cx, icon, val, lbl, valColor) => {
      const x = cx - CHIP_W / 2
      const shadow = scene.add.graphics()
      shadow.fillStyle(0x173248, 0.13)
      shadow.fillRoundedRect(x + 2, 4, CHIP_W, CHIP_H, 14)

      const bg = scene.add.graphics()
      bg.fillStyle(0xf8fdff, 0.96)
      bg.lineStyle(2, 0x9bcfe5, 0.9)
      bg.fillRoundedRect(x, 0, CHIP_W, CHIP_H, 14)
      bg.strokeRoundedRect(x, 0, CHIP_W, CHIP_H, 14)
      bg.fillStyle(0xdff5ff, 0.52)
      bg.fillRoundedRect(x + 7, 6, CHIP_W - 14, 9, 5)

      const ic = scene.add.text(x + 9, CHIP_CY - 5, icon, { fontSize: '17px', resolution: TEXT_RES }).setOrigin(0, 0.5)
      const v = scene.add.text(x + 34, CHIP_CY - 6, val, {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '17px', fontWeight: '900', color: valColor,
      }).setOrigin(0, 0.5)
      const l = scene.add.text(x + 34, CHIP_CY + 10, lbl, {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.inkSoft,
      }).setOrigin(0, 0.5)
      return { els: [shadow, bg, ic, v, l], valText: v }
    }

    const sc = chip(SCORE_X, ICONS.SCORE, String(initialScore), 'SCORE', UI_COLORS.warning)
    const ti = chip(TIME_X, ICONS.TIMER, '00:00', 'TIME', UI_COLORS.oceanDeep)

    scene.scoreValText = sc.valText
    scene.timeValText = ti.valText
    scene.scoreBar.add([...sc.els, ...ti.els])

    scene._sessionStartedAt = Date.now()
    scene._timeChipEvent = scene.time.addEvent({
      delay: 1000, loop: true,
      callback: () => {
        const elapsed = Math.floor((Date.now() - scene._sessionStartedAt) / 1000)
        const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
        const ss = String(elapsed % 60).padStart(2, '0')
        scene.timeValText?.setText(`${mm}:${ss}`)
      },
    })
  }

  buildHitHUD(W, H) {
    const scene = this.scene

    scene.hitHint = scene.add.text(W / 2, H * 0.36, `${ICONS.ROD} HIT! タップ！`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '31px', fontWeight: '900',
      color: UI_COLORS.coral,
      stroke: '#ffffff', strokeThickness: 6,
      shadow: SHADOW.soft,
    }).setOrigin(0.5).setDepth(50).setVisible(false)

    scene._hitHintBaseY = scene.hitHint.y

    scene.rageTag = scene.add.text(W / 2, 78, `${ICONS.RAGE} 魚が暴れている！ 待て`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900',
      color: '#ffffff', backgroundColor: UI_COLORS.coral,
      padding: { x: 10, y: 5 },
      stroke: '#173248', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(68).setVisible(false)
  }

  destroy() {
    this.scene._timeChipEvent?.remove(false)
    this.scene._timeChipEvent = undefined
    this.scene.hitHint?.destroy()
    this.scene.rageTag?.destroy()
  }
}
