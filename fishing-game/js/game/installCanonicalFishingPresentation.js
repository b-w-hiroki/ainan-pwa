import { FishingPresentation } from '../presentation/FishingPresentation.js'

export function installCanonicalFishingPresentation(GameScene) {
  if (GameScene.prototype.__ainanCanonicalFishingPresentationInstalled) return
  GameScene.prototype.__ainanCanonicalFishingPresentationInstalled = true

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    this.fishingPresentation = new FishingPresentation(this)
    this.fishingPresentation.build()
    return result
  }

  const wrapPhase = name => {
    const original = GameScene.prototype[name]
    if (!original) return
    GameScene.prototype[name] = function (...args) {
      const result = original.apply(this, args)
      this.fishingPresentation?.enter?.(this.phase)
      return result
    }
  }

  ;['_enterCast', '_enterRetrieve', '_beginRetrieveBite', '_openHitWindow', '_enterBattle'].forEach(wrapPhase)

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (...args) {
    const result = originalFinishBattle.apply(this, args)
    this.fishingPresentation?.enter?.(this.phase)
    this.time?.delayedCall?.(0, () => this.fishingPresentation?.enter?.(this.phase))
    return result
  }

  const originalUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (...args) {
    const result = originalUpdate?.apply(this, args)
    this.fishingPresentation?.sync?.()
    return result
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    this.fishingPresentation?.destroy?.()
    this.fishingPresentation = null
    return originalCleanup.apply(this, args)
  }
}
