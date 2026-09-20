import { getStaminaState } from './progress.js'

export function installStaminaSessionGate(GameScene) {
  if (GameScene.prototype.__ainanStaminaSessionGateInstalled) return
  GameScene.prototype.__ainanStaminaSessionGateInstalled = true

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    if (getStaminaState().current <= 0) {
      this.scene.start('HomeScene', { staminaEmpty: true })
      return
    }
    return originalCreate.apply(this, args)
  }
}
