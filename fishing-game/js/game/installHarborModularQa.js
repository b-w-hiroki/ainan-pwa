import { ACCESSORY_VISUALS, createAccessoryAccent, getVisualLoadout, ROD_VISUALS } from '../presentation/equipmentVisuals.js'
import { CHARACTER_MOTION_POSES } from '../presentation/cast/CharacterMotionController.js'
import { resolveModularSocket } from '../presentation/modularPlayerParts.js'

// H03 QA-only. Existing equipment ownership remains in progress/save code;
// these are independent DISPLAY objects attached to the live Phaser actor.
// Body gender/outfit sprites and the final cat painting are NOT available yet.
// Existing preview-gating policy must not disappear in a socket refactor.
export function isHarborModularQaEnabled(search = '') {
  const p = new URLSearchParams(search)
  return p.get('qa') === '1' && p.get('qaHarborPlayable') === '1'
    && p.get('cameraPan') === '1' && p.get('coneLoop') === '1'
    && p.get('qaParts') === '1'
}
const search = () => typeof window === 'undefined' ? '' : window.location.search
const catArtKey = 'qa_w03_cat_v1'
const catArtUrl = () => `${import.meta.env?.BASE_URL ?? '/'}fishing-game/assets/candidates/w03-cat-v1/cat.png`
const accessoryArtKey = id => `qa_w03_accessory_${id}_v1`
const accessoryArtUrl = id => `${import.meta.env?.BASE_URL ?? '/'}fishing-game/assets/candidates/w03-accessories-v1/${id}.png`
const accessoryCanvasWidth = Object.freeze({ cap: 160, bag: 150 })
// The generated cutouts have different painted centers from the procedural
// markers. Keep the adjustment in the shared 320x420 actor frame, so rotation
// and each pose's authored socket still work together.
const accessoryArtOffset = Object.freeze({ cap: [-32, -18], bag: [0, -115] })

// One shared socket transform for all W03 asset layers and existing QA hats/bags.
export const resolveHarborPartSocket = resolveModularSocket

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

function makeQaCatArt(scene) {
  return scene.add.image(0, 0, catArtKey).setDepth(38).setScrollFactor(1)
    .setOrigin(0.5, 1042 / 1254).setDisplaySize(90, 90)
    .setData('qaOnly', true).setData('artApproved', false)
}

function makeQaAccessoryArt(scene, id) {
  return scene.add.image(0, 0, accessoryArtKey(id)).setVisible(false)
    .setData('qaOnly', true).setData('artApproved', false)
    .setData('accessoryId', id).setData('artCandidate', true)
}

export function installHarborModularQa(GameScene) {
  if (GameScene.prototype.__ainanHarborModularQaInstalled) return
  GameScene.prototype.__ainanHarborModularQaInstalled = true

  const prevPreload = GameScene.prototype.preload
  GameScene.prototype.preload = function (...args) {
    prevPreload?.apply(this, args)
    const params = new URLSearchParams(search())
    if (isHarborModularQaEnabled(search()) && params.get('qaCatArt') === '1'
      && params.get('qaCat') === '1' && !this.textures.exists(catArtKey)) {
      this.load.image(catArtKey, catArtUrl())
    }
    if (isHarborModularQaEnabled(search()) && params.get('qaAccessoryArt') === '1') {
      for (const id of ['cap', 'bag']) {
        if (!this.textures.exists(accessoryArtKey(id))) this.load.image(accessoryArtKey(id), accessoryArtUrl(id))
      }
    }
  }

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
    const useAccessoryArt = params.get('qaAccessoryArt') === '1'
    const accents = Object.fromEntries(['cap', 'bag'].map(id => [id,
      useAccessoryArt && this.textures.exists(accessoryArtKey(id))
        ? makeQaAccessoryArt(this, id) : createAccessoryAccent(this, id),
    ]))
    for (const [id, item] of Object.entries(accents)) {
      item.setScrollFactor(1).setDepth(id === 'cap' ? 41.7 : item.getData('artCandidate') ? 41.4 : 40.6)
        .setData('qaOnly', true).setData('artApproved', false)
        .setVisible(show[id])
    }
    const catArt = params.get('qaCatArt') === '1' && this.textures.exists(catArtKey)
    const cat = catArt ? makeQaCatArt(this) : makeQaCat(this)
    cat.setVisible(show.cat)
    const qaRod = params.get('qaRod')
    if (qaRod && ROD_VISUALS[qaRod]) {
      // Reuse native rod draw owner: NEVER paint a duplicate second rod.
      this._cameraPanRodVisual = ROD_VISUALS[qaRod]
      this._cameraPanRod?.setData?.('rodType', qaRod)
    }
    this._qaHarborModular = { accents, cat, catArt, show, rod: this._cameraPanRod?.getData('rodType') }
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
      const offset = item.getData('artCandidate') ? accessoryArtOffset[id] : [0, 0]
      const transform = resolveHarborPartSocket(actor,
        [anchor[0] + offset[0], anchor[1] + offset[1], anchor[2]])
      item.setVisible(true).setPosition(transform.x, transform.y)
        .setRotation(transform.rotation)
      if (item.getData('artCandidate')) {
        const width = accessoryCanvasWidth[id] * transform.scale
        item.setDisplaySize(width, width)
      } else item.setScale(transform.scale)
    }
    parts.cat.setVisible(parts.show.cat && this.phase !== 'result')
    // Keep the option behind the actor in perspective, clear of the bottom cast HUD.
    parts.cat.setPosition(actor.x - 72, actor.y - 27)
    this._qaHarborPartSnapshot = Object.freeze({
      pose, rodId: parts.rod, bodyVariant: 'existing-approved-pose',
      independentBodyVariantsReady: false,
      independentClothingArtReady: false,
      optionArtApproved: false,
      catArtCandidate: parts.catArt,
      cap: Boolean(parts.accents.cap.visible),
      bag: Boolean(parts.accents.bag.visible),
      accessoryArtCandidates: Object.freeze(Object.fromEntries(
        Object.entries(parts.accents).map(([id, item]) => [id, Boolean(item.getData('artCandidate'))]))),
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
