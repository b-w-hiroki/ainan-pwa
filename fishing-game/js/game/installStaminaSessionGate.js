import { getStaminaState } from './progress.js'
import { FISH_LIST } from './fish.js'

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
      const qa = params.get('qa') === '1'
      const mockPhase = qa ? params.get('qaMockPhase') : null
      const action = qa ? params.get('qaAction') : null

      if (mockPhase === 'retrieve') {
        window.setTimeout(() => {
          if (this.phase !== 'cast') return
          const x = this.anchorX + 210
          const y = this.anchorY - 300
          this._enterRetrieve?.(x, y)
          this.bobber?.setPosition?.(x, y)?.setVisible?.(true)
          this.retrieveUI?.show?.()
          this.retrieveUI?.container?.setVisible?.(true)
          this._syncRetrieveWorldUI?.()
        }, 220)
      }

      const resolvedAction = action ?? (mockPhase === 'battle' ? 'battle' : mockPhase === 'result' ? 'caught' : null)
      if (resolvedAction === 'battle' || resolvedAction === 'caught') {
        window.setTimeout(() => {
          const qaFishId = params.get('qaFish')
          if (qaFishId) {
            const qaFish = FISH_LIST.find(item => item.id === qaFishId)
            if (qaFish) this.fish = qaFish
            if (this.env) delete this.env.bossId
          }
          if (this.phase !== 'battle' && this.phase !== 'result') {
            this._killWaitTimers?.()
            this._stopRetrieveRuntime?.()
            const runtime = this.bg?._fishRuntime?.find(item => item?.gfx?.active)
              ?? this.bg?._fishRuntime?.[0]
            if (runtime?.gfx) {
              this._targetFishIndex = runtime.index ?? 0
              this._targetFishGfx = runtime.gfx
              runtime.gfx.setVisible?.(true)
            }
            this._enterBattle?.()
          }
          if (resolvedAction === 'battle' && this.phase === 'battle') {
            this._battleTimer?.remove?.(false)
            this._battleTimer = undefined
            if (this.battleState) {
              this.battleState.escape = 42
              this.battleState.reel = 58
              this.battleState.isRaging = false
              this.battleState.nextRageAt = Number.POSITIVE_INFINITY
            }
            this._syncBattleUI?.()
            this.escapeBar?.setVisible?.(true)
            this.battlePanel?.setVisible?.(true)
          }
          if (resolvedAction === 'caught' && this.phase === 'battle') this._finishBattle?.('caught')
        }, 220)
      }
    }
    return result
  }
}
