import { getFishingPreparation } from '../../game/fishingJourney.js'

export class CastSceneAdapter {
  constructor(scene) {
    this.scene = scene
  }

  beginCharge() {
    const scene = this.scene
    if (scene.phase !== 'cast' || scene.isCharging || scene._castMotionInputLocked) return false
    scene.isCharging = true
    scene.chargeStartedAt = scene.time.now
    return true
  }

  releaseCharge() {
    const scene = this.scene
    if (scene.phase !== 'cast' || !scene.isCharging) return false
    scene._onUp?.()
    return true
  }

  cancelCharge() {
    if (this.scene.phase === 'cast') this.scene.isCharging = false
  }

  moveAim(pointer) {
    this.scene._onMove?.(pointer)
  }

  retrieveWait() {
    if (this.scene.phase !== 'retrieve') return false
    this.scene._setRetrieveIdle?.()
    return true
  }

  retrieveTwitch() {
    if (this.scene.phase !== 'retrieve') return false
    this.scene._twitchRetrieve?.()
    return true
  }

  beginSlowRetrieve() {
    if (this.scene.phase !== 'retrieve') return false
    this.scene._startSlowRetrieve?.()
    return true
  }

  endSlowRetrieve() {
    this.scene._stopSlowRetrieve?.()
  }

  resultTown() {
    const scene = this.scene
    if (scene.phase !== 'result' || scene._castPresentationOutcome !== 'caught') return false
    const lastCatch = scene.catches?.[scene.catches.length - 1]
    const catchArrival = lastCatch && scene.fish ? {
      fishId: scene.fish.id,
      name: scene.fish.name,
      emoji: scene.fish.emoji,
      rarity: scene.fish.rarity,
      sizeCm: lastCatch.sizeCm,
      score: lastCatch.score,
    } : null
    scene._cleanup?.()
    scene.scene.start('TownScene', { catchArrival })
    return true
  }

  resultRetry() {
    const scene = this.scene
    if (scene.phase !== 'result') return false
    const preparation = getFishingPreparation(scene.env?.point)
    if (!preparation.ready) {
      scene._cleanup?.()
      scene.scene.start(preparation.primaryBlocker.scene)
      return true
    }
    const env = { ...scene.env, player: { ...(scene.env?.player ?? {}) } }
    scene._cleanup?.()
    scene.scene.restart(env)
    return true
  }

  resultPrepare() {
    if (this.scene.phase !== 'result') return false
    this.scene._cleanup?.()
    this.scene.scene.start('UpgradeScene')
    return true
  }

  resultPort() {
    if (this.scene.phase !== 'result') return false
    this.scene._cleanup?.()
    this.scene.scene.start('HomeScene')
    return true
  }

  back() {
    this.cancelCharge()
    this.scene.scene.start('MapScene')
  }
}
