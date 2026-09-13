import Phaser from 'phaser'
import { FISHING_WORLD } from '../scenes/components/FishingCameraController.js'

const PLAYER_SCALE = {
  cast: 1,
  retrieve: 0.56,
  bite: 0.58,
  battle: 0.80,
  catch: 1.02,
}

function resizePlayer(scene, scale, { shadow = false, depth = 41 } = {}) {
  const sprite = scene._playerSprite
  if (!sprite || !scene._playerDisplayW || !scene._playerDisplayH) return

  sprite
    .setDisplaySize(scene._playerDisplayW * scale, scene._playerDisplayH * scale)
    .setDepth(depth)

  // The original shadow was drawn for the large cast pose. Hiding it during
  // retrieve prevents a large oval from remaining behind the smaller player.
  scene._playerShadow?.setVisible(shadow)
}

/**
 * Vertical Slice 1.0 composition rules.
 *
 * CAST      : character presentation matters
 * RETRIEVE  : water/lure/fish are the playfield; character is secondary
 * BITE      : keep lure/fish readable
 * BATTLE    : character becomes more present again
 * CATCH     : full hero payoff
 */
export function installVerticalSliceLayout(GameScene) {
  if (GameScene.prototype.__ainanVerticalSliceLayoutInstalled) return
  GameScene.prototype.__ainanVerticalSliceLayoutInstalled = true

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    const result = originalEnterCast.apply(this, args)
    resizePlayer(this, PLAYER_SCALE.cast, { shadow: true, depth: 41 })
    return result
  }

  const originalEnterRetrieve = GameScene.prototype._enterRetrieve
  GameScene.prototype._enterRetrieve = function (...args) {
    const result = originalEnterRetrieve.apply(this, args)
    resizePlayer(this, PLAYER_SCALE.retrieve, { shadow: false, depth: 34 })
    return result
  }

  const originalSetRetrievePlayerPose = GameScene.prototype._setRetrievePlayerPose
  GameScene.prototype._setRetrievePlayerPose = function (...args) {
    const result = originalSetRetrievePlayerPose.apply(this, args)
    resizePlayer(this, PLAYER_SCALE.retrieve, { shadow: false, depth: 34 })
    return result
  }

  const originalBeginRetrieveBite = GameScene.prototype._beginRetrieveBite
  GameScene.prototype._beginRetrieveBite = function (...args) {
    const result = originalBeginRetrieveBite.apply(this, args)
    resizePlayer(this, PLAYER_SCALE.bite, { shadow: false, depth: 36 })
    return result
  }

  const originalEnterBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    const result = originalEnterBattle.apply(this, args)
    resizePlayer(this, PLAYER_SCALE.battle, { shadow: false, depth: 48 })
    return result
  }

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (outcome, ...args) {
    const result = originalFinishBattle.call(this, outcome, ...args)
    if (outcome === 'caught') {
      resizePlayer(this, PLAYER_SCALE.catch, { shadow: true, depth: 70 })
    } else {
      resizePlayer(this, PLAYER_SCALE.battle, { shadow: false, depth: 48 })
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
