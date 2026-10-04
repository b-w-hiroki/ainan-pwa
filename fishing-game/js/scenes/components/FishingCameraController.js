import { MOBILE_FRAME } from '../../config/mobileFrame.js'
import { isReducedMotion } from '../../game/feedback.js'

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

const CAST_PLATFORM = [
  { x: 0, y: 1120 },
  { x: 210, y: 1068 },
  { x: 302, y: 1400 },
  { x: 0, y: 1400 },
]

export const FISHING_WORLD = {
  width: 900,
  height: 1400,
  player: { x: 138, y: 1160 },
  waterBounds: WATER_BOUNDS,
  castLandPolygons: [CAST_PLATFORM],
  pxPerMeter: 18,
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
const lerp = (a, b, t) => a + (b - a) * t
export const AIM_CAMERA_TUNING = Object.freeze({
  portrait: Object.freeze({ left: 54, right: 42, top: 92, bottom: 214 }),
  landscape: Object.freeze({ left: 58, right: 14, top: 76, bottom: 142 }),
  settleInsetPx: 32,
  followAmount: 0.08,
  returnDurationMs: 320,
})
const cameraPanPrototypeEnabled = () => typeof window !== 'undefined'
  && (new URLSearchParams(window.location.search).get('cameraPan') === '1'
    || new URLSearchParams(window.location.search).get('coneLoop') === '1')

export class FishingCameraController {
  constructor(scene, world = FISHING_WORLD) {
    this.scene = scene
    this.camera = scene.cameras.main
    this.world = world
    this.state = 'playerFocus'

    // The camera only moves the fishing world behind the fixed phone HUD.
    // Keep lure/fish inside the center play band so top info and bottom controls
    // never need to move or scale with the camera.
    this.safeZone = {
      left: 58,
      right: MOBILE_FRAME.width - 58,
      top: MOBILE_FRAME.playTop + 28,
      bottom: MOBILE_FRAME.playBottom - 40,
    }
    this.player = { ...world.player }
    this._aimTarget = null
    this._aimWasActive = false
  }

  setup(playerX = this.world.player.x, playerY = this.world.player.y) {
    this.player = { x: playerX, y: playerY }
    this.camera.setBounds(0, 0, this.world.width, this.world.height)
    this.camera.setZoom(1)
    this.focusPlayer(true)
  }

  _canMove() {
    // Scene restart / browser Back can briefly leave wrappers holding the
    // camera that Phaser has just destroyed. A destroyed camera keeps
    // `useBounds` but clears `_bounds`, and pan() then throws in clampX/Y.
    return Boolean(this.camera?.scene && this.camera?._bounds)
  }

  focusPlayer(immediate = false) {
    this.state = 'playerFocus'
    if (!this._canMove()) return
    const responsive = cameraPanPrototypeEnabled()
    const desiredX = clamp(this.player.x - (responsive ? this.camera.width * 0.30 : 118), 0, this.world.width - this.camera.width)
    const desiredY = clamp(this.player.y - (responsive ? this.camera.height * 0.78 : 650), 0, this.world.height - this.camera.height)
    if (immediate) {
      this.camera.setScroll(desiredX, desiredY)
      return
    }

    const centerX = desiredX + this.camera.width / 2
    const centerY = desiredY + this.camera.height / 2
    this.camera.pan(centerX, centerY, responsive && isReducedMotion() ? 90 : responsive ? AIM_CAMERA_TUNING.returnDurationMs : 320, 'Sine.easeInOut', true)
  }

  beginCastPan(angleDeg, power01, tuning = {}) {
    this.state = 'castAnticipation'
    if (!this._canMove()) return
    // Aim follow has already composed the selected landing. Do not add a
    // second anticipation offset on release: flight follow can continue from
    // the exact same camera pose without a visible jump.
    if (this._aimWasActive) {
      this._aimWasActive = false
      this._aimTarget = null
      return
    }
    const power = clamp(Number(power01) || 0, 0, 1)
    const distance = (tuning.panDistancePx ?? 0) * (0.72 + power * 0.28)
    const angle = angleDeg * Math.PI / 180
    const desiredX = clamp(this.camera.scrollX + Math.sin(angle) * distance, 0, this.world.width - this.camera.width)
    const desiredY = clamp(this.camera.scrollY - Math.cos(angle) * distance, 0, this.world.height - this.camera.height)
    this.camera.pan(
      desiredX + this.camera.width / 2,
      desiredY + this.camera.height / 2,
      tuning.panDurationMs ?? 220,
      tuning.panEase ?? 'Sine.easeInOut',
      true,
    )
  }

  updateCastFollow(x, y) {
    this.state = 'castFollow'
    if (!this._canMove()) return
    if (cameraPanPrototypeEnabled()) {
      const distance = Math.hypot(x - this.player.x, y - this.player.y)
      const travel = clamp((distance - 480) / 260, 0, 1)
      const playerX = clamp(this.player.x - this.camera.width * 0.30, 0, this.world.width - this.camera.width)
      const playerY = clamp(this.player.y - this.camera.height * 0.78, 0, this.world.height - this.camera.height)
      const lureX = clamp(x - this.camera.width * 0.52, 0, this.world.width - this.camera.width)
      const lureY = clamp(y - this.camera.height * 0.71, 0, this.world.height - this.camera.height)
      const amount = this.scene._castMotionProfile?.camera?.flightFollowAmount ?? (isReducedMotion() ? 0.52 : 0.18)
      this._moveToward(lerp(playerX, lureX, travel), lerp(playerY, lureY, travel), amount)
      return
    }
    this._followSafePoint(x, y, 0.12)
  }

  _aimSafeZone() {
    const compact = this.camera.height < 520
    const insets = compact ? AIM_CAMERA_TUNING.landscape : AIM_CAMERA_TUNING.portrait
    return {
      left: insets.left,
      right: Math.max(insets.left + 80, this.camera.width - insets.right),
      top: insets.top,
      bottom: Math.max(insets.top + 80, this.camera.height - insets.bottom),
    }
  }

  updateAimFollow(worldX, worldY) {
    if (this.state !== 'aimFollow') this.camera.panEffect?.reset?.()
    this.state = 'aimFollow'
    this._aimWasActive = true
    if (!this._canMove()) return
    const safe = this._aimSafeZone()
    const screenX = worldX - this.camera.scrollX
    const screenY = worldY - this.camera.scrollY
    let targetX = this.camera.scrollX
    let targetY = this.camera.scrollY
    const inset = AIM_CAMERA_TUNING.settleInsetPx

    if (screenX < safe.left) targetX = worldX - (safe.left + inset)
    else if (screenX > safe.right) targetX = worldX - (safe.right - inset)
    if (screenY < safe.top) targetY = worldY - (safe.top + inset)
    else if (screenY > safe.bottom) targetY = worldY - (safe.bottom - inset)

    targetX = clamp(targetX, 0, Math.max(0, this.world.width - this.camera.width))
    targetY = clamp(targetY, 0, Math.max(0, this.world.height - this.camera.height))
    if (targetX !== this.camera.scrollX || targetY !== this.camera.scrollY) this._aimTarget = { x: targetX, y: targetY }
    if (!this._aimTarget) return

    if (isReducedMotion()) this.camera.setScroll(this._aimTarget.x, this._aimTarget.y)
    else this._moveToward(this._aimTarget.x, this._aimTarget.y, AIM_CAMERA_TUNING.followAmount)
    if (Math.hypot(this.camera.scrollX - this._aimTarget.x, this.camera.scrollY - this._aimTarget.y) < 0.5) {
      this.camera.setScroll(this._aimTarget.x, this._aimTarget.y)
      this._aimTarget = null
    }
  }

  endAimFollow({ returnToPlayer = true } = {}) {
    if (!this._aimWasActive && !this._aimTarget) return
    this._aimTarget = null
    if (!returnToPlayer) return
    this._aimWasActive = false
    this.focusPlayer(isReducedMotion())
  }

  updateRetrieveFollow(lureX, lureY) {
    this.state = 'retrieveFollow'
    if (!this._canMove()) return
    if (cameraPanPrototypeEnabled()) {
      const distance = Math.hypot(lureX - this.player.x, lureY - this.player.y)
      const travel = clamp((distance - 480) / 260, 0, 1)
      const playerX = clamp(this.player.x - this.camera.width * 0.30, 0, this.world.width - this.camera.width)
      const playerY = clamp(this.player.y - this.camera.height * 0.78, 0, this.world.height - this.camera.height)
      const lureTargetX = clamp(lureX - this.camera.width * 0.52, 0, this.world.width - this.camera.width)
      const lureTargetY = clamp(lureY - this.camera.height * 0.68, 0, this.world.height - this.camera.height)
      this._moveToward(lerp(playerX, lureTargetX, travel), lerp(playerY, lureTargetY, travel), isReducedMotion() ? 0.48 : 0.08)
      return
    }
    const focusX = lerp(lureX, this.player.x, 0.24)
    const focusY = lerp(lureY, this.player.y, 0.18)
    this._followSafePoint(focusX, focusY, 0.07)
  }

  holdLure(x, y) {
    this.state = 'lureFocus'
    if (!this._canMove()) return
    if (cameraPanPrototypeEnabled()) {
      const desiredX = clamp(x - this.camera.width * 0.52, 0, this.world.width - this.camera.width)
      const desiredY = clamp(y - this.camera.height * 0.68, 0, this.world.height - this.camera.height)
      if (isReducedMotion()) {
        this.camera.setScroll(desiredX, desiredY)
      } else {
        const tuning = this.scene._castMotionProfile?.camera
        this.camera.pan(
          desiredX + this.camera.width / 2,
          desiredY + this.camera.height / 2,
          tuning?.landingPanMs ?? 220,
          tuning?.landingEase ?? 'Sine.easeOut',
          true,
        )
      }
      return
    }
    this._followSafePoint(x, y, 0.10)
  }

  focusBite(lureX, lureY, fishX = lureX, fishY = lureY) {
    this.state = 'biteFocus'
    if (!this._canMove()) return
    const focusX = lerp(lureX, fishX, 0.42)
    const focusY = lerp(lureY, fishY, 0.42)
    const desiredX = clamp(focusX - this.camera.width * 0.54, 0, this.world.width - this.camera.width)
    const desiredY = clamp(focusY - this.camera.height * 0.40, 0, this.world.height - this.camera.height)
    const centerX = desiredX + this.camera.width / 2
    const centerY = desiredY + this.camera.height / 2
    this.camera.pan(centerX, centerY, 180, 'Sine.easeOut', true)
  }

  composeBattle(fishX, fishY) {
    this.state = 'battleCompose'
    if (!this._canMove()) return
    const centerX = lerp(this.player.x, fishX ?? this.player.x + 180, 0.42)
    const centerY = lerp(this.player.y - 160, fishY ?? this.player.y - 360, 0.42)
    this.camera.pan(centerX, centerY, 320, 'Sine.easeInOut', true)
  }

  focusCatch() {
    this.state = 'catchFocus'
    if (!this._canMove()) return
    const centerX = this.player.x + 70
    const centerY = this.player.y - 292
    this.camera.pan(centerX, centerY, 280, 'Sine.easeInOut', true)
  }

  _followSafePoint(worldX, worldY, amount) {
    if (!this._canMove()) return
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
    if (!this._canMove()) return
    this.camera.scrollX = lerp(this.camera.scrollX, x, amount)
    this.camera.scrollY = lerp(this.camera.scrollY, y, amount)
  }
}
