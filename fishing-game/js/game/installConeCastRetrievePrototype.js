import { buildTrajectory } from './cast.js'
import { FISHING_WORLD } from '../scenes/components/FishingCameraController.js'
import { isReducedMotion } from './feedback.js'
import { PULL_CAST_TUNING, classifyPullRelease, pullChargeRatio, slingshotAimFromPull } from './pullCastTuning.js'

// Prototype tuning: ±52° fan, 10–43m requested distance. The actual landing
// remains clamped by the current rod range and authored water bounds.
export const CONE_CAST_TUNING = Object.freeze({ halfAngleDeg: 52, minDistancePx: 180, maxDistancePx: 780 })

const enabled = () => typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('coneLoop') === '1'
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function pointInPolygon(point, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    const crosses = ((a.y > point.y) !== (b.y > point.y))
      && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    if (crosses) inside = !inside
  }
  return inside
}

export function isValidCastLanding(point, world = FISHING_WORLD) {
  const bounds = world.waterBounds
  const insideWater = point.x >= bounds.minX && point.x <= bounds.maxX
    && point.y >= bounds.minY && point.y <= bounds.maxY
  return insideWater && !(world.castLandPolygons ?? []).some(polygon => pointInPolygon(point, polygon))
}

function selectionAt(scene, angleDeg, requestedDistance) {
  const range = Math.min(CONE_CAST_TUNING.maxDistancePx, Math.max(CONE_CAST_TUNING.minDistancePx, scene.castRangePx ?? 620))
  const requested = clamp(requestedDistance, CONE_CAST_TUNING.minDistancePx, CONE_CAST_TUNING.maxDistancePx)
  const abilityLimited = requested > range
  const effectiveDistance = Math.min(requested, range)
  const power = clamp((effectiveDistance / range - 0.4) / 0.6, 0.15, 0.95)
  const points = buildTrajectory(scene.anchorX, scene.anchorY, angleDeg, power, range)
  const raw = points[points.length - 1]
  const requestedPoints = buildTrajectory(scene.anchorX, scene.anchorY, angleDeg, 0.95, requested)
  const requestedRaw = requestedPoints[requestedPoints.length - 1]
  return { range, requestedDistance: requested, effectiveDistance, abilityLimited, power, points, raw, requestedRaw, valid: isValidCastLanding(raw) }
}

function findValidDistance(scene, angleDeg, fromStart) {
  const minimumPullProgress = PULL_CAST_TUNING.gesture.minPullDistancePx / PULL_CAST_TUNING.gesture.fullPullDistancePx
  const minimumRequest = CONE_CAST_TUNING.minDistancePx + (CONE_CAST_TUNING.maxDistancePx - CONE_CAST_TUNING.minDistancePx) * minimumPullProgress
  const maximumRequest = CONE_CAST_TUNING.maxDistancePx
  const steps = 40
  const distances = Array.from({ length: steps + 1 }, (_, index) => (
    minimumRequest + (maximumRequest - minimumRequest) * index / steps
  ))
  if (!fromStart) distances.reverse()
  const coarse = distances.find(distance => selectionAt(scene, angleDeg, distance).valid)
  if (coarse == null) return null
  const step = (maximumRequest - minimumRequest) / steps
  let valid = coarse
  let invalid = clamp(coarse + (fromStart ? -step : step), minimumRequest, maximumRequest)
  if (selectionAt(scene, angleDeg, invalid).valid) return { distance: valid, point: selectionAt(scene, angleDeg, valid).raw }
  for (let index = 0; index < 10; index++) {
    const mid = (valid + invalid) / 2
    if (selectionAt(scene, angleDeg, mid).valid) valid = mid
    else invalid = mid
  }
  return { distance: valid, point: selectionAt(scene, angleDeg, valid).raw }
}

export function buildCastRangeGeometry(scene) {
  const cacheKey = `${scene.anchorX}:${scene.anchorY}:${scene.castRangePx ?? 620}`
  const cached = scene._coneCastRangeGeometryCache
  if (cached?.cacheKey === cacheKey) {
    return { ...cached.geometry, rodTip: scene._cameraPanRodTip ? { ...scene._cameraPanRodTip } : null }
  }
  const samples = []
  const gestureAngleDeg = Math.atan(PULL_CAST_TUNING.gesture.maxHorizontalRatio) * 180 / Math.PI
  const maxAngleDeg = Math.min(CONE_CAST_TUNING.halfAngleDeg, gestureAngleDeg - 0.25)
  const angles = [-maxAngleDeg, 0, maxAngleDeg]
  for (let angleDeg = -maxAngleDeg + 4; angleDeg < maxAngleDeg; angleDeg += 4) angles.push(angleDeg)
  angles.sort((a, b) => a - b)
  for (const angleDeg of angles) {
    const inner = findValidDistance(scene, angleDeg, true)
    const outer = findValidDistance(scene, angleDeg, false)
    if (inner && outer) samples.push({ angleDeg, inner: inner.point, outer: outer.point, innerDistance: inner.distance, outerDistance: outer.distance })
  }
  const geometry = {
    origin: { x: scene.anchorX, y: scene.anchorY },
    inner: samples.map(sample => sample.inner),
    outer: samples.map(sample => sample.outer),
    polygon: [...samples.map(sample => sample.outer), ...samples.slice().reverse().map(sample => sample.inner)],
    samples,
  }
  scene._coneCastRangeGeometryCache = { cacheKey, geometry }
  return { ...geometry, rodTip: scene._cameraPanRodTip ? { ...scene._cameraPanRodTip } : null }
}

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
  pullPointerX: 0,
  pullPointerY: 0,
  pullDx: 0,
  pullDy: 0,
  pullProgress: 0,
  pullArmedAt: null,
  pullCharge: 0,
  pullFeedback: '',
})

function readSelection(scene) {
  const state = ensureState(scene)
  return selectionAt(scene, state.angleDeg, state.distancePx)
}

function setAimFromPull(scene, pullDx, pullDy) {
  const state = ensureState(scene)
  const aim = slingshotAimFromPull(pullDx, pullDy, CONE_CAST_TUNING)
  state.angleDeg = aim.angleDeg
  state.distancePx = aim.distancePx
  state.pullProgress = aim.pullProgress
  return aim
}

function pointerWorld(scene, pointer) {
  return scene.cameras.main.getWorldPoint(pointer.x, pointer.y)
}

function inSlingshotOrigin(scene, pointer) {
  const world = pointerWorld(scene, pointer)
  const zoom = Math.max(0.5, scene.cameras.main.zoom || 1)
  return Math.hypot(world.x - scene.anchorX, world.y - scene.anchorY) <= PULL_CAST_TUNING.gesture.originRadiusPx / zoom
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
  const infoX = 16
  const infoH = compact ? 52 : 68
  const infoY = H - infoH - (compact ? 8 : 14)
  const infoW = Math.min(compact ? 430 : 248, Math.max(190, buttonX - radius - infoX - 12))
  const root = scene.add.container(0, 0).setDepth(9200).setScrollFactor(0)
  const castChrome = scene.add.graphics()
  castChrome.fillStyle(0x062c44, 0.72).lineStyle(3, 0xffffff, 0.94).fillRoundedRect(gaugeX - 4, gaugeY - 4, gaugeW + 8, gaugeH + 8, 10).strokeRoundedRect(gaugeX - 4, gaugeY - 4, gaugeW + 8, gaugeH + 8, 10)
  const successTop = gaugeY + gaugeH * (1 - PULL_CAST_TUNING.gauge.successEnd)
  const successHeight = gaugeH * (PULL_CAST_TUNING.gauge.successEnd - PULL_CAST_TUNING.gauge.successStart)
  castChrome.fillStyle(0xffffff, 0.18).lineStyle(3, 0xffffff, 0.98).fillRoundedRect(gaugeX, successTop, gaugeW, successHeight, 5).strokeRoundedRect(gaugeX, successTop, gaugeW, successHeight, 5)
  const reelChrome = scene.add.graphics()
  reelChrome.fillStyle(0x062c44, 0.38).fillCircle(buttonX + 2, reelY + 4, radius + 3)
  reelChrome.fillStyle(0xffd95a, 1).lineStyle(4, 0xffffff, 0.96).fillCircle(buttonX, reelY, radius).strokeCircle(buttonX, reelY, radius)
  const charge = scene.add.graphics()
  const infoChrome = scene.add.graphics()
  infoChrome.fillStyle(0x062c44, 0.82).lineStyle(2, 0xffffff, 0.86)
    .fillRoundedRect(infoX, infoY, infoW, infoH, 14).strokeRoundedRect(infoX, infoY, infoW, infoH, 14)
  const label = scene.add.text(infoX + 14, infoY + (compact ? 15 : 19), '起点から斜め下へ引く', { fontFamily: 'M PLUS Rounded 1c, Nunito, sans-serif', fontSize: compact ? '14px' : '16px', fontStyle: 'bold', color: '#ffffff', align: 'left', wordWrap: { width: infoW - 28 } }).setOrigin(0, 0.5)
  const gaugeLabel = scene.add.text(gaugeX + gaugeW / 2, gaugeY - 16, '成功', { fontFamily: 'M PLUS Rounded 1c, Nunito, sans-serif', fontSize: compact ? '12px' : '13px', fontStyle: 'bold', color: '#ffffff', stroke: '#062c44', strokeThickness: 4 }).setOrigin(0.5)
  const feedback = scene.add.text(buttonX, castY - radius - 24, '', { fontFamily: 'Nunito, M PLUS Rounded 1c, sans-serif', fontSize: compact ? '12px' : '14px', fontStyle: 'bold', color: '#ffffff', stroke: '#062c44', strokeThickness: 5, align: 'center' }).setOrigin(0.5)
  const mode = scene.add.text(infoX + 14, infoY + infoH - (compact ? 15 : 20), '', { fontFamily: 'M PLUS Rounded 1c, Nunito, sans-serif', fontSize: compact ? '12px' : '13px', fontStyle: 'bold', color: '#bfeeff', align: 'left', wordWrap: { width: infoW - 28 } }).setOrigin(0, 0.5)
  const qaEnabled = new URLSearchParams(window.location.search).get('pullQa') === '1'
  const qaPointer = scene.add.graphics().setVisible(false)
  const qaTimeline = scene.add.text(12, 86, '', { fontFamily: 'Consolas, monospace', fontSize: compact ? '10px' : '11px', color: '#ffffff', backgroundColor: '#062c44', padding: { x: 8, y: 6 }, lineSpacing: 2 }).setScrollFactor(0).setVisible(qaEnabled)
  root.add([castChrome, reelChrome, charge, infoChrome, label, gaugeLabel, feedback, mode, qaPointer, qaTimeline])
  scene._coneCastHud = root
  scene._coneCastHudNodes = { buttonX, castY, reelY, radius, pullEndY, gaugeX, gaugeY, gaugeW, gaugeH, infoX, infoY, infoW, infoH, infoChrome, label, gaugeLabel, feedback, mode, charge, castChrome, reelChrome, qaEnabled, qaPointer, qaTimeline }
}

function drawAim(scene) {
  const overlay = scene._coneCastOverlay
  const target = scene._coneCastTarget
  if (!overlay || !target) return
  overlay.clear(); target.clear()
  const state = ensureState(scene)
  const aiming = scene.phase === 'cast' && !scene._cameraPanCasting
  const pulling = state.inputMode === 'pull'
  overlay.setVisible(aiming)
  target.setVisible(aiming)
  if (!aiming) return
  target.lineStyle(5, 0xffffff, 0.96).strokeCircle(scene.anchorX, scene.anchorY, pulling ? 24 : 20)
  target.lineStyle(3, 0xffd95a, 1).strokeCircle(scene.anchorX, scene.anchorY, pulling ? 15 : 11)
  target.fillStyle(0xffd95a, pulling ? 0.28 : 0.18).fillCircle(scene.anchorX, scene.anchorY, pulling ? 13 : 9)
  if (!pulling) {
    scene._coneCastPreview = null
    return
  }
  const selection = readSelection(scene)
  const { range, raw, requestedRaw, abilityLimited, valid } = selection
  const cx = scene.anchorX
  const cy = scene.anchorY
  const geometry = buildCastRangeGeometry(scene)
  if (geometry.polygon.length >= 6) {
    overlay.fillStyle(0x47c8ff, 0.12).fillPoints(geometry.polygon, true)
    overlay.lineStyle(2, 0xb7f1ff, 0.76).strokePoints(geometry.outer, false)
    overlay.lineStyle(1.5, 0xb7f1ff, 0.46).strokePoints(geometry.inner, false)
    overlay.lineStyle(1.5, 0xb7f1ff, 0.52)
      .lineBetween(geometry.inner[0].x, geometry.inner[0].y, geometry.outer[0].x, geometry.outer[0].y)
      .lineBetween(geometry.inner.at(-1).x, geometry.inner.at(-1).y, geometry.outer.at(-1).x, geometry.outer.at(-1).y)
  }
  if (geometry.rodTip && Math.hypot(geometry.rodTip.x - cx, geometry.rodTip.y - cy) > 5) {
    const controlX = (geometry.rodTip.x + cx) / 2
    const controlY = Math.min(geometry.rodTip.y, cy) - 18
    overlay.lineStyle(1.5, 0xffffff, 0.42)
      .lineBetween(geometry.rodTip.x, geometry.rodTip.y, controlX, controlY)
      .lineBetween(controlX, controlY, cx, cy)
  }
  overlay.lineStyle(4, valid ? 0xffe26b : 0xff765a, 0.96)
  overlay.strokePoints(selection.points, false)
  if (abilityLimited) {
    target.lineStyle(3, 0xff9a5a, 0.9).strokeCircle(raw.x, raw.y, 27)
  }
  target.lineStyle(4, valid ? 0xffe26b : 0xff765a, 1).strokeCircle(raw.x, raw.y, 20)
  target.lineStyle(2, 0xffffff, 0.9).strokeCircle(raw.x, raw.y, 8)
  target.fillStyle(valid ? 0xffe26b : 0xff765a, 0.25).fillCircle(raw.x, raw.y, 17)
  scene._coneCastPreview = { x: raw.x, y: raw.y, clampedX: raw.x, clampedY: raw.y, requestedX: requestedRaw.x, requestedY: requestedRaw.y, valid, abilityLimited, angleDeg: state.angleDeg, distancePx: state.distancePx, rangePx: range, power: selection.power, origin: geometry.origin, rodTip: geometry.rodTip, rangeGeometry: geometry }
}

function syncHud(scene) {
  const nodes = scene._coneCastHudNodes
  if (!nodes) return
  const selection = readSelection(scene)
  const remaining = scene.bobber?.visible ? Math.hypot(scene.bobber.x - scene.anchorX, scene.bobber.y - scene.anchorY) / FISHING_WORLD.pxPerMeter : 0
  nodes.label.setText(scene.phase === 'retrieve' ? '巻く' : '投げる')
  nodes.mode.setText(scene.phase === 'cast'
    ? `狙い ${scene._coneCastState.angleDeg.toFixed(0)}° / ${(Math.hypot(selection.raw.x - scene.anchorX, selection.raw.y - scene.anchorY) / FISHING_WORLD.pxPerMeter).toFixed(0)}m  水面をなぞって狙う`
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
  const landingMeters = Math.hypot(selection.raw.x - scene.anchorX, selection.raw.y - scene.anchorY) / FISHING_WORLD.pxPerMeter
  const remaining = scene.bobber?.visible ? Math.hypot(scene.bobber.x - scene.anchorX, scene.bobber.y - scene.anchorY) / FISHING_WORLD.pxPerMeter : 0
  const pulling = state.inputMode === 'pull'
  const showPullControls = scene.phase === 'cast' && state.inputMode !== 'released' && !scene._cameraPanCasting
  const charge = pulling && state.pullArmedAt != null ? pullChargeRatio((scene.time?.now ?? 0) - state.pullArmedAt) : state.pullCharge
  state.pullCharge = charge
  scene._syncPullCastMotion?.({
    mode: pulling ? 'pull' : state.inputMode,
    pullProgress: state.pullProgress,
    chargeRatio: charge,
    armed: state.pullArmedAt != null,
    pointerX: state.pullPointerX,
    pointerY: state.pullPointerY,
  })
  nodes.charge.clear()
  nodes.castChrome.setVisible(showPullControls && pulling)
  nodes.reelChrome.setVisible(scene.phase === 'retrieve')
  nodes.charge.setVisible(showPullControls && pulling)
  nodes.feedback.setVisible(scene.phase === 'cast')
  nodes.label.setVisible(showPullControls || scene.phase === 'retrieve')
  nodes.infoChrome.setVisible(['cast', 'retrieve'].includes(scene.phase))
  if (scene.phase === 'cast') {
    const fillH = nodes.gaugeH * charge
    const fillY = nodes.gaugeY + nodes.gaugeH - fillH
    const inGood = charge >= PULL_CAST_TUNING.gauge.successStart && charge <= PULL_CAST_TUNING.gauge.successEnd
    if (pulling) {
      nodes.charge.fillStyle(inGood ? 0x42d68c : charge > PULL_CAST_TUNING.gauge.successEnd ? 0xff765a : 0x5bc8e8, 0.98)
        .fillRoundedRect(nodes.gaugeX + 3, fillY, nodes.gaugeW - 6, Math.max(0, fillH), 4)
      nodes.charge.lineStyle(10, 0x062c44, 0.38).lineBetween(state.pullStartX, state.pullStartY, state.pullPointerX, state.pullPointerY)
      nodes.charge.lineStyle(4, 0xffd95a, 0.98).lineBetween(state.pullStartX, state.pullStartY, state.pullPointerX, state.pullPointerY)
      nodes.charge.fillStyle(0xffd95a, 0.36).lineStyle(4, 0xffffff, 0.96).fillCircle(state.pullPointerX, state.pullPointerY, 18).strokeCircle(state.pullPointerX, state.pullPointerY, 18)
    }
    nodes.label.setPosition(nodes.infoX + 14, nodes.infoY + (scene.scale.height < 520 ? 15 : 19)).setOrigin(0, 0.5)
      .setText(pulling ? (state.pullArmedAt == null ? '斜め下へ引く' : inGood ? '今、離す' : charge > PULL_CAST_TUNING.gauge.successEnd ? '遅い — 次は少し早く' : '力をためる') : '起点から斜め下へ引く')
    nodes.gaugeLabel.setVisible(showPullControls && pulling)
    nodes.feedback.setPosition(nodes.gaugeX + nodes.gaugeW / 2, nodes.gaugeY - 40)
      .setText(state.pullFeedback || '')
  } else {
    nodes.label.setPosition(nodes.buttonX, nodes.reelY).setOrigin(0.5).setText('巻く')
    nodes.gaugeLabel.setVisible(false)
    nodes.feedback.setText('')
  }
  nodes.mode.setText(scene.phase === 'cast'
    ? pulling ? `方向 ${state.angleDeg.toFixed(0)}°  •  着水 ${landingMeters.toFixed(0)}m${selection.abilityLimited ? '  •  竿の上限' : ''}` : '引く方向と反対側へ飛びます'
    : scene.phase === 'retrieve' ? `糸の張りを保つ  •  残り ${remaining.toFixed(1)}m` : '')
  scene._coneCastHud?.setVisible(['cast', 'retrieve'].includes(scene.phase))
  if (nodes.qaEnabled) {
    const timeline = scene._pullCastTimeline ?? scene._pullCastLastTimeline ?? {}
    const now = scene.time?.now ?? 0
    const releaseElapsed = timeline.releasedAt == null ? null : now - timeline.releasedAt
    nodes.qaTimeline.setText([
      `gesture ${state.inputMode}${state.pullArmedAt != null ? '/armed' : ''}`,
      `pull ${Math.round(state.pullProgress * 100)}%  charge ${Math.round(charge * 100)}%`,
      `pose ${timeline.visualPose ?? scene._cameraPanPose ?? 'idle'}  phase ${timeline.phase ?? 'aim'}`,
      `release ${releaseElapsed == null ? '--' : `${Math.round(releaseElapsed)}ms`}  lure ${timeline.lureReleasedAt == null ? '--' : `${Math.round(timeline.lureReleasedAt - timeline.releasedAt)}ms`}  camera ${timeline.cameraStartedAt == null ? '--' : `${Math.round(timeline.cameraStartedAt - timeline.releasedAt)}ms`}`,
    ])
    nodes.qaPointer.clear().setVisible(pulling)
    if (pulling) {
      nodes.qaPointer.lineStyle(3, 0xff765a, 1).strokeCircle(state.pullPointerX, state.pullPointerY, 16)
      nodes.qaPointer.lineStyle(2, 0xffffff, 0.95).lineBetween(state.pullPointerX - 23, state.pullPointerY, state.pullPointerX + 23, state.pullPointerY).lineBetween(state.pullPointerX, state.pullPointerY - 23, state.pullPointerX, state.pullPointerY + 23)
    }
  }
}

function inReelActionButton(scene, pointer) {
  const nodes = scene._coneCastHudNodes
  return nodes && Math.hypot(pointer.x - nodes.buttonX, pointer.y - nodes.reelY) <= nodes.radius + 14
}

const pointerId = pointer => pointer?.id ?? pointer?.pointerId ?? 0

function cancelPull(scene, feedback = '') {
  const state = ensureState(scene)
  state.inputMode = 'aim'
  state.pullPointerId = null
  state.pullDx = 0
  state.pullDy = 0
  state.pullProgress = 0
  state.pullPointerX = 0
  state.pullPointerY = 0
  state.pullArmedAt = null
  state.pullCharge = 0
  state.pullFeedback = feedback
  scene._cancelPullCastMotion?.()
  scene.fishingCamera?.endAimFollow?.({ returnToPlayer: true })
}

function startPull(scene, pointer) {
  const state = ensureState(scene)
  if (state.castLocked || scene._cameraPanCasting || state.pullPointerId != null) return false
  state.inputMode = 'pull'
  state.dragging = false
  state.pullPointerId = pointerId(pointer)
  state.pullStartX = pointer.x
  state.pullStartY = pointer.y
  state.pullPointerX = pointer.x
  state.pullPointerY = pointer.y
  state.pullDx = 0
  state.pullDy = 0
  state.pullArmedAt = null
  state.pullCharge = 0
  state.pullFeedback = ''
  scene._syncPullCastMotion?.({ mode: 'pull', pullProgress: 0, chargeRatio: 0, armed: false, pointerX: pointer.x, pointerY: pointer.y })
  return true
}

function movePull(scene, pointer) {
  const state = ensureState(scene)
  if (state.inputMode !== 'pull' || pointerId(pointer) !== state.pullPointerId) return false
  state.pullDx = pointer.x - state.pullStartX
  state.pullDy = pointer.y - state.pullStartY
  state.pullPointerX = pointer.x
  state.pullPointerY = pointer.y
  const aim = setAimFromPull(scene, state.pullDx, state.pullDy)
  if (!aim.directionOk) state.pullFeedback = '斜め下へ引く'
  if (aim.directionOk && aim.pullDistance >= PULL_CAST_TUNING.gesture.minPullDistancePx && state.pullArmedAt == null) {
    state.pullArmedAt = scene.time?.now ?? 0
    state.pullFeedback = ''
    scene.events.emit('ainan-pull-cast-armed', { at: state.pullArmedAt })
  }
  const charge = state.pullArmedAt == null ? 0 : pullChargeRatio((scene.time?.now ?? 0) - state.pullArmedAt)
  scene._syncPullCastMotion?.({ mode: 'pull', pullProgress: aim.pullProgress, chargeRatio: charge, armed: state.pullArmedAt != null, pointerX: pointer.x, pointerY: pointer.y })
  return true
}

function finishPull(scene, pointer, cancelled = false) {
  const state = ensureState(scene)
  if (state.inputMode !== 'pull' || pointerId(pointer) !== state.pullPointerId) return false
  movePull(scene, pointer)
  const armedAt = state.pullArmedAt
  const charge = armedAt == null ? 0 : pullChargeRatio((scene.time?.now ?? 0) - armedAt)
  const moved = Math.hypot(state.pullDx, state.pullDy)
  const directionSign = Math.sign(state.angleDeg || 1)
  if (cancelled || armedAt == null || moved < PULL_CAST_TUNING.gesture.shortTapDistancePx) {
    cancelPull(scene, cancelled ? '中断' : 'もっと斜め下へ引く')
    scene.events.emit('ainan-pull-cast-cancelled', { cancelled, moved })
    return true
  }
  const outcome = classifyPullRelease(charge, directionSign)
  state.inputMode = 'released'
  state.pullPointerId = null
  state.pullCharge = charge
  state.pullFeedback = outcome.label
  scene.fishingCamera?.endAimFollow?.({ returnToPlayer: false })
  scene.events.emit('ainan-pull-cast-release-grade', outcome)
  const committed = scene._coneCommitCast?.(outcome)
  if (!committed) cancelPull(scene, '投げられません')
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
    state.pullProgress = 0
    state.pullPointerX = 0
    state.pullPointerY = 0
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
      if (ensureState(this).inputMode === 'pull') cancelPull(this, '中止 / 戻る')
      this.scene.start('MapScene')
      return true
    }
    if (this.phase === 'cast') {
      const state = ensureState(this)
      if (state.inputMode === 'pull' && pointerId(pointer) !== state.pullPointerId) return true
      if (state.inputMode === 'pull') return true
      if (inSlingshotOrigin(this, pointer)) return startPull(this, pointer)
      return true
    }
    if (this.phase === 'retrieve' && inReelActionButton(this, pointer)) { this._startSlowRetrieve?.(); return true }
    return true
  }

  const originalOnMove = GameScene.prototype._onMove
  GameScene.prototype._onMove = function (pointer) {
    if (enabled() && this.phase === 'cast' && ensureState(this).inputMode === 'pull') return movePull(this, pointer)
    if (enabled() && this.phase === 'cast') return true
    return originalOnMove.call(this, pointer)
  }

  const originalOnUp = GameScene.prototype._onUp
  GameScene.prototype._onUp = function (...args) {
    if (!enabled()) return originalOnUp.apply(this, args)
    if (this.phase === 'cast') {
      if (ensureState(this).inputMode === 'pull') return finishPull(this, args[0], false)
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
    if (this.phase === 'cast' && this._coneCastState?.inputMode === 'pull' && this._coneCastPreview?.valid) {
      this.fishingCamera?.updateAimFollow?.(this._coneCastPreview.x, this._coneCastPreview.y)
    }
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
