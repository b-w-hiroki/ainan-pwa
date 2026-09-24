import { getStaminaState } from './progress.js'
import { FISH_LIST } from './fish.js'

function pickQaTarget(scene) {
  const runtime = scene.bg?._fishRuntime?.find(item => item?.gfx?.active)
    ?? scene.bg?._fishRuntime?.[0]
  if (!runtime?.gfx) return null
  scene._targetFishIndex = runtime.index ?? 0
  scene._targetFishGfx = runtime.gfx
  if (runtime.fishDef) scene.fish = runtime.fishDef
  scene.bg?._fishTweens?.[scene._targetFishIndex]?.stop?.()
  runtime.gfx.setVisible?.(true)
  return runtime.gfx
}

function stabilizeMockRetrieve(scene) {
  const x = scene.anchorX + 210
  const y = scene.anchorY - 300
  scene._killWaitTimers?.()
  scene._stopRetrieveRuntime?.()
  scene._enterRetrieve?.(x, y)
  scene._retrieveInterestTimer?.remove?.(false)
  scene._retrieveInterestTimer = null
  scene.phase = 'retrieve'
  scene.bobber?.setPosition?.(x, y)?.setVisible?.(true)
  scene.retrieveUI?.hide?.()
  scene._rcCastDock?.setVisible?.(false)
  scene._rcRetrieveDock?.setVisible?.(true)
  scene._blueprintCastInstruction?.setVisible?.(false)
  scene._mobileHudSetVisible?.(true)
  scene._mobileHudSetStatus?.('残り 20m')
  scene.lineGfx?.clear?.()
  scene.lineGfx?.lineStyle?.(1.8, 0xffffff, 0.86)
  scene.lineGfx?.lineBetween?.(scene.anchorX, scene.anchorY, x, y)
}

function stabilizeMockBattle(scene) {
  scene._killWaitTimers?.()
  scene._stopRetrieveRuntime?.()
  const target = pickQaTarget(scene)
  scene._enterBattle?.()
  scene._battleTimer?.remove?.(false)
  scene._battleTimer = undefined
  scene.phase = 'battle'
  if (scene.battleState) {
    scene.battleState.escape = 42
    scene.battleState.reel = 58
    scene.battleState.isRaging = false
    scene.battleState.nextRageAt = Number.POSITIVE_INFINITY
  }
  scene._syncBattleUI?.()
  scene.escapeBar?.setVisible?.(true)
  scene.battlePanel?.setVisible?.(true)
  scene._mobileHudSetVisible?.(false)
  scene._rcCastDock?.setVisible?.(false)
  scene._rcRetrieveDock?.setVisible?.(false)

  if (target?.active) {
    const cam = scene.cameras?.main
    target.setVisible?.(true)
    target.setAlpha?.(1)
    target.setDepth?.(40)
    target.setPosition?.((cam?.scrollX ?? 0) + scene.scale.width * 0.50, (cam?.scrollY ?? 0) + 330)
    target._assetImage?.setDisplaySize?.(176, 88)
  }
}

function stabilizeMockResult(scene) {
  stabilizeMockBattle(scene)
  scene._finishBattle?.('caught')
  scene.time?.delayedCall?.(120, () => {
    scene.phase = 'result'
    scene.resultOverlay?.setVisible?.(true)
    scene.escapeBar?.setVisible?.(false)
    scene.battlePanel?.setVisible?.(false)
    scene.reelCTA?.setVisible?.(false)
    scene.rageTag?.setVisible?.(false)
    scene.dangerFx?.setAlpha?.(0)
    scene._mobileHudSetVisible?.(false)
    scene._rcCastDock?.setVisible?.(false)
    scene._rcRetrieveDock?.setVisible?.(false)
  })
}

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
    if (typeof window === 'undefined') return result

    const params = new URLSearchParams(window.location.search)
    const qa = params.get('qa') === '1'
    if (!qa) return result

    const action = params.get('qaAction')
    const mockPhase = params.get('qaMockPhase')

    // Preserve the existing QA action behavior used by reward / boss / player
    // regression captures.
    if (action === 'battle' || action === 'caught') {
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
          this._enterBattle?.()
        }

        if (action === 'battle' && this.phase === 'battle') {
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

        if (action === 'caught' && this.phase === 'battle') this._finishBattle?.('caught')
      }, 220)
    }

    // The four canonical mock captures are deterministic presentation states.
    // Keep them isolated from the broader qaAction fixtures above.
    if (mockPhase === 'retrieve') {
      window.setTimeout(() => stabilizeMockRetrieve(this), 700)
    } else if (mockPhase === 'battle') {
      window.setTimeout(() => stabilizeMockBattle(this), 700)
    } else if (mockPhase === 'result') {
      window.setTimeout(() => stabilizeMockResult(this), 700)
    }

    return result
  }
}
