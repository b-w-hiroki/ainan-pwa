import Phaser from 'phaser'
import { FONT, SHADOW, UI_COLORS } from '../../config/fontStyles.js'
import { ICONS } from '../../config/icons.js'
import { MOBILE_FRAME } from '../../config/mobileFrame.js'
import { ASSETS } from '../../config/assetManifest.js'
import { FISHING_MOCK_LAYOUT as L } from '../../presentation/layouts/fishingMockLayout.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const BATTLE_STYLE = {
  aji:      { intro: '小刻みに走る', rage: '細かく走る… 少し待とう' },
  saba:     { intro: '素早い引き', rage: '急に走る… 少し待とう' },
  tai:      { intro: '重く粘る引き', rage: '首を振っている… 待とう' },
  isaki:    { intro: 'じわっと粘る', rage: 'じわじわ抵抗… 少し待とう' },
  bass:     { intro: '鋭いダッシュ', rage: '跳ねて暴れる！ 少し待とう' },
  buri:     { intro: '横へ走る強烈な引き', rage: '横へ走る！ 少し待とう' },
  hirame:   { intro: '底へ潜る重い引き', rage: '底へ潜る… 無理に巻かない' },
  kanpachi: { intro: '一気に走る大物', rage: '強烈に走る！ 少し待とう' },
  kue:      { intro: '岩へ潜る怪物級の引き', rage: '底へ潜る！ 今は耐える' },
}

const BATTLE_FISH_KEYS = {
  aji: ASSETS.fishHeroes.aji.key,
  tai: ASSETS.fishHeroes.tai.key,
  bass: ASSETS.fish.blackBassIcon.key,
  buri: ASSETS.fishHeroes.buri.key,
  kue: ASSETS.fishHeroes.kue.key,
  saba: ASSETS.fish.sabaIcon.key,
  isaki: ASSETS.fish.isakiIcon.key,
  hirame: ASSETS.fish.hirameIcon.key,
  kanpachi: ASSETS.fish.kanpachiIcon.key,
}

function clearBattleHeroVisual(scene) {
  scene._battleHeroTween?.stop?.()
  scene._battleHeroTween?.destroy?.()
  scene._battleHeroTween = null
  scene._battleHeroAngleTween?.stop?.()
  scene._battleHeroAngleTween?.destroy?.()
  scene._battleHeroAngleTween = null
  scene._battleStyleCueTween?.stop?.()
  scene._battleStyleCueTween?.destroy?.()
  scene._battleStyleCueTween = null
  scene._battleStyleCue?.destroy?.()
  scene._battleStyleCue = null
  scene.battleHeroGlow?.destroy?.()
  scene.battleHeroGlow = null
  scene.battleHeroSplash?.destroy?.()
  scene.battleHeroSplash = null
  scene.battleHeroShadow?.destroy?.()
  scene.battleHeroShadow = null
  scene.battleHero?.destroy?.()
  scene.battleHero = null
  scene._battleHeroKey = null
}

function ensureBattleHero(scene) {
  const key = BATTLE_FISH_KEYS[scene.fish?.id]
  if (!key || !scene.textures?.exists?.(key)) return null
  if (scene.battleHero?.active && scene._battleHeroKey === key) return scene.battleHero

  clearBattleHeroVisual(scene)
  const W = scene.scale.width
  const width = 326
  const height = 184
  const cy = 322

  const glow = scene.add.graphics().setDepth(82).setScrollFactor(0)
  glow.fillStyle(0x77d8ec, 0.12)
  glow.fillEllipse(scene.scale.width / 2, cy, width + 74, height + 56)
  glow.lineStyle(2, 0xbcecff, 0.28)
  glow.strokeEllipse(scene.scale.width / 2, cy, width + 42, height + 28)

  const splash = scene.add.graphics().setDepth(83).setScrollFactor(0)
  splash.lineStyle(4, 0xeafcff, 0.86)
  splash.strokeEllipse(scene.scale.width / 2, cy + 46, width * 0.90, 30)
  splash.lineStyle(2, 0x8edfff, 0.72)
  splash.strokeEllipse(scene.scale.width / 2, cy + 48, width * 1.12, 42)
  ;[-74, -46, 52, 82].forEach((dx, index) => {
    const baseX = scene.scale.width / 2 + dx
    const baseY = 372 + (index % 2) * 4
    splash.lineStyle(index % 2 ? 3 : 4, 0xffffff, 0.82)
    splash.beginPath()
    splash.moveTo(baseX, baseY)
    splash.lineTo(baseX + dx * 0.10, baseY - 22 - (index % 2) * 7)
    splash.lineTo(baseX + dx * 0.16, baseY - 5)
    splash.strokePath()
  })
  splash.fillStyle(0xc9f5ff, 0.92)
  ;[[-96,367,4],[-67,352,3],[71,354,3],[101,369,4]].forEach(([dx,y,r]) => {
    splash.fillCircle(scene.scale.width / 2 + dx, y, r)
  })
  scene.battleHeroSplash = splash

  const shadow = scene.add.ellipse(scene.scale.width / 2 + 7, cy + 28, width * 0.82, height * 0.38, 0x031725, 0.22)
    .setDepth(83)
    .setScrollFactor(0)
  scene.battleHeroShadow = shadow

  const hero = scene.add.image(scene.scale.width / 2, cy, key)
    .setDisplaySize(width, height)
    .setDepth(84)
    .setScrollFactor(0)
    .setVisible(false)

  scene.battleHeroGlow = glow
  scene.battleHero = hero
  scene._battleHeroKey = key

  const feel = scene.fish?.feel ?? {}
  const speed = feel.battleSpeed ?? 3.2
  const waveX = Math.min(18, Math.max(4, (feel.battleWaveX ?? 10) * 0.62))
  const waveY = Math.min(10, Math.max(4, feel.battleWaveY ?? 6))
  const duration = Phaser.Math.Clamp(Math.round(1220 - speed * 115), 540, 1050)
  const angle = Math.min(7, Math.max(2, (feel.battleWaveX ?? 10) * 0.22))

  scene._battleHeroTween = scene.tweens.add({
    targets: [hero, glow, splash, shadow],
    x: `+=${waveX}`,
    y: `-=${waveY}`,
    duration,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })
  hero.setAngle(-16)
  scene._battleHeroAngleTween = scene.tweens.add({
    targets: hero,
    angle: [-18, -8],
    duration: Math.round(duration * 0.82),
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })

  const style = BATTLE_STYLE[scene.fish?.id]
  if (style?.intro) {
    const cue = scene.add.text(W / 2, 454, style.intro, {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '11px',
      fontWeight: '900',
      color: '#dff5ff',
      backgroundColor: 'rgba(7,55,84,0.76)',
      padding: { x: 12, y: 5 },
    }).setOrigin(0.5).setDepth(91).setScrollFactor(0).setAlpha(0)
    scene._battleStyleCue = cue
    scene._battleStyleCueTween = scene.tweens.add({
      targets: cue,
      alpha: 1,
      y: 440,
      duration: 180,
      yoyo: true,
      hold: 720,
      ease: 'Sine.easeOut',
      onComplete: () => {
        cue.destroy()
        if (scene._battleStyleCue === cue) scene._battleStyleCue = null
      },
    })
  }
  return hero
}

export class BattleUI {
  constructor(scene) {
    this.scene = scene
  }

  buildEscapeBar(W) {
    const scene = this.scene
    scene.escapeBar = scene.add.container(0, 0).setDepth(98).setVisible(false).setScrollFactor(0)

    const bg = scene.add.graphics()
    bg.fillStyle(0x05283d, 0.94)
    bg.lineStyle(2, 0xc9f4ff, 0.70)
    bg.fillRoundedRect(10, 10, W - 20, 84, 16)
    bg.strokeRoundedRect(10, 10, W - 20, 84, 16)
    bg.fillStyle(0xffffff, 0.06)
    bg.fillRoundedRect(16, 16, W - 32, 22, 10)

    const title = scene.add.text(22, 31, '🐟  FISH', {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '14px',
      fontWeight: '900',
      color: '#ffffff',
    }).setOrigin(0, 0.5)
    scene._battleFishName = title

    const phase = scene.add.text(W - 22, 31, 'BATTLE', {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '11px',
      fontWeight: '900',
      color: '#dff5ff',
    }).setOrigin(1, 0.5)

    scene.ebarFill = scene.add.graphics()
    scene.ebarNum = scene.add.text(W - 24, 67, '', {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '10px',
      fontWeight: '900',
      color: '#ffffff',
    }).setOrigin(1, 0.5).setVisible(false)

    scene.ebarFishIcon = scene.add.text(0, 0, '', { fontSize: '1px' }).setVisible(false)
    scene.escapeBar.add([bg, title, phase, scene.ebarFill, scene.ebarNum, scene.ebarFishIcon])
    scene._ebarW = W - 56
  }

  buildBattlePanel(W, H) {
    const scene = this.scene
    scene.battlePanel = scene.add.container(0, 0).setDepth(66).setVisible(false).setScrollFactor(0)

    const controlsTop = H - MOBILE_FRAME.bottomControlsHeight
    const trackX = 38
    const trackY = controlsTop + 129
    const trackW = W - 76

    const lbl = scene.add.text(trackX, trackY - 12, `${ICONS.REEL} 巻き取り`, {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '9px',
      fontWeight: '900',
      color: '#dff5ff',
      backgroundColor: 'rgba(7,26,40,0.62)',
      padding: { x: 7, y: 3 },
    }).setOrigin(0, 0.5)

    scene.reelFill = scene.add.graphics()
    scene.reelValText = scene.add.text(W - 38, trackY - 12, '', {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '9px',
      fontWeight: '900',
      color: '#ffffff',
    }).setOrigin(1, 0.5).setVisible(false)

    scene.battlePanel.add([lbl, scene.reelFill, scene.reelValText])
    scene._reel = { x: trackX, y: trackY, w: trackW, h: 10 }
  }

  buildReelCTA(W, H) {
    const scene = this.scene
    const controlsTop = H - MOBILE_FRAME.bottomControlsHeight
    scene.reelCTA = scene.add.container(0, 0).setDepth(92).setVisible(false).setScrollFactor(0)

    const shade = scene.add.graphics()
    shade.fillStyle(0x031d2e, 0.98)
    shade.fillRect(0, controlsTop, W, MOBILE_FRAME.bottomControlsHeight)
    shade.lineStyle(1.5, 0x8edfff, 0.34)
    shade.lineBetween(0, controlsTop, W, controlsTop)

    const cx = W / 2
    const cy = controlsTop + 76
    const dial = scene.add.graphics()
    dial.fillStyle(0x062c44, 1)
    dial.fillCircle(cx + 2, cy + 4, 70)
    dial.lineStyle(8, 0x23b6ef, 0.98)
    dial.beginPath(); dial.arc(cx, cy, 61, Math.PI * 0.60, Math.PI * 1.34, false); dial.strokePath()
    dial.lineStyle(8, 0xff9f22, 0.98)
    dial.beginPath(); dial.arc(cx, cy, 61, Math.PI * 1.66, Math.PI * 0.40, false); dial.strokePath()
    dial.lineStyle(2, 0xffffff, 0.70)
    dial.strokeCircle(cx, cy, 50)
    dial.fillStyle(0x0b4567, 1)
    dial.fillCircle(cx, cy, 45)
    dial.fillStyle(0xffffff, 0.10)
    dial.fillCircle(cx - 12, cy - 13, 13)

    const fish = scene.add.text(cx, cy - 9, '🐟', {
      fontSize: '24px', resolution: TEXT_RES,
    }).setOrigin(0.5)
    const tension = scene.add.text(cx, cy + 20, 'TENSION', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '10px', fontWeight: '900', color: '#ffffff',
      letterSpacing: 1,
    }).setOrigin(0.5)

    const text = scene.add.text(W / 2, controlsTop + 158, 'タイミングよく下へスワイプ', {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '13px',
      fontWeight: '900',
      color: '#ffffff',
      backgroundColor: 'rgba(3,27,42,0.72)',
      padding: { x: 14, y: 6 },
    }).setOrigin(0.5)

    scene.reelCTA.add([shade, dial, fish, tension, text])
    scene.tweens.add({ targets: [fish, tension], y: '+=3', duration: 620, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
  }

  sync(battleState, reel, ebarW) {
    const scene = this.scene
    const st = battleState
    if (!st) return

    const tensionX = 28
    const tensionY = 55
    const tw = ebarW
    scene._battleFishName?.setText?.(`🐟  ${scene.fish?.name ?? 'FISH'}`)
    scene.ebarFill.clear()
    scene.ebarFill.fillStyle(0xdff5ff, 0.28)
    scene.ebarFill.fillRoundedRect(tensionX, tensionY, tw, 14, 7)
    scene.ebarFill.fillStyle(st.escape >= 72 ? 0xff514b : st.escape >= 42 ? 0xffa928 : 0x2da8e6, 1)
    scene.ebarFill.fillRoundedRect(tensionX, tensionY, Math.max(5, tw * (st.escape / 100)), 14, 7)
    scene.ebarFill.fillStyle(0xffffff, 0.32)
    scene.ebarFill.fillRoundedRect(tensionX + 4, tensionY + 3, Math.max(0, tw * (st.escape / 100) - 8), 3, 2)
    scene.ebarFill.lineStyle(1.2, 0xffffff, 0.38)
    scene.ebarFill.strokeRoundedRect(tensionX, tensionY, tw, 14, 7)



    const rw = Math.max(4, reel.w * (st.reel / 100))
    scene.reelFill.clear()
    scene.reelFill.fillStyle(0x071a28, 0.56)
    scene.reelFill.fillRoundedRect(reel.x, reel.y, reel.w, reel.h, 5)
    scene.reelFill.fillStyle(0x58b8df, 1)
    scene.reelFill.fillRoundedRect(reel.x, reel.y, rw, reel.h, 5)
    scene.reelFill.fillStyle(0xffffff, 0.30)
    scene.reelFill.fillRoundedRect(reel.x + 3, reel.y + 2, Math.max(0, rw - 6), 3, 2)

    scene.battlePanel?.setVisible(false)
    const hero = ensureBattleHero(scene)
    hero?.setVisible?.(true)
    scene.battleHeroGlow?.setVisible?.(true)
    const wasRaging = scene.rageTag.visible
    const style = BATTLE_STYLE[scene.fish?.id]
    if (st.isRaging && style?.rage) scene.rageTag.setText(style.rage)
    else if (!st.isRaging) scene.rageTag.setText('暴れてる… 少し待とう')
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

    scene.hitHint = scene.add.text(W / 2, H * 0.39, 'HIT!  タップ！', {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '30px',
      fontWeight: '900',
      color: '#ffd95a',
      stroke: '#073754',
      strokeThickness: 6,
      shadow: SHADOW.soft,
    }).setOrigin(0.5).setDepth(95).setVisible(false).setScrollFactor(0)

    scene._hitHintBaseY = scene.hitHint.y

    const controlsTop = H - MOBILE_FRAME.bottomControlsHeight
    scene.rageTag = scene.add.text(W / 2, controlsTop + 32, '暴れてる… 少し待とう', {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '14px',
      fontWeight: '900',
      color: '#ffffff',
      backgroundColor: 'rgba(255,82,74,0.94)',
      padding: { x: 18, y: 8 },
      stroke: '#7a251f',
      strokeThickness: 1,
    }).setOrigin(0.5).setDepth(93).setVisible(false).setScrollFactor(0)
  }

  destroy() {
    this.scene._timeChipEvent?.remove(false)
    this.scene._timeChipEvent = undefined
    this.scene.hitHint?.destroy()
    this.scene.rageTag?.destroy()
    clearBattleHeroVisual(this.scene)
  }
}
