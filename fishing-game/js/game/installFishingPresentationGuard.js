import { BackgroundManager } from '../scenes/components/BackgroundManager.js'
import { RetrieveUI } from '../scenes/components/RetrieveUI.js'
import { ASSETS } from '../config/assetManifest.js'
import { MOBILE_FRAME } from '../config/mobileFrame.js'

const FIELD = ASSETS.fishingField

function collectPlayerObjects(scene, added = []) {
  const existing = scene._fishingPresentationObjects ?? []
  const refs = added.filter(obj => {
    const depth = obj?.depth ?? -1
    return obj === scene._playerSprite || obj === scene._playerShadow || obj?.texture?.key === 'ch_player_default' || (depth >= 40 && depth <= 42)
  })
  scene._fishingPresentationObjects = [...new Set([...existing, ...refs])]
}

function setFishingPlayerVisible(scene, visible) {
  // If the animation spritesheet failed and we fell back to the large legacy
  // standing illustration, hide the fallback completely. A missing character
  // is less harmful than covering the fishing field.
  const hasAnimatedPlayer = Boolean(scene._playerSprite)
  const resolvedVisible = hasAnimatedPlayer ? Boolean(visible) : false
  const objects = new Set([
    ...(scene._fishingPresentationObjects ?? []),
    scene._playerSprite,
    scene._playerShadow,
  ])
  objects.forEach(obj => obj?.setVisible?.(resolvedVisible))
}

function drawRetrieveLineToPlayfieldEdge(scene) {
  if (scene.phase !== 'retrieve' || !scene.bobber?.visible || !scene.lineGfx) return

  const cam = scene.cameras.main
  const lureScreenX = scene.bobber.x - cam.scrollX
  const lureScreenY = scene.bobber.y - cam.scrollY
  const anchorScreenX = scene.anchorX - cam.scrollX
  const anchorScreenY = scene.anchorY - cam.scrollY
  const dx = anchorScreenX - lureScreenX
  const dy = anchorScreenY - lureScreenY
  if (Math.hypot(dx, dy) < 1) return

  // The fisherman is intentionally absent during Retrieve. Continue the line
  // in the same direction until it exits the playable water band instead of
  // letting it terminate at an invisible rod tip in the middle of the screen.
  const bounds = {
    left: -12,
    right: scene.scale.width + 12,
    top: MOBILE_FRAME.playTop - 12,
    bottom: MOBILE_FRAME.playBottom + 12,
  }
  const candidates = []
  if (dx > 0) candidates.push((bounds.right - lureScreenX) / dx)
  if (dx < 0) candidates.push((bounds.left - lureScreenX) / dx)
  if (dy > 0) candidates.push((bounds.bottom - lureScreenY) / dy)
  if (dy < 0) candidates.push((bounds.top - lureScreenY) / dy)
  const t = candidates.filter(value => Number.isFinite(value) && value > 0).sort((a, b) => a - b)[0]
  if (!t) return

  const endWorldX = scene.bobber.x + dx * t
  const endWorldY = scene.bobber.y + dy * t
  scene.lineGfx.clear()
  scene.lineGfx.lineStyle(1.7, 0xffffff, 0.82)
  scene.lineGfx.lineBetween(scene.bobber.x, scene.bobber.y, endWorldX, endWorldY)
}

/**
 * Last-line presentation guard for the canonical mobile fishing composition.
 * It prevents legacy fallback character art from leaking back into Retrieve /
 * Bite / Battle and swaps the primary Retrieve control to the managed asset.
 */
export function installFishingPresentationGuard(GameScene) {
  if (GameScene.prototype.__ainanFishingPresentationGuardInstalled) return
  GameScene.prototype.__ainanFishingPresentationGuardInstalled = true

  const originalBuildPlayer = BackgroundManager.prototype.buildPlayer
  BackgroundManager.prototype.buildPlayer = function (...args) {
    const before = this.scene.children.list.length
    const result = originalBuildPlayer.apply(this, args)
    collectPlayerObjects(this.scene, this.scene.children.list.slice(before))
    return result
  }

  const originalButton = RetrieveUI.prototype._button
  RetrieveUI.prototype._button = function (...args) {
    const [, , w, h, , , , , , primary = false] = args
    const result = originalButton.apply(this, args)
    const asset = FIELD.retrieveButtonShortReel
    if (!primary || !asset?.key || !this.scene.textures.exists(asset.key)) return result

    const oldBg = result.container?.list?.[0]
    const image = this.scene.add.image(0, 0, asset.key)
      .setDisplaySize(w, h)
      .setScrollFactor(0)
    if (oldBg) {
      result.container.remove(oldBg)
      oldBg.destroy()
    }
    result.container.addAt(image, 0)
    return result
  }

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    collectPlayerObjects(this)
    setFishingPlayerVisible(this, this.phase === 'cast')
    return result
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    const result = originalEnterCast.apply(this, args)
    setFishingPlayerVisible(this, true)
    return result
  }

  const originalFireCast = GameScene.prototype._fireCast
  GameScene.prototype._fireCast = function (...args) {
    const result = originalFireCast.apply(this, args)
    setFishingPlayerVisible(this, true)
    return result
  }

  const originalEnterRetrieve = GameScene.prototype._enterRetrieve
  GameScene.prototype._enterRetrieve = function (...args) {
    const result = originalEnterRetrieve.apply(this, args)
    setFishingPlayerVisible(this, false)
    drawRetrieveLineToPlayfieldEdge(this)
    return result
  }

  const originalSyncRetrieveWorldUI = GameScene.prototype._syncRetrieveWorldUI
  GameScene.prototype._syncRetrieveWorldUI = function (...args) {
    const result = originalSyncRetrieveWorldUI.apply(this, args)
    drawRetrieveLineToPlayfieldEdge(this)
    return result
  }

  const originalBeginRetrieveBite = GameScene.prototype._beginRetrieveBite
  GameScene.prototype._beginRetrieveBite = function (...args) {
    const result = originalBeginRetrieveBite.apply(this, args)
    setFishingPlayerVisible(this, false)
    return result
  }

  const originalOpenHitWindow = GameScene.prototype._openHitWindow
  GameScene.prototype._openHitWindow = function (...args) {
    const result = originalOpenHitWindow.apply(this, args)
    setFishingPlayerVisible(this, false)
    return result
  }

  const originalEnterBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    const result = originalEnterBattle.apply(this, args)
    setFishingPlayerVisible(this, false)
    return result
  }

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (outcome, ...args) {
    const result = originalFinishBattle.call(this, outcome, ...args)
    setFishingPlayerVisible(this, outcome === 'caught')
    return result
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    this._fishingPresentationObjects = null
    return originalCleanup.apply(this, args)
  }
}
