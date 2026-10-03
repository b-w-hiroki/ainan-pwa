import { buildTrajectory } from './cast.js'
import { FISHING_WORLD } from '../scenes/components/FishingCameraController.js'
import { isReducedMotion } from './feedback.js'
import { PULL_CAST_TUNING, classifyPullRelease, pullChargeRatio } from './pullCastTuning.js'

// Prototype tuning: ±52° fan, 10–43m requested distance. The actual landing
// remains clamped by the current rod range and authored water bounds.
export const CONE_CAST_TUNING = Object.freeze({ halfAngleDeg: 52, minDistancePx: 180, maxDistancePx: 780 })

const enabled = () => typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('coneLoop') === '1'
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const rad = degrees => degrees * Math.PI / 180
const ensureState = scene => (scene._coneCastState ??= {
  angleDeg: 0,
  distancePx: 620,
  dragging: false,
  castLocked: false,
  hitCommitted: false,
  hitTransitioning: false,
  keyboardReelHeld: false,
  inputMode: 'aim',
  pullPointerId: null,
  pullStartX: 0,
  pullStartY: 0,
  pullDx: 0,
  pullDy: 0,
  pullArmedAt: null,
  pullCharge: 0,
  pullFeedback: '',
})

function readSelection(scene) {
  const state = ensureState(scene)
  const range = Math.min(CONE_CAST_TUNING.maxDistancePx, Math.max(CONE_CAST_TUNING.minDistancePx, scene.castRangePx ?? 620))
  const requestedDistance = clamp(state.distancePx, CONE_CAST_TUNING.minDistancePx, CONE_CAST_TUNING.maxDistancePx)
  const abilityLimited = requestedDistance > range
  const effectiveDistance = Math.min(requestedDistance, range)
  const power = clamp((effectiveDistance / range - 0.4) / 0.6, 0.15, 0.95)
  const points = buildTrajectory(scene.anchorX, scene.anchorY, state.angleDeg, power, range)
  const raw = points[points.length - 1]
  const requestedPoints = buildTrajectory(scene.anchorX, scene.anchorY, state.angleDeg, 0.95, requestedDistance)
  const requestedRaw = requestedPoints[requestedPoints.length - 1]
  const bounds = FISHING_WORLD.waterBounds
  const valid = raw.x >= bounds.minX && raw.x <= bounds.maxX && raw.y >= bounds.minY && raw.y <= bounds.maxY
  return { range, requestedDistance, effectiveDistance, abilityLimited, power, points, raw, requestedRaw, valid }
}

function setAimFromWorld(scene, worldX, worldY) {
  const state = ensureState(scene)
  const dx = worldX - scene.anchorX
  const dy = worldY - scene.anchorY
  state.angleDeg = clamp(Math.atan2(dx, -dy) * 180 / Math.PI, -CONE_CAST_TUNING.halfAngleDeg, CONE_CAST_TUNING.halfAngleDeg)
  state.distancePx = clamp(Math.hypot(dx, dy), CONE_CAST_TUNING.minDistancePx, CONE_CAST_TUNING.maxDistancePx)
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
  const buttonX = W - (compact ? 60 : 70)
  const castY = H - (compact ? 112 : PULL_CAST_TUNING.ui.handleBottomInsetPx)
  const reelY = H - (compact ? 62 : PULL_CAST_TUNING.ui.reelBottomInsetPx)
  const radius = compact ? 36 : PULL_CAST_TUNING.ui.handleRadiusPx
  const pullEndY = H - (compact ? 36 : 48)
  const gaugeH = compact ? 102 : PULL_CAST_TUNING.ui.gaugeHeightPx
  const gaugeW = PULL_CAST_TUNING.ui.gaugeWidthPx
  const gaugeX = buttonX - radius - gaugeW - 18
  const gaugeY = castY - gaugeH / 2
  const root = scene.add.container(0, 0).setDepth(9200).setScrollFactor(0)
  const castChrome = scene.add.graphics()
  castChrome.lineStyle(8, 0x062c44, 0.34).lineBetween(buttonX, castY, buttonX, pullEndY)
  castChrome.lineStyle(4, 0xffffff, 0.74).lineBetween(buttonX, castY, buttonX, pullEndY)
  for (const offset of [54, 82]) {
    const y = castY + Math.min(offset, pullEndY - castY - 10)
    castChrome.lineStyle(4, 0x173248, 0.82).lineBetween(buttonX - 10, y - 6, buttonX, y + 3).lineBetween(buttonX, y + 3, buttonX + 10, y - 6)
  }
  castChrome.fillStyle(0x062c44, 0.72).lineStyle(3, 0xffffff, 0.94).fillRoundedRect(gaugeX - 4, gaugeY - 4, gaugeW + 8, gaugeH + 8, 10).strokeRoundedRect(gaugeX - 4, gaugeY - 4, gaugeW + 8, gaugeH + 8, 10)
  const successTop = gaugeY + gaugeH * (1 - PULL_CAST_TUNING.gauge.successEnd)
  const successHeight = gaugeH * (PULL_CAST_TUNING.gauge.successEnd - PULL_CAST_TUNING.gauge.successStart)
  castChrome.fillStyle(0xffffff, 0.18).lineStyle(3, 0xffffff, 0.98).fillRoundedRect(gaugeX, successTop, gaugeW, successHeight, 5).strokeRoundedRect(gaugeX, successTop, gaugeW, successHeight, 5)
  const reelChrome = scene.add.graphics()
  reelChrome.fillStyle(0x062c44, 0.38).fillCircle(buttonX + 2, reelY + 4, radius + 3)
  reelChrome.fillStyle(0xffd95a, 1).lineStyle(4, 0xffffff, 0.96).fillCircle(buttonX, reelY, radius).strokeCircle(buttonX, reelY, radius)
  const charge = scene.add.graphics()
  const label = scene.add.text(buttonX, castY, 'PULL', { fontFamily: 'Nunito, sans-serif', fontSize: compact ? '15px' : '17px', fontStyle: 'bold', color: '#173248', align: 'center' }).setOrigin(0.5)
  const gaugeLabel = scene.add.text(gaugeX + gaugeW / 2, gaugeY - 14, 'GOOD', { fontFamily: 'Nunito, sans-serif', fontSize: compact ? '10px' : '11px', fontStyle: 'bold', color: '#ffffff', stroke: '#062c44', strokeThickness: 3 }).setOrigin(0.5)
  const feedback = scene.add.text(buttonX, castY - radius - 24, '', { fontFamily: 'Nunito, M PLUS Rounded 1c, sans-serif', fontSize: compact ? '12px' : '14px', fontStyle: 'bold', color: '#ffffff', stroke: '#062c44', strokeThickness: 5, align: 'center' }).setOrigin(0.5)
  const mode = scene.add.text(18, H - (compact ? 35 : 48), '', { fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: compact ? '12px' : '14px', fontStyle: 'bold', color: '#ffffff', stroke: '#062c44', strokeThickness: 4 }).setOrigin(0, 0.5)
  root.add([castChrome, reelChrome, charge, label, gaugeLabel, feedback, mode])
  scene._coneCastHud = root
  scene._coneCastHudNodes = { buttonX, castY, reelY, radius, pullEndY, gaugeX, gaugeY, gaugeW, gaugeH, label, gaugeLabel, feedback, mode, charge, castChrome, reelChrome }
}

function drawAim(scene) {
  const overlay = scene._coneCastOverlay
  const target = scene._coneCastTarget
  if (!overlay || !target) return
  overlay.clear(); target.clear()
  const state = ensureState(scene)
  const aiming = scene.phase === 'cast' && !scene._cameraPanCasting
  overlay.setVisible(aiming && state.inputMode !== 'pull')
  target.setVisible(aiming)
  if (!aiming) return
  const { range, raw, requestedRaw, abilityLimited, valid } = readSelection(scene)
  const cx = scene.anchorX
  const cy = scene.anchorY
  const points = [{ x: cx, y: cy }]
  for (let degrees = -CONE_CAST_TUNING.halfAngleDeg; degrees <= CONE_CAST_TUNING.halfAngleDeg; degrees += 4) {
    points.push({ x: cx + Math.sin(rad(degrees)) * range * 1.2, y: cy - Math.cos(rad(degrees)) * range })
  }
  overlay.fillStyle(0x47c8ff, state.dragging ? 0.20 : 0.12).lineStyle(2, 0xb7f1ff, 0.72)
  overlay.fillPoints(points, true).strokePoints(points, true)
  const angle = rad(state.angleDeg)
  const shownTarget = abilityLimited ? requestedRaw : raw
  overlay.lineStyle(3, valid && !abilityLimited ? 0xffe26b : 0xff9a5a, 0.96)
  overlay.lineBetween(cx, cy, shownTarget.x, shownTarget.y)
  if (abilityLimited) {
    target.lineStyle(3, 0xffffff, 0.92).strokeCircle(raw.x, raw.y, 14)
    target.lineStyle(2, 0xff9a5a, 0.82).lineBetween(raw.x, raw.y, shownTarget.x, shownTarget.y)
  }
  target.lineStyle(4, valid && !abilityLimited ? 0xffe26b : 0xff765a, 1).strokeCircle(shownTarget.x, shownTarget.y, state.dragging ? 25 : 20)
  target.lineStyle(2, 0xffffff, 0.9).strokeCircle(shownTarget.x, shownTarget.y, 8)
  target.fillStyle(valid && !abilityLimited ? 0xffe26b : 0xff765a, 0.25).fillCircle(shownTarget.x, shownTarget.y, 17)
  scene._coneCastPreview = { x: shownTarget.x, y: shownTarget.y, clampedX: raw.x, clampedY: raw.y, valid, abilityLimited, angleDeg: state.angleDeg, distancePx: state.distancePx, rangePx: range, power: readSelection(scene).power }
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

function syncPullHud(scene) {
  const nodes = scene._coneCastHudNodes
  if (!nodes) return
  const state = ensureState(scene)
  const selection = readSelection(scene)
  const remaining = scene.bobber?.visible ? Math.hypot(scene.bobber.x - scene.anchorX, scene.bobber.y - scene.anchorY) / FISHING_WORLD.pxPerMeter : 0
  const pulling = state.inputMode === 'pull'
  const showPullControls = scene.phase === 'cast' && state.inputMode !== 'released' && !scene._cameraPanCasting
  const charge = pulling && state.pullArmedAt != null ? pullChargeRatio((scene.time?.now ?? 0) - state.pullArmedAt) : state.pullCharge
  state.pullCharge = charge
  nodes.charge.clear()
  nodes.castChrome.setVisible(showPullControls)
  nodes.reelChrome.setVisible(scene.phase === 'retrieve')
  nodes.charge.setVisible(showPullControls)
  nodes.feedback.setVisible(scene.phase === 'cast')
  nodes.label.setVisible(showPullControls || scene.phase === 'retrieve')
  if (scene.phase === 'cast') {
    const fillH = nodes.gaugeH * charge
    const fillY = nodes.gaugeY + nodes.gaugeH - fillH
    const inGood = charge >= PULL_CAST_TUNING.gauge.successStart && charge <= PULL_CAST_TUNING.gauge.successEnd
    nodes.charge.fillStyle(inGood ? 0x42d68c : charge > PULL_CAST_TUNING.gauge.successEnd ? 0xff765a : 0x5bc8e8, 0.98)
      .fillRoundedRect(nodes.gaugeX + 3, fillY, nodes.gaugeW - 6, Math.max(0, fillH), 4)
    const pullProgress = clamp(state.pullDy / PULL_CAST_TUNING.gesture.fullPullDistancePx, 0, 1)
    const handleY = nodes.castY + (nodes.pullEndY - nodes.castY) * pullProgress
    nodes.charge.fillStyle(0x062c44, 0.38).fillCircle(nodes.buttonX + 2, handleY + 4, nodes.radius + 3)
    nodes.charge.fillStyle(0xffd95a, 1).lineStyle(4, 0xffffff, 0.96).fillCircle(nodes.buttonX, handleY, nodes.radius).strokeCircle(nodes.buttonX, handleY, nodes.radius)
    nodes.label.setPosition(nodes.buttonX, handleY)
      .setText(state.pullArmedAt == null ? 'PULL' : 'HOLD')
    nodes.gaugeLabel.setVisible(showPullControls)
    nodes.feedback.setPosition(nodes.gaugeX + nodes.gaugeW / 2, nodes.gaugeY - 40)
      .setText(state.pullFeedback || (pulling ? (state.pullArmedAt == null ? '下へ引いてセット' : inGood ? 'GOODで放す' : 'ため中…') : ''))
  } else {
    nodes.label.setPosition(nodes.buttonX, nodes.reelY).setText('REEL')
    nodes.gaugeLabel.setVisible(false)
    nodes.feedback.setText('')
  }
  nodes.mode.setText(scene.phase === 'cast'
    ? `狙い ${state.angleDeg.toFixed(0)}° / ${(selection.requestedDistance / FISHING_WORLD.pxPerMeter).toFixed(0)}m  ${selection.abilityLimited ? `能力上限 ${(selection.range / FISHING_WORLD.pxPerMeter).toFixed(0)}m` : '狙点内'}`
    : scene.phase === 'retrieve' ? `長押しで巻く  残り ${remaining.toFixed(1)}m` : '')
  scene._coneCastHud?.setVisible(['cast', 'retrieve'].includes(scene.phase))
}

function inPullActionButton(scene, pointer) {
  const nodes = scene._coneCastHudNodes
  const y = scene.phase === 'retrieve' ? nodes?.reelY : nodes?.castY
  return nodes && Math.hypot(pointer.x - nodes.buttonX, pointer.y - y) <= nodes.radius + 14
}

const pointerId = pointer => pointer?.id ?? pointer?.pointerId ?? 0

function cancelPull(scene, feedback = '') {
  const state = ensureState(scene)
  state.inputMode = 'aim'
  state.pullPointerId = null
  state.pullDx = 0
  state.pullDy = 0
  state.pullArmedAt = null
  state.pullCharge = 0
  state.pullFeedback = feedback
  scene._cancelPullCastMotion?.()
}

function startPull(scene, pointer) {
  const state = ensureState(scene)
  if (state.castLocked || scene._cameraPanCasting || state.pullPointerId != null) return false
  state.inputMode = 'pull'
  state.dragging = false
  state.pullPointerId = pointerId(pointer)
  state.pullStartX = pointer.x
  state.pullStartY = pointer.y
  state.pullDx = 0
  state.pullDy = 0
  state.pullArmedAt = null
  state.pullCharge = 0
  state.pullFeedback = '下へ引いてセット'
  scene._previewPullCastMotion?.('ready')
  return true
}

function movePull(scene, pointer) {
  const state = ensureState(scene)
  if (state.inputMode !== 'pull' || pointerId(pointer) !== state.pullPointerId) return false
  state.pullDx = pointer.x - state.pullStartX
  state.pullDy = Math.max(0, pointer.y - state.pullStartY)
  const pullProgress = clamp(state.pullDy / PULL_CAST_TUNING.gesture.fullPullDistancePx, 0, 1)
  if (pullProgress > 0.14) scene._previewPullCastMotion?.('drawBack')
  const directionOk = Math.abs(state.pullDx) <= Math.max(18, state.pullDy * PULL_CAST_TUNING.gesture.maxHorizontalRatio)
  if (!directionOk) state.pullFeedback = 'まっすぐ下へ引く'
  if (directionOk && state.pullDy >= PULL_CAST_TUNING.gesture.minPullDistancePx && state.pullArmedAt == null) {
    state.pullArmedAt = scene.time?.now ?? 0
    state.pullFeedback = ''
    scene._previewPullCastMotion?.('charge')
    scene.events.emit('ainan-pull-cast-armed', { at: state.pullArmedAt })
  }
  return true
}

function finishPull(scene, pointer, cancelled = false) {
  const state = ensureState(scene)
  if (state.inputMode !== 'pull' || pointerId(pointer) !== state.pullPointerId) return false
  movePull(scene, pointer)
  const armedAt = state.pullArmedAt
  const charge = armedAt == null ? 0 : pullChargeRatio((scene.time?.now ?? 0) - armedAt)
  const moved = Math.hypot(state.pullDx, state.pullDy)
  const directionSign = Math.abs(state.pullDx) > 10 ? Math.sign(state.pullDx) : Math.sign(state.angleDeg || 1)
  if (cancelled || armedAt == null || moved < PULL_CAST_TUNING.gesture.shortTapDistancePx) {
    cancelPull(scene, cancelled ? 'CANCEL / 中断' : 'もっと下へ引く')
    scene.events.emit('ainan-pull-cast-cancelled', { cancelled, moved })
    return true
  }
  const outcome = classifyPullRelease(charge, directionSign)
  state.inputMode = 'released'
  state.pullPointerId = null
  state.pullCharge = charge
  state.pullFeedback = outcome.label
  scene.events.emit('ainan-pull-cast-release-grade', outcome)
  const committed = scene._coneCommitCast?.(outcome)
  if (!committed) cancelPull(scene, 'CAST不可')
  return true
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
    this._coneResize = () => {
      if (ensureState(this).inputMode === 'pull') cancelPull(this, '回転で中断')
      buildOverlay(this)
    }
    this.scale?.on?.('resize', this._coneResize)
    installKeyboardBridge()
    this._coneKeyDown = event => {
      if (this.phase === 'cast') {
        if (event.code === 'ArrowLeft' || event.code === 'KeyA') this._coneCastState.angleDeg = clamp(this._coneCastState.angleDeg - 3, -CONE_CAST_TUNING.halfAngleDeg, CONE_CAST_TUNING.halfAngleDeg)
        if (event.code === 'ArrowRight' || event.code === 'KeyD') this._coneCastState.angleDeg = clamp(this._coneCastState.angleDeg + 3, -CONE_CAST_TUNING.halfAngleDeg, CONE_CAST_TUNING.halfAngleDeg)
        if (event.code === 'ArrowUp' || event.code === 'KeyW') this._coneCastState.distancePx = clamp(this._coneCastState.distancePx + 24, CONE_CAST_TUNING.minDistancePx, CONE_CAST_TUNING.maxDistancePx)
        if (event.code === 'ArrowDown' || event.code === 'KeyS') this._coneCastState.distancePx = clamp(this._coneCastState.distancePx - 24, CONE_CAST_TUNING.minDistancePx, readSelection(this).range)
        if (event.code === 'Enter') this._coneCommitCast?.(classifyPullRelease(0.72, Math.sign(this._coneCastState.angleDeg || 1)))
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
    this._conePointerCancel = pointer => finishPull(this, pointer, false)
    this.input.on('pointerupoutside', this._conePointerCancel)
    this._coneNativePointerCancel = () => {
      const state = ensureState(this)
      if (state.inputMode === 'pull') finishPull(this, { id: state.pullPointerId, x: state.pullStartX + state.pullDx, y: state.pullStartY + state.pullDy }, true)
    }
    this.game.canvas?.addEventListener?.('pointercancel', this._coneNativePointerCancel)
    return result
  }

  GameScene.prototype._coneCommitCast = function (outcome = classifyPullRelease(0.72, 1)) {
    if (!enabled() || this.phase !== 'cast' || this._coneCastState.castLocked) return false
    const selected = readSelection(this)
    if (!selected.valid) {
      this.resultUI?.toast('海の有効範囲を狙ってください')
      return false
    }
    this._coneCastState.castLocked = true
    this._coneCastOverlay?.setVisible(false)
    this._coneCastTarget?.setVisible(false)
    this._castAngle = this._coneCastState.angleDeg + outcome.angleOffsetDeg
    const normalizedDistance = 0.4 + selected.power * 0.6
    const adjustedPower = clamp((normalizedDistance * outcome.distanceScale - 0.4) / 0.6, 0.15, 0.95)
    const releaseContext = { ...outcome, abilityLimited: selected.abilityLimited, selectedPower: selected.power, adjustedPower, rangePx: selected.range }
    this._pullCastPrechargedRelease = releaseContext
    this._coneCastState.lastRelease = releaseContext
    const result = this._fireCast(this._castAngle, adjustedPower)
    if (result === false) this._coneCastState.castLocked = false
    return result !== false
  }

  GameScene.prototype._coneLegacyCommitCast = function () {
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
    state.inputMode = 'aim'
    state.pullPointerId = null
    state.pullArmedAt = null
    state.pullCharge = 0
    state.pullDx = 0
    state.pullDy = 0
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
    if (pointer?.x <= 58 && pointer?.y <= 70) {
      if (ensureState(this).inputMode === 'pull') cancelPull(this, 'CANCEL / 戻る')
      this.scene.start('MapScene')
      return true
    }
    if (this.phase === 'cast') {
      const state = ensureState(this)
      if (state.inputMode === 'pull' && pointerId(pointer) !== state.pullPointerId) return true
      if (inPullActionButton(this, pointer)) return startPull(this, pointer)
      if (state.inputMode === 'pull') return true
      state.inputMode = 'aim'
      state.dragging = true
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
      setAimFromWorld(this, world.x, world.y)
      return true
    }
    if (this.phase === 'retrieve' && inPullActionButton(this, pointer)) { this._startSlowRetrieve?.(); return true }
    return true
  }

  const originalOnMove = GameScene.prototype._onMove
  GameScene.prototype._onMove = function (pointer) {
    if (enabled() && this.phase === 'cast' && ensureState(this).inputMode === 'pull') return movePull(this, pointer)
    if (!enabled() || !this._coneCastState?.dragging || this.phase !== 'cast') return originalOnMove.call(this, pointer)
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    setAimFromWorld(this, world.x, world.y)
    return true
  }

  const originalOnUp = GameScene.prototype._onUp
  GameScene.prototype._onUp = function (...args) {
    if (!enabled()) return originalOnUp.apply(this, args)
    if (this.phase === 'cast') {
      if (ensureState(this).inputMode === 'pull') return finishPull(this, args[0], false)
      this._coneCastState.dragging = false
      return true
    }
    if (this.phase === 'retrieve') { this._stopSlowRetrieve?.(); return true }
    return originalOnUp.apply(this, args)
  }

  const originalUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (...args) {
    const result = originalUpdate?.apply(this, args)
    if (!enabled()) return result
    if (this.phase === 'retrieve' && this._coneCastState?.keyboardReelHeld) this._startSlowRetrieve?.()
    drawAim(this)
    syncPullHud(this)
    return result
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    if (ensureState(this).inputMode === 'pull') cancelPull(this)
    this._coneCastOverlay?.destroy?.(); this._coneCastTarget?.destroy?.(); this._coneCastHud?.destroy?.(true)
    this.input?.off?.('pointerupoutside', this._conePointerCancel)
    this.game.canvas?.removeEventListener?.('pointercancel', this._coneNativePointerCancel)
    this._conePointerCancel = null
    this._coneNativePointerCancel = null
    this.scale?.off?.('resize', this._coneResize)
    this._coneResize = null
    return originalCleanup.apply(this, args)
  }
}
