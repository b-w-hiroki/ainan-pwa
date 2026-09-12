import { FONT, SHADOW, UI_COLORS } from '../../config/fontStyles.js'

const TEXT_RES = window.devicePixelRatio ?? 1
const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

export class RetrieveUI {
  constructor(scene) {
    this.scene = scene
    this.container = null
    this.appealFill = null
    this.hintText = null
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
      .on('pointerout', () => this._releaseSlow())

    const hintBg = this.scene.add.graphics().setScrollFactor(0)
    hintBg.fillStyle(0x173248, 0.88)
    hintBg.fillRoundedRect(24, H - 38, W - 48, 28, 12)
    this.hintText = this.scene.add.text(W / 2, H - 24, '少しずつ巻いて、魚の反応を見よう', {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: '#ffffff',
    }).setOrigin(0.5).setScrollFactor(0)

    this.container.add([
      panel, title, this.appealFill,
      waitBtn.container, twitchBtn.container, slowBtn.container,
      hintBg, this.hintText,
    ])
    this.syncAppeal(0.35)
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
    const fw = Math.max(5, w * v)
    const color = v < 0.32 ? 0x58b8df : v < 0.72 ? 0x71d6a2 : v < 0.88 ? 0xffd95a : 0xff765a
    this.appealFill.fillStyle(color, 1)
    this.appealFill.fillRoundedRect(x, y, fw, h, h / 2)
    this.appealFill.fillStyle(0xffffff, 0.38)
    this.appealFill.fillRoundedRect(x + 4, y + 3, Math.max(0, fw - 8), 4, 2)
    this.appealFill.lineStyle(1.6, 0xffffff, 0.72)
    this.appealFill.strokeRoundedRect(x, y, w, h, h / 2)
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
