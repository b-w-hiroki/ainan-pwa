import { BackgroundManager } from '../scenes/components/BackgroundManager.js'
import { BobberManager } from '../scenes/components/BobberManager.js'
import { FISHING_WORLD } from '../scenes/components/FishingCameraController.js'
import { MOBILE_FRAME } from '../config/mobileFrame.js'
import { ASSETS } from '../config/assetManifest.js'

const TEXT_RES = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1
const FIELD = ASSETS.fishingField

const LOCATION_OVERLAY = {
  pointA: FIELD.locationHarbor,
  pointB: FIELD.locationBay,
  pointC: FIELD.locationCape,
}

const THEMES = {
  pointA: { top: 0x45cce8, mid: 0x1689b7, deep: 0x07527d, abyss: 0x053957, glow: 0xcdf8ff, accent: 0x79e8ef },
  pointB: { top: 0x55d4cc, mid: 0x168f96, deep: 0x075c70, abyss: 0x064352, glow: 0xd5fff4, accent: 0x89f0d8 },
  pointC: { top: 0x3eb8d8, mid: 0x176f9c, deep: 0x123f62, abyss: 0x0a2b4b, glow: 0xd8f2ff, accent: 0x84c8f0 },
}

const PLAYER_SCALE = { cast: 0.58, catch: 0.92 }
const FISH_DURATION_SCALE = 1.65

function themeFor(point) { return THEMES[point] ?? THEMES.pointA }

function hasTexture(scene, asset) { return Boolean(asset?.key && scene.textures.exists(asset.key)) }

function drawFallbackWaterWorld(manager, W, H, pointId = 'pointA') {
  const scene = manager.scene
  const theme = themeFor(pointId)
  const g = scene.add.graphics().setDepth(0)
  g.fillGradientStyle(theme.top, theme.top, theme.deep, theme.deep, 1)
  g.fillRect(0, 0, W, H)
  g.fillStyle(theme.glow, 0.08); g.fillRect(0, 120, W, 170)
  g.fillStyle(theme.mid, 0.18); g.fillRect(0, 420, W, 310)
  g.fillStyle(theme.deep, 0.20); g.fillRect(0, 760, W, 350)
  g.fillStyle(theme.abyss, 0.28); g.fillRect(0, 1080, W, H - 1080)
  ;[[70,650,155,10,.13],[300,690,205,11,.10],[610,628,190,9,.13],[180,780,230,9,.08],[500,825,170,8,.09],[760,755,160,7,.08],[95,940,185,7,.07],[390,980,250,8,.06]].forEach(([x,y,w,h,a]) => {
    g.fillStyle(0xffffff, a); g.fillEllipse(x, y, w, h)
  })
  manager._blueprintWaterGfx = g
  return g
}

function buildAssetWaterWorld(manager, W, H, pointId = 'pointA') {
  const scene = manager.scene
  const needed = [FIELD.waterBase, FIELD.waterPattern, FIELD.waterHighlight, FIELD.underwaterDepth]
  if (!needed.every(asset => hasTexture(scene, asset))) return drawFallbackWaterWorld(manager, W, H, pointId)

  const makeLayer = (asset, depth, alpha = 1, scaleX = 1, scaleY = 1) => scene.add.image(W / 2, H / 2, asset.key)
    .setDisplaySize(W * scaleX, H * scaleY)
    .setDepth(depth)
    .setAlpha(alpha)

  const base = makeLayer(FIELD.waterBase, 0, 1)
  const pattern = makeLayer(FIELD.waterPattern, 1, 0.50, 1.04, 1.03)
  const highlight = makeLayer(FIELD.waterHighlight, 2, 0.62, 1.05, 1.04)
  const depth = makeLayer(FIELD.underwaterDepth, 3, 0.62)
  const overlayAsset = LOCATION_OVERLAY[pointId]
  const location = hasTexture(scene, overlayAsset)
    ? makeLayer(overlayAsset, 4, pointId === 'pointC' ? 0.82 : 0.72)
    : null

  if (pointId === 'pointB') base.setTint(0xd8fff2)
  if (pointId === 'pointC') base.setTint(0xd9eaff)

  scene.tweens.add({ targets: pattern, x: W / 2 + 10, y: H / 2 + 5, duration: 6200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
  scene.tweens.add({ targets: highlight, x: W / 2 - 16, y: H / 2 + 8, alpha: 0.35, duration: 4600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

  manager._blueprintWaterLayers = [base, pattern, highlight, depth, location].filter(Boolean)
  return base
}

function drawReadableFish(g, type, sc) {
  const bodyAlpha = type === 'rare' ? 0.82 : type === 'uncommon' ? 0.74 : 0.66
  const shadow = 0x061e31
  const bodyW = (type === 'rare' ? 40 : type === 'uncommon' ? 36 : 33) * sc
  const bodyH = (type === 'rare' ? 18 : 16) * sc
  g.clear()
  g.fillStyle(0x061e31, 0.12); g.fillEllipse(0, 2, bodyW * 1.36, bodyH * 1.55)
  g.fillStyle(shadow, bodyAlpha); g.fillEllipse(0, 0, bodyW, bodyH)
  g.fillTriangle(bodyW * 0.43, 0, bodyW * 0.73, -bodyH * 0.60, bodyW * 0.73, bodyH * 0.60)
  g.fillStyle(shadow, bodyAlpha * 0.88)
  g.fillTriangle(-bodyW * 0.12, -bodyH * 0.43, bodyW * 0.08, -bodyH * 0.42, -bodyW * 0.01, -bodyH * 0.88)
}

function resetAssetRuntime(manager, index) {
  const runtime = manager._fishRuntime?.[index]
  if (!runtime) return
  runtime.state = 'cruise'
  runtime.interest = 0
  runtime.stimulation = 0
  runtime.lastDistance = Infinity
  runtime.spooked = false
  runtime.reaction?.destroy?.()
  runtime.reaction = null
}

function applyAssetFishShadows(scene) {
  const manager = scene.bg
  if (!manager?._fishDefs?.length || !hasTexture(scene, FIELD.fishShadowMediumIdle)) return

  manager._fishTweens?.forEach(tw => { tw?.stop?.(); tw?.destroy?.() })
  manager._fishGfx?.forEach(obj => obj?.destroy?.())

  manager._fishGfx = manager._fishDefs.map(fd => {
    const baseW = fd.t === 'rare' ? 52 : fd.t === 'uncommon' ? 48 : 44
    const width = Math.max(32, Math.min(116, baseW * fd.sc))
    const container = scene.add.container(0, 0).setDepth(22)
    const image = scene.add.image(0, 0, FIELD.fishShadowMediumIdle.key)
      .setDisplaySize(width, width * 0.5)
      .setAlpha(fd.t === 'rare' ? 0.90 : fd.t === 'uncommon' ? 0.82 : 0.74)
    container.add(image)
    container._assetImage = image
    return container
  })

  manager._usingAssetFish = true
  manager._fishRuntime?.forEach((runtime, index) => { runtime.gfx = manager._fishGfx[index] })
  manager.startFishTweens()
}

function syncAssetFishPose(scene) {
  if (!scene.bg?._usingAssetFish) return
  scene.bg._fishRuntime?.forEach(runtime => {
    const image = runtime.gfx?._assetImage
    if (!image) return
    const turning = runtime.state === 'noticed' || runtime.state === 'inspect'
    const asset = turning && hasTexture(scene, FIELD.fishShadowMediumTurn) ? FIELD.fishShadowMediumTurn : FIELD.fishShadowMediumIdle
    if (image.texture?.key !== asset.key) image.setTexture(asset.key)
    image.setAlpha(runtime.spooked ? 0.42 : runtime.state === 'biteReady' ? 0.98 : runtime.state === 'follow' ? 0.90 : 0.78)
  })
}

function setPlayer(scene, visible, scale = 1) {
  const sprite = scene._playerSprite
  if (!sprite) return
  sprite.setVisible(visible)
  scene._playerShadow?.setVisible(visible)
  if (visible && scene._playerDisplayW && scene._playerDisplayH) sprite.setDisplaySize(scene._playerDisplayW * scale, scene._playerDisplayH * scale)
}

function hideTackle(scene) {
  const tackle = scene.tackleUI
  if (!tackle) return
  const hideBtn = btn => { if (btn) Object.values(btn).forEach(obj => obj?.setVisible?.(false)) }
  hideBtn(tackle._rodBtn); hideBtn(tackle._baitBtn)
  tackle._rodPanel?.setVisible(false); tackle._baitPanel?.setVisible(false)
  tackle._openPanel = null
  tackle.disable?.()
}

function buildCastInstruction(scene) {
  const W = scene.scale.width
  const H = scene.scale.height
  const top = H - MOBILE_FRAME.bottomControlsHeight
  const items = []

  const panel = scene.add.graphics().setDepth(91).setScrollFactor(0)
  panel.fillStyle(0xf8fdff, 0.95)
  panel.fillRect(0, top, W, MOBILE_FRAME.bottomControlsHeight)
  panel.lineStyle(2, 0x9bcfe5, 0.55)
  panel.lineBetween(0, top, W, top)
  items.push(panel)

  const power = scene.add.text(22, top + 24, 'パワー', {
    fontFamily: 'M PLUS Rounded 1c, sans-serif',
    resolution: TEXT_RES,
    fontSize: '12px',
    fontStyle: 'bold',
    color: '#173248',
  }).setOrigin(0, 0.5).setDepth(93).setScrollFactor(0)
  items.push(power)

  const buttonBg = scene.add.graphics().setDepth(92).setScrollFactor(0)
  buttonBg.fillStyle(0x2f9ed4, 1)
  buttonBg.lineStyle(3, 0xffffff, 0.94)
  buttonBg.fillCircle(W / 2, top + 116, 45)
  buttonBg.strokeCircle(W / 2, top + 116, 45)
  items.push(buttonBg)

  const buttonText = scene.add.text(W / 2, top + 116, '投げる', {
    fontFamily: 'M PLUS Rounded 1c, sans-serif',
    resolution: TEXT_RES,
    fontSize: '16px',
    fontStyle: 'bold',
    color: '#ffffff',
  }).setOrigin(0.5).setDepth(93).setScrollFactor(0)
  items.push(buttonText)

  const hit = scene.add.circle(W / 2, top + 116, 48, 0x000000, 0)
    .setDepth(94)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', (_pointer, _lx, _ly, event) => {
      event?.stopPropagation?.()
      if (scene.phase !== 'cast' || scene.isCharging) return
      scene.isCharging = true
      scene.chargeStartedAt = scene.time.now
    })
    .on('pointerup', (_pointer, _lx, _ly, event) => {
      event?.stopPropagation?.()
      if (scene.phase !== 'cast' || !scene.isCharging) return
      scene._onUp?.()
    })
  items.push(hit)

  scene.powerGfx?.setDepth(95).setScrollFactor(0)
  scene.powerLabel?.setDepth(96).setScrollFactor(0)
  scene._blueprintCastInstruction = scene.add.container(0, 0, items).setDepth(91).setScrollFactor(0).setVisible(false)
}

function showCastInstruction(scene, visible) { scene._blueprintCastInstruction?.setVisible(Boolean(visible)) }

function ensureLureRipple(scene) {
  if (scene._assetLureRipple || !hasTexture(scene, FIELD.rippleSmall)) return
  const ripple = scene.add.image(scene.bobber?.x ?? 0, scene.bobber?.y ?? 0, FIELD.rippleSmall.key)
    .setDisplaySize(42, 42).setDepth(29).setAlpha(0.46).setVisible(false)
  const sx = ripple.scaleX, sy = ripple.scaleY
  scene.tweens.add({ targets: ripple, scaleX: sx * 1.45, scaleY: sy * 1.45, alpha: 0.12, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
  scene._assetLureRipple = ripple
}

export function installBlueprintFishingField(GameScene) {
  if (GameScene.prototype.__ainanBlueprintFishingFieldInstalled) return
  GameScene.prototype.__ainanBlueprintFishingFieldInstalled = true

  const originalPreload = GameScene.prototype.preload
  GameScene.prototype.preload = function (...args) {
    originalPreload?.apply(this, args)
    Object.values(FIELD).forEach(asset => {
      if (asset.status === 'ready' && !this.textures.exists(asset.key)) this.load.image(asset.key, asset.path)
    })
  }

  BackgroundManager.prototype.buildBackground = function (_W, _H, pointId = 'pointA') {
    return buildAssetWaterWorld(this, FISHING_WORLD.width, FISHING_WORLD.height, pointId)
  }

  BackgroundManager.prototype._drawFish = function (g, type, sc) { drawReadableFish(g, type, sc) }

  const previousStartFishTweens = BackgroundManager.prototype.startFishTweens
  BackgroundManager.prototype.startFishTweens = function () {
    if (!this._usingAssetFish) return previousStartFishTweens.call(this)
    this._fishTweens?.forEach(tw => { tw?.stop?.(); tw?.destroy?.() })
    this._fishTweens = []
    this._fishDefs.forEach((fd, index) => {
      const gfx = this._fishGfx[index]
      if (!gfx) return
      resetAssetRuntime(this, index)
      const sx = fd.rtl ? FISHING_WORLD.width + 90 : -90
      const ex = fd.rtl ? -90 : FISHING_WORLD.width + 90
      gfx.setPosition(sx, FISHING_WORLD.height * fd.y).setScale(fd.rtl ? -1 : 1, 1)
      this._fishTweens[index] = this.scene.tweens.add({ targets: gfx, x: ex, duration: Math.round(fd.dur * FISH_DURATION_SCALE), delay: Math.round(fd.delay * 0.6), repeat: -1, ease: 'Linear' })
    })
  }

  const previousResetFish = BackgroundManager.prototype.resetFishToStart
  BackgroundManager.prototype.resetFishToStart = function (index) {
    if (!this._usingAssetFish) return previousResetFish.call(this, index)
    const fd = this._fishDefs?.[index], gfx = this._fishGfx?.[index]
    if (!fd || !gfx) return
    resetAssetRuntime(this, index)
    const sx = fd.rtl ? FISHING_WORLD.width + 90 : -90
    const ex = fd.rtl ? -90 : FISHING_WORLD.width + 90
    gfx.setPosition(sx, FISHING_WORLD.height * fd.y).setScale(fd.rtl ? -1 : 1, 1)
    this._fishTweens[index]?.stop?.(); this._fishTweens[index]?.destroy?.()
    this._fishTweens[index] = this.scene.tweens.add({ targets: gfx, x: ex, duration: Math.round(fd.dur * FISH_DURATION_SCALE), repeat: -1, ease: 'Linear' })
  }

  const originalBgDestroy = BackgroundManager.prototype.destroy
  BackgroundManager.prototype.destroy = function (...args) {
    this._blueprintWaterLayers?.forEach(obj => { this.scene?.tweens?.killTweensOf?.(obj); obj?.destroy?.() })
    this._blueprintWaterLayers = null
    this._blueprintWaterGfx?.destroy?.(); this._blueprintWaterGfx = null
    return originalBgDestroy.apply(this, args)
  }

  const originalBobberCreate = BobberManager.prototype.create
  BobberManager.prototype.create = function (W, H) {
    if (!hasTexture(this.scene, FIELD.lureIdle)) return originalBobberCreate.call(this, W, H)
    const image = this.scene.add.image(0, 0, FIELD.lureIdle.key).setDepth(30).setVisible(false).setDisplaySize(42, 42)
    this.gfx = image
    this._usingAssetLure = true
    this.setBaitType(this.scene.env?.player?.baitType ?? 'worm')
    return image
  }

  const originalSetBaitType = BobberManager.prototype.setBaitType
  BobberManager.prototype.setBaitType = function (baitType = 'worm') {
    if (!this._usingAssetLure) return originalSetBaitType.call(this, baitType)
    this.baitType = baitType
    this.gfx?.clearTint?.()
    if (baitType === 'shrimp') this.gfx?.setTint?.(0xffc4a8)
    if (baitType === 'special') this.gfx?.setTint?.(0xffef8a)
  }

  const originalShowSplash = BobberManager.prototype.showSplash
  BobberManager.prototype.showSplash = function (x, y) {
    if (!hasTexture(this.scene, FIELD.rippleSmall)) return originalShowSplash.call(this, x, y)
    const ripple = this.scene.add.image(x, y, FIELD.rippleSmall.key).setDepth(45).setDisplaySize(34, 34).setAlpha(0.86)
    const sx = ripple.scaleX, sy = ripple.scaleY
    this.scene.tweens.add({ targets: ripple, scaleX: sx * 2.4, scaleY: sy * 2.4, alpha: 0, duration: 320, ease: 'Sine.easeOut', onComplete: () => ripple.destroy() })
  }

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    buildCastInstruction(this)
    applyAssetFishShadows(this)
    ensureLureRipple(this)
    this.playerActionInset?.destroy?.(); this.playerActionInset = null
    this.castHintBg?.setVisible(false); this.hintText?.setVisible(false)
    this._castDistanceBadge?.setVisible(false); this._distanceBadge?.setVisible(false)
    hideTackle(this)
    if (this.phase === 'cast') { setPlayer(this, true, PLAYER_SCALE.cast); showCastInstruction(this, true) }
    return result
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    const result = originalEnterCast.apply(this, args)
    hideTackle(this)
    this.castHintBg?.setVisible(false); this.hintText?.setVisible(false)
    this._castDistanceBadge?.setVisible(false); this._distanceBadge?.setVisible(false)
    this._assetLureRipple?.setVisible(false)
    setPlayer(this, true, PLAYER_SCALE.cast); showCastInstruction(this, true)
    return result
  }

  const originalOnDown = GameScene.prototype._onDown
  GameScene.prototype._onDown = function (pointer) {
    const result = originalOnDown.call(this, pointer)
    if (this.phase === 'cast') setPlayer(this, true, PLAYER_SCALE.cast)
    return result
  }

  const originalFireCast = GameScene.prototype._fireCast
  GameScene.prototype._fireCast = function (...args) {
    showCastInstruction(this, false)
    const result = originalFireCast.apply(this, args)
    setPlayer(this, true, PLAYER_SCALE.cast)
    return result
  }

  const originalEnterRetrieve = GameScene.prototype._enterRetrieve
  GameScene.prototype._enterRetrieve = function (...args) {
    const result = originalEnterRetrieve.apply(this, args)
    setPlayer(this, true, PLAYER_SCALE.cast)
    this.playerActionInset?.setVisible?.(false)
    this._castDistanceBadge?.setVisible(false); this._distanceBadge?.setVisible(false)
    showCastInstruction(this, false)
    ensureLureRipple(this)
    this._assetLureRipple?.setPosition(this.bobber.x, this.bobber.y).setVisible(true)
    return result
  }

  const originalSyncRetrieveWorldUI = GameScene.prototype._syncRetrieveWorldUI
  GameScene.prototype._syncRetrieveWorldUI = function (...args) {
    const result = originalSyncRetrieveWorldUI.apply(this, args)
    this._distanceBadge?.setVisible(false); this._castDistanceBadge?.setVisible(false)
    if (this._assetLureRipple?.visible && this.bobber?.visible) this._assetLureRipple.setPosition(this.bobber.x, this.bobber.y)
    return result
  }

  const originalTwitchRetrieve = GameScene.prototype._twitchRetrieve
  GameScene.prototype._twitchRetrieve = function (...args) {
    const result = originalTwitchRetrieve.apply(this, args)
    if (this.phase === 'retrieve' && this.bobberMgr?._usingAssetLure && !this._assetLureMotionActive) {
      this._assetLureMotionActive = true
      this.tweens.add({ targets: this.bobber, angle: 12, duration: 110, yoyo: true, ease: 'Sine.easeOut', onComplete: () => { this.bobber?.setAngle(0); this._assetLureMotionActive = false } })
      this.bobberMgr.showSplash(this.bobber.x, this.bobber.y)
    }
    return result
  }

  const originalTickFishInterest = GameScene.prototype._tickFishInterest
  GameScene.prototype._tickFishInterest = function (...args) {
    const result = originalTickFishInterest.apply(this, args)
    syncAssetFishPose(this)
    return result
  }

  const originalBeginRetrieveBite = GameScene.prototype._beginRetrieveBite
  GameScene.prototype._beginRetrieveBite = function (...args) {
    const result = originalBeginRetrieveBite.apply(this, args)
    setPlayer(this, false)
    this._assetLureRipple?.setVisible(false)
    return result
  }

  const originalOpenHitWindow = GameScene.prototype._openHitWindow
  GameScene.prototype._openHitWindow = function (...args) {
    const result = originalOpenHitWindow.apply(this, args)
    setPlayer(this, false); this._assetLureRipple?.setVisible(false)
    return result
  }

  const originalEnterBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    const result = originalEnterBattle.apply(this, args)
    setPlayer(this, false); this._assetLureRipple?.setVisible(false)
    return result
  }

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (outcome, ...args) {
    const result = originalFinishBattle.call(this, outcome, ...args)
    if (outcome === 'caught') setPlayer(this, true, PLAYER_SCALE.catch)
    else setPlayer(this, false)
    showCastInstruction(this, false); this._assetLureRipple?.setVisible(false)
    return result
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    this._blueprintCastInstruction?.destroy(true); this._blueprintCastInstruction = null
    this.tweens?.killTweensOf?.(this._assetLureRipple)
    this._assetLureRipple?.destroy?.(); this._assetLureRipple = null
    return originalCleanup.apply(this, args)
  }
}
