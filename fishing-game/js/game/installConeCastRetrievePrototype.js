import { buildTrajectory } from './cast.js'
import { FISHING_WORLD } from '../scenes/components/FishingCameraController.js'
import { isReducedMotion } from './feedback.js'

// Prototype tuning: ±52° fan, 10–43m requested distance. The actual landing
// remains clamped by the current rod range and authored water bounds.
export const CONE_CAST_TUNING = Object.freeze({ halfAngleDeg: 52, minDistancePx: 180, maxDistancePx: 780 })

const enabled = () => typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('coneLoop') === '1'
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const rad = degrees => degrees * Math.PI / 180
const ensureState = scene => (scene._coneCastState ??= { angleDeg: 0, distancePx: 620, dragging: false, castLocked: false, hitCommitted: false, hitTransitioning: false, keyboardReelHeld: false })

function readSelection(scene) {
  const state = ensureState(scene)
  const range = Math.min(CONE_CAST_TUNING.maxDistancePx, Math.max(CONE_CAST_TUNING.minDistancePx, scene.castRangePx ?? 620))
  const power = clamp((state.distancePx / range - 0.4) / 0.6, 0.15, 0.95)
  const points = buildTrajectory(scene.anchorX, scene.anchorY, state.angleDeg, power, range)
  const raw = points[points.length - 1]
  const bounds = FISHING_WORLD.waterBounds
  const valid = raw.x >= bounds.minX && raw.x <= bounds.maxX && raw.y >= bounds.minY && raw.y <= bounds.maxY
  return { range, power, points, raw, valid }
}

function setAimFromWorld(scene, worldX, worldY) {
  const state = ensureState(scene)
  const dx = worldX - scene.anchorX
  const dy = worldY - scene.anchorY
  state.angleDeg = clamp(Math.atan2(dx, -dy) * 180 / Math.PI, -CONE_CAST_TUNING.halfAngleDeg, CONE_CAST_TUNING.halfAngleDeg)
  state.distancePx = clamp(Math.hypot(dx, dy), CONE_CAST_TUNING.minDistancePx, readSelection(scene).range)
}

function buildOverlay(scene) {
  scene._coneCastOverlay?.destroy?.()
  scene._coneCastTarget?.destroy?.()
  scene._coneCastHud?.destroy?.(true)
  scene._coneCastOverlay = scene.add.graphics().setDepth(35).setScrollFactor(1)
  scene._coneCastTarget = scene.add.graphics().setDepth(36).setScrollFactor(1)
  const W = scene.scale.width
  const H = scene.scale.height
  const compact = H < 520
  const buttonX = W - (compact ? 66 : 76)
  const buttonY = H - (compact ? 64 : 82)
  const radius = compact ? 44 : 52
  const root = scene.add.container(0, 0).setDepth(9200).setScrollFactor(0)
  const g = scene.add.graphics()
  g.fillStyle(0x062c44, 0.38).fillCircle(buttonX + 2, buttonY + 4, radius + 3)
  g.fillStyle(0xffd95a, 1).lineStyle(4, 0xffffff, 0.96).fillCircle(buttonX, buttonY, radius).strokeCircle(buttonX, buttonY, radius)
  const label = scene.add.text(buttonX, buttonY, 'CAST', { fontFamily: 'Nunito, sans-serif', fontSize: compact ? '17px' : '20px', fontStyle: 'bold', color: '#173248' }).setOrigin(0.5)
  const mode = scene.add.text(18, H - (compact ? 35 : 48), '', { fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: compact ? '12px' : '14px', fontStyle: 'bold', color: '#ffffff', stroke: '#062c44', strokeThickness: 4 }).setOrigin(0, 0.5)
  root.add([g, label, mode])
  scene._coneCastHud = root
  scene._coneCastHudNodes = { buttonX, buttonY, radius, label, mode }
}

function drawAim(scene) {
  const overlay = scene._coneCastOverlay
  const target = scene._coneCastTarget
  if (!overlay || !target) return
  overlay.clear(); target.clear()
  const aiming = scene.phase === 'cast' && !scene._cameraPanCasting
  overlay.setVisible(aiming); target.setVisible(aiming)
  if (!aiming) return
  const state = ensureState(scene)
  const { range, raw, valid } = readSelection(scene)
  const cx = scene.anchorX
  const cy = scene.anchorY
  const points = [{ x: cx, y: cy }]
  for (let degrees = -CONE_CAST_TUNING.halfAngleDeg; degrees <= CONE_CAST_TUNING.halfAngleDeg; degrees += 4) {
    points.push({ x: cx + Math.sin(rad(degrees)) * range * 1.2, y: cy - Math.cos(rad(degrees)) * range })
  }
  overlay.fillStyle(0x47c8ff, state.dragging ? 0.20 : 0.12).lineStyle(2, 0xb7f1ff, 0.72)
  overlay.fillPoints(points, true).strokePoints(points, true)
  const angle = rad(state.angleDeg)
  overlay.lineStyle(3, valid ? 0xffe26b : 0xff765a, 0.96)
  overlay.lineBetween(cx, cy, raw.x, raw.y)
  target.lineStyle(4, valid ? 0xffe26b : 0xff765a, 1).strokeCircle(raw.x, raw.y, state.dragging ? 25 : 20)
  target.lineStyle(2, 0xffffff, 0.9).strokeCircle(raw.x, raw.y, 8)
  target.fillStyle(valid ? 0xffe26b : 0xff765a, 0.25).fillCircle(raw.x, raw.y, 17)
  scene._coneCastPreview = { x: raw.x, y: raw.y, valid, angleDeg: state.angleDeg, distancePx: state.distancePx, power: readSelection(scene).power }
}

function syncHud(scene) {
  const nodes = scene._coneCastHudNodes
  if (!nodes) return
  const selection = readSelection(scene)
  const remaining = scene.bobber?.visible ? Math.hypot(scene.bobber.x - scene.anchorX, scene.bobber.y - scene.anchorY) / FISHING_WORLD.pxPerMeter : 0
  nodes.label.setText(scene.phase === 'retrieve' ? 'REEL' : 'CAST')
  nodes.mode.setText(scene.phase === 'cast'
    ? `狙い ${scene._coneCastState.angleDeg.toFixed(0)}° / ${(Math.hypot(selection.raw.x - scene.anchorX, selection.raw.y - scene.anchorY) / FISHING_WORLD.pxPerMeter).toFixed(0)}m  ドラッグで照準`
    : scene.phase === 'retrieve' ? `長押しで巻く  残り ${remaining.toFixed(1)}m` : '')
  scene._coneCastHud?.setVisible(['cast', 'retrieve'].includes(scene.phase))
}

function inActionButton(scene, pointer) {
  const nodes = scene._coneCastHudNodes
  return nodes && Math.hypot(pointer.x - nodes.buttonX, pointer.y - nodes.buttonY) <= nodes.radius + 12
}

function installKeyboardBridge() {
  if (typeof window === 'undefined' || window.__ainanConeKeyboardBridge) return
  const activeScene = () => window.__game?.scene?.getScene?.('GameScene')
  const keyDown = event => {
    const scene = activeScene()
    if (!scene?.sys?.isActive?.() || !enabled()) return
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyR'].includes(event.code)) event.preventDefault()
    scene._coneKeyDown?.(event)
  }
  const keyUp = event => {
    const scene = activeScene()
    if (scene?.sys?.isActive?.() && enabled()) scene._coneKeyUp?.(event)
  }
  window.addEventListener('keydown', keyDown, true)
  window.addEventListener('keyup', keyUp, true)
  window.__ainanConeKeyboardBridge = { keyDown, keyUp }
}

export function installConeCastRetrievePrototype(GameScene) {
  if (GameScene.prototype.__ainanConeCastRetrievePrototypeInstalled) return
  GameScene.prototype.__ainanConeCastRetrievePrototypeInstalled = true

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    if (!enabled()) return result
    ensureState(this)
    buildOverlay(this)
    this._coneResize = () => buildOverlay(this)
    this.scale?.on?.('resize', this._coneResize)
    installKeyboardBridge()
    this._coneKeyDown = event => {
      if (this.phase === 'cast') {
        if (event.code === 'ArrowLeft' || event.code === 'KeyA') this._coneCastState.angleDeg = clamp(this._coneCastState.angleDeg - 3, -CONE_CAST_TUNING.halfAngleDeg, CONE_CAST_TUNING.halfAngleDeg)
        if (event.code === 'ArrowRight' || event.code === 'KeyD') this._coneCastState.angleDeg = clamp(this._coneCastState.angleDeg + 3, -CONE_CAST_TUNING.halfAngleDeg, CONE_CAST_TUNING.halfAngleDeg)
        if (event.code === 'ArrowUp' || event.code === 'KeyW') this._coneCastState.distancePx = clamp(this._coneCastState.distancePx + 24, CONE_CAST_TUNING.minDistancePx, readSelection(this).range)
        if (event.code === 'ArrowDown' || event.code === 'KeyS') this._coneCastState.distancePx = clamp(this._coneCastState.distancePx - 24, CONE_CAST_TUNING.minDistancePx, readSelection(this).range)
        if (event.code === 'Enter') this._coneCommitCast?.()
      }
      if (event.code === 'KeyR' && this.phase === 'retrieve') {
        this._coneCastState.keyboardReelHeld = true
        this._startSlowRetrieve?.()
      }
    }
    this._coneKeyUp = event => {
      if (event.code !== 'KeyR') return
      this._coneCastState.keyboardReelHeld = false
      if (this.phase === 'retrieve') this._stopSlowRetrieve?.()
    }
    const keyboard = this.input.keyboard
    if (keyboard) {
      keyboard.off('keydown-R', keyboard.__ainanConeReelDown)
      keyboard.off('keyup-R', keyboard.__ainanConeReelUp)
      keyboard.__ainanConeReelDown = () => {
        const active = window.__game?.scene?.getScene?.('GameScene')
        if (active?.sys?.isActive?.() && active.phase === 'retrieve') active._startSlowRetrieve?.()
      }
      keyboard.__ainanConeReelUp = () => {
        const active = window.__game?.scene?.getScene?.('GameScene')
        if (active?.sys?.isActive?.() && active.phase === 'retrieve') active._stopSlowRetrieve?.()
      }
      keyboard.on('keydown-R', keyboard.__ainanConeReelDown)
      keyboard.on('keyup-R', keyboard.__ainanConeReelUp)
    }
    return result
  }

  GameScene.prototype._coneCommitCast = function () {
    if (!enabled() || this.phase !== 'cast' || this._coneCastState.castLocked) return false
    const selected = readSelection(this)
    if (!selected.valid) { this.resultUI?.toast('海の有効範囲を狙ってください'); return false }
    this._coneCastState.castLocked = true
    this._coneCastOverlay?.setVisible(false); this._coneCastTarget?.setVisible(false)
    this._castAngle = this._coneCastState.angleDeg
    const result = this._fireCast(this._castAngle, selected.power)
    this.time.delayedCall(isReducedMotion() ? 80 : 260, () => { if (this.phase === 'cast') this._coneCastState.castLocked = false })
    return result !== false
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    const result = originalEnterCast.apply(this, args)
    if (!enabled()) return result
    const state = ensureState(this)
    state.castLocked = false
    state.hitCommitted = false
    state.hitTransitioning = false
    state.dragging = false
    state.keyboardReelHeld = false
    return result
  }

  const originalEnterRetrieve = GameScene.prototype._enterRetrieve
  GameScene.prototype._enterRetrieve = function (...args) {
    const result = originalEnterRetrieve.apply(this, args)
    if (enabled()) {
      ensureState(this).hitCommitted = false
      ensureState(this).hitTransitioning = false
    }
    return result
  }

  const originalBeginRetrieveBite = GameScene.prototype._beginRetrieveBite
  GameScene.prototype._beginRetrieveBite = function (...args) {
    if (!enabled()) return originalBeginRetrieveBite.apply(this, args)
    const state = ensureState(this)
    if (state.hitCommitted || state.hitTransitioning || this.phase !== 'retrieve') return false
    state.hitTransitioning = true
    const result = originalBeginRetrieveBite.apply(this, args)
    state.hitTransitioning = false
    state.hitCommitted = this.phase === 'wait'
    return result
  }

  const originalOnDown = GameScene.prototype._onDown
  GameScene.prototype._onDown = function (pointer) {
    if (!enabled() || ['battle', 'wait', 'result'].includes(this.phase)) return originalOnDown.call(this, pointer)
    if (pointer?.x <= 58 && pointer?.y <= 70) { this.scene.start('MapScene'); return true }
    if (this.phase === 'cast') {
      if (inActionButton(this, pointer)) return this._coneCommitCast()
      this._coneCastState.dragging = true
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
      setAimFromWorld(this, world.x, world.y)
      return true
    }
    if (this.phase === 'retrieve' && inActionButton(this, pointer)) { this._startSlowRetrieve?.(); return true }
    return true
  }

  const originalOnMove = GameScene.prototype._onMove
  GameScene.prototype._onMove = function (pointer) {
    if (!enabled() || !this._coneCastState?.dragging || this.phase !== 'cast') return originalOnMove.call(this, pointer)
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    setAimFromWorld(this, world.x, world.y)
    return true
  }

  const originalOnUp = GameScene.prototype._onUp
  GameScene.prototype._onUp = function (...args) {
    if (!enabled()) return originalOnUp.apply(this, args)
    if (this.phase === 'cast') { this._coneCastState.dragging = false; return true }
    if (this.phase === 'retrieve') { this._stopSlowRetrieve?.(); return true }
    return originalOnUp.apply(this, args)
  }

  const originalUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (...args) {
    const result = originalUpdate?.apply(this, args)
    if (!enabled()) return result
    if (this.phase === 'retrieve' && this._coneCastState?.keyboardReelHeld) this._startSlowRetrieve?.()
    drawAim(this)
    syncHud(this)
    return result
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    this._coneCastOverlay?.destroy?.(); this._coneCastTarget?.destroy?.(); this._coneCastHud?.destroy?.(true)
    this.scale?.off?.('resize', this._coneResize)
    this._coneResize = null
    return originalCleanup.apply(this, args)
  }
}
