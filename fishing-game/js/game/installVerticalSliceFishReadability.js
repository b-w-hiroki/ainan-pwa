import { FISH_INTEREST_STATE } from './fishInterest.js'

const BITE_HESITATION_MS = 320
const NOTICED_CREEP_SPEED = 15

function faceLure(scene, runtime) {
  const gfx = runtime?.gfx
  if (!gfx?.active || !scene.bobber?.visible) return
  const dx = scene.bobber.x - gfx.x
  gfx.setScale(dx >= 0 ? 1 : -1, 1)
}

function pulseFish(scene, runtime, amount = 1.08) {
  const gfx = runtime?.gfx
  if (!gfx?.active) return
  const sign = gfx.scaleX < 0 ? -1 : 1
  scene.tweens.killTweensOf(gfx, 'scaleY')
  scene.tweens.add({
    targets: gfx,
    scaleY: amount,
    duration: 120,
    yoyo: true,
    ease: 'Sine.easeOut',
    onUpdate: () => {
      // Keep horizontal facing while only pulsing the silhouette vertically.
      if (Math.sign(gfx.scaleX || 1) !== sign) gfx.scaleX = Math.abs(gfx.scaleX || 1) * sign
    },
  })
}

function resetReadabilityRuntime(runtime) {
  if (!runtime) return
  runtime._visualState = FISH_INTEREST_STATE.CRUISE
  runtime._biteReadableReadyAt = 0
  runtime._biteHesitating = false
}

/**
 * Vertical Slice 1.0 fish readability.
 *
 * The fish silhouette is the primary UI:
 * cruise -> normal swim
 * noticed -> stops, faces the lure, creeps closer
 * follow -> visibly pursues the lure
 * inspect -> circles/orbits around the lure
 * biteReady -> briefly hesitates before the bite sequence starts
 *
 * Text symbols are reduced to only the moments where they add useful emphasis.
 */
export function installVerticalSliceFishReadability(GameScene) {
  if (GameScene.prototype.__ainanVerticalSliceFishReadabilityInstalled) return
  GameScene.prototype.__ainanVerticalSliceFishReadabilityInstalled = true

  const originalEnterRetrieve = GameScene.prototype._enterRetrieve
  GameScene.prototype._enterRetrieve = function (...args) {
    const result = originalEnterRetrieve.apply(this, args)
    for (const runtime of this.bg?._fishRuntime ?? []) resetReadabilityRuntime(runtime)
    return result
  }

  const originalSyncReaction = GameScene.prototype._syncFishReaction
  GameScene.prototype._syncFishReaction = function (runtime) {
    const result = originalSyncReaction.call(this, runtime)
    if (!runtime?.reaction) return result

    // Motion should carry follow/inspect. Keep symbols only for the initial
    // notice and the final bite-ready emphasis (plus spook handled elsewhere).
    const visible = runtime.spooked
      || runtime.state === FISH_INTEREST_STATE.NOTICED
      || runtime.state === FISH_INTEREST_STATE.BITE_READY
    runtime.reaction.setVisible(Boolean(visible))
    if (runtime.state === FISH_INTEREST_STATE.NOTICED && !runtime.spooked) runtime.reaction.setText('!')
    if (runtime.state === FISH_INTEREST_STATE.BITE_READY && !runtime.spooked) runtime.reaction.setText('✦')
    return result
  }

  const originalTick = GameScene.prototype._tickFishInterest
  GameScene.prototype._tickFishInterest = function (...args) {
    const runtimes = this.bg?._fishRuntime ?? []
    const previous = new Map(runtimes.map(runtime => [runtime, runtime.state]))
    const result = originalTick.apply(this, args)

    for (const runtime of runtimes) {
      const before = previous.get(runtime)
      const after = runtime.state
      if (before === after) continue

      runtime._visualState = after
      if (after !== FISH_INTEREST_STATE.BITE_READY) {
        runtime._biteReadableReadyAt = 0
        runtime._biteHesitating = false
      }

      if (after === FISH_INTEREST_STATE.NOTICED) {
        faceLure(this, runtime)
        pulseFish(this, runtime, 1.10)
      } else if (after === FISH_INTEREST_STATE.FOLLOW) {
        faceLure(this, runtime)
        pulseFish(this, runtime, 1.06)
      } else if (after === FISH_INTEREST_STATE.INSPECT) {
        pulseFish(this, runtime, 1.08)
      } else if (after === FISH_INTEREST_STATE.BITE_READY) {
        runtime._biteReadableReadyAt = this.time.now + BITE_HESITATION_MS
        runtime._biteHesitating = true
        faceLure(this, runtime)
        pulseFish(this, runtime, 1.12)
      }
    }
    return result
  }

  const originalStepPursuit = GameScene.prototype._stepFishPursuit
  GameScene.prototype._stepFishPursuit = function (dt) {
    const runtimes = this.bg?._fishRuntime ?? []

    // A noticed fish should not look frozen. It turns and makes a very small
    // deliberate move toward the lure before full pursuit begins.
    for (const runtime of runtimes) {
      if (runtime.state !== FISH_INTEREST_STATE.NOTICED || !runtime.gfx?.active || runtime.spooked) continue
      const gfx = runtime.gfx
      const dx = this.bobber.x - gfx.x
      const dy = (this.bobber.y + 14) - gfx.y
      const len = Math.max(1, Math.hypot(dx, dy))
      const step = Math.min(len, NOTICED_CREEP_SPEED * dt)
      gfx.x += (dx / len) * step
      gfx.y += (dy / len) * step
      faceLure(this, runtime)
      runtime.reaction?.setPosition(gfx.x, gfx.y - 24)
    }

    // During the final hesitation, preserve the fish position for a fraction
    // of a second so players can see "it is about to eat" before the bite cue.
    const held = new Map()
    for (const runtime of runtimes) {
      if (runtime.state === FISH_INTEREST_STATE.BITE_READY
        && runtime._biteHesitating
        && this.time.now < (runtime._biteReadableReadyAt ?? 0)
        && runtime.gfx?.active) {
        held.set(runtime, { x: runtime.gfx.x, y: runtime.gfx.y })
      }
    }

    originalStepPursuit.call(this, dt)

    for (const [runtime, pos] of held) {
      runtime.gfx.setPosition(pos.x, pos.y)
      runtime.reaction?.setPosition(pos.x, pos.y - 24)
    }
  }

  const originalBeginBite = GameScene.prototype._beginRetrieveBite
  GameScene.prototype._beginRetrieveBite = function (runtime, ...args) {
    if (this.phase === 'retrieve' && runtime?.state === FISH_INTEREST_STATE.BITE_READY) {
      if (!runtime._biteReadableReadyAt) {
        runtime._biteReadableReadyAt = this.time.now + BITE_HESITATION_MS
        runtime._biteHesitating = true
        return
      }
      if (this.time.now < runtime._biteReadableReadyAt) return
      runtime._biteHesitating = false
    }
    return originalBeginBite.call(this, runtime, ...args)
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    for (const runtime of this.bg?._fishRuntime ?? []) resetReadabilityRuntime(runtime)
    return originalEnterCast.apply(this, args)
  }
}
