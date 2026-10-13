import assert from 'node:assert/strict'

// The 900px authored fishing world is narrower than 932px landscape devices.
// Regressions previously produced clamp(value, 0, -32) -> -32, pushing the
// camera into invalid negative scroll while the player casts/reels.
globalThis.localStorage = { getItem: key => key === 'ainan_reduced_motion' ? '1' : null }
globalThis.window = { location: { search: '?qa=1&cameraPan=1&coneLoop=1' } }

const { FishingCameraController, FISHING_WORLD } =
  await import('../fishing-game/js/scenes/components/FishingCameraController.js')

function makeCamera(width, height) {
  return {
    scene: {}, _bounds: {}, width, height, scrollX: 0, scrollY: 0, zoom: 1,
    panEffect: { reset() {} },
    setBounds() { this._bounds = {}; return this },
    setZoom(zoom) { this.zoom = zoom; return this },
    setScroll(x, y) { this.scrollX = x; this.scrollY = y; return this },
    pan(centerX, centerY) {
      // No Phaser internal clamping: this deliberately exposes the raw scroll
      // requested by the camera controller.
      this.scrollX = centerX - width / 2
      this.scrollY = centerY - height / 2
      return this
    },
  }
}
function check(controller, label) {
  const cam = controller.camera
  const maxX = Math.max(0, controller.world.width - cam.width)
  const maxY = Math.max(0, controller.world.height - cam.height)
  assert.ok(Number.isFinite(cam.scrollX) && cam.scrollX >= 0 && cam.scrollX <= maxX + 0.001,
    label + ': invalid horizontal scroll ' + cam.scrollX + ', max=' + maxX)
  assert.ok(Number.isFinite(cam.scrollY) && cam.scrollY >= 0 && cam.scrollY <= maxY + 0.001,
    label + ': invalid vertical scroll ' + cam.scrollY + ', max=' + maxY)
}
function testViewport(width, height) {
  const cam = makeCamera(width, height)
  const scene = {
    cameras: { main: cam },
    _castMotionProfile: { camera: { flightFollowAmount: 1 } },
  }
  const controller = new FishingCameraController(scene)
  controller.setup(138, 1160)
  check(controller, 'setup')
  controller.focusPlayer(false)
  check(controller, 'player focus tween')
  controller.beginCastPan(45, 0.8, { panDistancePx: 190 })
  check(controller, 'Cast anticipation')
  controller.updateCastFollow(820, 240)
  check(controller, 'Cast flight follow')
  controller.updateAimFollow(820, 200)
  check(controller, 'aim camera')
  controller.endAimFollow({ returnToPlayer: true })
  check(controller, 'aim restore')
  controller.updateRetrieveFollow(830, 900)
  check(controller, 'Retrieve follow')
  controller.holdLure(830, 400)
  check(controller, 'lure focus')
  controller.focusBite(830, 380, 750, 420)
  check(controller, 'HIT')
  controller.composeBattle(800, 550)
  check(controller, 'Battle')
  controller.focusCatch()
  check(controller, 'Result')
  controller._followSafePoint(810, 740, 1)
  check(controller, 'world safe point')

  // This is the actual over-wide failure condition. Every phase's camera
  // horizontal scroll must remain at zero, never -32 for 932px or -124 for
  // 1024px.
  if (width >= FISHING_WORLD.width) assert.equal(cam.scrollX, 0)
  console.log('Camera safe in all phases:', width + 'x' + height)
}
for (const [width, height] of [
  [390, 844], [844, 390], [932, 430], [1024, 390],
  [932, 1500],
]) testViewport(width, height)

// Preserve real horizontal camera travel on screens narrower than the world.
const camera = makeCamera(390, 844)
const controller = new FishingCameraController({ cameras: { main: camera } })
controller.setup(780, 1160)
assert.ok(camera.scrollX > 0 && camera.scrollX <= 510,
  'portrait camera travel must not be disabled by wide viewport protection')

// A destroyed camera cannot be touched after a scene transition.
camera._bounds = null
controller.focusPlayer()
controller.updateRetrieveFollow(820, 300)
console.log('AINAN Fishing camera wide-viewport regression smoke passed')
