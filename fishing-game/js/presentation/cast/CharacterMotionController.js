import { ASSETS } from '../../config/assetManifest.js'
import { isReducedMotion } from '../../game/feedback.js'

const FRAME = Object.freeze({ width: 320, height: 420 })
export const CHARACTER_MOTION_LAYOUTS = Object.freeze({
  cast: Object.freeze({ x: 101, y: 670, displayWidth: 218, displayHeight: 286 }),
  retrieve: Object.freeze({ x: 101, y: 670, displayWidth: 218, displayHeight: 286 }),
  battle: Object.freeze({ x: 100, y: 600, displayWidth: 190, displayHeight: 249 }),
  result: Object.freeze({ x: 86, y: 540, displayWidth: 190, displayHeight: 249 }),
})
const ROD_SOURCE = Object.freeze({ grip: [130, 515], tip: [169, 379], width: 390, height: 844 })

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
  return requiredAssets().filter(Boolean)
}

export class CharacterMotionController {
  constructor(scene) {
    this.scene = scene
    this.root = null
    this.poseFront = null
    this.poseBack = null
    this.rod = null
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
    this.poseBack = scene.add.image(this.layout.x, this.layout.y, ASSETS.characters.fishingMotionIdle.key)
      .setOrigin(0.5, 1).setDisplaySize(this.layout.displayWidth, this.layout.displayHeight).setAlpha(0)
    this.poseFront = scene.add.image(this.layout.x, this.layout.y, ASSETS.characters.fishingMotionIdle.key)
      .setOrigin(0.5, 1).setDisplaySize(this.layout.displayWidth, this.layout.displayHeight)
    this.rod = scene.add.image(0, 0, ASSETS.characters.fishingMotionHeldRod.key)
      .setOrigin(ROD_SOURCE.grip[0] / ROD_SOURCE.width, ROD_SOURCE.grip[1] / ROD_SOURCE.height)
      .setScale(ROD_SOURCE.scale)
    this.line = scene.add.graphics()
    this.fish = scene.add.image(0, 0, ASSETS.fishHeroes.tai.key)
      .setDisplaySize(88, 50).setVisible(false).setAngle(-4)
    this.root.add([this.poseBack, this.poseFront, this.rod, this.line, this.fish])
    parent.add(this.root)
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
    if (pose) { this._applyRod(pose); this._applyFish(pose) }
  }

  _applyRod(pose) {
    this.line.clear()
    if (!pose.grip || !pose.tip) {
      this.rod.setVisible(false)
      return
    }
    const grip = this._point(pose.grip)
    const tip = this._point(pose.tip)
    const sourceAngle = Math.atan2(ROD_SOURCE.tip[1] - ROD_SOURCE.grip[1], ROD_SOURCE.tip[0] - ROD_SOURCE.grip[0])
    const targetAngle = Math.atan2(tip.y - grip.y, tip.x - grip.x)
    const sourceLength = Math.hypot(ROD_SOURCE.tip[0] - ROD_SOURCE.grip[0], ROD_SOURCE.tip[1] - ROD_SOURCE.grip[1])
    const targetLength = Math.hypot(tip.x - grip.x, tip.y - grip.y)
    this.rod.setVisible(true).setPosition(grip.x, grip.y).setScale(targetLength / sourceLength).setRotation(targetAngle - sourceAngle)
    const phase = this.scene.phase
    const target = phase === 'battle'
      ? { x: 228, y: 330 }
      : phase === 'result'
        ? { x: tip.x + 14, y: tip.y + 24 }
        : { x: 310, y: 235 }
    this.line.lineStyle(1.35, 0xeafcff, 0.82)
    this.line.beginPath()
    this.line.moveTo(tip.x, tip.y)
    this.line.lineTo((tip.x + target.x) / 2 + 18, Math.min(tip.y, target.y) - 18)
    this.line.lineTo(target.x, target.y)
    this.line.strokePath()
  }

  _applyFish(pose) {
    if (!pose.fish) { this.fish.setVisible(false); return }
    const point = this._point(pose.fish)
    this.fish.setVisible(true).setPosition(point.x, point.y)
  }

  _applyPose(name, immediate = false) {
    const pose = CHARACTER_MOTION_POSES[name]
    const asset = ASSETS.characters[pose.asset]
    if (!pose || !asset || !this.scene.textures.exists(asset.key)) return false
    const next = this.poseBack
    const previous = this.poseFront
    next.setTexture(asset.key).setAlpha(immediate ? 1 : 0)
    if (immediate || isReducedMotion()) {
      previous.setAlpha(0)
      next.setAlpha(1)
    } else {
      this.scene.tweens.killTweensOf([previous, next])
      this.scene.tweens.add({ targets: previous, alpha: 0, duration: 55, ease: 'Linear' })
      this.scene.tweens.add({ targets: next, alpha: 1, duration: 70, ease: 'Linear' })
    }
    this.poseFront = next
    this.poseBack = previous
    this.currentPose = name
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
    this.scene.tweens.killTweensOf([this.poseFront, this.poseBack, this.root])
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
    const { phase, isCharging, result } = view
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
      this.fish.setTexture(asset.key).setDisplaySize(88, 50)
    }
  }

  destroy() {
    this._cancel()
    this.root?.destroy(true)
    this.root = null
    this.ready = false
  }
}
