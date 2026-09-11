import { FONT, SHADOW, UI_COLORS } from '../../config/fontStyles.js'
import { ICONS } from '../../config/icons.js'

const TEXT_RES = window.devicePixelRatio ?? 1
const KUE_CLEAR_SEEN_KEY = 'ainan_kue_first_clear_seen'

export class ResultUI {
  constructor(scene) {
    this.scene = scene
  }

  buildResultOverlay(W, H) {
    const scene = this.scene
    scene.resultOverlay = scene.add.container(W / 2, H * 0.42).setDepth(120).setVisible(false)

    const glow = scene.add.graphics()
    glow.fillStyle(0xffffff, 0.20)
    glow.fillCircle(0, 0, 184)
    glow.fillStyle(0xdff5ff, 0.22)
    glow.fillCircle(0, 0, 156)

    const card = scene.add.graphics()
    card.fillStyle(0x173248, 0.16)
    card.fillRoundedRect(-157, -105, 314, 258, 26)
    card.fillStyle(0xf8fdff, 0.99)
    card.lineStyle(3, 0x9bcfe5, 1)
    card.fillRoundedRect(-154, -110, 308, 258, 26)
    card.strokeRoundedRect(-154, -110, 308, 258, 26)
    card.fillStyle(0xdff5ff, 0.92)
    card.fillRoundedRect(-142, -98, 284, 42, 18)
    card.fillStyle(0xffffff, 0.56)
    card.fillRoundedRect(-132, -91, 264, 10, 6)

    scene.resStripe = scene.add.graphics()
    scene.resLabel = scene.add.text(0, -76, '', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '16px', fontWeight: '900', color: '#ffffff', shadow: SHADOW.soft,
    }).setOrigin(0.5)

    const catchBadge = scene.add.graphics()
    catchBadge.fillStyle(0xffffff, 0.96)
    catchBadge.lineStyle(2, 0x9bcfe5, 0.75)
    catchBadge.fillCircle(0, -21, 43)
    catchBadge.strokeCircle(0, -21, 43)

    scene.resEmoji = scene.add.text(0, -21, '', { fontSize: '58px', resolution: TEXT_RES }).setOrigin(0.5)
    scene.resName = scene.add.text(0, 34, '', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '24px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5)
    scene.resPts = scene.add.text(0, 65, '', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '18px', fontWeight: '900', color: UI_COLORS.success,
    }).setOrigin(0.5)
    scene.resHint = scene.add.text(0, 91, '次の行き先を選ぼう', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.inkSoft,
    }).setOrigin(0.5)

    const BTN_W = 86, BTN_H = 42, BTN_GAP = 8
    const totalBtnW = BTN_W * 3 + BTN_GAP * 2
    const btnStartX = -totalBtnW / 2
    const btnY = 116

    const makeNavBtn = (x, mark, label, action, primary = false) => {
      const bg = scene.add.graphics()
      const drawBg = (mode = 'idle') => {
        const pressed = mode === 'press'
        const hover = mode === 'hover'
        bg.clear()
        bg.fillStyle(0x173248, pressed ? 0.08 : 0.13)
        bg.fillRoundedRect(x + 2, btnY + (pressed ? 3 : 5), BTN_W, BTN_H, 14)
        bg.fillStyle(primary ? (hover ? 0xffe78d : 0xffd95a) : (hover ? 0xdff5ff : 0xffffff), 0.99)
        bg.lineStyle(2, primary ? 0x173248 : 0x9bcfe5, 0.9)
        bg.fillRoundedRect(x, btnY + (pressed ? 2 : 0), BTN_W, BTN_H, 14)
        bg.strokeRoundedRect(x, btnY + (pressed ? 2 : 0), BTN_W, BTN_H, 14)
      }
      drawBg()
      const txt = scene.add.text(x + BTN_W / 2, btnY + BTN_H / 2, `${mark} ${label}`, {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.ink, align: 'center',
      }).setOrigin(0.5)
      const hit = scene.add.rectangle(x + BTN_W / 2, btnY + BTN_H / 2, BTN_W + 4, BTN_H + 4, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => drawBg('press'))
        .on('pointerup', () => { scene._skipNextDown = true; action() })
        .on('pointerover', () => drawBg('hover'))
        .on('pointerout', () => drawBg())
      return [bg, txt, hit]
    }

    const b1 = makeNavBtn(btnStartX, '↻', 'もう一度', () => { scene.resultOverlay.setVisible(false); scene._enterCast() }, true)
    const b2 = makeNavBtn(btnStartX + BTN_W + BTN_GAP, '□', '図鑑', () => { scene._cleanup(); scene.scene.start('CollectionScene') })
    const b3 = makeNavBtn(btnStartX + (BTN_W + BTN_GAP) * 2, '→', '町へ', () => { scene._cleanup(); scene.scene.start('TownScene') })

    scene.resultOverlay.add([glow, card, scene.resStripe, scene.resLabel, catchBadge, scene.resEmoji, scene.resName, scene.resPts, scene.resHint, ...b1, ...b2, ...b3])
  }

  drawResultStripe(outcome) {
    const scene = this.scene
    const g = scene.resStripe
    if (!g) return
    g.clear()
    const isKueClear = outcome === 'caught' && scene.fish?.id === 'kue'
    const color = isKueClear ? 0xe6a800 : outcome === 'caught' ? 0x2caf72 : 0xff765a
    g.fillStyle(color, 1)
    g.fillRoundedRect(-142, -98, 284, 42, 18)
    g.fillStyle(0xffffff, 0.28)
    g.fillRoundedRect(-130, -91, 260, 9, 5)

    if (isKueClear) this._showKueClearCutin()
  }

  _showKueClearCutin() {
    const scene = this.scene
    if (scene._kueClearCutinActive) return
    scene._kueClearCutinActive = true

    const { width: W, height: H } = scene.scale
    const firstClear = localStorage.getItem(KUE_CLEAR_SEEN_KEY) !== '1'
    localStorage.setItem(KUE_CLEAR_SEEN_KEY, '1')

    scene.time.delayedCall(90, () => {
      scene.cameras.main.flash(360, 255, 219, 90, true)
      scene.cameras.main.shake(420, 0.012)

      const c = scene.add.container(W / 2, H * 0.38).setDepth(190).setAlpha(0).setScale(0.88)
      const shade = scene.add.rectangle(0, 0, W, H, 0x071520, 0.70)
      const halo = scene.add.graphics()
      halo.fillStyle(0xffd95a, 0.18)
      halo.fillCircle(0, 0, 178)
      halo.lineStyle(5, 0xffd95a, 0.92)
      halo.strokeCircle(0, 0, 146)
      halo.lineStyle(2, 0xffffff, 0.50)
      halo.strokeCircle(0, 0, 166)

      const plate = scene.add.graphics()
      plate.fillStyle(0x102b42, 0.97)
      plate.lineStyle(3, 0xffd95a, 1)
      plate.fillRoundedRect(-156, -78, 312, 156, 24)
      plate.strokeRoundedRect(-156, -78, 312, 156, 24)
      plate.fillStyle(0xffd95a, 0.16)
      plate.fillRoundedRect(-144, -66, 288, 38, 14)

      const top = scene.add.text(0, -48, firstClear ? 'MISSION CLEAR' : 'LEGEND CATCH', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '16px', fontWeight: '900', color: '#ffd95a', letterSpacing: 2,
      }).setOrigin(0.5)
      const title = scene.add.text(0, -4, '黒潮の主　クエ', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '28px', fontWeight: '900', color: '#ffffff', shadow: SHADOW.medium,
      }).setOrigin(0.5)
      const sub = scene.add.text(0, 38, firstClear ? '大物挑戦を達成した' : '伝説魚を再び釣り上げた', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: '#dff5ff',
      }).setOrigin(0.5)

      c.add([shade, halo, plate, top, title, sub])
      scene.tweens.add({ targets: c, alpha: 1, scaleX: 1, scaleY: 1, duration: 260, ease: 'Back.easeOut' })
      scene.tweens.add({ targets: halo, angle: 16, scaleX: 1.08, scaleY: 1.08, duration: 900, yoyo: true, repeat: 0, ease: 'Sine.easeInOut' })
      scene.time.delayedCall(1350, () => {
        scene.tweens.add({
          targets: c,
          alpha: 0,
          y: c.y - 24,
          duration: 320,
          ease: 'Sine.easeIn',
          onComplete: () => {
            c.destroy(true)
            scene._kueClearCutinActive = false
          },
        })
      })
    })
  }

  toast(msg) {
    const { width: W, height: H } = this.scene.scale
    const bg = this.scene.add.graphics().setDepth(99)
    bg.fillStyle(0x173248, 0.92)
    bg.fillRoundedRect(W / 2 - 128, H * 0.38 - 24, 256, 48, 18)
    const t = this.scene.add.text(W / 2, H * 0.38, msg, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '18px', fontWeight: '900', color: '#ffffff', shadow: SHADOW.soft,
    }).setOrigin(0.5).setDepth(100)
    this.scene.tweens.add({ targets: [t, bg], alpha: 0, y: '-=22', duration: 700, onComplete: () => { t.destroy(); bg.destroy() } })
  }

  buildBackBtn(W, H) {
    const scene = this.scene
    const c = scene.add.container(18, H - 18).setDepth(200)
    const bg = scene.add.graphics()
    const draw = (hover = false) => {
      bg.clear()
      bg.fillStyle(0x173248, 0.12)
      bg.fillRoundedRect(2, -40, 120, 40, 14)
      bg.fillStyle(hover ? 0xdff5ff : 0xf8fdff, 0.98)
      bg.lineStyle(2, 0x9bcfe5, 0.92)
      bg.fillRoundedRect(0, -43, 120, 40, 14)
      bg.strokeRoundedRect(0, -43, 120, 40, 14)
    }
    draw()
    const txt = scene.add.text(60, -23, `${ICONS.BACK} マップへ`, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5)
    const hit = scene.add.rectangle(60, -23, 124, 44, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', (p) => {
        p.event.stopPropagation()
        scene._cleanup()
        scene.scene.start('MapScene')
      })
      .on('pointerover', () => draw(true))
      .on('pointerout', () => draw(false))
    c.add([bg, txt, hit])
    this._backBtn = c
  }

  destroy() {
    this._backBtn?.destroy()
  }
}
