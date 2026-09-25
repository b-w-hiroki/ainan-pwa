import { ASSETS } from '../config/assetManifest.js'
import { MOBILE_FRAME } from '../config/mobileFrame.js'

const POINT_BG = {
  pointA: ASSETS.backgrounds.fishingHarbor,
  pointB: ASSETS.backgrounds.fishingBay,
  pointC: ASSETS.backgrounds.fishingCape,
}

function ensureFixedBackdrop(scene) {
  if (scene._mockFirstBackdrop?.active) return scene._mockFirstBackdrop
  const asset = POINT_BG[scene.env?.point] ?? POINT_BG.pointA
  if (!asset?.key || !scene.textures?.exists?.(asset.key)) return null

  const W = scene.scale.width
  const top = MOBILE_FRAME.topHudHeight
  const bottom = scene.scale.height - MOBILE_FRAME.bottomControlsHeight
  const h = bottom - top

  const backdrop = scene.add.image(W / 2, top + h / 2, asset.key)
    .setDisplaySize(W, h)
    .setDepth(6)
    .setScrollFactor(0)

  // The gameplay world still exists behind this image and owns all coordinates.
  // The fixed art only establishes the mock's composition: location / water /
  // shore always occupy the same screen-space proportions at 390x844.
  scene._mockFirstBackdrop = backdrop
  return backdrop
}

function ensureBattleWash(scene) {
  if (scene._mockFirstBattleWash?.active) return scene._mockFirstBattleWash
  const top = MOBILE_FRAME.topHudHeight
  const bottom = scene.scale.height - MOBILE_FRAME.bottomControlsHeight
  const g = scene.add.graphics().setDepth(78).setScrollFactor(0).setVisible(false)
  g.fillStyle(0x073754, 0.10)
  g.fillRect(0, top, scene.scale.width, bottom - top)
  scene._mockFirstBattleWash = g
  return g
}

function tunePlayer(scene, phase) {
  const hero = scene._rcPlayerHero
  if (!hero?.active) return
  const playBottom = scene.scale.height - MOBILE_FRAME.bottomControlsHeight
  const visible = phase === 'cast' || phase === 'retrieve'
  hero.setVisible(visible)
  if (!visible) return

  // Mock-first: the fisherman is a foreground anchor, never the center subject.
  // Keep feet on the shore/deck edge and leave the middle two thirds to water.
  hero
    .setPosition(70, playBottom - 6)
    .setOrigin(0.5, 1)
    .setDisplaySize(124, 164)
    .setDepth(205)
}

function tuneFishField(scene, phase) {
  const top = MOBILE_FRAME.topHudHeight
  const playBottom = scene.scale.height - MOBILE_FRAME.bottomControlsHeight
  const cam = scene.cameras?.main

  // Keep the active lure / fish relationship in the central playfield.
  if (phase === 'retrieve' && scene.bobber?.visible) {
    const sx = (cam?.scrollX ?? 0) + scene.scale.width * 0.72
    const sy = (cam?.scrollY ?? 0) + top + (playBottom - top) * 0.53
    const dx = sx - scene.bobber.x
    const dy = sy - scene.bobber.y
    if (Math.abs(dx) > 150 || Math.abs(dy) > 180) {
      // Only correct severe composition drift. Normal retrieve motion remains intact.
      scene.bobber.x += dx * 0.18
      scene.bobber.y += dy * 0.18
    }
  }

  // Decorative fish should read as underwater silhouettes, not UI chips.
  ;(scene.bg?._fishGfx ?? []).forEach((fish, index) => {
    if (!fish?.active || fish === scene._targetFishGfx) return
    fish.setAlpha?.(phase === 'battle' ? 0.10 : 0.58)
    fish.setDepth?.(22)
    const image = fish._assetImage
    if (image) {
      const widths = [48, 42, 46, 54, 50, 58]
      const w = widths[index % widths.length]
      image.setDisplaySize(w, Math.round(w * 0.50))
    }
  })
}

function tuneBattle(scene) {
  const battle = scene.phase === 'battle'
  scene._mockFirstBattleWash?.setVisible?.(battle)
  if (!battle) return

  const W = scene.scale.width
  const hero = scene.battleHero
  if (hero?.active) {
    const rarity = scene.fish?.rarity ?? 'common'
    const width = rarity === 'legendary' ? 252 : rarity === 'rare' ? 238 : 226
    hero
      .setPosition(W / 2, 330)
      .setDisplaySize(width, Math.round(width * 0.56))
      .setDepth(170)
      .setVisible(true)
  }
  scene.battleHeroGlow?.setVisible?.(true)
  scene._targetFishGfx?.setAlpha?.(0)
  scene.lineGfx?.clear?.()
  scene.bobber?.setVisible?.(false)

  // Battle owns the screen: normal fishing HUD/control layers must not leak in.
  scene._rcCastDock?.setVisible?.(false)
  scene._rcRetrieveDock?.setVisible?.(false)
  scene._mobileHudSetVisible?.(false)
  scene.retrieveUI?.hide?.()
}

function tuneResult(scene) {
  if (scene.phase !== 'result') return
  scene._mockFirstBattleWash?.setVisible?.(false)
  scene._mockFirstBackdrop?.setVisible?.(false)

  const hero = scene._resultHeroFish
  if (hero?.active) {
    hero
      .setPosition(scene.scale.width / 2, 286)
      .setDisplaySize(226, 226)
      .setDepth(150)
      .setVisible(true)
  }

  // Preserve the intended reading order: fish -> name -> stats -> CTA.
  scene.resName?.setY?.(18)
  scene.resPts?.setY?.(74)
  scene.resHint?.setY?.(119)
  scene.resultOverlay?.setVisible?.(true)
}

function apply(scene, phase = scene.phase) {
  const backdrop = ensureFixedBackdrop(scene)
  ensureBattleWash(scene)
  backdrop?.setVisible?.(phase !== 'result')

  tunePlayer(scene, phase)
  tuneFishField(scene, phase)
  tuneBattle(scene)
  if (phase === 'result') tuneResult(scene)
}

/**
 * Final mock-first composition pass.
 *
 * It deliberately does not change fishing rules. It fixes the screen-space
 * hierarchy at 390x844 so camera/world movement can no longer destroy the
 * reference composition.
 */
export function installMockFirstFishingComposition(GameScene) {
  if (GameScene.prototype.__ainanMockFirstFishingCompositionInstalled) return
  GameScene.prototype.__ainanMockFirstFishingCompositionInstalled = true

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    apply(this, this.phase)
    return result
  }

  const wrapPhase = name => {
    const original = GameScene.prototype[name]
    if (!original) return
    GameScene.prototype[name] = function (...args) {
      const result = original.apply(this, args)
      apply(this, this.phase)
      return result
    }
  }

  ;['_enterCast', '_enterRetrieve', '_beginRetrieveBite', '_openHitWindow', '_enterBattle'].forEach(wrapPhase)

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (...args) {
    const result = originalFinishBattle.apply(this, args)
    apply(this, this.phase)
    // Result hero is created by another presentation layer on the same tick.
    this.time?.delayedCall?.(0, () => apply(this, this.phase))
    return result
  }

  const originalUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (...args) {
    const result = originalUpdate?.apply(this, args)
    if (this.phase === 'battle') tuneBattle(this)
    return result
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    this._mockFirstBackdrop?.destroy?.()
    this._mockFirstBackdrop = null
    this._mockFirstBattleWash?.destroy?.()
    this._mockFirstBattleWash = null
    return originalCleanup.apply(this, args)
  }
}
