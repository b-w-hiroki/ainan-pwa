import { ASSETS } from '../../config/assetManifest.js'
import { isReducedMotion } from '../../game/feedback.js'
import {
  ACCESSORY_VISUALS,
  DEFAULT_ROD_VISUAL_ID,
  ROD_VISUALS,
  createAccessoryAccent,
} from '../equipmentVisuals.js'

export { DEFAULT_ROD_VISUAL_ID, ROD_VISUALS } from '../equipmentVisuals.js'

const FRAME = Object.freeze({ width: 320, height: 420 })
const HELD_FISH_BOUNDS = Object.freeze({ width: 150, height: 86, offsetX: 44, liftY: 22 })
export const CHARACTER_MOTION_LAYOUTS = Object.freeze({
  cast: Object.freeze({ x: 101, y: 670, displayWidth: 218, displayHeight: 286 }),
  retrieve: Object.freeze({ x: 101, y: 670, displayWidth: 218, displayHeight: 286 }),
  battle: Object.freeze({ x: 100, y: 600, displayWidth: 190, displayHeight: 249 }),
  result: Object.freeze({ x: 86, y: 540, displayWidth: 190, displayHeight: 249 }),
})

export const CHARACTER_MOTION_POSES = Object.freeze({
  idle: { asset: 'fishingMotionIdle', grip: [214, 193], tip: [261, 58] },
  castWindup: { asset: 'fishingMotionCastWindup', grip: [75, 139], tip: [23, 38] },
  castMid: { asset: 'fishingMotionCastMid', grip: [250, 151], tip: [291, 47] },
  castRelease: { asset: 'fishingMotionCastRelease', grip: [282, 147], tip: [316, 42] },
  fightLeft: { asset: 'fishingMotionFightLeft', grip: [242, 202], tip: [302, 52] },
  fightMid: { asset: 'fishingMotionFightMid', grip: [250, 188], tip: [306, 48] },
  fightRight: { asset: 'fishingMotionFightRight', grip: [242, 202], tip: [304, 70] },
  joyLift: { asset: 'fishingMotionJoyLift', fish: [225, 204] },
  joyMid: { asset: 'fishingMotionJoyMid', fish: [247, 202] },
  joyHold: { asset: 'fishingMotionJoyHold', fish: [250, 210] },
  sadDrop: { asset: 'fishingMotionSadDrop', grip: [230, 308], tip: [302, 380] },
  sadMid: { asset: 'fishingMotionSadMid', grip: [247, 296], tip: [306, 388] },
  sadSlump: { asset: 'fishingMotionSadSlump', grip: [225, 315], tip: [292, 402] },
})

export const CHARACTER_MOTION_TIMING = Object.freeze({
  charge: Object.freeze([{ pose: 'castMid', ms: 120 }, { pose: 'castWindup', ms: 170 }]),
  release: Object.freeze([{ pose: 'castMid', ms: 80 }, { pose: 'castRelease', ms: 210 }, { pose: 'castRelease', ms: 190 }, { pose: 'idle', ms: 180 }]),
  fight: Object.freeze([{ pose: 'fightLeft', ms: 170 }, { pose: 'fightMid', ms: 120 }, { pose: 'fightRight', ms: 170 }, { pose: 'fightMid', ms: 120 }]),
  joy: Object.freeze([{ pose: 'joyLift', ms: 180 }, { pose: 'joyMid', ms: 170 }, { pose: 'joyHold', ms: 430 }, { pose: 'joyMid', ms: 160 }, { pose: 'idle', ms: 220 }]),
  sad: Object.freeze([{ pose: 'sadDrop', ms: 220 }, { pose: 'sadMid', ms: 230 }, { pose: 'sadSlump', ms: 470 }, { pose: 'sadMid', ms: 180 }, { pose: 'idle', ms: 240 }]),
})

const requiredAssets = () => [
  ...new Set(Object.values(CHARACTER_MOTION_POSES).map(pose => ASSETS.characters[pose.asset])),
  ASSETS.characters.fishingMotionHeldRod,
]

export function characterMotionAssets() {
  return [...new Set([
    ...requiredAssets(),
    ...Object.values(ROD_VISUALS).map(visual => ASSETS.characters[visual.asset]),
  ])].filter(Boolean)
}

export class CharacterMotionController {
  constructor(scene) {
    this.scene = scene
    this.root = null
    this.poseFront = null
    this.poseBack = null
    this.rod = null
    this.rodType = DEFAULT_ROD_VISUAL_ID
    this.rodVisual = ROD_VISUALS[DEFAULT_ROD_VISUAL_ID]
    this.rodTextureFallback = false
    this.accessoryAccents = {}
    this.accessoryIds = { hat: null, bag: null }
    this.line = null
    this.fish = null
    this.currentPose = 'idle'
    this.currentAction = null
    this.token = 0
    this.timer = null
    this.previous = { phase: null, charging: false, outcome: null }
    this.layout = CHARACTER_MOTION_LAYOUTS.cast
    this.layoutPhase = 'cast'
    this.ready = false
  }

  mount(parent) {
    if (this.root?.active) return this
    const scene = this.scene
    this.ready = requiredAssets().every(asset => asset?.key && scene.textures.exists(asset.key))
    if (!this.ready) return this
    this.root = scene.add.container(0, 0).setDepth(75)
    this.poseFront = scene.add.image(this.layout.x, this.layout.y, ASSETS.characters.fishingMotionIdle.key)
      .setOrigin(0.5, 1).setDisplaySize(this.layout.displayWidth, this.layout.displayHeight)
    // Keep the rod as native geometry. Some browsers composited the transparent
    // rod texture as an opaque black rectangle during alpha animation.
    this.rod = scene.add.graphics()
    this.accessoryAccents.cap = createAccessoryAccent(scene, 'cap')
    this.accessoryAccents.bag = createAccessoryAccent(scene, 'bag')
    this.line = scene.add.graphics()
    this.fish = scene.add.image(0, 0, ASSETS.fishHeroes.tai.key)
      .setVisible(false).setAngle(-4)
    this._fitFish(HELD_FISH_BOUNDS.width, HELD_FISH_BOUNDS.height)
    this.root.add([this.poseFront, this.accessoryAccents.bag, this.accessoryAccents.cap, this.rod, this.line, this.fish])
    parent.add(this.root)
    this._setRodVisual(DEFAULT_ROD_VISUAL_ID, true)
    this._applyPose('idle', true)
    return this
  }

  _point([x, y]) {
    const layout = this.layout
    return {
      x: layout.x - layout.displayWidth / 2 + x * (layout.displayWidth / FRAME.width),
      y: layout.y - layout.displayHeight + y * (layout.displayHeight / FRAME.height),
    }
  }

  _applyLayout(phase) {
    const next = CHARACTER_MOTION_LAYOUTS[phase] ?? CHARACTER_MOTION_LAYOUTS.cast
    if (this.layoutPhase === phase && this.layout === next) return
    this.layout = next
    this.layoutPhase = phase
    ;[this.poseFront, this.poseBack].forEach(image => image?.setPosition(next.x, next.y).setDisplaySize(next.displayWidth, next.displayHeight))
    const pose = CHARACTER_MOTION_POSES[this.currentPose]
    if (pose) { this._applyRod(pose); this._applyAccessories(pose); this._applyFish(pose) }
  }

  _applyRod(pose) {
    this.line.clear()
    if (!pose.grip || !pose.tip) {
      this.rod.setVisible(false)
      return
    }
    const grip = this._point(pose.grip)
    const poseTip = this._point(pose.tip)
    const visual = this.rodVisual ?? ROD_VISUALS[DEFAULT_ROD_VISUAL_ID]
    const poseDx = poseTip.x - grip.x
    const poseDy = poseTip.y - grip.y
    const poseLength = Math.max(1, Math.hypot(poseDx, poseDy))
    const phase = this.scene.phase ?? this.layoutPhase
    const flex = visual.flex[phase] ?? 0
    const tip = {
      x: grip.x + poseDx * visual.lengthScale - (poseDy / poseLength) * poseLength * flex,
      y: grip.y + poseDy * visual.lengthScale + (poseDx / poseLength) * poseLength * flex,
    }
    this.rod.clear().setVisible(true)
    const rodControl = {
      x: (grip.x + tip.x) / 2 - (poseDy / poseLength) * poseLength * flex * 0.55,
      y: (grip.y + tip.y) / 2 + (poseDx / poseLength) * poseLength * flex * 0.55,
    }
    const drawRodCurve = (width, color, alpha) => {
      this.rod.lineStyle(width, color, alpha)
      this.rod.beginPath()
      this.rod.moveTo(grip.x, grip.y)
      for (let index = 1; index <= 10; index += 1) {
        const t = index / 10
        const inverse = 1 - t
        this.rod.lineTo(
          inverse * inverse * grip.x + 2 * inverse * t * rodControl.x + t * t * tip.x,
          inverse * inverse * grip.y + 2 * inverse * t * rodControl.y + t * t * tip.y,
        )
      }
      this.rod.strokePath()
    }
    drawRodCurve(7, 0x183146, 0.96)
    drawRodCurve(3, visual.accent, 1)
    this.rod.fillStyle(0x183146, 1).fillCircle(grip.x, grip.y, 7)
    this.rod.fillStyle(visual.accent, 1).fillCircle(grip.x, grip.y, 4)
    this.rod.lineStyle(2, visual.accent, 0.95).strokeCircle(grip.x + 7, grip.y + 5, 5)
    const target = phase === 'battle'
      ? { x: 228, y: 330 }
      : phase === 'result'
        ? { x: tip.x + 14, y: tip.y + 24 }
        : { x: 310, y: 235 }
    const line = visual.line
    const lineDx = target.x - tip.x
    const lineDy = target.y - tip.y
    const lineLength = Math.max(1, Math.hypot(lineDx, lineDy))
    const control = {
      x: (tip.x + target.x) / 2 - (lineDy / lineLength) * line.curve,
      y: (tip.y + target.y) / 2 + (lineDx / lineLength) * line.curve,
    }
    this.line.lineStyle(line.width, line.color, line.alpha)
    this.line.beginPath()
    this.line.moveTo(tip.x, tip.y)
    const curveSteps = 8
    for (let index = 1; index <= curveSteps; index += 1) {
      const t = index / curveSteps
      const inverse = 1 - t
      this.line.lineTo(
        inverse * inverse * tip.x + 2 * inverse * t * control.x + t * t * target.x,
        inverse * inverse * tip.y + 2 * inverse * t * control.y + t * t * target.y,
      )
    }
    this.line.strokePath()
    this.root.setData('rodTip', { x: Math.round(tip.x), y: Math.round(tip.y) })
  }

  _setRodVisual(rodType, force = false) {
    const resolvedType = ROD_VISUALS[rodType] ? rodType : DEFAULT_ROD_VISUAL_ID
    if (!force && this.rodType === resolvedType) return
    const visual = ROD_VISUALS[resolvedType]
    this.rodType = resolvedType
    this.rodVisual = visual
    this.rodTextureFallback = false
    this.root.setData('rodType', resolvedType)
    this.root.setData('rodTexture', `native:${resolvedType}`)
    this.root.setData('rodTextureFallback', this.rodTextureFallback)
    const pose = CHARACTER_MOTION_POSES[this.currentPose]
    if (pose) this._applyRod(pose)
  }

  _setAccessoryVisuals(accessories = {}) {
    const next = { hat: accessories.hat ?? null, bag: accessories.bag ?? null }
    if (this.accessoryIds.hat === next.hat && this.accessoryIds.bag === next.bag) return
    this.accessoryIds = next
    this.root.setData('accessories', { ...next })
    const pose = CHARACTER_MOTION_POSES[this.currentPose]
    if (pose) this._applyAccessories(pose)
  }

  _applyAccessories(_pose) {
    for (const [id, accent] of Object.entries(this.accessoryAccents)) {
      const visual = ACCESSORY_VISUALS[id]
      const equipped = this.accessoryIds[visual.slot] === id
      const anchor = visual.anchors[this.currentPose]
      if (!equipped || !anchor) { accent.setVisible(false); continue }
      const point = this._point(anchor)
      const sourceScale = this.layout.displayWidth / FRAME.width
      accent.setVisible(true).setPosition(point.x, point.y).setRotation((anchor[2] ?? 0) * Math.PI / 180).setScale(sourceScale)
    }
  }

  _applyFish(pose) {
    if (!pose.fish) { this.fish.setVisible(false); return }
    const point = this._point(pose.fish)
    this.fish.setVisible(true).setPosition(point.x + HELD_FISH_BOUNDS.offsetX, point.y - HELD_FISH_BOUNDS.liftY)
  }

  _fitFish(maxWidth, maxHeight) {
    const source = this.fish?.texture?.getSourceImage?.()
    const width = source?.naturalWidth ?? source?.width ?? 1
    const height = source?.naturalHeight ?? source?.height ?? 1
    const scale = Math.min(maxWidth / width, maxHeight / height)
    this.fish?.setDisplaySize(Math.round(width * scale), Math.round(height * scale))
  }

  _applyPose(name, immediate = false) {
    const pose = CHARACTER_MOTION_POSES[name]
    const asset = ASSETS.characters[pose.asset]
    if (!pose || !asset || !this.scene.textures.exists(asset.key)) return false
    // Pose timing still supplies the authored in-betweens. Switch the one
    // visible texture atomically so transparent pixels never enter an
    // intermediate-alpha compositor path.
    this.scene.tweens.killTweensOf(this.poseFront)
    this.poseFront.setTexture(asset.key).setVisible(true).setAlpha(1)
    this.currentPose = name
    this._applyAccessories(pose)
    this._applyRod(pose)
    this._applyFish(pose)
    this.root.setData('pose', name)
    this.scene.events.emit('ainan-character-pose', { action: this.currentAction, pose: name })
    return true
  }

  _cancel({ idle = false } = {}) {
    this.token += 1
    this.timer?.remove(false)
    this.timer = null
    this.scene.tweens.killTweensOf([this.poseFront, this.root])
    this.currentAction = null
    if (idle && this.ready) this._applyPose('idle', true)
  }

  play(action, { loop = false, hold = false } = {}) {
    if (!this.ready || (this.currentAction === action && (loop || hold))) return false
    this._cancel()
    this.currentAction = action
    const token = this.token
    const reduced = isReducedMotion()
    const reducedSequences = {
      charge: [{ pose: 'castWindup', ms: 240 }],
      release: [{ pose: 'castRelease', ms: 120 }, { pose: 'idle', ms: 120 }],
      fight: [{ pose: 'fightMid', ms: 900 }],
      joy: [{ pose: 'joyHold', ms: 240 }, { pose: 'idle', ms: 120 }],
      sad: [{ pose: 'sadSlump', ms: 240 }, { pose: 'idle', ms: 120 }],
    }
    const sequence = reduced ? reducedSequences[action] : CHARACTER_MOTION_TIMING[action]
    let index = 0
    const step = () => {
      if (token !== this.token || !this.root?.active) return
      const frame = sequence[index]
      this._applyPose(frame.pose)
      this.timer = this.scene.time.delayedCall(frame.ms, () => {
        if (token !== this.token) return
        index += 1
        if (index < sequence.length) { step(); return }
        if (loop) { index = 0; step(); return }
        if (!hold) {
          this.currentAction = null
          if (action !== 'release' && action !== 'joy' && action !== 'sad') this._applyPose('idle')
        }
      })
    }
    step()
    return true
  }

  sync(view) {
    if (!this.ready || !this.root?.active) return
    const { phase, isCharging, result, rodType, accessories } = view
    this.root.setData('rodRequestedType', view.rodRequestedType)
    this.root.setData('rodStateFallback', Boolean(view.rodVisualFallback))
    this._setRodVisual(rodType)
    this._setAccessoryVisuals(accessories)
    this._applyLayout(phase)
    this.root.setVisible(['cast', 'battle', 'result'].includes(phase) || (phase === 'retrieve' && this.currentAction === 'release'))
    if (phase === 'cast') {
      if (isCharging && !this.previous.charging) this.play('charge', { hold: true })
      else if (!isCharging && this.previous.charging) this.play('release')
      else if (this.previous.phase !== 'cast' && !isCharging) { this._cancel({ idle: true }) }
    } else if (phase === 'battle' && this.previous.phase !== 'battle') {
      this.play('fight', { loop: true })
    } else if (phase === 'result' && (this.previous.phase !== 'result' || this.previous.outcome !== result.outcome)) {
      this.play(result.outcome === 'caught' ? 'joy' : 'sad')
    } else if (phase === 'retrieve' && this.previous.phase !== 'retrieve' && this.currentAction !== 'release') {
      this._cancel({ idle: true })
    }
    this.previous = { phase, charging: isCharging, outcome: result.outcome }
  }

  setFishTexture(asset) {
    if (asset?.key && this.scene.textures.exists(asset.key) && this.fish.texture?.key !== asset.key) {
      this.fish.setTexture(asset.key)
    }
    this._fitFish(HELD_FISH_BOUNDS.width, HELD_FISH_BOUNDS.height)
  }

  destroy() {
    this._cancel()
    this.root?.destroy(true)
    this.root = null
    this.ready = false
  }
}
