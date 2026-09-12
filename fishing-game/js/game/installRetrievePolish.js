import Phaser from 'phaser'
import { PlayerActionInset } from '../scenes/components/PlayerActionInset.js'
import { FISH_INTEREST_STATE } from './fishInterest.js'
import { FISHING_WORLD } from '../scenes/components/FishingCameraController.js'

const CRUISE_DURATION_SCALE = 1.65

export function installRetrievePolish(GameScene) {
  if (GameScene.prototype.__ainanRetrievePolishInstalled) return
  GameScene.prototype.__ainanRetrievePolishInstalled = true

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)

    this.playerActionInset = new PlayerActionInset(this)
    this.playerActionInset.build(this.scale.width, this.scale.height)

    this._castDistanceBadge = this.add.text(0, 0, '', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(23,50,72,0.90)',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5, 1).setDepth(44).setVisible(false)

    if (this.fishingCamera) {
      const originalCastFollow = this.fishingCamera.updateCastFollow.bind(this.fishingCamera)
      this.fishingCamera.updateCastFollow = (x, y) => {
        originalCastFollow(x, y)
        const meters = Phaser.Math.Distance.Between(this.anchorX, this.anchorY, x, y) / FISHING_WORLD.pxPerMeter
        this._castDistanceBadge
          ?.setVisible(true)
          .setPosition(x, y - 26)
          .setText(`飛距離 ${meters.toFixed(1)}m`)
      }
    }

    return result
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    const result = originalEnterCast.apply(this, args)
    this.playerActionInset?.setVisible(false)
    this._castDistanceBadge?.setVisible(false)
    return result
  }

  const originalEnterRetrieve = GameScene.prototype._enterRetrieve
  GameScene.prototype._enterRetrieve = function (x, y) {
    this._castDistanceBadge?.setVisible(false)
    const result = originalEnterRetrieve.call(this, x, y)
    if (this.retrieveState) {
      this.retrieveState.initialDistancePx = Phaser.Math.Distance.Between(this.anchorX, this.anchorY, x, y)
    }
    this._syncRetrieveDistanceLabel?.()
    this._syncPlayerActionInset?.()
    return result
  }

  const originalSyncRetrieveWorldUI = GameScene.prototype._syncRetrieveWorldUI
  GameScene.prototype._syncRetrieveWorldUI = function (...args) {
    const result = originalSyncRetrieveWorldUI.apply(this, args)
    this._syncRetrieveDistanceLabel?.()
    return result
  }

  GameScene.prototype._syncRetrieveDistanceLabel = function () {
    if (!this.retrieveState || !this._distanceBadge || !this.bobber?.visible) return
    const distPx = Phaser.Math.Distance.Between(this.anchorX, this.anchorY, this.bobber.x, this.bobber.y)
    const meters = distPx / FISHING_WORLD.pxPerMeter
    this._distanceBadge.setText(`残り ${meters.toFixed(1)}m`)
  }

  GameScene.prototype._syncPlayerActionInset = function () {
    if (!this.playerActionInset || !this._playerSprite || this.phase !== 'retrieve') {
      this.playerActionInset?.setVisible(false)
      return
    }

    const cam = this.cameras.main
    const sx = this._playerSprite.x - cam.scrollX
    const sy = this._playerSprite.y - cam.scrollY
    const W = this.scale.width
    const H = this.scale.height
    const comfortablyVisible = sx > 16 && sx < W - 16 && sy > 120 && sy < H - 220

    let action = this.retrieveState?.action ?? 'idle'
    const targetState = this._retrieveTargetFish?.state
    if (targetState === FISH_INTEREST_STATE.BITE_READY || targetState === FISH_INTEREST_STATE.INSPECT) action = 'biteReady'
    else if (targetState === FISH_INTEREST_STATE.FOLLOW) action = 'follow'

    this.playerActionInset.syncFromPlayer(this._playerSprite, action)
    this.playerActionInset.setVisible(!comfortablyVisible)
  }

  // NOTICED でも完全停止せず、ルアー方向へわずかに向きを変えて寄る。
  const originalStepFishPursuit = GameScene.prototype._stepFishPursuit
  GameScene.prototype._stepFishPursuit = function (dt) {
    originalStepFishPursuit.call(this, dt)
    const runtimes = this.bg?._fishRuntime ?? []
    for (const runtime of runtimes) {
      if (runtime.state !== FISH_INTEREST_STATE.NOTICED || !runtime.gfx?.active) continue
      const gfx = runtime.gfx
      const profile = runtime.fishDef?.retrieve ?? {}
      const dx = this.bobber.x - gfx.x
      const dy = this.bobber.y - gfx.y
      const len = Math.max(1, Math.hypot(dx, dy))
      const speed = (profile.followSpeed ?? 55) * 0.22
      const step = Math.min(len, speed * dt)
      gfx.x += (dx / len) * step
      gfx.y += (dy / len) * step
      gfx.setScale(dx >= 0 ? 1 : -1, 1)
      runtime.reaction?.setPosition(gfx.x, gfx.y - 24)
    }
  }

  // Interest が落ちて cruise に戻った魚は、その場から自然に通常遊泳へ復帰させる。
  const originalTickFishInterest = GameScene.prototype._tickFishInterest
  GameScene.prototype._tickFishInterest = function (...args) {
    const runtimes = this.bg?._fishRuntime ?? []
    const before = runtimes.map(runtime => runtime.state)
    const result = originalTickFishInterest.apply(this, args)

    runtimes.forEach((runtime, index) => {
      if (this.phase !== 'retrieve') return
      if (before[index] === FISH_INTEREST_STATE.CRUISE || runtime.state !== FISH_INTEREST_STATE.CRUISE) return
      if (this.bg?._fishTweens?.[index]) return
      this._resumeFishCruise?.(runtime)
    })

    this._retrieveTargetFish = runtimes
      .filter(runtime => runtime.state !== FISH_INTEREST_STATE.CRUISE)
      .sort((a, b) => (b.interest ?? 0) - (a.interest ?? 0))[0] ?? null
    this._syncPlayerActionInset?.()
    return result
  }

  GameScene.prototype._resumeFishCruise = function (runtime) {
    const index = runtime.index
    const fd = this.bg?._fishDefs?.[index]
    const gfx = runtime.gfx
    if (!fd || !gfx) return

    const exitX = fd.rtl ? -90 : FISHING_WORLD.width + 90
    const remaining = Math.max(80, Math.abs(exitX - gfx.x))
    const full = FISHING_WORLD.width + 180
    const duration = Math.max(1200, Math.round(fd.dur * CRUISE_DURATION_SCALE * (remaining / full)))
    gfx.setScale(fd.rtl ? -1 : 1, 1)

    this.bg._fishTweens[index]?.stop()
    this.bg._fishTweens[index]?.destroy()
    this.bg._fishTweens[index] = this.tweens.add({
      targets: gfx,
      x: exitX,
      duration,
      ease: 'Linear',
      onComplete: () => {
        if (this.phase === 'retrieve') this.bg?.resetFishToStart(index)
      },
    })
  }

  const originalBeginRetrieveBite = GameScene.prototype._beginRetrieveBite
  GameScene.prototype._beginRetrieveBite = function (runtime) {
    this.playerActionInset?.syncFromPlayer(this._playerSprite, 'biteReady')
    const result = originalBeginRetrieveBite.call(this, runtime)
    this.playerActionInset?.setVisible(false)
    return result
  }

  const originalEnterBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    this.playerActionInset?.setVisible(false)
    return originalEnterBattle.apply(this, args)
  }

  const originalUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (time, delta) {
    originalUpdate?.call(this, time, delta)
    if (this.phase === 'retrieve') this._syncPlayerActionInset?.()
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    this.playerActionInset?.destroy()
    this.playerActionInset = null
    this._castDistanceBadge?.destroy()
    this._castDistanceBadge = null
    return originalCleanup.apply(this, args)
  }
}
