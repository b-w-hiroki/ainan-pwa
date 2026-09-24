import { getStaminaState } from './progress.js'
import { FISH_LIST } from './fish.js'
import { ASSETS } from '../config/assetManifest.js'

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

function clearQaMockOverlay(scene) {
  scene._qaMockOverlay?.forEach?.(obj => obj?.destroy?.())
  scene._qaMockOverlay = []
}

function stabilizeMockCast(scene) {
  scene._killWaitTimers?.()
  scene._stopRetrieveRuntime?.()
  scene.phase = 'cast'
  scene.retrieveUI?.hide?.()
  scene.escapeBar?.setVisible?.(false)
  scene.battlePanel?.setVisible?.(false)
  scene.reelCTA?.setVisible?.(false)
  scene.resultOverlay?.setVisible?.(false)
  scene._mobileHudSetVisible?.(true)
  scene._mobileHudSetStatus?.('キャスト')
  scene._rcRetrieveDock?.setVisible?.(false)
  scene._applyRcFishingPresentation?.('cast')

  clearQaMockOverlay(scene)
  const W = scene.scale.width
  const H = scene.scale.height
  const top = H - 176
  const g = scene.add.graphics().setDepth(2000).setScrollFactor(0)
  g.fillStyle(0xf8fdff, 0.99)
  g.fillRect(0, top, W, 176)
  g.lineStyle(2, 0x9bcfe5, 0.78)
  g.lineBetween(0, top, W, top)
  g.fillStyle(0xd9edf6, 1)
  g.fillRoundedRect(82, top + 18, 198, 10, 5)
  g.fillStyle(0x58b8df, 1)
  g.fillRoundedRect(82, top + 18, 126, 10, 5)
  g.fillStyle(0x2f9ed4, 1)
  g.lineStyle(3, 0xffffff, 0.96)
  g.fillCircle(W / 2, top + 108, 44)
  g.strokeCircle(W / 2, top + 108, 44)

  const power = scene.add.text(24, top + 23, 'パワー', {
    fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#173248',
  }).setOrigin(0, 0.5).setDepth(2001).setScrollFactor(0)
  const throwText = scene.add.text(W / 2, top + 108, '投げる', {
    fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#ffffff',
  }).setOrigin(0.5).setDepth(2001).setScrollFactor(0)
  scene._qaMockOverlay = [g, power, throwText]
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
  scene._applyRcFishingPresentation?.('retrieve')
  scene._mobileHudSetVisible?.(true)
  scene._mobileHudSetStatus?.('残り 20m')
  scene.lineGfx?.clear?.()
  scene.lineGfx?.lineStyle?.(1.8, 0xffffff, 0.86)
  scene.lineGfx?.lineBetween?.(scene.anchorX, scene.anchorY, x, y)
}

function stabilizeMockBattle(scene) {
  scene._killWaitTimers?.()
  scene._stopRetrieveRuntime?.()
  const commonFish = FISH_LIST.find(item => item.id === 'aji')
  if (commonFish) scene.fish = commonFish
  const target = pickQaTarget(scene)
  if (commonFish) scene.fish = commonFish
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
  scene._applyRcFishingPresentation?.('battle')

  if (target?.active) {
    const cam = scene.cameras?.main
    target.setVisible?.(true)
    target.setAlpha?.(1)
    target.setDepth?.(40)
    target.setPosition?.((cam?.scrollX ?? 0) + scene.scale.width * 0.50, (cam?.scrollY ?? 0) + 330)
    target._assetImage?.setDisplaySize?.(176, 88)
  }

  scene._qaMockBattleFish?.destroy?.()
  if (scene.textures?.exists?.('fish_aji_icon')) {
    scene._qaMockBattleFish = scene.add.image(scene.scale.width / 2, 345, 'fish_aji_icon')
      .setDisplaySize(172, 132)
      .setDepth(900)
      .setScrollFactor(0)
      .setAlpha(1)
  } else {
    const g = scene.add.graphics().setDepth(900).setScrollFactor(0)
    g.fillStyle(0x0b3046, 0.96)
    g.fillEllipse(scene.scale.width / 2, 345, 168, 76)
    g.fillTriangle(scene.scale.width / 2 + 70, 345, scene.scale.width / 2 + 112, 313, scene.scale.width / 2 + 112, 377)
    scene._qaMockBattleFish = g
  }
}

function stabilizeMockResult(scene) {
  scene._killWaitTimers?.()
  scene._stopRetrieveRuntime?.()
  scene._battleTimer?.remove?.(false)
  scene._battleTimer = undefined
  scene._qaMockBattleFish?.destroy?.()
  scene._qaMockBattleFish = null

  scene.phase = 'result'
  const fish = scene.fish
  const score = fish ? scene.calcScore?.(fish) ?? 0 : 0
  const sizeCm = fish ? scene._rollFishSize?.(fish) ?? 42 : 42

  scene.resultUI?.drawResultStripe?.('caught')
  scene.resLabel?.setText?.(fish ? `${fish.name}を釣り上げた！` : '釣り上げた！')
  if (fish) scene._showResultFishVisual?.(fish)
  scene.resName?.setText?.(fish?.name ?? '釣果')
  scene.resPts?.setText?.(`サイズ  ${sizeCm} cm   +${score} pt\nレア度  ★☆☆☆☆`)
  scene.resHint?.setText?.('サイズ・ポイントを確認')

  scene.escapeBar?.setVisible?.(false)
  scene.battlePanel?.setVisible?.(false)
  scene.reelCTA?.setVisible?.(false)
  scene.rageTag?.setVisible?.(false)
  scene.dangerFx?.setAlpha?.(0)
  scene.resultOverlay?.setVisible?.(true)
  scene._mobileHudSetVisible?.(false)
  scene._rcCastDock?.setVisible?.(false)
  scene._rcRetrieveDock?.setVisible?.(false)
  scene._applyRcFishingPresentation?.('result')
  scene._polishCaughtResultPresentation?.()
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
    this._applyRcFishingPresentation?.(this.phase)
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

    if (action === 'caught') {
      window.setTimeout(() => {
        if (this.phase === 'result') return
        if (this.phase !== 'battle') {
          this._killWaitTimers?.()
          this._stopRetrieveRuntime?.()
          this._enterBattle?.()
        }
        this._battleTimer?.remove?.(false)
        this._battleTimer = undefined
        if (this.phase === 'battle') this._finishBattle?.('caught')
      }, 760)
    }

    // The four canonical mock captures are deterministic presentation states.
    // Keep them isolated from the broader qaAction fixtures above.
    if (mockPhase === 'cast') {
      window.setTimeout(() => stabilizeMockCast(this), 700)
    } else if (mockPhase === 'retrieve') {
      window.setTimeout(() => stabilizeMockRetrieve(this), 700)
    } else if (mockPhase === 'battle') {
      window.setTimeout(() => stabilizeMockBattle(this), 700)
    } else if (mockPhase === 'result') {
      window.setTimeout(() => stabilizeMockResult(this), 700)
    }

    return result
  }
}
