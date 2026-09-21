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
    const result = originalCreate.apply(this, args)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const action = params.get('qa') === '1' ? params.get('qaAction') : null
      if (action === 'battle' || action === 'caught') {
        this.time.delayedCall(120, () => {
          if (this.phase !== 'battle' && this.phase !== 'result') {
            this._killWaitTimers?.()
            this._stopRetrieveRuntime?.()
            this._enterBattle?.()
          }
          if (action === 'battle' && this.phase === 'battle' && this._battleTimer) this._battleTimer.paused = true
          if (action === 'caught' && this.phase === 'battle') this._finishBattle?.('caught')
        })
      }
    }
    return result
  }
}
