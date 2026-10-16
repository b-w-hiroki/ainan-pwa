import { ASSETS } from '../config/assetManifest.js'
import { CHARACTER_MOTION_POSES } from '../presentation/cast/CharacterMotionController.js'
import { isHarborPlayableQaEnabled } from './installHarborPlayableQa.js'

// W03 QA only (?qaBody=<variant> together with the Harbor playable QA flags).
// Shows independent W03 body PNGs on the EXISTING camera-pan player owner and
// lets the reviewer cycle through every variant with the chip at the top right.
// 'a'/'b' have idle + castWindup; the cute variants only have idle so far. Every
// other pose keeps the old animation-v1 art (drawn into same-size canvases so the
// scale stays consistent). Rod/line owner, cast, save data, odds and rewards are
// untouched, and every mutation is undone in _cleanup. Never enable on a normal URL.
const search = () => typeof window === 'undefined' ? '' : window.location.search
const baseUrl = () => import.meta.env?.BASE_URL ?? '/'
const FRAME = Object.freeze({ width: 640, height: 840 })
const dirOf = id => `fishing-game/assets/candidates/w03-body-${id}`

export const HARBOR_BODY_VARIANTS = Object.freeze([
  { id: 'cute-a-01', label: 'かわいいA-1', poses: ['idle'] },
  { id: 'cute-a-02', label: 'かわいいA-2', poses: ['idle'] },
  { id: 'cute-a-03', label: 'かわいいA-3', poses: ['idle'] },
  { id: 'cute-b-01', label: 'かわいいB-1', poses: ['idle'] },
  { id: 'cute-b-02', label: 'かわいいB-2', poses: ['idle'] },
  { id: 'cute-b-03', label: 'かわいいB-3', poses: ['idle'] },
  { id: 'cute-b-01-v2', label: 'かわいいB-1 v2', poses: ['idle'] },
  { id: 'cute-b-02-v2', label: 'かわいいB-2 v2', poses: ['idle'] },
  { id: 'cute-b-03-v2', label: 'かわいいB-3 v2', poses: ['idle'] },
  { id: 'a', label: '写実A', poses: ['idle', 'castWindup'] },
  { id: 'b', label: '写実B', poses: ['idle', 'castWindup'] },
])
const FILES = Object.freeze({ idle: 'idle.png', castWindup: 'cast-windup.png' })
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
  for (const [pose, grip, tip] of undo.poses) { pose.grip = grip; pose.tip = tip }
  scene._qaBodyUndo = null
}

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
      const grip = info.poses[name].grip
      undo.poses.push([pose, pose.grip, pose.tip])
      const old = { grip: pose.grip, tip: pose.tip }
      pose.grip = grip
      pose.tip = [grip[0] + old.tip[0] - old.grip[0], grip[1] + old.tip[1] - old.grip[1]]
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
        if (!this.textures.exists(key)) this.load.image(key, `${baseUrl()}${dirOf(variant.id)}/${FILES[pose]}`)
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

    // Screen-space chip. Like the existing HUD hit zones it stops propagation so a tap
    // never starts a cast. Top right, below the header, clear of the bottom cast area.
    const chip = this.add.text(this.scale.width - 12, 84, '', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '13px', color: '#ffffff',
      backgroundColor: '#14374acc', padding: { x: 9, y: 7 },
    }).setOrigin(1, 0).setDepth(9501).setScrollFactor(0).setInteractive({ useHandCursor: true })
    const refresh = () => chip.setText(`見た目 ${this._qaBody?.label ?? ''} ▶ (${ready.findIndex(v => v.id === this._qaBody?.id) + 1}/${ready.length})`)
    chip.on('pointerdown', pointer => {
      pointer?.event?.stopPropagation?.()
      const index = ready.findIndex(v => v.id === this._qaBody?.id)
      applyVariant(this, ready[(index + 1) % ready.length].id)
      refresh()
    })
    refresh()
    this._qaBodyChip = chip
    this._qaBodyOnResize = () => chip.setX(this.scale.width - 12)
    this.scale.on('resize', this._qaBodyOnResize)
    return result
  }

  const prevCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    undoVariant(this)
    this.scale?.off?.('resize', this._qaBodyOnResize)
    this._qaBodyOnResize = null
    this._qaBodyChip?.destroy?.()
    this._qaBodyChip = null
    for (const key of this._qaBodyCanvases ?? []) this.textures.remove?.(key)
    this._qaBodyCanvases = null
    this._qaBodyReady = null
    this._qaBody = null
    return prevCleanup?.apply(this, args)
  }
}
