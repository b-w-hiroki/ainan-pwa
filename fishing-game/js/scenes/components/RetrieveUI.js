import { FONT, SHADOW, UI_COLORS } from '../../config/fontStyles.js'

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

    const panelY = H - 198
    const panel = this.scene.add.graphics()
    panel.fillStyle(0x173248, 0.84)
    panel.fillRoundedRect(18, panelY, W - 36, 66, 18)
    panel.lineStyle(2, 0x9bcfe5, 0.88)
    panel.strokeRoundedRect(18, panelY, W - 36, 66, 18)
    panel.fillStyle(0xf8fdff, 0.10)
    panel.fillRoundedRect(28, panelY + 8, W - 56, 16, 8)
    panel.setScrollFactor(0)

    const title = this.scene.add.text(34, panelY + 18, 'ルアーのアピール', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0, 0.5).setScrollFactor(0)

    this.appealFill = this.scene.add.graphics().setScrollFactor(0)
    this.appealTrack = { x: 34, y: panelY + 37, w: W - 68, h: 16 }

    const senseX = W - 56
    const senseY = H - 274
    const senseBg = this.scene.add.graphics().setScrollFactor(0)
    senseBg.fillStyle(0x173248, 0.82)
    senseBg.lineStyle(2, 0x9bcfe5, 0.88)
    senseBg.fillCircle(senseX, senseY, 38)
    senseBg.strokeCircle(senseX, senseY, 38)
    senseBg.fillStyle(0xf8fdff, 0.10)
    senseBg.fillCircle(senseX - 9, senseY - 9, 19)

    this.senseFill = this.scene.add.graphics().setScrollFactor(0)
    const senseTitle = this.scene.add.text(senseX, senseY - 3, '気配', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5).setScrollFactor(0)
    this.senseText = this.scene.add.text(senseX, senseY + 48, 'まだ遠い', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: '#ffffff',
      backgroundColor: 'rgba(23,50,72,0.82)', padding: { x: 7, y: 4 },
    }).setOrigin(0.5).setScrollFactor(0)

    const btnY = H - 94
    const gap = 8
    const sideW = 104
    const mainW = W - 32 - sideW * 2 - gap * 2
    const waitBtn = this._button(16 + sideW / 2, btnY, sideW, 78, '待つ', '動かさず見る', 0x2f9ed4, () => {
      this.scene._setRetrieveIdle?.()
    })
    const twitchBtn = this._button(W / 2, btnY, mainW, 86, 'ちょい巻き', '少しだけ引く', 0xffd95a, () => {
      this.scene._twitchRetrieve?.()
    }, true)
    const slowBtn = this._button(W - 16 - sideW / 2, btnY, sideW, 78, 'ゆっくり', '長押し', 0x2f9ed4, null)

    slowBtn.hit
      .on('pointerdown', () => {
        this._slowPressed = true
        this.scene._startSlowRetrieve?.()
      })
      .on('pointerup', () => this._releaseSlow())
      .on('pointerupoutside', () => this._releaseSlow())
      .on('pointerout', () => this._releaseSlow())

    const hintBg = this.scene.add.graphics().setScrollFactor(0)
    hintBg.fillStyle(0x173248, 0.88)
    hintBg.fillRoundedRect(24, H - 38, W - 48, 28, 12)
    this.hintText = this.scene.add.text(W / 2, H - 24, '少しずつ巻いて、魚の反応を見よう', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5).setScrollFactor(0)

    this.container.add([
      panel, title, this.appealFill,
      senseBg, this.senseFill, senseTitle, this.senseText,
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
    bg.fillStyle(0x173248, 0.20)
    bg.fillRoundedRect(-w / 2 + 2, -h / 2 + 4, w, h, 18)
    bg.fillStyle(fill, 1)
    bg.lineStyle(primary ? 3 : 2, primary ? 0xc98716 : 0x173248, 0.84)
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18)
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18)
    bg.fillStyle(0xffffff, 0.24)
    bg.fillRoundedRect(-w / 2 + 10, -h / 2 + 8, w - 20, 9, 5)

    const t = this.scene.add.text(0, -9, label, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: primary ? '22px' : '17px', fontWeight: '900',
      color: UI_COLORS.ink, shadow: SHADOW.subtle,
    }).setOrigin(0.5).setScrollFactor(0)
    const s = this.scene.add.text(0, primary ? 18 : 15, sub, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.inkSoft,
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

    // GOOD帯を薄く常時表示し、今どこを狙うかを一目で分かるようにする。
    this.appealFill.fillStyle(0x71d6a2, 0.24)
    this.appealFill.fillRoundedRect(x + w * 0.34, y + 2, w * 0.34, h - 4, (h - 4) / 2)

    const fw = Math.max(5, w * v)
    const color = v < 0.32 ? 0x58b8df : v < 0.72 ? 0x71d6a2 : v < 0.88 ? 0xffd95a : 0xff765a
    this.appealFill.fillStyle(color, 1)
    this.appealFill.fillRoundedRect(x, y, fw, h, h / 2)
    this.appealFill.fillStyle(0xffffff, 0.38)
    this.appealFill.fillRoundedRect(x + 4, y + 3, Math.max(0, fw - 8), 4, 2)
    this.appealFill.lineStyle(1.6, 0xffffff, 0.72)
    this.appealFill.strokeRoundedRect(x, y, w, h, h / 2)

    const markerX = x + w * v
    this.appealFill.lineStyle(3, 0xffffff, 0.96)
    this.appealFill.lineBetween(markerX, y - 3, markerX, y + h + 3)
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
    const cx = this.scene.scale.width - 56
    const cy = this.scene.scale.height - 274

    this.senseFill.clear()
    this.senseFill.lineStyle(5, 0xffffff, 0.18)
    this.senseFill.strokeCircle(cx, cy, 29)
    if (level > 0) {
      this.senseFill.lineStyle(6, color, 0.96)
      this.senseFill.beginPath()
      this.senseFill.arc(cx, cy, 29, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (level / 4), false)
      this.senseFill.strokePath()
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
