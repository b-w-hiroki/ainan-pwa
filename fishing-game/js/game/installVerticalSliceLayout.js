import Phaser from 'phaser'
import { FISHING_WORLD } from '../scenes/components/FishingCameraController.js'

// The fishing character is presentation, not the playfield. Keep the player
// small during the long interactive phases and only bring them forward for
// short payoff beats.
const PLAYER_SCALE = {
  cast: 0.78,
  retrieve: 0.34,
  bite: 0.40,
  battle: 0.56,
  catch: 0.96,
}

function resizePlayer(scene, scale, { shadow = false, depth = 41 } = {}) {
  const sprite = scene._playerSprite
  if (!sprite || !scene._playerDisplayW || !scene._playerDisplayH) return

  sprite
    .setDisplaySize(scene._playerDisplayW * scale, scene._playerDisplayH * scale)
    .setDepth(depth)

  // The original shadow was drawn for the large cast pose. Hiding it during
  // active fishing prevents the character treatment from stealing water space.
  scene._playerShadow?.setVisible(shadow)
}

function alignPlayerToFishingWorld(scene) {
  const sprite = scene._playerSprite
  if (!sprite || !scene._playerDisplayW || !scene._playerDisplayH) return

  const oldX = scene._playerBaseX ?? sprite.x
  const oldY = scene._playerBaseY ?? sprite.y
  const targetX = FISHING_WORLD.player.x
  const targetY = FISHING_WORLD.player.y
  const dx = targetX - oldX
  const dy = targetY - oldY

  scene._playerBaseX = targetX
  scene._playerBaseY = targetY
  sprite.setPosition(targetX, targetY)

  // Player shadow is a Graphics object whose ellipse was drawn in world
  // coordinates, so shift the whole graphics object by the same delta.
  scene._playerShadow?.setPosition(dx, dy)

  // Keep fishing-line origin attached to the rod after correcting the player
  // world position. These ratios match installPlayerAnimations.js.
  scene.anchorX = targetX + scene._playerDisplayW * 0.42
  scene.anchorY = targetY - scene._playerDisplayH * 0.77
}

/**
 * Vertical Slice composition rules.
 *
 * WATER/FISH/LURE are always the gameplay subject.
 * CAST      : short presentation beat; player visible but not dominant
 * RETRIEVE  : player is a small supporting actor; water owns the screen
 * BITE      : keep lure/fish relationship completely readable
 * BATTLE    : player grows slightly, but fish + line remain the focus
 * CATCH     : only here does the character become a hero presentation again
 */
export function installVerticalSliceLayout(GameScene) {
  if (GameScene.prototype.__ainanVerticalSliceLayoutInstalled) return
  GameScene.prototype.__ainanVerticalSliceLayoutInstalled = true

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    alignPlayerToFishingWorld(this)
    resizePlayer(this, PLAYER_SCALE.cast, { shadow: true, depth: 41 })
    return result
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    const result = originalEnterCast.apply(this, args)
    resizePlayer(this, PLAYER_SCALE.cast, { shadow: true, depth: 41 })
    return result
  }

  const originalEnterRetrieve = GameScene.prototype._enterRetrieve
  GameScene.prototype._enterRetrieve = function (...args) {
    const result = originalEnterRetrieve.apply(this, args)
    resizePlayer(this, PLAYER_SCALE.retrieve, { shadow: false, depth: 30 })
    return result
  }

  const originalSetRetrievePlayerPose = GameScene.prototype._setRetrievePlayerPose
  GameScene.prototype._setRetrievePlayerPose = function (...args) {
    const result = originalSetRetrievePlayerPose.apply(this, args)
    resizePlayer(this, PLAYER_SCALE.retrieve, { shadow: false, depth: 30 })
    return result
  }

  const originalBeginRetrieveBite = GameScene.prototype._beginRetrieveBite
  GameScene.prototype._beginRetrieveBite = function (...args) {
    const result = originalBeginRetrieveBite.apply(this, args)
    resizePlayer(this, PLAYER_SCALE.bite, { shadow: false, depth: 33 })
    return result
  }

  // installPlayerAnimations switches to the fight sheet at the HIT window and
  // restores the sprite to its full base display size. Re-apply the bite scale
  // here so the character never covers the lure/fish relationship.
  const originalOpenHitWindow = GameScene.prototype._openHitWindow
  GameScene.prototype._openHitWindow = function (...args) {
    const result = originalOpenHitWindow.apply(this, args)
    resizePlayer(this, PLAYER_SCALE.bite, { shadow: false, depth: 33 })
    return result
  }

  const originalEnterBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    const result = originalEnterBattle.apply(this, args)
    resizePlayer(this, PLAYER_SCALE.battle, { shadow: false, depth: 40 })
    return result
  }

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (outcome, ...args) {
    const result = originalFinishBattle.call(this, outcome, ...args)
    if (outcome === 'caught') {
      resizePlayer(this, PLAYER_SCALE.catch, { shadow: true, depth: 70 })
    } else {
      resizePlayer(this, PLAYER_SCALE.battle, { shadow: false, depth: 40 })
    }
    return result
  }

  // During retrieve the number describes line remaining to the player's rod,
  // not the original cast distance. Make that distinction explicit.
  const originalSyncRetrieveWorldUI = GameScene.prototype._syncRetrieveWorldUI
  GameScene.prototype._syncRetrieveWorldUI = function (...args) {
    const result = originalSyncRetrieveWorldUI.apply(this, args)
    if (this.phase === 'retrieve' && this.bobber?.visible && this._distanceBadge) {
      const distPx = Phaser.Math.Distance.Between(
        this.anchorX,
        this.anchorY,
        this.bobber.x,
        this.bobber.y,
      )
      const meters = distPx / FISHING_WORLD.pxPerMeter
      this._distanceBadge.setText(`残り ${meters.toFixed(1)}m`)
    }
    return result
  }
}
