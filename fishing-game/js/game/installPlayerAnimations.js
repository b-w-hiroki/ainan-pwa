import { BackgroundManager } from '../scenes/components/BackgroundManager.js'

const BASE = import.meta.env.BASE_URL ?? '/'
const assetPath = path => `${BASE}${path.replace(/^\/+/, '')}`

const SHEETS = {
  cast: {
    key: 'ch_player_cast_anim',
    path: assetPath('fishing-game/assets/characters/player_cast_anim.webp'),
  },
  fight: {
    key: 'ch_player_fight_anim',
    path: assetPath('fishing-game/assets/characters/player_fight_anim.webp'),
  },
  catch: {
    key: 'ch_player_catch_anim',
    path: assetPath('fishing-game/assets/characters/player_catch_anim.webp'),
  },
}

const FRAME_W = 64
const FRAME_H = 72

const ANIM = {
  castCharge: 'ainan-player-cast-charge',
  castRelease: 'ainan-player-cast-release',
  fightHit: 'ainan-player-fight-hit',
  fightLoop: 'ainan-player-fight-loop',
  catchSuccess: 'ainan-player-catch-success',
}

const setSheetFrame = (scene, sheet, frame = 0) => {
  const sprite = scene._playerSprite
  if (!sprite || !scene.textures.exists(SHEETS[sheet].key)) return
  sprite.stop()
  sprite.setTexture(SHEETS[sheet].key, frame)
  sprite.setVisible(true)
  sprite.setAlpha(1)
}

const createAnimations = scene => {
  if (!scene.anims.exists(ANIM.castCharge)) {
    scene.anims.create({
      key: ANIM.castCharge,
      frames: scene.anims.generateFrameNumbers(SHEETS.cast.key, { frames: [0, 1, 2, 3] }),
      frameRate: 7,
      repeat: 0,
    })
  }
  if (!scene.anims.exists(ANIM.castRelease)) {
    scene.anims.create({
      key: ANIM.castRelease,
      frames: scene.anims.generateFrameNumbers(SHEETS.cast.key, { frames: [4, 5] }),
      frameRate: 8,
      repeat: 0,
    })
  }
  if (!scene.anims.exists(ANIM.fightHit)) {
    scene.anims.create({
      key: ANIM.fightHit,
      frames: scene.anims.generateFrameNumbers(SHEETS.fight.key, { frames: [0, 1, 2] }),
      frameRate: 8,
      repeat: 0,
    })
  }
  if (!scene.anims.exists(ANIM.fightLoop)) {
    scene.anims.create({
      key: ANIM.fightLoop,
      frames: scene.anims.generateFrameNumbers(SHEETS.fight.key, { frames: [2, 3, 4, 3, 5, 3] }),
      frameRate: 6,
      repeat: -1,
    })
  }
  if (!scene.anims.exists(ANIM.catchSuccess)) {
    scene.anims.create({
      key: ANIM.catchSuccess,
      frames: scene.anims.generateFrameNumbers(SHEETS.catch.key, { frames: [0, 1, 2, 3, 4, 5] }),
      frameRate: 6,
      repeat: 0,
    })
  }
}

/**
 * GameScene に生成画像ベースの釣り人アニメーションを後付けする。
 * 既存の釣りロジックは触らず、描画とフェーズ遷移だけをラップする。
 */
export function installPlayerAnimations(GameScene) {
  if (GameScene.prototype.__ainanPlayerAnimationInstalled) return
  GameScene.prototype.__ainanPlayerAnimationInstalled = true

  const originalPreload = GameScene.prototype.preload
  GameScene.prototype.preload = function (...args) {
    originalPreload?.apply(this, args)
    Object.values(SHEETS).forEach(sheet => {
      if (!this.textures.exists(sheet.key)) {
        this.load.spritesheet(sheet.key, sheet.path, {
          frameWidth: FRAME_W,
          frameHeight: FRAME_H,
        })
      }
    })
  }

  const originalBuildPlayer = BackgroundManager.prototype.buildPlayer
  BackgroundManager.prototype.buildPlayer = function (W, H) {
    const scene = this.scene
    if (!scene.textures.exists(SHEETS.cast.key)) {
      return originalBuildPlayer.call(this, W, H)
    }

    const cx = W * 0.50
    const by = H * 0.842
    const displayH = Math.min(H * 0.225, 190)
    const displayW = displayH * (FRAME_W / FRAME_H)

    const shadow = scene.add.graphics().setDepth(40)
    shadow.fillStyle(0x102b42, 0.16)
    shadow.fillEllipse(cx, by + 3, displayW * 0.48, 13)

    const sprite = scene.add.sprite(cx, by, SHEETS.cast.key, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(displayW, displayH)
      .setDepth(41)

    scene._playerSprite = sprite
    scene._playerShadow = shadow
    scene._playerBaseY = by
    scene._playerDisplayH = displayH
    createAnimations(scene)

    // 既存の糸・軌道計算は固定アンカーを前提としているため、
    // 立ち姿の竿先付近を自然な基準点として使う。
    return {
      anchorX: cx + displayW * 0.30,
      anchorY: by - displayH * 0.78,
      castRangePx: H * 0.65,
      shaftDisplayPx: Math.min(H * 0.17, 120),
    }
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    const result = originalEnterCast.apply(this, args)
    this._playerCelebrating = false
    if (this._playerSprite) {
      this._playerSprite.setY(this._playerBaseY).setDepth(41).setScale(1)
      setSheetFrame(this, 'cast', 0)
    }
    return result
  }

  const originalOnDown = GameScene.prototype._onDown
  GameScene.prototype._onDown = function (pointer) {
    if (this._playerCelebrating) return
    const wasCast = this.phase === 'cast' && !this.isCharging
    const result = originalOnDown.call(this, pointer)
    if (wasCast && this.phase === 'cast' && this.isCharging && this._playerSprite) {
      this._playerSprite.play(ANIM.castCharge, true)
    }
    return result
  }

  const originalFireCast = GameScene.prototype._fireCast
  GameScene.prototype._fireCast = function (...args) {
    if (this._playerSprite) {
      this._playerSprite.setTexture(SHEETS.cast.key, 4).play(ANIM.castRelease, true)
    }
    return originalFireCast.apply(this, args)
  }

  const originalEnterWait = GameScene.prototype._enterWait
  GameScene.prototype._enterWait = function (...args) {
    const result = originalEnterWait.apply(this, args)
    this.time.delayedCall(180, () => {
      if (this.phase === 'wait') setSheetFrame(this, 'cast', 0)
    })
    return result
  }

  const originalOpenHitWindow = GameScene.prototype._openHitWindow
  GameScene.prototype._openHitWindow = function (...args) {
    const result = originalOpenHitWindow.apply(this, args)
    if (this._playerSprite) setSheetFrame(this, 'fight', 0)
    return result
  }

  const originalEnterBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    const result = originalEnterBattle.apply(this, args)
    if (this._playerSprite) {
      this._playerSprite.setTexture(SHEETS.fight.key, 0).play(ANIM.fightHit, true)
      this.time.delayedCall(360, () => {
        if (this.phase === 'battle' && this._playerSprite) {
          this._playerSprite.play(ANIM.fightLoop, true)
        }
      })
    }
    return result
  }

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (outcome) {
    const result = originalFinishBattle.call(this, outcome)

    if (!this._playerSprite) return result

    if (outcome !== 'caught') {
      setSheetFrame(this, 'cast', 0)
      return result
    }

    // リザルトカードを一瞬遅らせ、釣り上げ → 喜び → 正面決めポーズを先に見せる。
    this._playerCelebrating = true
    this.resultOverlay?.setVisible(false)
    this._playerSprite
      .setTexture(SHEETS.catch.key, 0)
      .setDepth(70)
      .play(ANIM.catchSuccess, true)

    this.tweens.add({
      targets: this._playerSprite,
      y: this._playerBaseY - 5,
      duration: 220,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
    })

    this.time.delayedCall(1040, () => {
      if (this.phase !== 'result') return
      this._playerCelebrating = false
      this._playerSprite?.setY(this._playerBaseY).setDepth(58)
      this.resultOverlay?.setVisible(true)
    })

    return result
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    this._playerSprite?.destroy()
    this._playerSprite = null
    this._playerShadow?.destroy()
    this._playerShadow = null
    return originalCleanup.apply(this, args)
  }
}
