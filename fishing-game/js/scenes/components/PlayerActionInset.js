import { FONT } from '../../config/fontStyles.js'

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
    // 遠投時だけ出す補助表示。水面を隠さないよう左下・小さめにする。
    const x = 52
    const y = H - 224
    this.container = this.scene.add.container(x, y).setDepth(78).setScrollFactor(0).setVisible(false)

    const halo = this.scene.add.graphics().setScrollFactor(0)
    halo.fillStyle(0x173248, 0.16)
    halo.fillCircle(0, 3, 41)
    halo.fillStyle(0xf8fdff, 0.90)
    halo.lineStyle(1.8, 0x9bcfe5, 0.92)
    halo.fillCircle(0, 0, 37)
    halo.strokeCircle(0, 0, 37)
    halo.fillStyle(0xdff5ff, 0.40)
    halo.fillCircle(-8, -8, 21)

    const texture = this.scene.textures.exists('ch_player_fight_anim') ? 'ch_player_fight_anim' : 'ch_player_cast_anim'
    this.sprite = this.scene.add.sprite(0, 29, texture, 2)
      .setOrigin(0.5, 1)
      .setDisplaySize(62, 70)
      .setScrollFactor(0)

    const chip = this.scene.add.graphics().setScrollFactor(0)
    chip.fillStyle(0x173248, 0.88)
    chip.lineStyle(1.2, 0xffffff, 0.50)
    chip.fillRoundedRect(29, -14, 82, 28, 11)
    chip.strokeRoundedRect(29, -14, 82, 28, 11)

    this.label = this.scene.add.text(70, 0, '探る…', {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '10px',
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
      idle: '様子を見る',
      twitch: 'ちょい巻き',
      slowReel: 'ゆっくり',
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
      this.scene.tweens.add({ targets: this.container, alpha: 1, duration: 130, ease: 'Sine.easeOut' })
    } else {
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0,
        duration: 100,
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
