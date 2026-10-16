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
const isW02Candidate = () => isHarborPlayableQaEnabled(getSearch())
  && new URLSearchParams(getSearch()).get('qaArtCandidate') === 'w02-harbor-v1'
const displayTextureKey = layer => isW02Candidate() ? 'qa_art_w02_v1_' + layer.id : textureKey(layer)
const displayTexturePath = layer => isW02Candidate()
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
export function syncHarborQaFishHorizon(scene, seaStartY = 476) {
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
    this._qaHarborArtCandidate = isW02Candidate() ? 'w02-harbor-v1' : null
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
    showReviewLayer(this)
    this.fishingCamera.focusPlayer(true)

    // The QA label belongs to screen-space HUD and must not affect cast hits.
    this._qaHarborPlayableBadge = this.add.text(
      12, Math.max(76, this.scale.height - 170),
      'QA実装：背景美術は未承認',
      { fontFamily: 'M PLUS Rounded 1c, sans-serif',
        fontSize: '12px', color: '#ffffff', backgroundColor: '#14374abb',
        padding: { x: 7, y: 5 } },
    ).setDepth(9500).setScrollFactor(0).setAlpha(0.8)

    this._qaHarborPlayableOnResize = () => {
      showReviewLayer(this)
      const badgeY = Math.max(76, this.scale.height - 170)
      this._qaHarborPlayableBadge?.setY?.(badgeY)
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
