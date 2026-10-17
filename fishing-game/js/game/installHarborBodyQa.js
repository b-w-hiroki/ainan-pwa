import { ASSETS } from '../config/assetManifest.js'
import { CHARACTER_MOTION_POSES } from '../presentation/cast/CharacterMotionController.js'
import { isHarborPlayableQaEnabled } from './installHarborPlayableQa.js'

// W03 QA only (?qaBody=<variant> together with the Harbor playable QA flags).
// Shows independent W03 body PNGs on the EXISTING camera-pan player owner. There is
// deliberately NO in-game switch control: the look is chosen by the URL here, and the
// game-start / settings flow will call setHarborBodyVariant(scene, id) later.
// cute-b-01 has all 13 poses plus separate hair. Other variants keep their
// existing pose availability. Every
// other pose keeps the old animation-v1 art (drawn into same-size canvases so the
// scale stays consistent). Rod/line owner, cast, save data, odds and rewards are
// untouched, and every mutation is undone in _cleanup. Never enable on a normal URL.
const search = () => typeof window === 'undefined' ? '' : window.location.search
const baseUrl = () => import.meta.env?.BASE_URL ?? '/'
const FRAME = Object.freeze({ width: 640, height: 840 })
const dirOf = id => `fishing-game/assets/candidates/w03-body-${id}`

export const HARBOR_BODY_VARIANTS = Object.freeze([
  { id: 'cute-a-01', label: 'かわいいA-1', poses: ['idle', 'castWindup'] },
  { id: 'cute-a-02', label: 'かわいいA-2', poses: ['idle'] },
  { id: 'cute-a-03', label: 'かわいいA-3', poses: ['idle'] },
  { id: 'cute-b-01', label: 'かわいいB-1', poses: Object.keys(CHARACTER_MOTION_POSES), hair: true },
  { id: 'cute-b-02', label: 'かわいいB-2', poses: ['idle'] },
  { id: 'cute-b-03', label: 'かわいいB-3', poses: ['idle'] },
  { id: 'cute-b-01-v2', label: 'かわいいB-1 v2', poses: ['idle'] },
  { id: 'cute-b-02-v2', label: 'かわいいB-2 v2', poses: ['idle'] },
  { id: 'cute-b-03-v2', label: 'かわいいB-3 v2', poses: ['idle'] },
  { id: 'a', label: '写実A', poses: ['idle', 'castWindup'] },
  { id: 'b', label: '写実B', poses: ['idle', 'castWindup'] },
])
// Chosen defaults (男の子 / 女の子). The start/settings flow will use these.
export const HARBOR_BODY_DEFAULTS = Object.freeze({ male: 'cute-a-01', female: 'cute-b-01' })
const poseFile = pose => pose.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()) + '.png'
const textureKey = (id, pose) => `qa_body_${id}_${pose}`

export const harborBodyQaStart = (s = search()) => {
  if (!isHarborPlayableQaEnabled(s)) return null
  const requested = new URLSearchParams(s).get('qaBody')
  if (!requested) return null
  return HARBOR_BODY_VARIANTS.some(v => v.id === requested) ? requested : HARBOR_BODY_VARIANTS[0].id
}
const bodyScale = (s = search()) => {
  const n = Number(new URLSearchParams(s).get('qaBodyScale') ?? 1.6)
  return Number.isFinite(n) && n >= 0.5 && n <= 3 ? n : 1.6
}

function undoVariant(scene) {
  const undo = scene._qaBodyUndo
  if (!undo) return
  for (const [asset, key] of undo.keys) asset.key = key
  for (const [pose, grip, tip, fish] of undo.poses) { pose.grip = grip; pose.tip = tip; pose.fish = fish }
  scene._qaBodyUndo = null
}

export const setHarborBodyVariant = (scene, id) =>
  Boolean(scene?._qaBodyReady?.some(v => v.id === id)) && applyVariant(scene, id)

function applyVariant(scene, id) {
  undoVariant(scene)
  const variant = HARBOR_BODY_VARIANTS.find(v => v.id === id)
  const info = scene.cache.json.get(`qa_body_${id}_poses`)
  const player = scene._cameraPanPlayer
  if (!variant || !info || !player?.active) return false
  const undo = { keys: [], poses: [] }
  for (const [name, pose] of Object.entries(CHARACTER_MOTION_POSES)) {
    const asset = ASSETS.characters[pose.asset]
    if (!asset?.key) continue
    undo.keys.push([asset, asset.key])
    if (variant.poses.includes(name)) {
      const sockets = info.poses[name]
      undo.poses.push([pose, pose.grip, pose.tip, pose.fish])
      if (sockets.grip && pose.grip && pose.tip) {
        const old = { grip: pose.grip, tip: pose.tip }
        pose.grip = sockets.grip
        pose.tip = [pose.grip[0] + old.tip[0] - old.grip[0], pose.grip[1] + old.tip[1] - old.grip[1]]
      }
      if (sockets.fish) pose.fish = sockets.fish
      asset.key = textureKey(id, name)
    } else {
      const copyKey = `qa_body_legacy_${name}`
      if (!scene.textures.exists(copyKey) && scene.textures.exists(asset.key)) {
        const source = scene.textures.get(asset.key).getSourceImage()
        const canvas = scene.textures.createCanvas(copyKey, FRAME.width, FRAME.height)
        canvas.context.drawImage(source, 0, 0, FRAME.width, FRAME.height)
        canvas.refresh()
        scene._qaBodyCanvases.push(copyKey)
      }
      if (scene.textures.exists(copyKey)) asset.key = copyKey
    }
  }
  scene._qaBodyUndo = undo
  const k = bodyScale()
  for (const image of [player, scene._cameraPanPlayerBlend]) {
    image?.setTexture(textureKey(id, 'idle')).setDisplaySize(150 * k, 195 * k)
  }
  scene._cameraPanPlayerBaseScale = { x: player.scaleX, y: player.scaleY }
  scene._cameraPanPlayerShadow?.setScale(k)
  scene._qaBody = Object.freeze({ id, label: variant.label, scale: k, replacedPoses: variant.poses, artApproved: false })
  return true
}

export function installHarborBodyQa(GameScene) {
  if (GameScene.prototype.__ainanHarborBodyQaInstalled) return
  GameScene.prototype.__ainanHarborBodyQaInstalled = true

  const prevPreload = GameScene.prototype.preload
  GameScene.prototype.preload = function (...args) {
    prevPreload?.apply(this, args)
    if (!harborBodyQaStart()) return
    for (const variant of HARBOR_BODY_VARIANTS) {
      for (const pose of variant.poses) {
        const key = textureKey(variant.id, pose)
        if (!this.textures.exists(key)) this.load.image(key, `${baseUrl()}${dirOf(variant.id)}/${poseFile(pose)}`)
        if (variant.hair && !this.textures.exists(key + '_hair')) {
          this.load.image(key + '_hair', `${baseUrl()}${dirOf(variant.id)}/hair-${poseFile(pose)}`)
        }
      }
      const jsonKey = `qa_body_${variant.id}_poses`
      if (!this.cache.json.exists(jsonKey)) this.load.json(jsonKey, `${baseUrl()}${dirOf(variant.id)}/poses.json`)
    }
  }

  const prevCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = prevCreate.apply(this, args)
    const start = harborBodyQaStart()
    if (!start || !this._qaHarborPlayable || !this._cameraPanPlayer?.active) return result
    this._qaBodyCanvases = []
    const ready = HARBOR_BODY_VARIANTS.filter(v => this.cache.json.exists(`qa_body_${v.id}_poses`)
      && v.poses.every(p => this.textures.exists(textureKey(v.id, p))))
    if (!ready.some(v => v.id === start)) { this._qaBodyError = 'Missing W03 body textures'; return result }
    this._qaBodyReady = ready
    applyVariant(this, start)

    return result
  }

  const prevUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (...args) {
    const result = prevUpdate?.apply(this, args)
    syncHarborBodyHair(this)
    return result
  }

  const prevCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    for (const hair of this._qaBodyHair ?? []) hair?.destroy()
    this._qaBodyHair = null
    undoVariant(this)
    for (const key of this._qaBodyCanvases ?? []) this.textures.remove?.(key)
    this._qaBodyCanvases = null
    this._qaBodyReady = null
    this._qaBody = null
    return prevCleanup?.apply(this, args)
  }
}

// Match BOTH crossfade images; a single hair image would pop during a pose blend.
export function syncHarborBodyHair(scene) {
  const variant = HARBOR_BODY_VARIANTS.find(v => v.id === scene._qaBody?.id)
  if (!variant?.hair) {
    for (const hair of scene._qaBodyHair ?? []) hair?.setVisible(false)
    return
  }
  scene._qaBodyHair ??= []
  ;[scene._cameraPanPlayer, scene._cameraPanPlayerBlend].forEach((actor, i) => {
    const key = actor?.texture?.key + '_hair'
    if (!actor?.active || !actor.visible || !scene.textures.exists(key)) {
      scene._qaBodyHair[i]?.setVisible(false)
      return
    }
    const hair = scene._qaBodyHair[i] ??= scene.add.image(actor.x, actor.y, key)
    hair.setTexture(key).setOrigin(actor.originX, actor.originY)
      .setPosition(actor.x, actor.y).setDisplaySize(actor.displayWidth, actor.displayHeight)
      .setRotation(actor.rotation).setFlipX(actor.flipX).setFlipY(actor.flipY)
      .setScrollFactor(actor.scrollFactorX, actor.scrollFactorY)
      .setDepth(actor.depth + 0.1).setAlpha(actor.alpha).setVisible(true)
  })
}
