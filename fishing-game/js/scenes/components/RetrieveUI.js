import { FONT, SHADOW, UI_COLORS } from '../../config/fontStyles.js'
import { MOBILE_FRAME } from '../../config/mobileFrame.js'

const TEXT_RES = window.devicePixelRatio ?? 1
const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

export class RetrieveUI {
  constructor(scene) {
    this.scene = scene
    this.container = null
    this.appealFill = null
    this.hintText = null
    this.senseFill = null
    this.senseText = null
    this._slowPressed = false
  }

  build(W, H) {
    this.container = this.scene.add.container(0, 0).setDepth(82).setScrollFactor(0).setVisible(false)

    const controlsTop = H - MOBILE_FRAME.bottomControlsHeight
    const panelY = controlsTop + 4
    const panelH = 52
    const panel = this.scene.add.graphics()
    panel.fillStyle(0x173248, 0.78)
    panel.fillRoundedRect(18, panelY, W - 36, panelH, 16)
    panel.lineStyle(1.8, 0x9bcfe5, 0.82)
    panel.strokeRoundedRect(18, panelY, W - 36, panelH, 16)
    panel.fillStyle(0xf8fdff, 0.09)
    panel.fillRoundedRect(28, panelY + 7, W - 56, 12, 6)
    panel.setScrollFactor(0)

    const title = this.scene.add.text(32, panelY + 16, 'ルアー', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0, 0.5).setScrollFactor(0)

    this.appealFill = this.scene.add.graphics().setScrollFactor(0)
    this.appealTrack = { x: 32, y: panelY + 30, w: W - 158, h: 11 }

    const senseX = W - 75
    const senseY = panelY + 27
    const senseBg = this.scene.add.graphics().setScrollFactor(0)
    senseBg.fillStyle(0xf8fdff, 0.96)
    senseBg.lineStyle(1.6, 0x9bcfe5, 0.88)
    senseBg.fillRoundedRect(senseX - 47, senseY - 16, 94, 32, 12)
    senseBg.strokeRoundedRect(senseX - 47, senseY - 16, 94, 32, 12)

    this.senseFill = this.scene.add.graphics().setScrollFactor(0)
    this.senseText = this.scene.add.text(senseX + 8, senseY, 'まだ遠い', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.ink,
    }).setOrigin(0.5).setScrollFactor(0)

    const btnY = H - 82
    const gap = 7
    const sideW = 98
    const mainW = W - 32 - sideW * 2 - gap * 2
    const waitBtn = this._button(16 + sideW / 2, btnY, sideW, 62, '待つ', '動かさず見る', 0x2f9ed4, () => {
      this.scene._setRetrieveIdle?.()
    })
    const twitchBtn = this._button(W / 2, btnY, mainW, 68, 'ちょい巻き', '少しだけ引く', 0xffd95a, () => {
      this.scene._twitchRetrieve?.()
    }, true)
    const slowBtn = this._button(W - 16 - sideW / 2, btnY, sideW, 62, 'ゆっくり', '長押し', 0x2f9ed4, null)

    slowBtn.hit
      .on('pointerdown', () => {
        this._slowPressed = true
        this.scene._startSlowRetrieve?.()
      })
      .on('pointerup', () => this._releaseSlow())
      .on('pointerupoutside', () => this._releaseSlow())
      .on('pointerout', () => this._releaseSlow())

    const hintBg = this.scene.add.graphics().setScrollFactor(0)
    hintBg.fillStyle(0x173248, 0.84)
    hintBg.fillRoundedRect(32, H - 38, W - 64, 24, 10)
    this.hintText = this.scene.add.text(W / 2, H - 26, '魚影の反応を見よう', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5).setScrollFactor(0)

    this.container.add([
      panel, title, this.appealFill,
      senseBg, this.senseFill, this.senseText,
      waitBtn.container, twitchBtn.container, slowBtn.container,
      hintBg, this.hintText,
    ])
    this.syncAppeal(0.35)
    this.syncFishSense('cruise')
  }

  _releaseSlow() {
    if (!this._slowPressed) return
    this._slowPressed = false
    this.scene._stopSlowRetrieve?.()
  }

  _button(x, y, w, h, label, sub, fill, onTap, primary = false) {
    const c = this.scene.add.container(x, y).setScrollFactor(0)
    const bg = this.scene.add.graphics().setScrollFactor(0)
    bg.fillStyle(0x173248, 0.18)
    bg.fillRoundedRect(-w / 2 + 2, -h / 2 + 3, w, h, 16)
    bg.fillStyle(fill, 1)
    bg.lineStyle(primary ? 2.5 : 1.8, primary ? 0xc98716 : 0x173248, 0.82)
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 16)
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 16)
    bg.fillStyle(0xffffff, 0.22)
    bg.fillRoundedRect(-w / 2 + 9, -h / 2 + 7, w - 18, 7, 4)

    const t = this.scene.add.text(0, -7, label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: primary ? '19px' : '15px', fontWeight: '900',
      color: UI_COLORS.ink, shadow: SHADOW.subtle,
    }).setOrigin(0.5).setScrollFactor(0)
    const s = this.scene.add.text(0, primary ? 14 : 12, sub, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: UI_COLORS.inkSoft,
    }).setOrigin(0.5).setScrollFactor(0)

    const hit = this.scene.add.rectangle(0, 0, w, h, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
    if (onTap) hit.on('pointerdown', onTap)
    c.add([bg, t, s, hit])
    return { container: c, hit }
  }

  syncAppeal(value) {
    if (!this.appealFill || !this.appealTrack) return
    const v = clamp(value, 0, 1)
    const { x, y, w, h } = this.appealTrack
    this.appealFill.clear()
    this.appealFill.fillStyle(0xe8f4f8, 1)
    this.appealFill.fillRoundedRect(x, y, w, h, h / 2)

    this.appealFill.fillStyle(0x71d6a2, 0.24)
    this.appealFill.fillRoundedRect(x + w * 0.34, y + 1.5, w * 0.34, h - 3, (h - 3) / 2)

    const fw = Math.max(4, w * v)
    const color = v < 0.32 ? 0x58b8df : v < 0.72 ? 0x71d6a2 : v < 0.88 ? 0xffd95a : 0xff765a
    this.appealFill.fillStyle(color, 1)
    this.appealFill.fillRoundedRect(x, y, fw, h, h / 2)
    this.appealFill.fillStyle(0xffffff, 0.34)
    this.appealFill.fillRoundedRect(x + 3, y + 2, Math.max(0, fw - 6), 3, 2)
    this.appealFill.lineStyle(1.4, 0xffffff, 0.68)
    this.appealFill.strokeRoundedRect(x, y, w, h, h / 2)

    const markerX = x + w * v
    this.appealFill.lineStyle(2, 0xffffff, 0.96)
    this.appealFill.lineBetween(markerX, y - 2, markerX, y + h + 2)
  }

  syncFishSense(state = 'cruise', spooked = false) {
    if (!this.senseFill || !this.senseText) return
    const states = {
      cruise: { level: 0, label: 'まだ遠い' },
      noticed: { level: 1, label: '気づいた' },
      follow: { level: 2, label: '追ってる' },
      inspect: { level: 3, label: 'すぐ近く' },
      biteReady: { level: 4, label: '食いそう！' },
    }
    const data = states[state] ?? states.cruise
    const level = spooked ? 1 : data.level
    const color = spooked ? 0xff765a : level >= 4 ? 0xffd95a : level >= 2 ? 0x71d6a2 : 0x58b8df
    const panelY = this.scene.scale.height - MOBILE_FRAME.bottomControlsHeight + 4
    const cx = this.scene.scale.width - 112
    const cy = panelY + 27

    this.senseFill.clear()
    this.senseFill.fillStyle(color, level > 0 ? 1 : 0.42)
    this.senseFill.fillCircle(cx, cy, 5)
    if (level >= 3) {
      this.senseFill.lineStyle(2, color, 0.42)
      this.senseFill.strokeCircle(cx, cy, 9)
    }
    this.senseText.setText(spooked ? '警戒した' : data.label)
  }

  setHint(text) {
    this.hintText?.setText(text)
  }

  show() {
    this.container?.setVisible(true)
  }

  hide() {
    this._releaseSlow()
    this.container?.setVisible(false)
  }

  destroy() {
    this._releaseSlow()
    this.container?.destroy(true)
    this.container = null
  }
}
