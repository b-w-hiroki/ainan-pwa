import { ACCESSORY_VISUALS, createAccessoryAccent, getVisualLoadout, ROD_VISUALS } from '../presentation/equipmentVisuals.js'
import { CHARACTER_MOTION_POSES } from '../presentation/cast/CharacterMotionController.js'

// H03 QA-only. Existing equipment ownership remains in progress/save code;
// these are independent DISPLAY objects attached to the live Phaser actor.
// Body gender/outfit sprites and the final cat painting are NOT available yet.
const FRAME = Object.freeze({ width: 320, height: 420 })
export function isHarborModularQaEnabled(search = '') {
  const p = new URLSearchParams(search)
  return p.get('qa') === '1' && p.get('qaHarborPlayable') === '1'
    && p.get('cameraPan') === '1' && p.get('coneLoop') === '1'
    && p.get('qaParts') === '1'
}
const search = () => typeof window === 'undefined' ? '' : window.location.search
const rotation = (x, y, degrees) => {
  const a = degrees * Math.PI / 180
  return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) }
}
export function resolveHarborPartSocket(actor, rawAnchor) {
  if (!actor || !Array.isArray(rawAnchor) || rawAnchor.length < 2
    || !Number.isFinite(actor.x) || !Number.isFinite(actor.y)
    || !Number.isFinite(actor.displayWidth) || !Number.isFinite(actor.displayHeight)
    || !Number.isFinite(actor.angle)
    || !rawAnchor.slice(0, 3).every(value => value === undefined || Number.isFinite(value))) {
    throw new TypeError('Actor transform and pose socket must be finite')
  }
  const local = rotation(
    (rawAnchor[0] - FRAME.width / 2) * actor.displayWidth / FRAME.width,
    (rawAnchor[1] - FRAME.height) * actor.displayHeight / FRAME.height,
    actor.angle,
  )
  return Object.freeze({
    x: actor.x + local.x, y: actor.y + local.y,
    rotation: (actor.angle + (rawAnchor[2] ?? 0)) * Math.PI / 180,
    scale: actor.displayWidth / FRAME.width,
  })
}

// A clearly provisional silhouette/marker rather than a baked-in cat bitmap.
// Cat is its own object, stays BEHIND the casting hand and never moves with
// the far-water atlas. Replace with approved PNG in H03/H06.
function makeQaCat(scene) {
  const root = scene.add.container(0, 0).setDepth(38).setScrollFactor(1)
    .setData('qaOnly', true).setData('artApproved', false)
  const g = scene.add.graphics()
  g.fillStyle(0x5b6f68, 1).lineStyle(2, 0x173248, 0.94)
  g.fillEllipse(0, -12, 33, 38).strokeEllipse(0, -12, 33, 38)
  g.fillTriangle(-13, -30, -9, -53, -1, -37)
  g.fillTriangle(13, -30, 9, -53, 1, -37)
  g.fillEllipse(0, -33, 30, 25)
  g.fillStyle(0xffde90, 1)
  g.fillCircle(-6, -35, 2.6); g.fillCircle(6, -35, 2.6)
  g.lineStyle(5, 0x5b6f68, 1).beginPath().moveTo(17, -8).lineTo(27, -22).lineTo(24, -37).strokePath()
  root.add(g)
  return root
}

export function installHarborModularQa(GameScene) {
  if (GameScene.prototype.__ainanHarborModularQaInstalled) return
  GameScene.prototype.__ainanHarborModularQaInstalled = true

  const prevCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = prevCreate.apply(this, args)
    if (!isHarborModularQaEnabled(search()) || !this._qaHarborPlayable || !this._cameraPanPlayer?.active) return result

    const params = new URLSearchParams(search())
    const loadout = getVisualLoadout(this.env?.player?.rodType)
    const show = {
      cap: params.get('qaCap') === '1' || loadout.accessories.hat === 'cap',
      bag: params.get('qaBag') === '1' || loadout.accessories.bag === 'bag',
      cat: params.get('qaCat') === '1',
    }
    const accents = {
      cap: createAccessoryAccent(this, 'cap'),
      bag: createAccessoryAccent(this, 'bag'),
    }
    for (const [id, item] of Object.entries(accents)) {
      item.setScrollFactor(1).setDepth(id === 'cap' ? 41.7 : 40.6)
        .setData('qaOnly', true).setData('artApproved', false)
        .setVisible(show[id])
    }
    const cat = makeQaCat(this)
    cat.setVisible(show.cat)
    const qaRod = params.get('qaRod')
    if (qaRod && ROD_VISUALS[qaRod]) {
      // Reuse native rod draw owner: NEVER paint a duplicate second rod.
      this._cameraPanRodVisual = ROD_VISUALS[qaRod]
      this._cameraPanRod?.setData?.('rodType', qaRod)
    }
    this._qaHarborModular = { accents, cat, show, rod: this._cameraPanRod?.getData('rodType') }
    return result
  }

  const prevUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (...args) {
    const result = prevUpdate?.apply(this, args)
    const parts = this._qaHarborModular
    const actor = this._cameraPanPlayer
    if (!parts || !actor?.active) return result
    const pose = CHARACTER_MOTION_POSES[this._cameraPanPose] ? this._cameraPanPose : 'idle'
    for (const [id, item] of Object.entries(parts.accents)) {
      const anchor = ACCESSORY_VISUALS[id]?.anchors[pose]
      if (!parts.show[id] || !anchor || actor.visible === false) {
        item.setVisible(false)
        continue
      }
      const transform = resolveHarborPartSocket(actor, anchor)
      item.setVisible(true).setPosition(transform.x, transform.y)
        .setRotation(transform.rotation).setScale(transform.scale)
    }
    parts.cat.setVisible(parts.show.cat && this.phase !== 'result')
    parts.cat.setPosition(actor.x - 72, actor.y - 4)
    this._qaHarborPartSnapshot = Object.freeze({
      pose, rodId: parts.rod, bodyVariant: 'existing-approved-pose',
      independentBodyVariantsReady: false,
      independentClothingArtReady: false,
      optionArtApproved: false,
      cap: Boolean(parts.accents.cap.visible),
      bag: Boolean(parts.accents.bag.visible),
      cat: Boolean(parts.cat.visible),
      catWorld: Object.freeze({ x: parts.cat.x, y: parts.cat.y }),
      rodGraphicsOwners: this._cameraPanRod?.active ? 1 : 0,
    })
    return result
  }

  const prevCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    const p = this._qaHarborModular
    if (p) {
      Object.values(p.accents).forEach(item => item?.destroy?.(true))
      p.cat?.destroy?.(true)
    }
    this._qaHarborModular = null
    this._qaHarborPartSnapshot = null
    return prevCleanup?.apply(this, args)
  }
}
