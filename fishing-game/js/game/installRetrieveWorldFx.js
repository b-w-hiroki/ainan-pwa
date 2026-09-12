import { FISH_INTEREST_STATE } from './fishInterest.js'

function ripple(scene, x, y, color = 0xffffff, size = 1) {
  const ring = scene.add.ellipse(x, y, 14, 6)
    .setStrokeStyle(2, color, 0.76)
    .setFillStyle(0xffffff, 0)
    .setDepth(33)
  scene.tweens.add({
    targets: ring,
    scaleX: 2.8 * size,
    scaleY: 2.0 * size,
    alpha: 0,
    duration: 430,
    ease: 'Sine.easeOut',
    onComplete: () => ring.destroy(),
  })
}

function wake(scene, runtime, color = 0xffffff) {
  const gfx = runtime?.gfx
  if (!gfx?.active) return
  const dx = runtime._lastFxX == null ? 0 : gfx.x - runtime._lastFxX
  const dy = runtime._lastFxY == null ? 0 : gfx.y - runtime._lastFxY
  runtime._lastFxX = gfx.x
  runtime._lastFxY = gfx.y
  if (Math.hypot(dx, dy) < 2) return

  const len = Math.max(1, Math.hypot(dx, dy))
  const ux = dx / len
  const uy = dy / len
  const px = -uy
  const py = ux
  const backX = gfx.x - ux * 14
  const backY = gfx.y - uy * 14
  const g = scene.add.graphics().setDepth(21).setAlpha(0.58)
  g.lineStyle(1.8, color, 0.7)
  g.beginPath()
  g.moveTo(backX + px * 3, backY + py * 3)
  g.lineTo(backX - ux * 15 + px * 9, backY - uy * 15 + py * 9)
  g.moveTo(backX - px * 3, backY - py * 3)
  g.lineTo(backX - ux * 15 - px * 9, backY - uy * 15 - py * 9)
  g.strokePath()
  scene.tweens.add({
    targets: g,
    alpha: 0,
    duration: 340,
    onComplete: () => g.destroy(),
  })
}

function spookFish(scene, runtime) {
  if (!runtime?.gfx?.active || runtime._spookTween?.isPlaying?.()) return
  const gfx = runtime.gfx
  const dx = gfx.x - scene.bobber.x
  const dy = gfx.y - scene.bobber.y
  const len = Math.max(1, Math.hypot(dx, dy))
  const distance = 92 + (runtime.fishDef?.retrieve?.caution ?? 0.2) * 52
  const tx = gfx.x + (dx / len) * distance
  const ty = gfx.y + (dy / len) * distance * 0.52
  gfx.setScale(dx >= 0 ? 1 : -1, 1)

  // 通常遊泳と逃走が同じ座標を同時に更新しないようにする。
  scene.bg?._fishTweens?.[runtime.index]?.stop()
  scene.bg?._fishTweens?.[runtime.index]?.destroy()
  // 配列に null を残すと startFishTweens()/destroy() の forEach で例外になる。
  // hole にしておけば forEach は安全にスキップし、_resumeFishCruise も再生成できる。
  if (scene.bg?._fishTweens) delete scene.bg._fishTweens[runtime.index]

  runtime._spookTween = scene.tweens.add({
    targets: gfx,
    x: tx,
    y: ty,
    duration: 360,
    ease: 'Quad.easeOut',
    onUpdate: () => {
      if (Math.random() < 0.22) wake(scene, runtime, 0xdff5ff)
      runtime.reaction?.setPosition(gfx.x, gfx.y - 24)
    },
    onComplete: () => {
      runtime._spookTween = null
      runtime.stimulation = Math.min(runtime.stimulation ?? 0, 0.45)
      runtime._lastFxX = gfx.x
      runtime._lastFxY = gfx.y
      if (scene.phase === 'retrieve' && runtime.state === FISH_INTEREST_STATE.CRUISE) {
        scene._resumeFishCruise?.(runtime)
      }
    },
  })
}

export function installRetrieveWorldFx(GameScene) {
  if (GameScene.prototype.__ainanRetrieveWorldFxInstalled) return
  GameScene.prototype.__ainanRetrieveWorldFxInstalled = true

  const originalTwitch = GameScene.prototype._twitchRetrieve
  GameScene.prototype._twitchRetrieve = function (...args) {
    const beforeX = this.bobber?.x
    const beforeY = this.bobber?.y
    const wasTweening = Boolean(this._retrieveTween)
    const result = originalTwitch.apply(this, args)
    const started = !wasTweening && Boolean(this._retrieveTween)
    if (started && this.phase === 'retrieve' && this.bobber && beforeX != null) {
      ripple(this, beforeX, beforeY, 0xffffff, 0.92)
      this.time.delayedCall(150, () => {
        if (this.phase === 'retrieve' && this.bobber?.visible) ripple(this, this.bobber.x, this.bobber.y, 0x9ee8ff, 0.62)
      })
    }
    return result
  }

  const originalStartSlow = GameScene.prototype._startSlowRetrieve
  GameScene.prototype._startSlowRetrieve = function (...args) {
    const wasSlow = Boolean(this.retrieveState?.slowHeld)
    const result = originalStartSlow.apply(this, args)
    if (!wasSlow && this.phase === 'retrieve' && this.bobber?.visible) ripple(this, this.bobber.x, this.bobber.y, 0x9ee8ff, 0.65)
    return result
  }

  const originalStepFishPursuit = GameScene.prototype._stepFishPursuit
  GameScene.prototype._stepFishPursuit = function (dt) {
    originalStepFishPursuit.call(this, dt)
    const now = this.time.now
    for (const runtime of this.bg?._fishRuntime ?? []) {
      if (![FISH_INTEREST_STATE.FOLLOW, FISH_INTEREST_STATE.INSPECT, FISH_INTEREST_STATE.BITE_READY].includes(runtime.state)) continue
      if (now < (runtime._nextWakeAt ?? 0)) continue
      runtime._nextWakeAt = now + (runtime.state === FISH_INTEREST_STATE.FOLLOW ? 260 : 190)
      wake(this, runtime, runtime.state === FISH_INTEREST_STATE.BITE_READY ? 0xfff0a8 : 0xdff5ff)
    }
  }

  const originalTick = GameScene.prototype._tickFishInterest
  GameScene.prototype._tickFishInterest = function (...args) {
    const runtimes = this.bg?._fishRuntime ?? []
    const wasSpooked = new Map(runtimes.map(runtime => [runtime, Boolean(runtime.spooked)]))
    const result = originalTick.apply(this, args)

    for (const runtime of runtimes) {
      if (runtime.spooked && !wasSpooked.get(runtime)) {
        runtime.reaction?.setText('!').setVisible(true)
        ripple(this, runtime.gfx.x, runtime.gfx.y, 0xffb29f, 1.15)
        spookFish(this, runtime)
      }
    }
    return result
  }

  const originalBeginBite = GameScene.prototype._beginRetrieveBite
  GameScene.prototype._beginRetrieveBite = function (runtime) {
    if (runtime?.gfx) {
      ripple(this, runtime.gfx.x, runtime.gfx.y, 0xffe58a, 1.35)
      this.time.delayedCall(100, () => {
        if (this.bobber?.visible) ripple(this, this.bobber.x, this.bobber.y, 0xffffff, 1.35)
      })
    }
    return originalBeginBite.call(this, runtime)
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    for (const runtime of this.bg?._fishRuntime ?? []) {
      runtime._spookTween?.stop()
      runtime._spookTween?.destroy()
      runtime._spookTween = null
    }
    return originalCleanup.apply(this, args)
  }
}
