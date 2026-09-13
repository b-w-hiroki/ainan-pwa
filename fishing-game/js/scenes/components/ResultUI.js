import { FONT, SHADOW, UI_COLORS } from '../../config/fontStyles.js'

const TEXT_RES = window.devicePixelRatio ?? 1
const KUE_CLEAR_SEEN_KEY = 'ainan_kue_first_clear_seen'

export class ResultUI {
  constructor(scene) { this.scene = scene }

  buildResultOverlay(W, H) {
    const scene = this.scene
    scene.resultOverlay = scene.add.container(W / 2, H / 2).setDepth(120).setVisible(false).setScrollFactor(0)

    const scrim = scene.add.rectangle(0, 0, W, H, 0x03243a, 0.72)
    const card = scene.add.graphics()
    card.fillStyle(0x073754, 0.96)
    card.lineStyle(2, 0x8edfff, 0.55)
    card.fillRoundedRect(-168, -250, 336, 500, 28)
    card.strokeRoundedRect(-168, -250, 336, 500, 28)
    card.fillStyle(0xffffff, 0.08)
    card.fillRoundedRect(-154, -236, 308, 9, 5)

    scene.resStripe = scene.add.graphics()
    scene.resLabel = scene.add.text(0, -218, '', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: '#ffffff', shadow: SHADOW.soft,
    }).setOrigin(0.5)

    const halo = scene.add.graphics()
    halo.fillStyle(0x58b8df, 0.16)
    halo.fillCircle(0, -116, 78)
    halo.lineStyle(2, 0x8edfff, 0.38)
    halo.strokeCircle(0, -116, 70)

    scene.resEmoji = scene.add.text(0, -116, '', { fontSize: '82px', resolution: TEXT_RES }).setOrigin(0.5)
    scene.resName = scene.add.text(0, -38, '', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '25px', fontWeight: '900', color: '#ffffff', shadow: SHADOW.soft,
    }).setOrigin(0.5)

    const stats = scene.add.graphics()
    stats.fillStyle(0xffffff, 0.10)
    stats.lineStyle(1.5, 0x8edfff, 0.34)
    stats.fillRoundedRect(-132, -4, 264, 52, 16)
    stats.strokeRoundedRect(-132, -4, 264, 52, 16)

    scene.resPts = scene.add.text(0, 22, '', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '18px', fontWeight: '900', color: '#ffd95a',
    }).setOrigin(0.5)
    scene.resHint = scene.add.text(0, 68, '釣果を町へ持ち帰ろう', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: '#dff5ff',
    }).setOrigin(0.5)

    const makeBtn = (x, y, w, h, label, action, primary = false) => {
      const bg = scene.add.graphics()
      const draw = pressed => {
        bg.clear()
        bg.fillStyle(primary ? 0x2f9ed4 : 0x0e425f, pressed ? 0.82 : 0.98)
        bg.lineStyle(primary ? 2 : 1.5, primary ? 0xbcecff : 0x8edfff, primary ? 0.72 : 0.36)
        bg.fillRoundedRect(x, y + (pressed ? 2 : 0), w, h, primary ? 20 : 15)
        bg.strokeRoundedRect(x, y + (pressed ? 2 : 0), w, h, primary ? 20 : 15)
      }
      draw(false)
      const txt = scene.add.text(x + w / 2, y + h / 2, label, {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: primary ? '15px' : '11px', fontWeight: '900', color: '#ffffff',
      }).setOrigin(0.5)
      const hit = scene.add.rectangle(x + w / 2, y + h / 2, w + 4, h + 4, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => draw(true))
        .on('pointerup', () => { scene._skipNextDown = true; action() })
        .on('pointerout', () => draw(false))
      return [bg, txt, hit]
    }

    const town = makeBtn(-126, 102, 252, 56, '町へ持ち帰る', () => {
      const lastCatch = scene.catches?.[scene.catches.length - 1]
      const catchArrival = lastCatch && scene.fish ? {
        fishId: scene.fish.id, name: scene.fish.name, emoji: scene.fish.emoji,
        rarity: scene.fish.rarity, sizeCm: lastCatch.sizeCm, score: lastCatch.score,
      } : null
      scene._cleanup()
      scene.scene.start('TownScene', { catchArrival })
    }, true)
    const retry = makeBtn(-126, 170, 120, 42, '↻ もう一度', () => {
      scene.resultOverlay.setVisible(false)
      scene._enterCast()
    })
    const book = makeBtn(6, 170, 120, 42, '□ 図鑑', () => {
      scene._cleanup()
      scene.scene.start('CollectionScene')
    })

    scene.resultSuccessActions = scene.add.container(0, 0, [...town, ...retry, ...book])
    scene.resultOverlay.add([scrim, card, scene.resStripe, scene.resLabel, halo, scene.resEmoji, scene.resName, stats, scene.resPts, scene.resHint, scene.resultSuccessActions])
  }

  drawResultStripe(outcome) {
    const scene = this.scene
    const g = scene.resStripe
    if (!g) return
    g.clear()
    const isKue = outcome === 'caught' && scene.fish?.id === 'kue'
    const color = isKue ? 0xffd95a : outcome === 'caught' ? 0x2f9ed4 : 0xff765a
    g.fillStyle(color, 0.96)
    g.fillRoundedRect(-92, -236, 184, 34, 15)
    if (isKue) this._showKueClearCutin()
  }

  _showKueClearCutin() {
    const scene = this.scene
    if (scene._kueClearCutinActive) return
    scene._kueClearCutinActive = true
    const first = localStorage.getItem(KUE_CLEAR_SEEN_KEY) !== '1'
    localStorage.setItem(KUE_CLEAR_SEEN_KEY, '1')
    const { width: W, height: H } = scene.scale
    const c = scene.add.container(W / 2, H * 0.38).setDepth(190).setAlpha(0).setScrollFactor(0)
    const bg = scene.add.rectangle(0, 0, 320, 130, 0x102b42, 0.97).setStrokeStyle(3, 0xffd95a, 1)
    const top = scene.add.text(0, -34, first ? 'MISSION CLEAR' : 'LEGEND CATCH', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: '#ffd95a',
    }).setOrigin(0.5)
    const title = scene.add.text(0, 4, '黒潮の主　クエ', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '26px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5)
    c.add([bg, top, title])
    scene.tweens.add({ targets: c, alpha: 1, duration: 220 })
    scene.time.delayedCall(1200, () => scene.tweens.add({ targets: c, alpha: 0, duration: 280, onComplete: () => { c.destroy(true); scene._kueClearCutinActive = false } }))
  }

  toast(msg) {
    const { width: W, height: H } = this.scene.scale
    const bg = this.scene.add.graphics().setDepth(99).setScrollFactor(0)
    bg.fillStyle(0x073754, 0.94)
    bg.fillRoundedRect(W / 2 - 128, H * 0.38 - 24, 256, 48, 18)
    const t = this.scene.add.text(W / 2, H * 0.38, msg, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '18px', fontWeight: '900', color: '#ffffff', shadow: SHADOW.soft,
    }).setOrigin(0.5).setDepth(100).setScrollFactor(0)
    this.scene.tweens.add({ targets: [t, bg], alpha: 0, y: '-=22', duration: 700, onComplete: () => { t.destroy(); bg.destroy() } })
  }

  buildBackBtn() { this._backBtn = null }
  destroy() { this._backBtn?.destroy() }
}
