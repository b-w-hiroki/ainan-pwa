import { CUTE_EQUIPMENT, cuteEquipmentAssets, cuteEquipmentPlacement } from './cuteEquipment.js'
import { getActiveCharacterAppearance, isCharacterAppearancePreview, CHARACTER_PREVIEW_BACKGROUND } from '../../game/characterAppearance.js'
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
// Only QA may displace the modular actor, rod and accessories. The canonical
// approved Harbor composite and normal gameplay remain exactly unchanged.
export function readCharacterQaOffset(search = '') {
  const params = new URLSearchParams(search)
  if (params.get('qa') !== '1') return 0
  const requested = Number(params.get('qaCharacterX') ?? 0)
  return Number.isInteger(requested) && [-18, 0, 18].includes(requested) ? requested : 0
}
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

const CUTE_CAST_LAYOUT = Object.freeze({ x: 76, y: 612, displayWidth: 140, displayHeight: 183.75 })
const CUTE_LAYOUTS = Object.freeze({
  cast: CUTE_CAST_LAYOUT, retrieve: CUTE_CAST_LAYOUT,
  battle: Object.freeze({ x: 78, y: 600, displayWidth: 110, displayHeight: 144.375 }),
  result: Object.freeze({ x: 82, y: 430, displayWidth: 120, displayHeight: 157.5 }),
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

const isCute = () => ['cute-a-01', 'cute-b-01'].includes(getActiveCharacterAppearance())
const cuteKey = (name, id = getActiveCharacterAppearance()) => `character_cute_${id === 'cute-a-01' ? 'a' : 'b'}_${name}`
const cuteFile = name => name.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())
const cuteDir = () => `${import.meta.env?.BASE_URL ?? '/'}fishing-game/assets/candidates/w03-body-${getActiveCharacterAppearance()}/`
const ROD_ART_SOURCE = Object.freeze({ grip: [448, 840], tip: [1167, 101], size: 1254 })
const ROD_ART = Object.freeze({
  basic: { key: 'character_cute_rod_basic', path: new URL('../../../../docs/art-source/w03-cute-rod/W03-CUTE-ROD-basic-v1.png', import.meta.url).href, status: 'candidate' },
  carbon: { key: 'character_cute_rod_carbon', path: new URL('../../../../docs/art-source/w03-cute-rod/W03-CUTE-ROD-carbon-v1.png', import.meta.url).href, status: 'candidate' },
  premium: { key: 'character_cute_rod_premium', path: new URL('../../../../docs/art-source/w03-cute-rod/W03-CUTE-ROD-premium-v1.png', import.meta.url).href, status: 'candidate' },
})
const isRodArtPreview = (search = globalThis.window?.location?.search ?? '') => {
  const params = new URLSearchParams(search)
  return params.get('qa') === '1' && params.get('qaRodArt') === '1'
}
export function preloadCharacterAppearance(scene) {
  if ((isCharacterAppearancePreview() || isCute()) && !scene.textures.exists(CHARACTER_PREVIEW_BACKGROUND.key)) {
    scene.load.image(CHARACTER_PREVIEW_BACKGROUND.key, CHARACTER_PREVIEW_BACKGROUND.path)
  }
  if (!isCute()) return
  if (!scene.cache.json.exists(cuteKey('poses'))) scene.load.json(cuteKey('poses'), cuteDir() + 'poses.json')
}
export function characterMotionAssets() {
  return [...new Set([
    ...requiredAssets(),
    ...(isCute() ? cuteEquipmentAssets() : []),
    ...(isCute() && isRodArtPreview() ? Object.values(ROD_ART) : []),
    ...(isCute() ? Object.keys(CHARACTER_MOTION_POSES).flatMap(name => [
      { key: cuteKey(name), path: cuteDir() + cuteFile(name) + '.png', status: 'ready' },
      ...(getActiveCharacterAppearance() === 'cute-b-01' ? [{ key: cuteKey(name) + '_hair', path: cuteDir() + 'hair-' + cuteFile(name) + '.png', status: 'ready' }] : []),
    ]) : []),
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
    this.rodArt = null
    this.rodType = DEFAULT_ROD_VISUAL_ID
    this.rodVisual = ROD_VISUALS[DEFAULT_ROD_VISUAL_ID]
    this.rodTextureFallback = false
    this.accessoryAccents = {}
    this.accessoryIds = { hat: null, bag: null }
    this.line = null
    this.retrieveTarget = null
    this.fish = null
    this.currentPose = 'idle'
    this.currentAction = null
    this.token = 0
    this.timer = null
    this.previous = { phase: null, charging: false, outcome: null }
    this.layout = CHARACTER_MOTION_LAYOUTS.cast
    this.layoutPhase = 'cast'
    this.ready = false
    this.poses = CHARACTER_MOTION_POSES
    this.cute = false
    this.hair = null
  }

  mount(parent) {
    if (this.root?.active) return this
    const scene = this.scene
    this.ready = requiredAssets().every(asset => asset?.key && scene.textures.exists(asset.key))
    if (!this.ready) return this
    this.appearance = getActiveCharacterAppearance()
    const metadata = scene.cache?.json?.get(cuteKey('poses'))
    this.cute = (scene.env?.point ?? 'pointA') === 'pointA' && isCute() && scene.textures.exists(CHARACTER_PREVIEW_BACKGROUND.key) && Object.keys(CHARACTER_MOTION_POSES).every(name =>
      metadata?.poses?.[name] && scene.textures.exists(cuteKey(name)) && (this.appearance === 'cute-a-01' || scene.textures.exists(cuteKey(name) + '_hair')))
    if (this.cute) this.poses = Object.fromEntries(Object.entries(CHARACTER_MOTION_POSES).map(([name, pose]) => {
      const socket = metadata.poses[name]
      return [name, { ...pose, ...(socket.grip ? { grip: socket.grip,
        tip: [socket.grip[0] + pose.tip[0] - pose.grip[0], socket.grip[1] + pose.tip[1] - pose.grip[1]] } : {}),
        ...(socket.fish ? { fish: socket.fish } : {}) }]
    }))
    if (this.cute) { this.layout = CUTE_CAST_LAYOUT; this.cuteMetadata = metadata }
    const qaX = readCharacterQaOffset(typeof window !== 'undefined' ? window.location.search : '')
    this.root = scene.add.container(qaX, 0).setDepth(75)
    this.root.setData('qaCharacterX', qaX)
    this.root.setData('actorMotionArtApproved', false)
    this.poseFront = scene.add.image(this.layout.x, this.layout.y, ASSETS.characters.fishingMotionIdle.key)
      .setOrigin(0.5, 1).setDisplaySize(this.layout.displayWidth, this.layout.displayHeight)
    // Keep the rod as native geometry. Some browsers composited the transparent
    // rod texture as an opaque black rectangle during alpha animation.
    this.rod = scene.add.graphics()
    if (this.cute && isRodArtPreview() && Object.values(ROD_ART).every(asset => scene.textures.exists(asset.key))) {
      this.rodArt = scene.add.image(0, 0, ROD_ART[DEFAULT_ROD_VISUAL_ID].key).setVisible(false)
    }
    for (const id of ['cap','bag']) {
      this.accessoryAccents[id] = this.cute
        ? (scene.textures.exists(CUTE_EQUIPMENT[id].key) ? scene.add.image(0,0,CUTE_EQUIPMENT[id].key).setVisible(false) : null)
        : createAccessoryAccent(scene,id)
    }
    this.line = scene.add.graphics()
    this.fish = scene.add.image(0, 0, ASSETS.fishHeroes.tai.key)
      .setVisible(false).setAngle(-4)
    this._fitFish(HELD_FISH_BOUNDS.width, HELD_FISH_BOUNDS.height)
    this.root.add([this.poseFront, this.accessoryAccents.bag, this.accessoryAccents.cap, this.rod, this.rodArt, this.line, this.fish].filter(Boolean))
    this.root.setData('qaRodArt', Boolean(this.rodArt))
    if (this.cute && this.appearance === 'cute-b-01') {
      this.hair = scene.add.image(this.layout.x, this.layout.y, cuteKey('idle', this.appearance) + '_hair').setOrigin(0.5, 1)
      this.root.add(this.hair)
      this._syncHair()
    }
    if (this.cute && this.accessoryAccents.cap) this.root.bringToTop(this.accessoryAccents.cap)
    parent.add(this.root)
    this._setRodVisual(DEFAULT_ROD_VISUAL_ID, true)
    this._applyPose('idle', true)
    return this
  }

  _syncHair() {
    if (!this.hair) return
    this.hair.setTexture(cuteKey(this.currentPose, this.appearance) + '_hair')
      .setPosition(this.layout.x, this.layout.y)
      .setDisplaySize(this.layout.displayWidth * 896 / 640, this.layout.displayHeight)
  }

  _point([x, y]) {
    const layout = this.layout
    return {
      x: layout.x - layout.displayWidth / 2 + x * (layout.displayWidth / FRAME.width),
      y: layout.y - layout.displayHeight + y * (layout.displayHeight / FRAME.height),
    }
  }

  _applyLayout(phase) {
    const next = (this.cute ? CUTE_LAYOUTS[phase] : CHARACTER_MOTION_LAYOUTS[phase]) ?? CHARACTER_MOTION_LAYOUTS.cast
    if (this.layoutPhase === phase && this.layout === next) return
    this.layout = next
    this.layoutPhase = phase
    this._syncHair()
    ;[this.poseFront, this.poseBack].forEach(image => image?.setPosition(next.x, next.y).setDisplaySize(next.displayWidth, next.displayHeight))
    const pose = this.poses[this.currentPose]
    if (pose) { this._applyRod(pose); this._applyAccessories(pose); this._applyFish(pose) }
  }

  _applyRod(pose) {
    this.line.clear()
    if (!pose.grip || !pose.tip) {
      this.root.setData('rodGripLocal', null)
      this.rod.setVisible(false)
      this.rodArt?.setVisible(false)
      return
    }
    const grip = this._point(pose.grip)
    const poseTip = this._point(pose.tip)
    this.root.setData('rodGripLocal', { x: grip.x, y: grip.y })
    this.root.setData('rodGripWorld', {
      x: grip.x + this.root.x,
      y: grip.y + this.root.y,
    })
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
    this.rod.clear().setVisible(!this.rodArt)
    if (this.rodArt) {
      const sourceDx = ROD_ART_SOURCE.tip[0] - ROD_ART_SOURCE.grip[0]
      const sourceDy = ROD_ART_SOURCE.tip[1] - ROD_ART_SOURCE.grip[1]
      const scale = Math.hypot(tip.x - grip.x, tip.y - grip.y) / Math.hypot(sourceDx, sourceDy)
      const angle = Math.atan2(tip.y - grip.y, tip.x - grip.x) - Math.atan2(sourceDy, sourceDx)
      this.rodArt.setOrigin(ROD_ART_SOURCE.grip[0] / ROD_ART_SOURCE.size, ROD_ART_SOURCE.grip[1] / ROD_ART_SOURCE.size)
        .setPosition(grip.x, grip.y).setScale(scale).setRotation(angle).setVisible(true)
    }
    const rodControl = {
      x: (grip.x + tip.x) / 2 - (poseDy / poseLength) * poseLength * flex * 0.55,
      y: (grip.y + tip.y) / 2 + (poseDx / poseLength) * poseLength * flex * 0.55,
    }
    const pointOnRod = t => {
      const inverse = 1 - t
      return {
        x: inverse * inverse * grip.x + 2 * inverse * t * rodControl.x + t * t * tip.x,
        y: inverse * inverse * grip.y + 2 * inverse * t * rodControl.y + t * t * tip.y,
      }
    }
    // Taper the blank toward the tip instead of drawing one uniform tube.
    // Keep the geometry native: the old transparent rod bitmap produced black
    // rectangles in some browsers during alpha animation.
    for (let index = 0; index < 12; index += 1) {
      const from = pointOnRod(index / 12)
      const to = pointOnRod((index + 1) / 12)
      const taper = 1 - index / 12
      this.rod.lineStyle(1.6 + 5.4 * taper, 0x183146, 0.97)
      this.rod.lineBetween(from.x, from.y, to.x, to.y)
      this.rod.lineStyle(0.8 + 2.1 * taper, visual.accent, 0.96)
      this.rod.lineBetween(from.x, from.y, to.x, to.y)
    }
    // Ferrules and guides follow the bent blank; the line still begins at
    // the exact tip calculated above, so casting geometry is unchanged.
    for (const t of [0.32, 0.57, 0.78, 0.94]) {
      const guide = pointOnRod(t)
      this.rod.fillStyle(0x15394e, 0.95).fillCircle(guide.x, guide.y, t < 0.5 ? 2.4 : 1.8)
      this.rod.fillStyle(0xe6f6f7, 0.92).fillCircle(guide.x, guide.y, 0.8)
    }
    this.rod.fillStyle(0x183146, 1).fillCircle(grip.x, grip.y, 6)
    this.rod.fillStyle(visual.accent, 1).fillCircle(grip.x, grip.y, 3.4)
    this.rod.lineStyle(2, 0x183146, 0.95).strokeCircle(grip.x + 7, grip.y + 5, 5)
    this.rod.lineStyle(1.4, visual.accent, 0.95).strokeCircle(grip.x + 7, grip.y + 5, 3.3)
    this.rod.fillStyle(0xe6f6f7, 0.9).fillCircle(grip.x + 7, grip.y + 5, 1.3)
    const stageTarget = phase === 'battle'
      ? { x: 228, y: 330 }
      : phase === 'result'
        ? { x: tip.x + 14 + this.root.x, y: tip.y + 24 + this.root.y }
        : phase === 'retrieve' && this.retrieveTarget
          ? this.retrieveTarget
          : { x: 310, y: 235 }
    // Keep the lure/line target in stage coordinates as the entire character
    // and its rod shift as one container during the QA art-offset experiment.
    const target = { x: stageTarget.x - this.root.x, y: stageTarget.y - this.root.y }
    this.root.setData('rodLineTargetWorld', stageTarget)
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
    this.root.setData('rodTipWorld', { x: tip.x + this.root.x, y: tip.y + this.root.y })
  }

  setRetrieveTarget(target) {
    const previous = this.retrieveTarget
    if (previous === null && target === null) return
    if (previous && target && Math.hypot(previous.x - target.x, previous.y - target.y) < 0.4) return
    this.retrieveTarget = target
    if (this.scene.phase === 'retrieve') {
      const pose = this.poses[this.currentPose]
      if (pose) this._applyRod(pose)
    }
  }

  _setRodVisual(rodType, force = false) {
    const resolvedType = ROD_VISUALS[rodType] ? rodType : DEFAULT_ROD_VISUAL_ID
    if (!force && this.rodType === resolvedType) return
    const visual = ROD_VISUALS[resolvedType]
    this.rodType = resolvedType
    this.rodVisual = visual
    this.rodTextureFallback = false
    this.root.setData('rodType', resolvedType)
    if (this.rodArt) this.rodArt.setTexture(ROD_ART[resolvedType].key)
    this.root.setData('rodTexture', this.rodArt ? `candidate:${resolvedType}` : `native:${resolvedType}`)
    this.root.setData('rodTextureFallback', this.rodTextureFallback)
    const pose = this.poses[this.currentPose]
    if (pose) this._applyRod(pose)
  }

  _setAccessoryVisuals(accessories = {}) {
    const next = { hat: accessories.hat ?? null, bag: accessories.bag ?? null }
    if (this.accessoryIds.hat === next.hat && this.accessoryIds.bag === next.bag) return
    this.accessoryIds = next
    this.root.setData('accessories', { ...next })
    const pose = this.poses[this.currentPose]
    if (pose) this._applyAccessories(pose)
  }

  _applyAccessories(_pose) {
    for (const [id, accent] of Object.entries(this.accessoryAccents)) {
      if (!accent) continue
      const visual = ACCESSORY_VISUALS[id]
      const equipped = this.accessoryIds[visual.slot] === id
      if (this.cute) {
        const placement = cuteEquipmentPlacement(this.appearance,this.currentPose,id,this.cuteMetadata)
        if (!equipped || !placement) { accent.setVisible(false); continue }
        const point = this._point(placement.point)
        const width = placement.width*this.layout.displayWidth/FRAME.width
        accent.setOrigin(...placement.origin).setDisplaySize(width,width)
          .setPosition(point.x,point.y).setAngle(placement.angle).setVisible(true)
        continue
      }
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
    const pose = this.poses[name]
    const asset = this.cute ? { key: cuteKey(name, this.appearance) } : ASSETS.characters[pose?.asset]
    if (!pose || !asset || !this.scene.textures.exists(asset.key)) return false
    // Pose timing still supplies the authored in-betweens. Switch the one
    // visible texture atomically so transparent pixels never enter an
    // intermediate-alpha compositor path.
    this.scene.tweens.killTweensOf(this.poseFront)
    this.poseFront.setTexture(asset.key).setDisplaySize(this.layout.displayWidth, this.layout.displayHeight).setVisible(true).setAlpha(1)
    this.currentPose = name
    this._syncHair()
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
    this.root.setVisible(['cast', 'battle', 'result'].includes(phase) ||
      (phase === 'retrieve' && (this.cute || this.currentAction === 'release')))
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
