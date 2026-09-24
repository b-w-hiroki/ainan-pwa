import { FONT, SHADOW, UI_COLORS } from '../../config/fontStyles.js'
import { MOBILE_FRAME } from '../../config/mobileFrame.js'
import { ASSETS } from '../../config/assetManifest.js'

const TEXT_RES = window.devicePixelRatio ?? 1
const FIELD = ASSETS.fishingField

export class RetrieveUI {
  constructor(scene) {
    this.scene = scene
    this.container = null
    this.hintText = null
    this.senseFill = null
    this.senseText = null
    this._slowPressed = false
  }

  build(W, H) {
    this.container = this.scene.add.container(0, 0).setDepth(82).setScrollFactor(0).setVisible(false)

    const controlsTop = H - MOBILE_FRAME.bottomControlsHeight
    const statusY = controlsTop + 22

    const dockBg = this.scene.add.graphics().setScrollFactor(0)
    dockBg.fillStyle(0x073754, 0.97)
    dockBg.fillRect(0, controlsTop, W, MOBILE_FRAME.bottomControlsHeight)
    dockBg.lineStyle(2, 0x8edfff, 0.38)
    dockBg.lineBetween(0, controlsTop, W, controlsTop)

    // One thin status row only. The fish itself is the primary feedback UI.
    const statusBg = this.scene.add.graphics().setScrollFactor(0)
    statusBg.fillStyle(0x071a28, 0.78)
    statusBg.fillRoundedRect(16, controlsTop + 5, W - 32, 36, 14)
    statusBg.lineStyle(1.4, 0x8edfff, 0.42)
    statusBg.strokeRoundedRect(16, controlsTop + 5, W - 32, 36, 14)

    this.hintText = this.scene.add.text(30, statusY + 1, '魚影の向きと動きを見る', {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '10px',
      fontWeight: '900',
      color: '#ffffff',
      wordWrap: { width: 222 },
    }).setOrigin(0, 0.5).setScrollFactor(0)

    const senseX = W - 72
    const senseBg = this.scene.add.graphics().setScrollFactor(0)
    senseBg.fillStyle(0xffffff, 0.10)
    senseBg.fillRoundedRect(senseX - 42, statusY - 13, 84, 26, 11)
    this.senseFill = this.scene.add.graphics().setScrollFactor(0)
    this.senseText = this.scene.add.text(senseX + 5, statusY, 'まだ遠い', {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '9px',
      fontWeight: '900',
      color: '#dff5ff',
    }).setOrigin(0.5).setScrollFactor(0)

    const btnY = controlsTop + 104
    const waitBtn = this._button(W * 0.22, btnY, 86, 86, 'Ⅱ', '待つ', '', 0x248cd6, () => {
      this.scene._setRetrieveIdle?.()
    })
    const twitchBtn = this._button(W * 0.50, btnY, 94, 94, '↻', 'ちょい巻き', '', 0x2ebd67, () => {
      this.scene._twitchRetrieve?.()
    }, true)
    const slowBtn = this._button(W * 0.78, btnY, 86, 86, '≫', 'ゆっくり巻く', '', 0xf2a01f, null)

    slowBtn.hit
      .on('pointerdown', () => {
        this._slowPressed = true
        this.scene._startSlowRetrieve?.()
      })
      .on('pointerup', () => this._releaseSlow())
      .on('pointerupoutside', () => this._releaseSlow())
      .on('pointerout', () => this._releaseSlow())

    this.container.add([
      dockBg, statusBg, this.hintText,
      senseBg, this.senseFill, this.senseText,
      waitBtn.container, twitchBtn.container, slowBtn.container,
    ])
    this.syncFishSense('cruise')
  }

  _releaseSlow() {
    if (!this._slowPressed) return
    this._slowPressed = false
    this.scene._stopSlowRetrieve?.()
  }

  _button(x, y, w, h, mark, label, sub, fill, onTap, primary = false, asset = null) {
    const c = this.scene.add.container(x, y).setScrollFactor(0)
    const radius = Math.min(w, h) / 2
    const bg = this.scene.add.graphics().setScrollFactor(0)
    bg.fillStyle(0x031b2a, 0.38)
    bg.fillCircle(2, 4, radius + 2)
    bg.fillStyle(fill, 1)
    bg.lineStyle(primary ? 4 : 3, 0xffffff, 0.94)
    bg.fillCircle(0, 0, radius)
    bg.strokeCircle(0, 0, radius)
    bg.fillStyle(0xffffff, 0.20)
    bg.fillCircle(-radius * 0.25, -radius * 0.28, radius * 0.28)
    const assetBg = null

    const icon = this.scene.add.text(0, -19, mark, {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: primary ? '30px' : '27px',
      fontWeight: '900',
      color: primary ? UI_COLORS.ink : '#ffffff',
      shadow: primary ? SHADOW.subtle : undefined,
    }).setOrigin(0.5).setScrollFactor(0)

    const t = this.scene.add.text(0, radius + 17, label, {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: primary ? '13px' : '12px',
      fontWeight: '900',
      color: primary ? UI_COLORS.ink : '#ffffff',
      shadow: primary ? SHADOW.subtle : undefined,
    }).setOrigin(0.5).setScrollFactor(0)

    const s = this.scene.add.text(0, radius + 31, sub, {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '8px',
      fontWeight: '900',
      color: primary ? UI_COLORS.inkSoft : '#dff5ff',
    }).setOrigin(0.5).setScrollFactor(0)

    const hit = this.scene.add.circle(0, 0, radius + 4, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
    if (onTap) hit.on('pointerdown', onTap)
    c.add([bg, ...(assetBg ? [assetBg] : []), icon, t, s, hit])
    return { container: c, hit }
  }

  // Kept for compatibility with retrieve logic. The blueprint intentionally
  // removes the abstract appeal meter from the normal player-facing HUD.
  syncAppeal(_value) {}

  syncFishSense(state = 'cruise', spooked = false) {
    if (!this.senseFill || !this.senseText) return
    const states = {
      cruise: { level: 0, label: 'まだ遠い' },
      noticed: { level: 1, label: '気づいた' },
      follow: { level: 2, label: '追ってる' },
      inspect: { level: 3, label: 'すぐ近く' },
      biteReady: { level: 4, label: '食いそう' },
    }
    const data = states[state] ?? states.cruise
    const level = spooked ? 1 : data.level
    const color = spooked ? 0xff765a : level >= 4 ? 0xffd95a : level >= 2 ? 0x71d6a2 : 0x58b8df
    const controlsTop = this.scene.scale.height - MOBILE_FRAME.bottomControlsHeight
    const cx = this.scene.scale.width - 108
    const cy = controlsTop + 22

    this.senseFill.clear()
    this.senseFill.fillStyle(color, level > 0 ? 1 : 0.48)
    this.senseFill.fillCircle(cx, cy, 4.5)
    if (level >= 3) {
      this.senseFill.lineStyle(1.5, color, 0.48)
      this.senseFill.strokeCircle(cx, cy, 8)
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
