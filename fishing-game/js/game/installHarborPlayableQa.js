import { HARBOR_WIDE_H02 } from '../presentation/harborWideWorldH02.js'
import { FISHING_WORLD } from '../scenes/components/FishingCameraController.js'

// This is an actual GameScene fishing integration, NOT the standalone HTML
// camera scrubber. The artists' 2160px atlas is still a QA BLOCKOUT.
// Never enable on a normal URL or for Bay/Cape. Do not alter saved equipment,
// probability, player input, reward logic, or the published art manifest.
export const isHarborPlayableQaEnabled = (search = '') => {
  const params = new URLSearchParams(search)
  return params.get('qa') === '1'
    && params.get('qaHarborPlayable') === '1'
    && params.get('cameraPan') === '1'
    && params.get('coneLoop') === '1'
}
const getSearch = () => typeof window === 'undefined' ? '' : window.location.search
const baseUrl = () => import.meta.env?.BASE_URL ?? '/'
const textureKey = layer => 'qa_harbor_playable_' + layer.id
const candidateParam = () => isHarborPlayableQaEnabled(getSearch())
  ? new URLSearchParams(getSearch()).get('qaArtCandidate') : null
const isW02Candidate = () => candidateParam() === 'w02-harbor-v1'
// v3: three PNG layers split from ONE 1536x1024 master (candidates/w02-harbor-v3).
// Drawn at a uniform scale (never stretched per axis); the world is cropped to
// the art rather than padded, so no copied or invented sea is ever shown.
export const W02_V3 = Object.freeze({
  id: 'w02-harbor-v3', scale: 2160 / 1536, offsetX: -200, offsetY: -205, art: Object.freeze({ width: 1536, height: 1024 }),
  seaStartY: Math.round(162 * (2160 / 1536) - 205),
})
const isW02V3 = () => candidateParam() === W02_V3.id
const candidateId = () => isW02V3() ? W02_V3.id : isW02Candidate() ? 'w02-harbor-v1' : null
const displayTextureKey = layer => isW02V3() ? 'qa_art_w02_v3_' + layer.id
  : isW02Candidate() ? 'qa_art_w02_v1_' + layer.id : textureKey(layer)
const displayTexturePath = layer => isW02V3()
  ? 'fishing-game/assets/candidates/w02-harbor-v3/' + layer.id + '.png'
  : isW02Candidate()
    ? 'fishing-game/assets/candidates/w02-harbor-v1/' + layer.id + '.svg'
    : 'fishing-game/assets/qa/' + layer.file
// Existing procedural weather and legacy field art occupy depths below 19.
// Bring this complete QA world in FRONT of those legacy layers, while
// remaining BEHIND fish sprites (22), player (41), rod/line (42/43), and HUD.
const HARBOR_PLAYABLE_DEPTHS = Object.freeze({ far: 19, sea: 20, quay: 25 })

// World-only QA scenery has a real painted horizon at y=476. The legacy
// blueprint spawns decorative silhouettes anywhere in the formerly all-water
// 900x1400 field, including ABOVE this new horizon. Keep their positions and
// gameplay AI unchanged; only clip visible decorative fish while casting.
// Battle and Result retain their existing scene-owned fish presentation.
export function syncHarborQaFishHorizon(scene, seaStartY = scene?._qaHarborSeaStartY ?? 476) {
  if (!scene?._qaHarborPlayable || scene.phase !== 'cast') return
  for (const fish of scene.bg?._fishGfx ?? []) {
    if (!fish?.active) continue
    if (fish.getData?.('qaOriginalVisible') === undefined) {
      fish.setData?.('qaOriginalVisible', fish.visible)
    }
    const baseline = fish.getData?.('qaOriginalVisible') !== false
    fish.setVisible?.(baseline && Number.isFinite(fish.y) && fish.y >= seaStartY + 8)
  }
}

// v3 art is cropped, not padded: world = art at a uniform scale. Layers are
// re-placed and the camera world/bounds shrunk to the painted area.
function applyW02V3Layout(scene) {
  const worldW = Math.round(W02_V3.art.width * W02_V3.scale + W02_V3.offsetX)
  const worldH = Math.round(W02_V3.art.height * W02_V3.scale + W02_V3.offsetY)
  scene.fishingCamera.world = { ...scene.fishingCamera.world, width: worldW, height: worldH }
  scene.cameras.main.setBounds(0, 0, worldW, worldH)
  for (const layer of scene._qaHarborWorldLayers) {
    layer.setPosition(W02_V3.offsetX, W02_V3.offsetY).setScale(W02_V3.scale)
  }
}

function showReviewLayer(scene) {
  if (scene._qaHarborPlayable !== true) return
  // Older cinematic QA install owns a mirrored 900px image as a fallback.
  // Hide that art without changing its owner or destroying it: the new scene
  // draws its own full-size independent layers instead.
  scene.bg?._blueprintWaterLayers?.forEach(object => object?.setVisible?.(false))
  scene._cameraPanWideBackground?.setVisible?.(false)
}

export function installHarborPlayableQa(GameScene) {
  if (GameScene.prototype.__ainanHarborPlayableQaInstalled) return
  GameScene.prototype.__ainanHarborPlayableQaInstalled = true

  const previousPreload = GameScene.prototype.preload
  GameScene.prototype.preload = function (...args) {
    previousPreload?.apply(this, args)
    if (!isHarborPlayableQaEnabled(getSearch())) return
    for (const layer of HARBOR_WIDE_H02.layers) {
      const key = displayTextureKey(layer)
      if (!this.textures.exists(key)) this.load.image(
        key, baseUrl() + displayTexturePath(layer),
      )
    }
  }

  const previousCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = previousCreate.apply(this, args)
    if (!isHarborPlayableQaEnabled(getSearch()) || this.env?.point !== 'pointA') return result
    if (!this.fishingCamera || !this._cameraPanPlayer?.active) return result
    const missing = HARBOR_WIDE_H02.layers.filter(layer => !this.textures.exists(displayTextureKey(layer)))
    if (missing.length) {
      this._qaHarborPlayableError = 'Missing real Phaser textures: ' + missing.map(layer => layer.id).join(', ')
      return result
    }

    this._qaHarborPlayable = true
    this._qaHarborArtCandidate = candidateId()
    this._qaHarborSeaStartY = isW02V3() ? W02_V3.seaStartY : 476
    // Existing fishing gameplay still owns player, bobber, cast/landing and
    // every timer. Only extend the WORLD CAMERA view bounds for this QA mode.
    this.fishingCamera.world = {
      ...FISHING_WORLD,
      width: HARBOR_WIDE_H02.size.width,
      height: HARBOR_WIDE_H02.size.height,
    }
    this.cameras.main.setBounds(0, 0, HARBOR_WIDE_H02.size.width, HARBOR_WIDE_H02.size.height)
    this._qaHarborWorldLayers = HARBOR_WIDE_H02.layers.map(layer =>
      this.add.image(0, 0, displayTextureKey(layer))
        .setOrigin(0, 0)
        .setDisplaySize(HARBOR_WIDE_H02.size.width, HARBOR_WIDE_H02.size.height)
        .setDepth(HARBOR_PLAYABLE_DEPTHS[layer.id])
        .setScrollFactor(1)
        .setData('qaOnly', true)
        .setData('artApproved', false),
    )
    if (isW02V3()) applyW02V3Layout(this)
    showReviewLayer(this)
    this.fishingCamera.focusPlayer(true)

    // The QA label belongs to screen-space HUD and must not affect cast hits.
    this._qaHarborPlayableBadge = this.add.text(
      12, this.scale.height < 500 ? 76 : 98,
      'QA実装：背景美術は未承認',
      { fontFamily: 'M PLUS Rounded 1c, sans-serif',
        fontSize: '12px', color: '#ffffff', backgroundColor: '#14374abb',
        padding: { x: 7, y: 5 } },
    ).setDepth(9500).setScrollFactor(0).setAlpha(0.8)
    this._qaHarborPlayableBadge.setX(Math.max(12,
      this.scale.width - this._qaHarborPlayableBadge.width - 12))

    this._qaHarborPlayableOnResize = () => {
      showReviewLayer(this)
      this._qaHarborPlayableBadge?.setPosition?.(
        Math.max(12, this.scale.width - this._qaHarborPlayableBadge.width - 12),
        this.scale.height < 500 ? 76 : 98,
      )
    }
    this.scale.on('resize', this._qaHarborPlayableOnResize)
    return result
  }

  const previousUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (...args) {
    const result = previousUpdate?.apply(this, args)
    if (!this._qaHarborPlayable) return result
    showReviewLayer(this)
    syncHarborQaFishHorizon(this)
    this._qaHarborCameraState = Object.freeze({
      phase: this.phase,
      x: this.cameras.main.scrollX,
      y: this.cameras.main.scrollY,
      lureX: this.bobber?.visible ? this.bobber.x : null,
      lureY: this.bobber?.visible ? this.bobber.y : null,
    })
    return result
  }

  const previousCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    this.scale?.off?.('resize', this._qaHarborPlayableOnResize)
    this._qaHarborPlayableOnResize = null
    this._qaHarborPlayableBadge?.destroy?.()
    this._qaHarborPlayableBadge = null
    this._qaHarborWorldLayers?.forEach(layer => layer?.destroy?.())
    this._qaHarborWorldLayers = null
    this._qaHarborCameraState = null
    this._qaHarborArtCandidate = null
    this._qaHarborPlayable = false
    return previousCleanup?.apply(this, args)
  }
}
