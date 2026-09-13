import { ASSETS } from '../config/assetManifest.js'
import { BobberManager } from '../scenes/components/BobberManager.js'

const FIELD = ASSETS.fishingField
const hasTexture = (scene, asset) => Boolean(asset?.key && scene.textures.exists(asset.key))

function chooseFishAsset(scene, runtime) {
  const fd = scene.bg?._fishDefs?.[runtime.index]
  if (!fd) return FIELD.fishShadowMediumIdle
  if (fd.t === 'rare' && hasTexture(scene, FIELD.fishShadowLargeIdle)) return FIELD.fishShadowLargeIdle
  if (fd.t === 'common' && fd.sc <= 1.02 && hasTexture(scene, FIELD.fishShadowSmallIdle)) return FIELD.fishShadowSmallIdle
  return FIELD.fishShadowMediumIdle
}

function applyFishSizeAssets(scene) {
  scene.bg?._fishRuntime?.forEach(runtime => {
    const image = runtime.gfx?._assetImage
    if (!image) return
    const fd = scene.bg?._fishDefs?.[runtime.index]
    const asset = chooseFishAsset(scene, runtime)
    if (asset && image.texture?.key !== asset.key) image.setTexture(asset.key)
    const base = fd?.t === 'rare' ? 78 : fd?.t === 'common' ? 43 : 55
    const width = Math.max(34, Math.min(128, base * (fd?.sc ?? 1)))
    image.setDisplaySize(width, width * 0.5)
  })
}

function buildFieldObjects(scene) {
  const objects = []
  const add = (asset, x, y, w, h, alpha = 1, depth = 6) => {
    if (!hasTexture(scene, asset)) return null
    const obj = scene.add.image(x, y, asset.key).setDisplaySize(w, h).setAlpha(alpha).setDepth(depth)
    objects.push(obj)
    return obj
  }

  add(FIELD.rock01, 115, 395, 132, 132, 0.55)
  add(FIELD.rock01, 778, 875, 164, 164, 0.42)
  const weedA = add(FIELD.seaweed01, 86, 828, 88, 132, 0.38, 7)
  const weedB = add(FIELD.seaweed01, 824, 535, 72, 108, 0.32, 7)
  ;[weedA, weedB].filter(Boolean).forEach((obj, i) => {
    scene.tweens.add({ targets: obj, angle: i ? 2.2 : -2.2, duration: 2300 + i * 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
  })
  scene._fieldDecorObjects = objects
}

function spawnTrail(scene, asset, x, y, angle = 0, w = 54, h = 27, alpha = 0.58) {
  if (!hasTexture(scene, asset)) return
  const fx = scene.add.image(x, y, asset.key).setDisplaySize(w, h).setAngle(angle).setAlpha(alpha).setDepth(28)
  scene.tweens.add({ targets: fx, alpha: 0, scaleX: fx.scaleX * 1.25, duration: 320, ease: 'Sine.easeOut', onComplete: () => fx.destroy() })
}

function spawnPulse(scene, asset, x, y, size, duration = 420) {
  if (!hasTexture(scene, asset)) return
  const fx = scene.add.image(x, y, asset.key).setDisplaySize(size, size).setAlpha(0.92).setDepth(46)
  const sx = fx.scaleX, sy = fx.scaleY
  scene.tweens.add({ targets: fx, scaleX: sx * 1.35, scaleY: sy * 1.35, alpha: 0, duration, ease: 'Sine.easeOut', onComplete: () => fx.destroy() })
}

function setLureTexture(scene, asset) {
  if (!scene.bobber?.active || !hasTexture(scene, asset)) return
  if (scene.bobber.texture?.key !== asset.key) scene.bobber.setTexture(asset.key)
}

function setLureIdle(scene) { setLureTexture(scene, FIELD.lureIdle) }
function setLurePull(scene) { setLureTexture(scene, FIELD.lurePull) }

function syncFishWake(scene) {
  scene.bg?._fishRuntime?.forEach(runtime => {
    const container = runtime.gfx
    if (!container?._assetImage) return
    let wake = container._followWake
    if (!wake && hasTexture(scene, FIELD.followWave)) {
      wake = scene.add.image(-31, 4, FIELD.followWave.key).setDisplaySize(48, 24).setAlpha(0).setDepth(21)
      container.addAt(wake, 0)
      container._followWake = wake
    }
    if (!wake) return
    const active = runtime.state === 'follow' || runtime.state === 'inspect' || runtime.state === 'biteReady'
    wake.setAlpha(active ? (runtime.state === 'biteReady' ? 0.72 : 0.46) : 0)
  })
}

export function installFishingFieldMotionFx(GameScene) {
  if (GameScene.prototype.__ainanFishingFieldMotionFxInstalled) return
  GameScene.prototype.__ainanFishingFieldMotionFxInstalled = true

  // Keep the existing landing ripple, then add a short splash part on top.
  const originalShowSplash = BobberManager.prototype.showSplash
  BobberManager.prototype.showSplash = function (x, y) {
    const result = originalShowSplash.call(this, x, y)
    if (hasTexture(this.scene, FIELD.lureSplash)) {
      const splash = this.scene.add.image(x, y - 5, FIELD.lureSplash.key)
        .setDisplaySize(58, 58).setDepth(47).setAlpha(0.95)
      const sx = splash.scaleX, sy = splash.scaleY
      splash.setScale(sx * 0.72, sy * 0.72)
      this.scene.tweens.add({
        targets: splash,
        scaleX: sx * 1.16,
        scaleY: sy * 1.16,
        alpha: 0,
        duration: 300,
        ease: 'Quad.easeOut',
        onComplete: () => splash.destroy(),
      })
    }
    return result
  }

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    buildFieldObjects(this)
    applyFishSizeAssets(this)
    return result
  }

  const originalTick = GameScene.prototype._tickFishInterest
  GameScene.prototype._tickFishInterest = function (...args) {
    const result = originalTick.apply(this, args)
    applyFishSizeAssets(this)
    syncFishWake(this)
    return result
  }

  const originalPursuit = GameScene.prototype._stepFishPursuit
  GameScene.prototype._stepFishPursuit = function (...args) {
    const result = originalPursuit.apply(this, args)
    syncFishWake(this)
    return result
  }

  const originalTwitch = GameScene.prototype._twitchRetrieve
  GameScene.prototype._twitchRetrieve = function (...args) {
    const x = this.bobber?.x ?? 0
    const y = this.bobber?.y ?? 0
    const result = originalTwitch.apply(this, args)
    if (this.phase === 'retrieve') {
      setLurePull(this)
      spawnTrail(this, FIELD.lureTrail, x, y + 6, -18, 58, 28, 0.64)
      this.time.delayedCall(260, () => {
        if (this.phase === 'retrieve' && this.retrieveState?.action !== 'slowReel') setLureIdle(this)
      })
    }
    return result
  }

  const originalStartSlow = GameScene.prototype._startSlowRetrieve
  GameScene.prototype._startSlowRetrieve = function (...args) {
    const result = originalStartSlow.apply(this, args)
    if (this.phase === 'retrieve') setLurePull(this)
    return result
  }

  const originalStopSlow = GameScene.prototype._stopSlowRetrieve
  GameScene.prototype._stopSlowRetrieve = function (...args) {
    const result = originalStopSlow.apply(this, args)
    if (this.phase === 'retrieve') setLureIdle(this)
    return result
  }

  const originalSetIdle = GameScene.prototype._setRetrieveIdle
  GameScene.prototype._setRetrieveIdle = function (...args) {
    const result = originalSetIdle.apply(this, args)
    if (this.phase === 'retrieve') setLureIdle(this)
    return result
  }

  const originalSync = GameScene.prototype._syncRetrieveWorldUI
  GameScene.prototype._syncRetrieveWorldUI = function (...args) {
    const result = originalSync.apply(this, args)
    if (this.phase === 'retrieve' && this.retrieveState?.action === 'slowReel' && this.time.now > (this._nextSlowTrailAt ?? 0)) {
      this._nextSlowTrailAt = this.time.now + 260
      spawnTrail(this, FIELD.lureTrail, this.bobber.x, this.bobber.y + 5, -16, 46, 22, 0.36)
    }
    return result
  }

  const originalBite = GameScene.prototype._beginRetrieveBite
  GameScene.prototype._beginRetrieveBite = function (...args) {
    const x = this.bobber?.x ?? 0
    const y = this.bobber?.y ?? 0
    setLureIdle(this)
    spawnPulse(this, FIELD.rippleBite, x, y, 104, 520)
    return originalBite.apply(this, args)
  }

  const originalHit = GameScene.prototype._openHitWindow
  GameScene.prototype._openHitWindow = function (...args) {
    const result = originalHit.apply(this, args)
    spawnPulse(this, FIELD.hitFlash, this.bobber?.x ?? this.scale.width / 2, this.bobber?.y ?? this.scale.height / 2, 82, 260)
    return result
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    const result = originalEnterCast.apply(this, args)
    this._nextSlowTrailAt = 0
    setLureIdle(this)
    return result
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    this._fieldDecorObjects?.forEach(obj => { this.tweens?.killTweensOf?.(obj); obj?.destroy?.() })
    this._fieldDecorObjects = null
    return originalCleanup.apply(this, args)
  }
}
