import { ASSETS } from '../config/assetManifest.js'
import { FISHING_WORLD } from '../scenes/components/FishingCameraController.js'

const enabled = () => typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('cameraPan') === '1'

const fieldAssets = () => [
  ASSETS.fishingField.waterBase,
  ASSETS.fishingField.waterPattern,
  ASSETS.fishingField.waterHighlight,
  ASSETS.fishingField.underwaterDepth,
  ASSETS.fishingField.locationHarbor,
  ASSETS.ui.fishingLayerPlatform,
  ASSETS.characters.fishingMotionIdle,
  ASSETS.characters.fishingMotionCastWindup,
  ASSETS.characters.fishingMotionCastMid,
  ASSETS.characters.fishingMotionCastRelease,
]

function hideFixedPresentation(scene) {
  scene._finalCastOverlay?.setVisible?.(false)
  scene._rcCastDock?.setVisible?.(false)
  scene._rcRetrieveDock?.setVisible?.(false)
  scene._rcPlayerHero?.setVisible?.(false)
  scene._rcLeftPierDecor?.setVisible?.(false)
  scene._mockTopChrome?.setVisible?.(false)
  scene._blueprintCastInstruction?.setVisible?.(false)
  scene._rcRetrieveLine?.setVisible?.(false)
  scene._qaHudObjects?.forEach?.(obj => obj?.setVisible?.(false))
}

function buildWorld(scene) {
  scene.bg?._blueprintWaterLayers?.forEach(obj => obj?.destroy?.())
  scene.bg._blueprintWaterLayers = []
  const addLayer = (asset, depth, alpha = 1) => {
    if (!asset?.key || !scene.textures.exists(asset.key)) return null
    const image = scene.add.image(FISHING_WORLD.width / 2, FISHING_WORLD.height / 2, asset.key)
      .setDisplaySize(FISHING_WORLD.width, FISHING_WORLD.height)
      .setDepth(depth)
      .setAlpha(alpha)
      .setScrollFactor(1)
    scene.bg._blueprintWaterLayers.push(image)
    return image
  }
  addLayer(ASSETS.fishingField.waterBase, 0)
  addLayer(ASSETS.fishingField.waterPattern, 1, 0.48)
  addLayer(ASSETS.fishingField.waterHighlight, 2, 0.56)
  addLayer(ASSETS.fishingField.underwaterDepth, 3, 0.58)
  addLayer(ASSETS.fishingField.locationHarbor, 4, 0.72)

  const platformAsset = ASSETS.ui.fishingLayerPlatform
  if (platformAsset?.key && scene.textures.exists(platformAsset.key)) {
    const platform = scene.add.image(0, 520, platformAsset.key)
      .setOrigin(0)
      .setDisplaySize(390, 844)
      .setDepth(6)
      .setScrollFactor(1)
    scene.bg._blueprintWaterLayers.push(platform)
  }

  scene._cameraPanPlayerShadow?.destroy?.()
  scene._cameraPanPlayer?.destroy?.()
  scene._cameraPanPlayerShadow = scene.add.ellipse(FISHING_WORLD.player.x, FISHING_WORLD.player.y - 5, 118, 24, 0x062c44, 0.20)
    .setDepth(40)
    .setScrollFactor(1)
  scene._cameraPanPlayer = scene.add.image(FISHING_WORLD.player.x, FISHING_WORLD.player.y, ASSETS.characters.fishingMotionIdle.key)
    .setOrigin(0.5, 1)
    .setDisplaySize(150, 195)
    .setDepth(41)
    .setScrollFactor(1)
}

function buildHud(scene) {
  scene._cameraPanHud?.destroy?.(true)
  const W = scene.scale.width
  const H = scene.scale.height
  const compact = H < 520
  const pad = compact ? 12 : 16
  const headerH = compact ? 50 : 58
  const panelW = Math.min(compact ? 330 : 358, W - pad * 2)
  const root = scene.add.container(0, 0).setDepth(9000).setScrollFactor(0)
  const g = scene.add.graphics()
  g.fillStyle(0x062c44, 0.22).fillRoundedRect(pad, pad + 4, panelW, headerH, 18)
  g.fillStyle(0xfffdf7, 0.97).lineStyle(3, 0x173248, 0.94)
    .fillRoundedRect(pad, pad, panelW, headerH, 18).strokeRoundedRect(pad, pad, panelW, headerH, 18)
  g.lineStyle(1, 0x9bcfe5, 0.75).strokeRoundedRect(pad + 3, pad + 3, panelW - 6, headerH - 6, 15)
  const back = scene.add.text(pad + 26, pad + headerH / 2, '‹', { fontFamily: 'Nunito, sans-serif', fontSize: compact ? '34px' : '40px', fontStyle: 'bold', color: '#173248' }).setOrigin(0.5)
  const location = scene.add.text(pad + 62, pad + headerH / 2, '汐風港', { fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: compact ? '15px' : '17px', fontStyle: 'bold', color: '#173248' }).setOrigin(0, 0.5)
  const distance = scene.add.text(pad + panelW - 20, pad + headerH / 2, '', { fontFamily: 'Nunito, M PLUS Rounded 1c, sans-serif', fontSize: compact ? '13px' : '15px', fontStyle: 'bold', color: '#173248' }).setOrigin(1, 0.5)
  const status = scene.add.text(W / 2, H - (compact ? 28 : 42), '', { fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: compact ? '14px' : '16px', fontStyle: 'bold', color: '#ffffff', stroke: '#062c44', strokeThickness: 5, align: 'center' }).setOrigin(0.5).setScrollFactor(0)
  root.add([g, back, location, distance, status])
  scene._cameraPanHud = root
  scene._cameraPanHudNodes = { distance, status }
}

function syncHud(scene) {
  const nodes = scene._cameraPanHudNodes
  if (!nodes) return
  const meters = scene.bobber?.visible
    ? Math.hypot(scene.bobber.x - scene.anchorX, scene.bobber.y - scene.anchorY) / FISHING_WORLD.pxPerMeter
    : 0
  nodes.distance.setText(meters > 0.5 ? `${meters.toFixed(0)}m` : '')
  const casting = scene._cameraPanCasting
  nodes.status.setText(casting ? '仕掛けを追っています' : scene.phase === 'cast' ? '岸から狙いを決めてキャスト' : scene.phase === 'retrieve' ? '着水地点で魚の反応を読む' : scene.phase === 'battle' ? '糸の張りを保つ' : '')
}

function showWorldPlayer(scene) {
  scene._playerSprite?.setVisible?.(false)
  scene._playerShadow?.setVisible?.(false)
  scene._cameraPanPlayer?.setVisible?.(true)
  scene._cameraPanPlayerShadow?.setVisible?.(true)
}

function setWorldPlayerPose(scene, asset) {
  if (asset?.key && scene._cameraPanPlayer?.active && scene.textures.exists(asset.key)) scene._cameraPanPlayer.setTexture(asset.key)
}

export function installCastCameraPanPrototype(GameScene) {
  if (GameScene.prototype.__ainanCastCameraPanPrototypeInstalled) return
  GameScene.prototype.__ainanCastCameraPanPrototypeInstalled = true

  const originalPreload = GameScene.prototype.preload
  GameScene.prototype.preload = function (...args) {
    originalPreload?.apply(this, args)
    if (!enabled()) return
    fieldAssets().forEach(asset => {
      if (asset?.status === 'ready' && asset.key && !this.textures.exists(asset.key)) this.load.image(asset.key, asset.path)
    })
  }

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    if (!enabled()) return result
    buildWorld(this)
    buildHud(this)
    hideFixedPresentation(this)
    showWorldPlayer(this)
    this.fishingCamera?.focusPlayer(true)
    this._cameraPanCasting = false
    this._cameraPanResize = () => {
      buildHud(this)
      if (this.phase === 'cast') this.fishingCamera?.focusPlayer(true)
      else if (this.bobber?.visible) this.fishingCamera?.holdLure(this.bobber.x, this.bobber.y)
    }
    this.scale?.on?.('resize', this._cameraPanResize)
    return result
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    const result = originalEnterCast.apply(this, args)
    if (!enabled()) return result
    this._cameraPanCasting = false
    hideFixedPresentation(this)
    showWorldPlayer(this)
    setWorldPlayerPose(this, ASSETS.characters.fishingMotionIdle)
    this.fishingCamera?.focusPlayer(false)
    return result
  }

  const originalOnDown = GameScene.prototype._onDown
  GameScene.prototype._onDown = function (...args) {
    const pointer = args[0]
    if (enabled() && ['cast', 'retrieve'].includes(this.phase) && pointer?.x <= 58 && pointer?.y <= 70) {
      this.scene.start('MapScene')
      return true
    }
    const result = originalOnDown.apply(this, args)
    if (enabled() && this.phase === 'cast' && this.isCharging) setWorldPlayerPose(this, ASSETS.characters.fishingMotionCastWindup)
    return result
  }

  const originalFireCast = GameScene.prototype._fireCast
  GameScene.prototype._fireCast = function (...args) {
    if (!enabled()) return originalFireCast.apply(this, args)
    if (this._cameraPanCasting) return false
    this._cameraPanCasting = true
    hideFixedPresentation(this)
    showWorldPlayer(this)
    setWorldPlayerPose(this, ASSETS.characters.fishingMotionCastMid)
    this.time?.delayedCall?.(120, () => {
      if (this._cameraPanCasting) setWorldPlayerPose(this, ASSETS.characters.fishingMotionCastRelease)
    })
    return originalFireCast.apply(this, args)
  }

  const originalEnterRetrieve = GameScene.prototype._enterRetrieve
  GameScene.prototype._enterRetrieve = function (...args) {
    const result = originalEnterRetrieve.apply(this, args)
    if (!enabled()) return result
    this._cameraPanCasting = false
    hideFixedPresentation(this)
    showWorldPlayer(this)
    setWorldPlayerPose(this, ASSETS.characters.fishingMotionIdle)
    this.lineGfx?.setVisible?.(true)
    return result
  }

  const originalEnterBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    const result = originalEnterBattle.apply(this, args)
    if (!enabled()) return result
    hideFixedPresentation(this)
    showWorldPlayer(this)
    return result
  }

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (...args) {
    const result = originalFinishBattle.apply(this, args)
    if (!enabled() || result === false) return result
    showWorldPlayer(this)
    this.fishingCamera?.focusPlayer(false)
    return result
  }

  const originalUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (...args) {
    const result = originalUpdate?.apply(this, args)
    if (!enabled()) return result
    hideFixedPresentation(this)
    showWorldPlayer(this)
    if (this.phase === 'retrieve' && this.bobber?.visible) {
      this._rcRetrieveLine?.setVisible?.(false)
      this.lineGfx?.setVisible?.(true).clear().lineStyle(2, 0xffffff, 0.82)
        .lineBetween(this.anchorX, this.anchorY, this.bobber.x, this.bobber.y)
    }
    syncHud(this)
    return result
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    this._cameraPanHud?.destroy?.(true)
    this._cameraPanHud = null
    this._cameraPanHudNodes = null
    this._cameraPanPlayer?.destroy?.()
    this._cameraPanPlayer = null
    this._cameraPanPlayerShadow?.destroy?.()
    this._cameraPanPlayerShadow = null
    this.scale?.off?.('resize', this._cameraPanResize)
    this._cameraPanResize = null
    return originalCleanup.apply(this, args)
  }
}
