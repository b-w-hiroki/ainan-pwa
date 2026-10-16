import { ASSETS } from '../config/assetManifest.js'
import { CHARACTER_MOTION_POSES } from '../presentation/cast/CharacterMotionController.js'
import { isHarborPlayableQaEnabled } from './installHarborPlayableQa.js'

// W03 QA only (?qaBody=a|b together with the Harbor playable QA flags).
// Shows the independent W03 body PNGs on the EXISTING camera-pan player owner.
// Only idle + castWindup exist so far; the other 11 poses keep the old
// animation-v1 art (drawn into same-size canvases so scale stays consistent).
// Rod/line owner, cast, save data, odds and rewards are untouched, and every
// mutation below is undone in _cleanup. Never enable on a normal URL.
const search = () => typeof window === 'undefined' ? '' : window.location.search
const baseUrl = () => import.meta.env?.BASE_URL ?? '/'
const FRAME = Object.freeze({ width: 640, height: 840 })
const NEW_POSES = Object.freeze({ idle: 'idle.png', castWindup: 'cast-windup.png' })

export const harborBodyQaId = (s = search()) => {
  if (!isHarborPlayableQaEnabled(s)) return null
  const body = new URLSearchParams(s).get('qaBody')
  return body === 'a' || body === 'b' ? body : null
}
const bodyScale = (s = search()) => {
  const n = Number(new URLSearchParams(s).get('qaBodyScale') ?? 1.6)
  return Number.isFinite(n) && n >= 0.5 && n <= 3 ? n : 1.6
}
const newKey = (body, pose) => `qa_body_${body}_${pose}`

export function installHarborBodyQa(GameScene) {
  if (GameScene.prototype.__ainanHarborBodyQaInstalled) return
  GameScene.prototype.__ainanHarborBodyQaInstalled = true

  const prevPreload = GameScene.prototype.preload
  GameScene.prototype.preload = function (...args) {
    prevPreload?.apply(this, args)
    const body = harborBodyQaId()
    if (!body) return
    for (const [pose, file] of Object.entries(NEW_POSES)) {
      const key = newKey(body, pose)
      if (!this.textures.exists(key)) this.load.image(key, `${baseUrl()}fishing-game/assets/candidates/w03-body-${body}/${file}`)
    }
    if (!this.cache.json.exists(`qa_body_${body}_poses`)) {
      this.load.json(`qa_body_${body}_poses`, `${baseUrl()}fishing-game/assets/candidates/w03-body-${body}/poses.json`)
    }
  }

  const prevCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = prevCreate.apply(this, args)
    const body = harborBodyQaId()
    const player = this._cameraPanPlayer
    if (!body || !this._qaHarborPlayable || !player?.active) return result
    const info = this.cache.json.get(`qa_body_${body}_poses`)
    if (!info || Object.keys(NEW_POSES).some(p => !this.textures.exists(newKey(body, p)))) {
      this._qaBodyError = 'Missing W03 body textures'
      return result
    }
    const undo = { keys: [], poses: [], canvases: [] }
    for (const [name, pose] of Object.entries(CHARACTER_MOTION_POSES)) {
      const asset = ASSETS.characters[pose.asset]
      if (!asset?.key) continue
      undo.keys.push([asset, asset.key])
      if (NEW_POSES[name]) {
        const grip = info.poses[name].grip
        undo.poses.push([pose, pose.grip, pose.tip])
        const old = { grip: pose.grip, tip: pose.tip }
        pose.grip = grip
        pose.tip = [grip[0] + old.tip[0] - old.grip[0], grip[1] + old.tip[1] - old.grip[1]]
        asset.key = newKey(body, name)
      } else if (this.textures.exists(asset.key)) {
        const copyKey = `qa_body_${body}_legacy_${name}`
        if (!this.textures.exists(copyKey)) {
          const source = this.textures.get(asset.key).getSourceImage()
          const canvas = this.textures.createCanvas(copyKey, FRAME.width, FRAME.height)
          canvas.context.drawImage(source, 0, 0, FRAME.width, FRAME.height)
          canvas.refresh()
          undo.canvases.push(copyKey)
        }
        asset.key = copyKey
      }
    }
    const k = bodyScale()
    for (const image of [player, this._cameraPanPlayerBlend]) {
      image?.setTexture(newKey(body, 'idle')).setDisplaySize(150 * k, 195 * k)
    }
    this._cameraPanPlayerBaseScale = { x: player.scaleX, y: player.scaleY }
    this._cameraPanPlayerShadow?.setScale(k)
    this._qaBodyUndo = undo
    this._qaBody = Object.freeze({ body, scale: k, replacedPoses: Object.keys(NEW_POSES), artApproved: false })
    return result
  }

  const prevCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    const undo = this._qaBodyUndo
    if (undo) {
      for (const [asset, key] of undo.keys) asset.key = key
      for (const [pose, grip, tip] of undo.poses) { pose.grip = grip; pose.tip = tip }
      for (const key of undo.canvases) this.textures.remove?.(key)
    }
    this._qaBodyUndo = null
    this._qaBody = null
    return prevCleanup?.apply(this, args)
  }
}
