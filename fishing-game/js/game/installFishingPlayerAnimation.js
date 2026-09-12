import { ASSETS } from '../config/assetManifest.js'
import GameScene from '../scenes/GameScene.js'
import { BackgroundManager } from '../scenes/components/BackgroundManager.js'
import { PlayerAnimator } from '../scenes/components/PlayerAnimator.js'

let installed = false

export function installFishingPlayerAnimation() {
  if (installed) return
  installed = true

  // Keep the existing BackgroundManager anchor calculations, but hide its legacy
  // static player/rod when the animation atlas is available. Only objects created
  // by buildPlayer itself are affected, so the rest of the scene/UI is untouched.
  const originalBuildPlayer = BackgroundManager.prototype.buildPlayer
  BackgroundManager.prototype.buildPlayer = function patchedBuildPlayer(W, H) {
    const before = this.scene.children.list.length
    const anchor = originalBuildPlayer.call(this, W, H)
    if (this.scene.textures.exists(ASSETS.characters.playerFishingAtlas.key)) {
      this.scene.children.list.slice(before).forEach(obj => obj.setVisible?.(false))
    }
    return anchor
  }

  const originalPreload = GameScene.prototype.preload
  GameScene.prototype.preload = function patchedPreload(...args) {
    originalPreload?.apply(this, args)
    const atlas = ASSETS.characters.playerFishingAtlas
    if (atlas?.status === 'ready' && !this.textures.exists(atlas.key)) {
      this.load.atlas(atlas.key, atlas.image, atlas.atlas)
    }
  }

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function patchedCreate(...args) {
    originalCreate.apply(this, args)
    this.playerAnimator = new PlayerAnimator(this)
    if (this.playerAnimator.build(this.scale.width, this.scale.height)) {
      this.playerAnimator.showIdle()
    }
    this._resultRevealPending = false
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function patchedEnterCast(...args) {
    const out = originalEnterCast.apply(this, args)
    this.playerAnimator?.showIdle()
    return out
  }

  const originalFireCast = GameScene.prototype._fireCast
  GameScene.prototype._fireCast = function patchedFireCast(...args) {
    this.playerAnimator?.playCast()
    return originalFireCast.apply(this, args)
  }

  const originalEnterWait = GameScene.prototype._enterWait
  GameScene.prototype._enterWait = function patchedEnterWait(...args) {
    const out = originalEnterWait.apply(this, args)
    this.playerAnimator?.showWait()
    return out
  }

  const originalOpenHitWindow = GameScene.prototype._openHitWindow
  GameScene.prototype._openHitWindow = function patchedOpenHitWindow(...args) {
    const out = originalOpenHitWindow.apply(this, args)
    this.playerAnimator?.playHit()
    return out
  }

  const originalEnterBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function patchedEnterBattle(...args) {
    const out = originalEnterBattle.apply(this, args)
    this.playerAnimator?.playFight()
    return out
  }

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function patchedFinishBattle(outcome, ...args) {
    const out = originalFinishBattle.call(this, outcome, ...args)

    if (!this.playerAnimator) return out

    if (outcome === 'caught') {
      // Let the in-world catch animation breathe before the result card appears.
      // The final frame turns toward the player and naturally bridges into results.
      this._resultRevealPending = true
      this.resultOverlay?.setVisible(false)
      this.playerAnimator.playCatch(() => {
        if (!this.sys?.isActive()) return
        this._resultRevealPending = false
        this.resultOverlay?.setVisible(true)
        this.cameras.main.flash(160, 255, 245, 190, true)
      })
    } else {
      this.playerAnimator.showEscaped()
    }
    return out
  }

  const originalOnDown = GameScene.prototype._onDown
  GameScene.prototype._onDown = function patchedOnDown(pointer, ...args) {
    if (this._resultRevealPending) return
    return originalOnDown.call(this, pointer, ...args)
  }

  const originalUpdate = GameScene.prototype.update
  GameScene.prototype.update = function patchedUpdate(...args) {
    const out = originalUpdate?.apply(this, args)
    if (this.phase === 'battle' && this.battleState) {
      this.playerAnimator?.setFightIntensity(this.battleState.isRaging ? 1.35 : 1)
    }
    return out
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function patchedCleanup(...args) {
    this.playerAnimator?.destroy()
    this.playerAnimator = null
    return originalCleanup.apply(this, args)
  }
}
