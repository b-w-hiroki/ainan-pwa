import { FISHING_WORLD } from '../scenes/components/FishingCameraController.js'

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

const SCREEN_SPOTS = [
  { x: 0.23, y: 205, driftX: 46, driftY: 8 },
  { x: 0.72, y: 315, driftX: -52, driftY: 10 },
  { x: 0.42, y: 455, driftX: 42, driftY: -8 },
]

function stageCastFish(scene) {
  if (scene.phase !== 'cast') return
  const runtimes = (scene.bg?._fishRuntime ?? []).filter(runtime => runtime?.gfx?.active)
  if (!runtimes.length) return

  const cam = scene.cameras.main
  const bounds = FISHING_WORLD.waterBounds
  const staged = runtimes.slice(0, Math.min(3, runtimes.length))

  staged.forEach((runtime, i) => {
    const gfx = runtime.gfx
    const spot = SCREEN_SPOTS[i]
    scene.bg?._fishTweens?.[runtime.index]?.stop?.()
    scene.bg?._fishTweens?.[runtime.index]?.destroy?.()

    const x = clamp(cam.scrollX + scene.scale.width * spot.x, bounds.minX + 42, bounds.maxX - 42)
    const y = clamp(cam.scrollY + spot.y, bounds.minY + 42, bounds.maxY - 42)
    const dir = spot.driftX >= 0 ? 1 : -1
    gfx.setPosition(x, y).setScale(dir, 1).setAlpha(i === 1 ? 0.88 : 0.76)

    const tween = scene.tweens.add({
      targets: gfx,
      x: clamp(x + spot.driftX, bounds.minX + 42, bounds.maxX - 42),
      y: clamp(y + spot.driftY, bounds.minY + 42, bounds.maxY - 42),
      duration: 2600 + i * 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
    if (scene.bg?._fishTweens) scene.bg._fishTweens[runtime.index] = tween
  })
}

/**
 * CAST must show real fish targets in the current camera, not an empty ocean.
 * These are the same runtime fish that Retrieve later reacts to; no fake UI
 * markers or duplicate preview sprites are created.
 */
export function installCastFishStaging(GameScene) {
  if (GameScene.prototype.__ainanCastFishStagingInstalled) return
  GameScene.prototype.__ainanCastFishStagingInstalled = true

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    this.time.delayedCall(30, () => stageCastFish(this))
    return result
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    const result = originalEnterCast.apply(this, args)
    this.time.delayedCall(30, () => stageCastFish(this))
    return result
  }
}
