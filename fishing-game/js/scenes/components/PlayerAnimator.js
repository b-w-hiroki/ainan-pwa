export class PlayerAnimator {
  constructor(scene) {
    this.scene = scene
    this.sprite = null
    this.shadow = null
    this.baseY = 0
  }

  build(W, H) {
    if (!this.scene.textures.exists('player_fishing')) return false
    this._ensureAnimations()

    const x = W * 0.50
    const y = H * 0.875
    const displayH = H * 0.31

    this.baseY = y
    this.shadow = this.scene.add.graphics().setDepth(40)
    this.shadow.fillStyle(0x000000, 0.14)
    this.shadow.fillEllipse(x, y - 5, W * 0.27, 13)

    this.sprite = this.scene.add.sprite(x, y, 'player_fishing', 'player_cast_01')
      .setOrigin(0.5, 1)
      .setDisplaySize(displayH * (512 / 576), displayH)
      .setDepth(42)

    return true
  }

  _ensureAnimations() {
    const anims = this.scene.anims
    const frame = (name) => ({ key: 'player_fishing', frame: name })

    if (!anims.exists('ainan_player_cast')) {
      anims.create({
        key: 'ainan_player_cast',
        frames: [1, 2, 3, 4, 5, 6].map(i => frame(`player_cast_0${i}`)),
        frameRate: 10,
        repeat: 0,
      })
    }

    if (!anims.exists('ainan_player_hit')) {
      anims.create({
        key: 'ainan_player_hit',
        frames: [1, 2].map(i => frame(`player_fight_0${i}`)),
        frameRate: 9,
        repeat: 0,
      })
    }

    if (!anims.exists('ainan_player_fight')) {
      anims.create({
        key: 'ainan_player_fight',
        frames: [3, 4, 5, 4, 6, 4].map(i => frame(`player_fight_0${i}`)),
        frameRate: 7,
        repeat: -1,
      })
    }

    if (!anims.exists('ainan_player_catch')) {
      anims.create({
        key: 'ainan_player_catch',
        frames: [1, 2, 3, 4, 5, 6].map(i => frame(`player_catch_0${i}`)),
        frameRate: 7,
        repeat: 0,
      })
    }
  }

  showIdle() {
    if (!this.sprite) return
    this.sprite.stop().setFrame('player_cast_01').setVisible(true)
    this.sprite.anims.timeScale = 1
  }

  playCast() {
    if (!this.sprite) return
    this.sprite.anims.timeScale = 1
    this.sprite.play('ainan_player_cast', true)
  }

  showWait() {
    if (!this.sprite) return
    this.sprite.stop().setFrame('player_fight_01').setVisible(true)
    this.sprite.anims.timeScale = 1
  }

  playHit() {
    if (!this.sprite) return
    this.sprite.anims.timeScale = 1
    this.sprite.play('ainan_player_hit', true)
  }

  playFight() {
    if (!this.sprite) return
    this.sprite.play('ainan_player_fight', true)
  }

  setFightIntensity(mult = 1) {
    if (!this.sprite) return
    this.sprite.anims.timeScale = mult
  }

  playCatch(onComplete) {
    if (!this.sprite) {
      onComplete?.()
      return
    }
    this.sprite.anims.timeScale = 1
    this.sprite.play('ainan_player_catch', true)
    this.sprite.once('animationcomplete-ainan_player_catch', () => {
      this.sprite?.setFrame('player_catch_06')
      onComplete?.()
    })
  }

  showEscaped() {
    if (!this.sprite) return
    this.sprite.stop().setFrame('player_fight_06')
    this.sprite.anims.timeScale = 1
  }

  destroy() {
    this.sprite?.destroy()
    this.shadow?.destroy()
    this.sprite = null
    this.shadow = null
  }
}
