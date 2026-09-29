import { FONT, SHADOW, UI_COLORS } from '../../config/fontStyles.js'
import { ASSETS } from '../../config/assetManifest.js'
import { haptic, playSfx } from '../../game/feedback.js'

const TEXT_RES = window.devicePixelRatio ?? 1
const KUE_CLEAR_SEEN_KEY = 'ainan_kue_first_clear_seen'

export class ResultUI {
  constructor(scene) { this.scene = scene }

  buildResultOverlay(W, H) {
    const scene = this.scene
    scene.resultOverlay = scene.add.container(W / 2, H / 2).setDepth(120).setVisible(false).setScrollFactor(0)

    const scrim = scene.add.rectangle(0, 0, W, H, 0x06395c, 0.30)
    const card = scene.add.graphics()
    card.fillStyle(0x031f33, 0.82)
    card.lineStyle(2, 0xc9f4ff, 0.58)
    card.fillRoundedRect(-168, 24, 336, 148, 22)
    card.strokeRoundedRect(-168, 24, 336, 148, 22)
    card.fillStyle(0xffffff, 0.05)
    card.fillRoundedRect(-158, 34, 316, 26, 12)

    scene.resStripe = scene.add.graphics()
    scene.resLabel = scene.add.text(0, -316, '', {
      fontFamily: 'Nunito, M PLUS Rounded 1c, sans-serif', resolution: TEXT_RES,
      fontSize: '66px', fontWeight: '900', color: '#ffd95a',
      stroke: '#824400', strokeThickness: 5, shadow: SHADOW.soft,
    }).setOrigin(0.5)

    const halo = scene.add.graphics()
    halo.fillStyle(0xffd95a, 0.08)
    halo.fillCircle(0, -130, 118)
    halo.lineStyle(2, 0xffffff, 0.22)
    halo.strokeCircle(0, -130, 104)

    scene.resEmoji = scene.add.text(0, -130, '', { fontSize: '96px', resolution: TEXT_RES }).setOrigin(0.5)
    scene.resName = scene.add.text(0, 47, '', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '27px', fontWeight: '900', color: '#ffffff', shadow: SHADOW.soft,
    }).setOrigin(0.5)

    const stats = scene.add.graphics()
    stats.fillStyle(0x062c44, 0.62)
    stats.lineStyle(1.5, 0xbcecff, 0.42)
    stats.fillRoundedRect(-150, 70, 300, 84, 16)
    stats.strokeRoundedRect(-150, 70, 300, 84, 16)

    scene.resPts = scene.add.text(0, 111, '', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: '#ffffff', align: 'left', lineSpacing: 7,
    }).setOrigin(0.5)
    scene.resHint = scene.add.text(0, 162, '釣った魚を町へ持ち帰ろう', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: '#dff5ff',
    }).setOrigin(0.5)

    const guide = scene.add.container(0, 0).setVisible(false)
    const bubble = scene.add.graphics()
    bubble.fillStyle(0xffffff, 0.96)
    bubble.lineStyle(2, 0x9bcfe5, 0.92)
    bubble.fillRoundedRect(-158, 180, 218, 62, 17)
    bubble.strokeRoundedRect(-158, 180, 218, 62, 17)
    bubble.fillTriangle(48, 219, 70, 227, 52, 206)
    const bubbleText = scene.add.text(-146, 191, 'やったー！\n立派な一匹だ！', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900',
      color: '#173248', lineSpacing: 3,
    }).setOrigin(0, 0)
    const guideAsset = ASSETS.characters?.fishingCastHero ?? ASSETS.characters?.playerDefaultUi
    const guideArt = guideAsset?.key && scene.textures.exists(guideAsset.key)
      ? scene.add.image(123, 238, guideAsset.key).setOrigin(0.5, 1).setDisplaySize(88, 124)
      : scene.add.text(125, 213, '🎣', { fontSize: '54px', resolution: TEXT_RES }).setOrigin(0.5)
    guide.add([bubble, bubbleText, guideArt])
    scene._resultGuideGroup = guide

    const makeBtn = (x, y, w, h, label, action, primary = false, artAsset = null) => {
      const useArt = Boolean(artAsset?.key && scene.textures.exists(artAsset.key))
      const bg = useArt
        ? scene.add.image(x + w / 2, y + h / 2, artAsset.key).setDisplaySize(w, h)
        : scene.add.graphics()
      const draw = pressed => {
        if (useArt) {
          bg.setY(y + h / 2 + (pressed ? 2 : 0)).setAlpha(pressed ? 0.88 : 1)
          return
        }
        bg.clear()
        bg.fillStyle(0x021b2b, 0.28)
        bg.fillRoundedRect(x + 2, y + 5, w, h, primary ? 20 : 15)
        bg.fillStyle(primary ? 0x2f9ed4 : 0x0e425f, pressed ? 0.84 : 1)
        bg.lineStyle(primary ? 2.5 : 1.8, primary ? 0xc9f4ff : 0x8edfff, primary ? 0.92 : 0.54)
        bg.fillRoundedRect(x, y + (pressed ? 2 : 0), w, h, primary ? 20 : 15)
        bg.strokeRoundedRect(x, y + (pressed ? 2 : 0), w, h, primary ? 20 : 15)
        bg.fillStyle(0xffffff, primary ? 0.12 : 0.07)
        bg.fillRoundedRect(x + 7, y + 7 + (pressed ? 2 : 0), w - 14, 9, 5)
      }
      draw(false)
      const txt = scene.add.text(x + w / 2, y + h / 2, label, {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: primary ? '15px' : '11px', fontWeight: '900',
        color: useArt ? 'rgba(255,255,255,0)' : '#ffffff',
      }).setOrigin(0.5)
      const hit = scene.add.rectangle(x + w / 2, y + h / 2, w + 4, h + 4, 0x000000, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => draw(true))
        .on('pointerup', () => { draw(false); scene._skipNextDown = true; action() })
        .on('pointerout', () => draw(false))
      return [bg, txt, hit]
    }

    const town = makeBtn(-162, 250, 154, 58, '⌂ 町へ持ち帰る', () => {
      playSfx('select')
      haptic(10)
      const lastCatch = scene.catches?.[scene.catches.length - 1]
      const catchArrival = lastCatch && scene.fish ? {
        fishId: scene.fish.id, name: scene.fish.name, emoji: scene.fish.emoji,
        rarity: scene.fish.rarity, sizeCm: lastCatch.sizeCm, score: lastCatch.score,
      } : null
      scene._cleanup()
      scene.scene.start('TownScene', { catchArrival })
    }, false, ASSETS.ui.fishingTownButton)
    const retry = makeBtn(8, 250, 154, 58, '↻ もう一投', () => {
      playSfx('select')
      haptic(12)
      const env = { ...scene.env, player: { ...(scene.env?.player ?? {}) } }
      scene._cleanup()
      scene.scene.restart(env)
    }, true, ASSETS.ui.fishingRetryButton)


    const retrySub = scene.add.text(0, 320, '同じ釣り場・仕掛けで続ける', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: '#a9d9ed',
    }).setOrigin(0.5)

    scene.resultSuccessActions = scene.add.container(0, 0, [...town, ...retry, retrySub])
    scene.resultOverlay.add([scrim, card, scene.resStripe, scene.resLabel, halo, scene.resEmoji, scene.resName, stats, scene.resPts, scene.resHint, guide, scene.resultSuccessActions])
  }

  drawResultStripe(outcome) {
    const scene = this.scene
    const g = scene.resStripe
    if (!g) return
    g.clear()
    const isKue = outcome === 'caught' && scene.fish?.id === 'kue' && scene.env?.point === 'pointC'
    const color = isKue ? 0xffd95a : outcome === 'caught' ? 0x2f9ed4 : 0xff765a
    g.fillStyle(color, 0.96)
    g.fillRoundedRect(-92, -236, 184, 34, 15)
    scene._resultGuideGroup?.setVisible?.(outcome === 'caught')
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
