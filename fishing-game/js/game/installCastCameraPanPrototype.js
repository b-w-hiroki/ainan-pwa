import { ASSETS } from '../config/assetManifest.js'
import { FISHING_WORLD } from '../scenes/components/FishingCameraController.js'
import { isReducedMotion } from './feedback.js'
import { resolveCastMotionProfile } from './castMotionTuning.js'
import { PULL_CAST_TUNING } from './pullCastTuning.js'
import { CHARACTER_MOTION_POSES } from '../presentation/cast/CharacterMotionController.js'
import { DEFAULT_ROD_VISUAL_ID, ROD_VISUALS, getVisualLoadout } from '../presentation/equipmentVisuals.js'

const enabled = () => typeof window !== 'undefined'
  && ['1', 'true'].includes(new URLSearchParams(window.location.search).get('cameraPan') ?? '')
  || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('coneLoop') === '1')

const fieldAssets = () => [
  ASSETS.ui.fishingApprovedCleanHarbor,
  ASSETS.characters.fishingMotionIdle,
  ASSETS.characters.fishingMotionCastWindup,
  ASSETS.characters.fishingMotionCastMid,
  ASSETS.characters.fishingMotionCastRelease,
  ...Object.values(ROD_VISUALS).map(visual => ASSETS.characters[visual.asset]),
]

const rad = degrees => degrees * Math.PI / 180
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const lerp = (from, to, amount) => from + (to - from) * amount

function hideFixedPresentation(scene) {
  scene._finalCastOverlay?.setVisible?.(false)
  scene._rcCastDock?.setVisible?.(false)
  scene._rcRetrieveDock?.setVisible?.(false)
  scene._rcPlayerHero?.setVisible?.(false)
  scene._rcLeftPierDecor?.setVisible?.(false)
  scene._mockTopChrome?.setVisible?.(false)
  scene._blueprintCastInstruction?.setVisible?.(false)
  scene._rcRetrieveLine?.setVisible?.(false)
  scene.escapeBar?.setVisible?.(false)
  scene._bossEncounterCutin?.setVisible?.(false)
  // The legacy battle hero is an SVG rendered above the world fish. In the
  // panning WebGL composition its transparent canvas is promoted as an opaque
  // rectangle, so keep the authored in-world target as the single battle fish.
  scene.battleHero?.removeFromDisplayList?.()
  scene._qaHudObjects?.forEach?.(obj => obj?.setVisible?.(false))
}

function buildWorld(scene) {
  scene.bg?._blueprintWaterLayers?.forEach(obj => obj?.destroy?.())
  scene.bg._blueprintWaterLayers = []
  const addLayer = (asset, depth, alpha = 1) => {
    if (!asset?.key || !scene.textures.exists(asset.key)) return null
    const image = scene.add.image(FISHING_WORLD.width / 2, FISHING_WORLD.height / 2, asset.key)
      .setDisplaySize(FISHING_WORLD.width, FISHING_WORLD.height)
      .setDepth(depth)
      .setAlpha(alpha)
      .setScrollFactor(1)
    scene.bg._blueprintWaterLayers.push(image)
    return image
  }
  addLayer(ASSETS.ui.fishingApprovedCleanHarbor, 0)
  const platform = scene.add.graphics().setDepth(6).setScrollFactor(1)
  platform.fillStyle(0x8a7357, 1).lineStyle(4, 0x4c4135, 1)
  platform.fillPoints([
    { x: 0, y: FISHING_WORLD.player.y - 40 }, { x: 210, y: FISHING_WORLD.player.y - 92 },
    { x: 302, y: FISHING_WORLD.height }, { x: 0, y: FISHING_WORLD.height },
  ], true).strokePoints([
    { x: 0, y: FISHING_WORLD.player.y - 40 }, { x: 210, y: FISHING_WORLD.player.y - 92 },
    { x: 302, y: FISHING_WORLD.height }, { x: 0, y: FISHING_WORLD.height },
  ], true)
  platform.fillStyle(0x2788cf, 1).fillRoundedRect(22, FISHING_WORLD.player.y + 62, 86, 58, 9)
  platform.fillStyle(0xeef9ff, 1).fillRect(22, FISHING_WORLD.player.y + 72, 86, 10)
  scene.bg._blueprintWaterLayers.push(platform)

  scene._cameraPanPlayerShadow?.destroy?.()
  scene._cameraPanPlayer?.destroy?.()
  scene._cameraPanPlayerBlend?.destroy?.()
  scene._cameraPanPlayerShadow = scene.add.ellipse(FISHING_WORLD.player.x, FISHING_WORLD.player.y - 5, 118, 24, 0x062c44, 0.20)
    .setDepth(40)
    .setScrollFactor(1)
  scene._cameraPanPlayer = scene.add.image(FISHING_WORLD.player.x, FISHING_WORLD.player.y, ASSETS.characters.fishingMotionIdle.key)
    .setOrigin(0.5, 1)
    .setDisplaySize(150, 195)
    .setDepth(41)
    .setScrollFactor(1)
  scene._cameraPanPlayerBlend = scene.add.image(FISHING_WORLD.player.x, FISHING_WORLD.player.y, ASSETS.characters.fishingMotionIdle.key)
    .setOrigin(0.5, 1)
    .setDisplaySize(150, 195)
    .setDepth(41.1)
    .setScrollFactor(1)
    .setAlpha(0)
  scene._cameraPanPlayerBaseScale = { x: scene._cameraPanPlayer.scaleX, y: scene._cameraPanPlayer.scaleY }
  const loadout = getVisualLoadout(scene.env?.player?.rodType)
  const visual = ROD_VISUALS[loadout.rod.id] ?? ROD_VISUALS[DEFAULT_ROD_VISUAL_ID]
  scene._cameraPanRodVisual = visual
  scene._cameraPanRod = scene.add.graphics()
    .setDepth(42)
    .setScrollFactor(1)
    .setData('rodType', loadout.rod.id)
  scene._cameraPanRodLine = scene.add.graphics().setDepth(43).setScrollFactor(1)
  scene._cameraPanRodAngleOffset = 0
}

function buildHud(scene) {
  scene._cameraPanHud?.destroy?.(true)
  const W = scene.scale.width
  const H = scene.scale.height
  const compact = H < 520
  const pad = compact ? 12 : 16
  const headerH = compact ? 50 : 58
  const panelW = Math.min(compact ? 330 : 358, W - pad * 2)
  const root = scene.add.container(0, 0).setDepth(9000).setScrollFactor(0)
  const g = scene.add.graphics()
  g.fillStyle(0x062c44, 0.22).fillRoundedRect(pad, pad + 4, panelW, headerH, 18)
  g.fillStyle(0xfffdf7, 0.97).lineStyle(3, 0x173248, 0.94)
    .fillRoundedRect(pad, pad, panelW, headerH, 18).strokeRoundedRect(pad, pad, panelW, headerH, 18)
  g.lineStyle(1, 0x9bcfe5, 0.75).strokeRoundedRect(pad + 3, pad + 3, panelW - 6, headerH - 6, 15)
  const back = scene.add.text(pad + 26, pad + headerH / 2, '‹', { fontFamily: 'Nunito, sans-serif', fontSize: compact ? '34px' : '40px', fontStyle: 'bold', color: '#173248' }).setOrigin(0.5)
  const location = scene.add.text(pad + 62, pad + headerH / 2, '汐風港', { fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: compact ? '15px' : '17px', fontStyle: 'bold', color: '#173248' }).setOrigin(0, 0.5)
  const distance = scene.add.text(pad + panelW - 20, pad + headerH / 2, '', { fontFamily: 'Nunito, M PLUS Rounded 1c, sans-serif', fontSize: compact ? '13px' : '15px', fontStyle: 'bold', color: '#173248' }).setOrigin(1, 0.5)
  const status = scene.add.text(W / 2, H - (compact ? 28 : 42), '', { fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: compact ? '14px' : '16px', fontStyle: 'bold', color: '#ffffff', stroke: '#062c44', strokeThickness: 5, align: 'center' }).setOrigin(0.5).setScrollFactor(0)
  root.add([g, back, location, distance, status])
  scene._cameraPanHud = root
  scene._cameraPanHudNodes = { distance, status }
}

function syncHud(scene) {
  const nodes = scene._cameraPanHudNodes
  if (!nodes) return
  const meters = scene.bobber?.visible
    ? Math.hypot(scene.bobber.x - scene.anchorX, scene.bobber.y - scene.anchorY) / FISHING_WORLD.pxPerMeter
    : 0
  nodes.distance.setText(meters > 0.5 ? `${meters.toFixed(0)}m` : '')
  if (scene._coneCastHud) {
    nodes.status.setText('')
    return
  }
  const casting = scene._cameraPanCasting
  nodes.status.setText(casting ? '仕掛けを追っています' : scene.phase === 'cast' ? '岸から狙いを決めてキャスト' : scene.phase === 'retrieve' ? '着水地点で魚の反応を読む' : scene.phase === 'battle' ? '糸の張りを保つ' : '')
}

function showWorldPlayer(scene) {
  scene._playerSprite?.removeFromDisplayList?.()
  scene._playerShadow?.removeFromDisplayList?.()
  if ((scene._cameraPanHidePlayerUntil ?? 0) > (scene.time?.now ?? 0)) {
    scene._cameraPanPlayer?.removeFromDisplayList?.()
    scene._cameraPanPlayerBlend?.removeFromDisplayList?.()
    scene._cameraPanRod?.removeFromDisplayList?.()
    scene._cameraPanRodLine?.removeFromDisplayList?.()
    return
  }
  scene._cameraPanPlayer?.addToDisplayList?.()
  scene._cameraPanPlayerBlend?.addToDisplayList?.()
  scene._cameraPanRod?.addToDisplayList?.()
  scene._cameraPanRodLine?.addToDisplayList?.()
  scene._cameraPanPlayer?.setVisible?.(true)
  scene._cameraPanPlayerBlend?.setVisible?.(true)
  scene._cameraPanPlayerShadow?.setVisible?.(true)
  scene._cameraPanRod?.setVisible?.(true)
}

function rotateLocal(x, y, angleDeg) {
  const angle = rad(angleDeg)
  return { x: x * Math.cos(angle) - y * Math.sin(angle), y: x * Math.sin(angle) + y * Math.cos(angle) }
}

function phaseDefaults(phase = {}) {
  return { offsetX: 0, offsetY: 0, bodyScale: 1, bodyAngleDeg: 0, rodAngleOffsetDeg: 0, ...phase }
}

function poseWorldAnchor(scene, poseName, anchorName) {
  const pose = CHARACTER_MOTION_POSES[poseName]
  const player = scene._cameraPanPlayer
  const anchor = pose?.[anchorName]
  if (!anchor || !player) return null
  const frame = { width: 320, height: 420 }
  const local = {
    x: (anchor[0] - frame.width / 2) * (player.displayWidth / frame.width),
    y: (anchor[1] - frame.height) * (player.displayHeight / frame.height),
  }
  const rotated = rotateLocal(local.x, local.y, player.angle)
  return { x: player.x + rotated.x, y: player.y + rotated.y }
}

function applyWorldRodBlend(scene, fromPhase, toPhase, amount) {
  const rod = scene._cameraPanRod
  const visual = scene._cameraPanRodVisual
  const fromGrip = poseWorldAnchor(scene, fromPhase.pose, 'grip')
  const fromTip = poseWorldAnchor(scene, fromPhase.pose, 'tip')
  const toGrip = poseWorldAnchor(scene, toPhase.pose, 'grip')
  const toTip = poseWorldAnchor(scene, toPhase.pose, 'tip')
  if (!rod?.active || !visual || !fromGrip || !fromTip || !toGrip || !toTip) return
  const t = clamp(amount, 0, 1)
  const grip = { x: lerp(fromGrip.x, toGrip.x, t), y: lerp(fromGrip.y, toGrip.y, t) }
  const poseTip = { x: lerp(fromTip.x, toTip.x, t), y: lerp(fromTip.y, toTip.y, t) }
  const poseAngle = Math.atan2(poseTip.y - grip.y, poseTip.x - grip.x) + rad(lerp(fromPhase.rodAngleOffsetDeg, toPhase.rodAngleOffsetDeg, t))
  const poseLength = Math.max(1, Math.hypot(poseTip.x - grip.x, poseTip.y - grip.y) * visual.lengthScale)
  const tip = { x: grip.x + Math.cos(poseAngle) * poseLength, y: grip.y + Math.sin(poseAngle) * poseLength }
  const handle = { x: grip.x + (tip.x - grip.x) * 0.22, y: grip.y + (tip.y - grip.y) * 0.22 }
  rod.clear().setVisible(true)
  rod.lineStyle(6, 0x173248, 0.96).beginPath().moveTo(grip.x, grip.y).lineTo(tip.x, tip.y).strokePath()
  rod.lineStyle(3.2, visual.accent, 1).beginPath().moveTo(handle.x, handle.y).lineTo(tip.x, tip.y).strokePath()
  rod.lineStyle(7, 0x263847, 1).beginPath().moveTo(grip.x, grip.y).lineTo(handle.x, handle.y).strokePath()
  rod.fillStyle(0xeef9ff, 1).lineStyle(2, 0x173248, 1).fillCircle(handle.x, handle.y, 4).strokeCircle(handle.x, handle.y, 4)
  scene._cameraPanRodTip = tip
}

function setWorldPlayerBlend(scene, rawFrom, rawTo, amount) {
  const from = phaseDefaults(rawFrom)
  const to = phaseDefaults(rawTo)
  const fromPose = CHARACTER_MOTION_POSES[from.pose]
  const toPose = CHARACTER_MOTION_POSES[to.pose]
  const fromAsset = fromPose ? ASSETS.characters[fromPose.asset] : null
  const toAsset = toPose ? ASSETS.characters[toPose.asset] : null
  const player = scene._cameraPanPlayer
  const blend = scene._cameraPanPlayerBlend
  if (!fromAsset?.key || !toAsset?.key || !player?.active || !blend?.active) return
  const t = clamp(amount, 0, 1)
  scene.tweens.killTweensOf([player, blend, scene._cameraPanRodMotion])
  const baseScale = scene._cameraPanPlayerBaseScale
  const transform = {
    x: FISHING_WORLD.player.x + lerp(from.offsetX, to.offsetX, t),
    y: FISHING_WORLD.player.y + lerp(from.offsetY, to.offsetY, t),
    angle: lerp(from.bodyAngleDeg, to.bodyAngleDeg, t),
    scaleX: baseScale.x * lerp(from.bodyScale, to.bodyScale, t),
    scaleY: baseScale.y * lerp(from.bodyScale, to.bodyScale, t),
  }
  player.setTexture(fromAsset.key).setPosition(transform.x, transform.y).setAngle(transform.angle).setScale(transform.scaleX, transform.scaleY).setAlpha(1 - t)
  blend.setTexture(toAsset.key).setPosition(transform.x, transform.y).setAngle(transform.angle).setScale(transform.scaleX, transform.scaleY).setAlpha(t)
  scene._cameraPanPose = t < 0.5 ? from.pose : to.pose
  scene._cameraPanPoseBlend = { from, to, amount: t }
  scene._cameraPanRodAngleOffset = lerp(from.rodAngleOffsetDeg, to.rodAngleOffsetDeg, t)
  applyWorldRodBlend(scene, from, to, t)
}

function applyWorldRod(scene, poseName, rodAngleOffsetDeg = scene._cameraPanRodAngleOffset ?? 0) {
  const pose = CHARACTER_MOTION_POSES[poseName]
  const rod = scene._cameraPanRod
  const player = scene._cameraPanPlayer
  const visual = scene._cameraPanRodVisual
  if (!pose?.grip || !pose?.tip || !rod?.active || !player?.active || !visual) {
    rod?.setVisible?.(false)
    return
  }
  const frame = { width: 320, height: 420 }
  const width = player.displayWidth
  const height = player.displayHeight
  const local = anchor => ({ x: (anchor[0] - frame.width / 2) * (width / frame.width), y: (anchor[1] - frame.height) * (height / frame.height) })
  const gripLocal = rotateLocal(local(pose.grip).x, local(pose.grip).y, player.angle)
  const tipLocal = rotateLocal(local(pose.tip).x, local(pose.tip).y, player.angle)
  const grip = { x: player.x + gripLocal.x, y: player.y + gripLocal.y }
  const poseVector = { x: tipLocal.x - gripLocal.x, y: tipLocal.y - gripLocal.y }
  const poseAngle = Math.atan2(poseVector.y, poseVector.x) + rad(rodAngleOffsetDeg)
  const poseLength = Math.max(1, Math.hypot(poseVector.x, poseVector.y) * visual.lengthScale)
  const tip = { x: grip.x + Math.cos(poseAngle) * poseLength, y: grip.y + Math.sin(poseAngle) * poseLength }
  const handle = { x: grip.x + (tip.x - grip.x) * 0.22, y: grip.y + (tip.y - grip.y) * 0.22 }
  rod.clear().setVisible(true)
  rod.lineStyle(6, 0x173248, 0.96).beginPath().moveTo(grip.x, grip.y).lineTo(tip.x, tip.y).strokePath()
  rod.lineStyle(3.2, visual.accent, 1).beginPath().moveTo(handle.x, handle.y).lineTo(tip.x, tip.y).strokePath()
  rod.lineStyle(7, 0x263847, 1).beginPath().moveTo(grip.x, grip.y).lineTo(handle.x, handle.y).strokePath()
  rod.fillStyle(0xeef9ff, 1).lineStyle(2, 0x173248, 1).fillCircle(handle.x, handle.y, 4).strokeCircle(handle.x, handle.y, 4)
  scene._cameraPanRodTip = tip
}

function setWorldPlayerPhase(scene, phase, immediate = false) {
  phase = {
    offsetX: 0,
    offsetY: 0,
    bodyScale: 1,
    bodyAngleDeg: 0,
    rodAngleOffsetDeg: 0,
    ...phase,
  }
  const pose = CHARACTER_MOTION_POSES[phase.pose]
  const asset = pose ? ASSETS.characters[pose.asset] : null
  const player = scene._cameraPanPlayer
  if (!asset?.key || !player?.active || !scene.textures.exists(asset.key)) return
  player.setTexture(asset.key)
  player.setAlpha(1)
  scene._cameraPanPlayerBlend?.setAlpha?.(0)
  scene._cameraPanPoseBlend = null
  scene._cameraPanPose = phase.pose
  scene.tweens.killTweensOf([player, scene._cameraPanRodMotion])
  const baseScale = scene._cameraPanPlayerBaseScale
  const target = {
    x: FISHING_WORLD.player.x + phase.offsetX,
    y: FISHING_WORLD.player.y + phase.offsetY,
    angle: phase.bodyAngleDeg,
    scaleX: baseScale.x * phase.bodyScale,
    scaleY: baseScale.y * phase.bodyScale,
  }
  if (immediate || phase.durationMs <= 1) {
    player.setPosition(target.x, target.y).setAngle(target.angle).setScale(target.scaleX, target.scaleY)
    scene._cameraPanRodAngleOffset = phase.rodAngleOffsetDeg
    applyWorldRod(scene, phase.pose)
    return
  }
  const rodMotion = { angle: scene._cameraPanRodAngleOffset ?? 0 }
  scene._cameraPanRodMotion = rodMotion
  scene.tweens.add({
    targets: player,
    ...target,
    duration: phase.durationMs,
    ease: phase.ease,
    onUpdate: () => {
      scene._cameraPanRodAngleOffset = rodMotion.angle
      applyWorldRod(scene, phase.pose)
    },
  })
  scene.tweens.add({ targets: rodMotion, angle: phase.rodAngleOffsetDeg, duration: phase.durationMs, ease: phase.ease })
  applyWorldRod(scene, phase.pose)
}

function cancelCastMotion(scene, { idle = false } = {}) {
  if (scene._pullCastTimeline?.releasedAt != null) scene._pullCastLastTimeline = { ...scene._pullCastTimeline }
  scene._pullCastTimeline = null
  scene._pullCastPreviewPhase = null
  scene._cameraPanMotionToken = (scene._cameraPanMotionToken ?? 0) + 1
  scene._cameraPanMotionTimers?.forEach(timer => timer?.remove?.(false))
  scene._cameraPanMotionTimers = []
  scene.tweens.killTweensOf([scene._cameraPanPlayer, scene._cameraPanRodMotion])
  if (idle) setWorldPlayerPhase(scene, { pose: 'idle', durationMs: 1, ease: 'Linear', offsetX: 0, offsetY: 0, bodyScale: 1, bodyAngleDeg: 0, rodAngleOffsetDeg: 0 }, true)
}

function playCastMotion(scene, args, originalFireCast) {
  const profile = resolveCastMotionProfile(window.location.search, isReducedMotion())
  scene._castMotionProfile = profile
  scene._cameraPanMotionToken = (scene._cameraPanMotionToken ?? 0) + 1
  const token = scene._cameraPanMotionToken
  scene._cameraPanMotionTimers = []
  profile.phases.forEach((phase, index) => {
    const run = () => {
      if (token !== scene._cameraPanMotionToken || !scene.sys?.isActive?.()) return
      setWorldPlayerPhase(scene, phase, index === 0)
      scene.events.emit('ainan-cast-motion-phase', { profile: profile.name, phase: phase.id, atMs: profile.phaseStartMs[phase.id] })
    }
    if (index === 0) run()
    else scene._cameraPanMotionTimers.push(scene.time.delayedCall(profile.phaseStartMs[phase.id], run))
  })
  scene._cameraPanMotionTimers.push(scene.time.delayedCall(profile.camera.panStartMs, () => {
    if (token !== scene._cameraPanMotionToken || scene.phase !== 'cast') return
    scene.fishingCamera?.beginCastPan(args[0], args[1], profile.camera)
    scene.events.emit('ainan-cast-camera-pan', { profile: profile.name, atMs: profile.camera.panStartMs, bobberVisible: Boolean(scene.bobber?.visible) })
  }))
  scene._cameraPanMotionTimers.push(scene.time.delayedCall(profile.releaseEventMs, () => {
    if (token !== scene._cameraPanMotionToken || scene.phase !== 'cast') return
    const result = originalFireCast.apply(scene, args)
    if (!scene.bobber?.visible) {
      scene._cameraPanCasting = false
      cancelCastMotion(scene, { idle: true })
      return
    }
    scene.events.emit('ainan-cast-release', { profile: profile.name, atMs: profile.releaseEventMs, result })
  }))
  scene._cameraPanMotionTimers.push(scene.time.delayedCall(profile.totalMs, () => {
    if (token === scene._cameraPanMotionToken && scene.phase === 'cast') {
      setWorldPlayerPhase(scene, { pose: 'idle', durationMs: 90, ease: 'Sine.easeOut', offsetX: 0, offsetY: 0, bodyScale: 1, bodyAngleDeg: 0, rodAngleOffsetDeg: 0 })
    }
  }))
  return true
}

function chargedPullProfile() {
  return resolveCastMotionProfile('?castMotion=charged', isReducedMotion())
}

function emitPullPhase(scene, timeline, phase) {
  if (timeline.phase === phase) return
  timeline.phase = phase
  scene.events.emit('ainan-cast-motion-phase', {
    profile: timeline.profile.name,
    phase,
    source: timeline.mode === 'release' ? 'pullRelease' : 'pullGesture',
    atSceneMs: scene.time?.now ?? 0,
  })
}

function syncPullCastMotion(scene, snapshot) {
  const profile = chargedPullProfile()
  if (scene._cameraPanCasting || snapshot.mode !== 'pull') return false
  const ready = phaseDefaults(profile.phases.find(item => item.id === 'ready'))
  const drawBack = phaseDefaults(profile.phases.find(item => item.id === 'drawBack'))
  const charge = phaseDefaults(profile.phases.find(item => item.id === 'charge'))
  const timeline = scene._pullCastTimeline?.mode === 'gesture'
    ? scene._pullCastTimeline
    : { mode: 'gesture', phase: null, profile, startedAt: scene.time?.now ?? 0 }
  Object.assign(timeline, snapshot, { mode: 'gesture', profile, updatedAt: scene.time?.now ?? 0 })
  scene._pullCastTimeline = timeline
  scene._castMotionProfile = profile
  if (!snapshot.armed) {
    const armProgress = PULL_CAST_TUNING.gesture.minPullDistancePx / PULL_CAST_TUNING.gesture.fullPullDistancePx
    const blend = clamp(snapshot.pullProgress / armProgress, 0, 1)
    timeline.visualPose = blend < 0.08 ? 'idle' : `idle>castMid ${Math.round(blend * 100)}%`
    emitPullPhase(scene, timeline, blend < 0.08 ? 'ready' : 'drawBack')
    setWorldPlayerBlend(scene, ready, drawBack, blend)
  } else {
    const blend = clamp(snapshot.chargeRatio / PULL_CAST_TUNING.motion.chargePoseBlendEnd, 0, 1)
    timeline.visualPose = blend < 1 ? `castMid>castWindup ${Math.round(blend * 100)}%` : 'castWindup'
    emitPullPhase(scene, timeline, 'charge')
    setWorldPlayerBlend(scene, drawBack, charge, blend)
  }
  return true
}

function playPrechargedRelease(scene, args, originalFireCast, releaseContext) {
  const profile = chargedPullProfile()
  scene._cameraPanMotionToken = (scene._cameraPanMotionToken ?? 0) + 1
  scene._cameraPanMotionTimers?.forEach(timer => timer?.remove?.(false))
  scene._cameraPanMotionTimers = []
  scene.tweens.killTweensOf([scene._cameraPanPlayer, scene._cameraPanPlayerBlend, scene._cameraPanRodMotion])
  scene._castMotionProfile = profile
  const now = scene.time?.now ?? 0
  scene._pullCastTimeline = {
    mode: 'release', phase: null, profile, releasedAt: now, updatedAt: now,
    releaseOffsetMs: profile.releaseEventMs - profile.phaseStartMs.swing,
    args, originalFireCast, releaseContext,
    lureReleasedAt: null, cameraStartedAt: null, result: true,
  }
  emitPullPhase(scene, scene._pullCastTimeline, 'swing')
  return true
}

function updatePullCastTimeline(scene) {
  const timeline = scene._pullCastTimeline
  if (!timeline || timeline.mode !== 'release') return
  const now = scene.time?.now ?? 0
  const elapsed = now - timeline.releasedAt
  const profile = timeline.profile
  const charge = phaseDefaults(profile.phases.find(phase => phase.id === 'charge'))
  const swing = phaseDefaults(profile.phases.find(phase => phase.id === 'swing'))
  const follow = phaseDefaults(profile.phases.find(phase => phase.id === 'followThrough'))
  const idle = phaseDefaults({ pose: 'idle' })
  const followStart = swing.durationMs
  const recoverStart = followStart + follow.durationMs
  const recoverEnd = recoverStart + PULL_CAST_TUNING.motion.recoveryMs

  if (elapsed < followStart) {
    emitPullPhase(scene, timeline, 'swing')
    const blend = clamp(elapsed / swing.durationMs, 0, 1)
    timeline.visualPose = `castWindup>castRelease ${Math.round(blend * 100)}%`
    setWorldPlayerBlend(scene, charge, swing, blend)
  } else if (elapsed < recoverStart) {
    emitPullPhase(scene, timeline, 'followThrough')
    const blend = clamp((elapsed - followStart) / follow.durationMs, 0, 1)
    timeline.visualPose = 'castRelease'
    setWorldPlayerBlend(scene, swing, follow, blend)
  } else if (elapsed < recoverEnd) {
    emitPullPhase(scene, timeline, 'recover')
    const blend = clamp((elapsed - recoverStart) / PULL_CAST_TUNING.motion.recoveryMs, 0, 1)
    timeline.visualPose = `castRelease>idle ${Math.round(blend * 100)}%`
    setWorldPlayerBlend(scene, follow, idle, blend)
  } else if (timeline.phase !== 'flight') {
    setWorldPlayerPhase(scene, { ...idle, durationMs: 1, ease: 'Linear' }, true)
    emitPullPhase(scene, timeline, 'flight')
    timeline.visualPose = 'idle'
  }

  if (timeline.lureReleasedAt == null && elapsed >= timeline.releaseOffsetMs) {
    const result = timeline.originalFireCast.apply(scene, timeline.args)
    if (!scene.bobber?.visible) {
      scene._cameraPanCasting = false
      if (scene._coneCastState) {
        scene._coneCastState.castLocked = false
        scene._coneCastState.inputMode = 'aim'
      }
      cancelCastMotion(scene, { idle: true })
      return
    }
    timeline.result = result
    timeline.lureReleasedAt = now
    timeline.lureOrigin = { ...(scene._cameraPanRodTip ?? { x: scene.anchorX, y: scene.anchorY }) }
    scene.bobber.setPosition(timeline.lureOrigin.x, timeline.lureOrigin.y)
    scene.events.emit('ainan-cast-release', { profile: profile.name, atMs: elapsed, atSceneMs: now, result, source: 'pullRelease', releaseContext: timeline.releaseContext })
  }

  if (timeline.lureReleasedAt != null) {
    const detachElapsed = now - timeline.lureReleasedAt
    if (detachElapsed < PULL_CAST_TUNING.motion.lureDetachBlendMs) {
      const target = { x: scene.bobber.x, y: scene.bobber.y }
      const blend = clamp(detachElapsed / PULL_CAST_TUNING.motion.lureDetachBlendMs, 0, 1)
      scene.bobber.setPosition(lerp(timeline.lureOrigin.x, target.x, blend), lerp(timeline.lureOrigin.y, target.y, blend))
    }
  }

  if (timeline.cameraStartedAt == null && timeline.lureReleasedAt != null && now - timeline.lureReleasedAt >= PULL_CAST_TUNING.motion.cameraDelayAfterLureMs) {
    timeline.cameraStartedAt = now
    scene.fishingCamera?.beginCastPan(timeline.args[0], timeline.args[1], profile.camera)
    scene.events.emit('ainan-cast-camera-pan', { profile: profile.name, atMs: elapsed, atSceneMs: now, bobberVisible: Boolean(scene.bobber?.visible), source: 'pullRelease' })
  }
  timeline.updatedAt = now
}

export function installCastCameraPanPrototype(GameScene) {
  if (GameScene.prototype.__ainanCastCameraPanPrototypeInstalled) return
  GameScene.prototype.__ainanCastCameraPanPrototypeInstalled = true

  const originalPreload = GameScene.prototype.preload
  GameScene.prototype.preload = function (...args) {
    originalPreload?.apply(this, args)
    if (!enabled()) return
    fieldAssets().forEach(asset => {
      if (asset?.status === 'ready' && asset.key && !this.textures.exists(asset.key)) this.load.image(asset.key, asset.path)
    })
  }

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    if (!enabled()) return result
    buildWorld(this)
    buildHud(this)
    hideFixedPresentation(this)
    showWorldPlayer(this)
    setWorldPlayerPhase(this, { pose: 'idle', durationMs: 1, ease: 'Linear' }, true)
    this.fishingCamera?.focusPlayer(true)
    this._cameraPanCasting = false
    this._pullCastPreviewPhase = null
    this._syncPullCastMotion = snapshot => syncPullCastMotion(this, snapshot)
    this._cancelPullCastMotion = () => cancelCastMotion(this, { idle: true })
    this._cameraPanResize = () => {
      buildHud(this)
      if (this.phase === 'cast') this.fishingCamera?.focusPlayer(true)
      else if (this.bobber?.visible) this.fishingCamera?.holdLure(this.bobber.x, this.bobber.y)
    }
    this.scale?.on?.('resize', this._cameraPanResize)
    return result
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    const result = originalEnterCast.apply(this, args)
    if (!enabled()) return result
    this._cameraPanCasting = false
    cancelCastMotion(this)
    hideFixedPresentation(this)
    showWorldPlayer(this)
    setWorldPlayerPhase(this, { pose: 'idle', durationMs: 1, ease: 'Linear' }, true)
    this.fishingCamera?.focusPlayer(false)
    return result
  }

  const originalOnDown = GameScene.prototype._onDown
  GameScene.prototype._onDown = function (...args) {
    const pointer = args[0]
    if (enabled() && ['cast', 'retrieve'].includes(this.phase) && pointer?.x <= 58 && pointer?.y <= 70) {
      this.scene.start('MapScene')
      return true
    }
    return originalOnDown.apply(this, args)
  }

  const originalFireCast = GameScene.prototype._fireCast
  GameScene.prototype._fireCast = function (...args) {
    if (!enabled()) return originalFireCast.apply(this, args)
    if (this._cameraPanCasting) return false
    this._cameraPanCasting = true
    hideFixedPresentation(this)
    showWorldPlayer(this)
    const releaseContext = this._pullCastPrechargedRelease
    this._pullCastPrechargedRelease = null
    if (releaseContext) return playPrechargedRelease(this, args, originalFireCast, releaseContext)
    return playCastMotion(this, args, originalFireCast)
  }

  const originalEnterRetrieve = GameScene.prototype._enterRetrieve
  GameScene.prototype._enterRetrieve = function (...args) {
    const result = originalEnterRetrieve.apply(this, args)
    if (!enabled()) return result
    this._cameraPanCasting = false
    cancelCastMotion(this, { idle: true })
    hideFixedPresentation(this)
    showWorldPlayer(this)
    this.lineGfx?.setVisible?.(false)
    return result
  }

  const originalEnterBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    const result = originalEnterBattle.apply(this, args)
    if (!enabled()) return result
    cancelCastMotion(this, { idle: true })
    this.cameras.main.resetFX?.()
    this._cameraPanHidePlayerUntil = (this.time?.now ?? 0) + 900
    hideFixedPresentation(this)
    showWorldPlayer(this)
    return result
  }

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (...args) {
    const result = originalFinishBattle.apply(this, args)
    if (!enabled() || result === false) return result
    showWorldPlayer(this)
    this.fishingCamera?.focusPlayer(false)
    return result
  }

  const originalUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (...args) {
    const result = originalUpdate?.apply(this, args)
    if (!enabled()) return result
    hideFixedPresentation(this)
    showWorldPlayer(this)
    this.lineGfx?.setVisible?.(false)
    if (this.phase === 'retrieve' && this.bobber?.visible) {
      this._rcRetrieveLine?.setVisible?.(false)
    }
    updatePullCastTimeline(this)
    if (this._cameraPanPoseBlend) applyWorldRodBlend(this, this._cameraPanPoseBlend.from, this._cameraPanPoseBlend.to, this._cameraPanPoseBlend.amount)
    else applyWorldRod(this, this._cameraPanPose ?? 'idle')
    if (this.bobber?.visible && ['cast', 'retrieve'].includes(this.phase)) {
      this._cameraPanRodLine?.setVisible?.(true).clear().lineStyle(2, 0xffffff, 0.82)
        .lineBetween(this._cameraPanRodTip?.x ?? this.anchorX, this._cameraPanRodTip?.y ?? this.anchorY, this.bobber.x, this.bobber.y)
    } else this._cameraPanRodLine?.clear?.()
    syncHud(this)
    return result
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    cancelCastMotion(this)
    this._cameraPanHud?.destroy?.(true)
    this._cameraPanHud = null
    this._cameraPanHudNodes = null
    this._cameraPanPlayer?.destroy?.()
    this._cameraPanPlayer = null
    this._cameraPanPlayerBlend?.destroy?.()
    this._cameraPanPlayerBlend = null
    this._cameraPanPlayerShadow?.destroy?.()
    this._cameraPanPlayerShadow = null
    this._cameraPanRod?.destroy?.()
    this._cameraPanRod = null
    this._cameraPanRodLine?.destroy?.()
    this._cameraPanRodLine = null
    this.scale?.off?.('resize', this._cameraPanResize)
    this._cameraPanResize = null
    this._syncPullCastMotion = null
    this._cancelPullCastMotion = null
    return originalCleanup.apply(this, args)
  }
}
