export class CastSceneAdapter {
  constructor(scene) {
    this.scene = scene
  }

  beginCharge() {
    const scene = this.scene
    if (scene.phase !== 'cast' || scene.isCharging) return false
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

  back() {
    this.cancelCharge()
    this.scene.scene.start('MapScene')
  }
}
