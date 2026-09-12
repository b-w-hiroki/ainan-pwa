import { FONT, UI_COLORS } from '../../config/fontStyles.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export class PlayerActionInset {
  constructor(scene) {
    this.scene = scene
    this.container = null
    this.sprite = null
    this.label = null
    this._visible = false
  }

  build(W, H) {
    const x = 62
    const y = H - 262
    this.container = this.scene.add.container(x, y).setDepth(78).setScrollFactor(0).setVisible(false)

    const halo = this.scene.add.graphics().setScrollFactor(0)
    halo.fillStyle(0x173248, 0.18)
    halo.fillCircle(0, 3, 49)
    halo.fillStyle(0xf8fdff, 0.92)
    halo.lineStyle(2, 0x9bcfe5, 0.95)
    halo.fillCircle(0, 0, 45)
    halo.strokeCircle(0, 0, 45)
    halo.fillStyle(0xdff5ff, 0.45)
    halo.fillCircle(-10, -10, 26)

    const texture = this.scene.textures.exists('ch_player_fight_anim') ? 'ch_player_fight_anim' : 'ch_player_cast_anim'
    this.sprite = this.scene.add.sprite(0, 34, texture, 2)
      .setOrigin(0.5, 1)
      .setDisplaySize(76, 86)
      .setScrollFactor(0)

    const chip = this.scene.add.graphics().setScrollFactor(0)
    chip.fillStyle(0x173248, 0.90)
    chip.lineStyle(1.5, 0xffffff, 0.55)
    chip.fillRoundedRect(38, -17, 92, 34, 13)
    chip.strokeRoundedRect(38, -17, 92, 34, 13)

    this.label = this.scene.add.text(84, 0, '探る…', {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '11px',
      fontWeight: '900',
      color: '#ffffff',
    }).setOrigin(0.5).setScrollFactor(0)

    this.container.add([halo, this.sprite, chip, this.label])
    this.container.setAlpha(0)
  }

  syncFromPlayer(playerSprite, action = 'idle') {
    if (!this.container || !this.sprite || !playerSprite?.texture) return
    const textureKey = playerSprite.texture.key
    if (this.scene.textures.exists(textureKey)) {
      this.sprite.setTexture(textureKey)
      const frameName = playerSprite.frame?.name
      if (frameName != null) this.sprite.setFrame(frameName)
    }

    const labels = {
      idle: '様子を見る…',
      twitch: 'ちょい巻き！',
      slowReel: 'ゆっくり巻く',
      follow: 'きてる…！',
      biteReady: '食うかも！',
    }
    this.label?.setText(labels[action] ?? labels.idle)
  }

  setVisible(visible) {
    if (!this.container || this._visible === visible) return
    this._visible = visible
    if (visible) {
      this.container.setVisible(true)
      this.scene.tweens.add({ targets: this.container, alpha: 1, duration: 150, ease: 'Sine.easeOut' })
    } else {
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0,
        duration: 120,
        ease: 'Sine.easeIn',
        onComplete: () => {
          if (!this._visible) this.container?.setVisible(false)
        },
      })
    }
  }

  destroy() {
    this.container?.destroy(true)
    this.container = null
    this.sprite = null
    this.label = null
  }
}
