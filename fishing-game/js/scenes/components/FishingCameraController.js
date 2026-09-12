const WATER_BOUNDS = {
  left: 70,
  right: 830,
  top: 120,
  bottom: 1020,
  minX: 70,
  maxX: 830,
  minY: 120,
  maxY: 1020,
}

export const FISHING_WORLD = {
  width: 900,
  height: 1400,
  player: { x: 138, y: 1160 },
  waterBounds: WATER_BOUNDS,
  pxPerMeter: 18,
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
const lerp = (a, b, t) => a + (b - a) * t

export class FishingCameraController {
  constructor(scene, world = FISHING_WORLD) {
    this.scene = scene
    this.camera = scene.cameras.main
    this.world = world
    this.state = 'playerFocus'
    this.safeZone = { left: 88, right: 306, top: 135, bottom: 585 }
    this.player = { ...world.player }
  }

  setup(playerX = this.world.player.x, playerY = this.world.player.y) {
    this.player = { x: playerX, y: playerY }
    this.camera.setBounds(0, 0, this.world.width, this.world.height)
    this.camera.setZoom(1)
    this.focusPlayer(true)
  }

  focusPlayer(immediate = false) {
    this.state = 'playerFocus'
    const desiredX = clamp(this.player.x - 125, 0, this.world.width - this.camera.width)
    const desiredY = clamp(this.player.y - 650, 0, this.world.height - this.camera.height)
    if (immediate) {
      this.camera.setScroll(desiredX, desiredY)
      return
    }

    const centerX = desiredX + this.camera.width / 2
    const centerY = desiredY + this.camera.height / 2
    this.camera.pan(centerX, centerY, 360, 'Sine.easeInOut', true)
  }

  updateCastFollow(x, y) {
    this.state = 'castFollow'
    this._followSafePoint(x, y, 0.18)
  }

  updateRetrieveFollow(lureX, lureY) {
    this.state = 'retrieveFollow'
    const focusX = lerp(lureX, this.player.x, 0.18)
    const focusY = lerp(lureY, this.player.y, 0.12)
    this._followSafePoint(focusX, focusY, 0.10)
  }

  holdLure(x, y) {
    this.state = 'lureFocus'
    this._followSafePoint(x, y, 0.14)
  }

  focusBite(lureX, lureY, fishX = lureX, fishY = lureY) {
    this.state = 'biteFocus'
    const focusX = lerp(lureX, fishX, 0.42)
    const focusY = lerp(lureY, fishY, 0.42)
    const desiredX = clamp(focusX - this.camera.width * 0.55, 0, this.world.width - this.camera.width)
    const desiredY = clamp(focusY - this.camera.height * 0.38, 0, this.world.height - this.camera.height)
    const centerX = desiredX + this.camera.width / 2
    const centerY = desiredY + this.camera.height / 2
    this.camera.pan(centerX, centerY, 220, 'Sine.easeOut', true)
  }

  composeBattle(fishX, fishY) {
    this.state = 'battleCompose'
    const centerX = lerp(this.player.x, fishX ?? this.player.x + 180, 0.48)
    const centerY = lerp(this.player.y - 170, fishY ?? this.player.y - 360, 0.48)
    this.camera.pan(centerX, centerY, 360, 'Sine.easeInOut', true)
  }

  focusCatch() {
    this.state = 'catchFocus'
    const centerX = this.player.x + 75
    const centerY = this.player.y - 300
    this.camera.pan(centerX, centerY, 320, 'Sine.easeInOut', true)
  }

  _followSafePoint(worldX, worldY, amount) {
    const sx = worldX - this.camera.scrollX
    const sy = worldY - this.camera.scrollY
    let targetX = this.camera.scrollX
    let targetY = this.camera.scrollY

    if (sx < this.safeZone.left) targetX = worldX - this.safeZone.left
    else if (sx > this.safeZone.right) targetX = worldX - this.safeZone.right

    if (sy < this.safeZone.top) targetY = worldY - this.safeZone.top
    else if (sy > this.safeZone.bottom) targetY = worldY - this.safeZone.bottom

    targetX = clamp(targetX, 0, this.world.width - this.camera.width)
    targetY = clamp(targetY, 0, this.world.height - this.camera.height)
    this._moveToward(targetX, targetY, amount)
  }

  _moveToward(x, y, amount) {
    this.camera.scrollX = lerp(this.camera.scrollX, x, amount)
    this.camera.scrollY = lerp(this.camera.scrollY, y, amount)
  }
}
