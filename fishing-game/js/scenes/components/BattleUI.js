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
    bg.fillStyle(0x173248, 0.15)
    bg.fillRoundedRect(10, 9, W - 20, 66, 22)
    bg.fillStyle(0xf8fdff, 0.97)
    bg.lineStyle(2.5, 0x9bcfe5, 0.95)
    bg.fillRoundedRect(10, 4, W - 20, 66, 22)
    bg.strokeRoundedRect(10, 4, W - 20, 66, 22)
    bg.fillStyle(0xdff5ff, 0.82)
    bg.fillRoundedRect(20, 12, W - 40, 19, 10)

    const title = scene.add.text(24, 21, '魚の逃走', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900',
      color: UI_COLORS.ink,
    }).setOrigin(0, 0.5)

    scene.ebarFill = scene.add.graphics()
    scene.ebarNum = scene.add.text(W - 24, 21, '0', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '18px', fontWeight: '900',
      color: UI_COLORS.coral,
    }).setOrigin(1, 0.5)

    scene.ebarFishIcon = scene.add.text(24, 50, '🐟', {
      fontSize: '18px', resolution: TEXT_RES,
    }).setOrigin(0.5)

    scene.escapeBar.add([bg, title, scene.ebarFill, scene.ebarNum, scene.ebarFishIcon])
    scene._ebarW = W - 48
  }

  buildBattlePanel(W, H) {
    const scene = this.scene
    scene.battlePanel = scene.add.container(0, 0).setDepth(60).setVisible(false)

    const panW = Math.min(346, W * 0.92)
    const px = (W - panW) / 2
    const py = H * 0.79

    const bg = scene.add.graphics()
    bg.fillStyle(0x173248, 0.14)
    bg.fillRoundedRect(px + 2, py + 5, panW, 66, 20)
    bg.fillStyle(0xf8fdff, 0.97)
    bg.lineStyle(2.5, 0x9bcfe5, 0.95)
    bg.fillRoundedRect(px, py, panW, 66, 20)
    bg.strokeRoundedRect(px, py, panW, 66, 20)
    bg.fillStyle(0xdff5ff, 0.7)
    bg.fillRoundedRect(px + 10, py + 9, 78, 20, 10)

    const lbl = scene.add.text(px + 20, py + 19, `${ICONS.REEL} 巻き取り`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: UI_COLORS.inkSoft,
    }).setOrigin(0, 0.5)

    scene.reelFill = scene.add.graphics()
    scene.reelValText = scene.add.text(px + panW - 16, py + 41, '0', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(1, 0.5)

    scene.battlePanel.add([bg, lbl, scene.reelFill, scene.reelValText])
    scene._reel = { x: px + 18, y: py + 35, w: panW - 62, h: 18 }
  }

  buildReelCTA(W, H) {
    const scene = this.scene
    scene.reelCTA = scene.add.container(W / 2, H * 0.685).setDepth(67).setVisible(false)

    const halo = scene.add.graphics()
    halo.fillStyle(0xffffff, 0.20)
    halo.fillEllipse(0, 6, 252, 110)

    const t1 = scene.add.text(0, -30, '釣り上げろ！', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '34px', fontWeight: '900',
      color: UI_COLORS.coral,
      stroke: '#ffffff', strokeThickness: 5,
      shadow: SHADOW.soft,
    }).setOrigin(0.5)

    const t2 = scene.add.text(0, 6, ICONS.SWIPE_DN, { fontSize: '28px', resolution: TEXT_RES }).setOrigin(0.5)

    const swipeBg = scene.add.graphics()
    swipeBg.fillStyle(0x173248, 0.14)
    swipeBg.fillRoundedRect(-72, 34, 144, 34, 14)
    swipeBg.fillStyle(0xffd95a, 1)
    swipeBg.lineStyle(2, 0x173248, 0.92)
    swipeBg.fillRoundedRect(-72, 30, 144, 34, 14)
    swipeBg.strokeRoundedRect(-72, 30, 144, 34, 14)
    swipeBg.fillStyle(0xffffff, 0.35)
    swipeBg.fillRoundedRect(-60, 35, 120, 7, 4)

    const t3 = scene.add.text(0, 47, '下にスワイプ！', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900',
      color: UI_COLORS.ink,
    }).setOrigin(0.5)

    scene.reelCTA.add([halo, t1, t2, swipeBg, t3])
    scene.tweens.add({ targets: t1, y: '-=6', duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
    scene.tweens.add({ targets: t2, y: '+=8', duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
  }

  sync(battleState, reel, ebarW) {
    const scene = this.scene
    const st = battleState
    if (!st) return
    const tw = ebarW

    scene.ebarFill.clear()
    scene.ebarFill.fillStyle(0xe8f6fb, 1)
    scene.ebarFill.fillRoundedRect(24, 40, tw, 18, 9)
    const escapeColor = st.escape >= 72 ? 0xff765a : st.escape >= 42 ? 0xffc857 : 0x71d6a2
    scene.ebarFill.fillStyle(escapeColor, 1)
    scene.ebarFill.fillRoundedRect(24, 40, tw * (st.escape / 100), 18, 9)
    scene.ebarFill.fillStyle(0xffffff, 0.35)
    scene.ebarFill.fillRoundedRect(28, 43, Math.max(0, tw * (st.escape / 100) - 8), 5, 3)
    scene.ebarFill.fillStyle(0x173248, 0.18)
    scene.ebarFill.fillRect(24 + tw * 0.70, 38, 3, 22)
    scene.ebarNum.setText(String(Math.round(st.escape)))
    const fishX = 24 + Math.max(10, tw * (st.escape / 100))
    scene.ebarFishIcon?.setX(fishX)

    const rw = Math.max(4, reel.w * (st.reel / 100))
    scene.reelFill.clear()
    scene.reelFill.fillStyle(0xe8f6fb, 1)
    scene.reelFill.fillRoundedRect(reel.x, reel.y, reel.w, reel.h, 9)
    scene.reelFill.fillStyle(0x2f9ed4, 1)
    scene.reelFill.fillRoundedRect(reel.x, reel.y, rw, reel.h, 9)
    scene.reelFill.fillStyle(0xffffff, 0.35)
    scene.reelFill.fillRoundedRect(reel.x + 4, reel.y + 3, Math.max(0, rw - 8), 5, 3)
    scene.reelFill.lineStyle(1.5, 0x1f6f9f, 0.75)
    scene.reelFill.strokeRoundedRect(reel.x, reel.y, reel.w, reel.h, 9)
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

    scene.rageTag = scene.add.text(W / 2, 50, `${ICONS.RAGE} 魚が暴れている！`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900',
      color: '#ffffff', backgroundColor: UI_COLORS.coral,
      padding: { x: 12, y: 6 },
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
