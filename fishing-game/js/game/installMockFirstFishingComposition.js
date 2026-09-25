import { ASSETS } from '../config/assetManifest.js'
import { MOBILE_FRAME } from '../config/mobileFrame.js'

const POINT_BG = {
  pointA: ASSETS.backgrounds.fishingHarbor,
  pointB: ASSETS.backgrounds.fishingBay,
  pointC: ASSETS.backgrounds.fishingCape,
}

const FIELD = ASSETS.fishingField

function hasTexture(scene, asset) {
  return Boolean(asset?.key && scene.textures?.exists?.(asset.key))
}

function ensureFacade(scene) {
  if (scene._mockFacade?.container?.active) return scene._mockFacade

  const W = scene.scale.width
  const top = MOBILE_FRAME.topHudHeight
  const bottom = scene.scale.height - MOBILE_FRAME.bottomControlsHeight
  const h = bottom - top
  const container = scene.add.container(0, 0).setDepth(140).setScrollFactor(0)

  const asset = POINT_BG[scene.env?.point] ?? POINT_BG.pointA
  const backdrop = hasTexture(scene, asset)
    ? scene.add.image(W / 2, top + h / 2, asset.key).setDisplaySize(W, h).setScrollFactor(0)
    : scene.add.rectangle(W / 2, top + h / 2, W, h, 0x1689b7).setScrollFactor(0)

  const fishAssets = [
    FIELD.fishShadowMediumIdle,
    FIELD.fishShadowSmallIdle,
    FIELD.fishShadowMediumIdle,
  ]
  const fishPos = [
    [W * 0.72, top + h * 0.32, 52],
    [W * 0.38, top + h * 0.48, 42],
    [W * 0.78, top + h * 0.60, 48],
  ]
  const fish = fishPos.map(([x, y, size], index) => {
    const a = fishAssets[index]
    if (!hasTexture(scene, a)) return null
    return scene.add.image(x, y, a.key)
      .setDisplaySize(size, Math.round(size * 0.50))
      .setAlpha(index === 0 ? 0.72 : 0.52)
      .setScrollFactor(0)
  }).filter(Boolean)

  const line = scene.add.graphics().setScrollFactor(0)
  const lure = hasTexture(scene, FIELD.lureIdle)
    ? scene.add.image(W * 0.76, top + h * 0.58, FIELD.lureIdle.key).setDisplaySize(38, 38).setScrollFactor(0)
    : null

  container.add([backdrop, ...fish, line, ...(lure ? [lure] : [])])
  scene._mockFacade = { container, backdrop, fish, line, lure }
  return scene._mockFacade
}

function tunePlayer(scene, phase) {
  const hero = scene._rcPlayerHero
  if (!hero?.active) return
  const playBottom = scene.scale.height - MOBILE_FRAME.bottomControlsHeight
  const visible = phase === 'cast' || phase === 'retrieve'
  hero.setVisible(visible)
  if (!visible) return
  hero
    .setPosition(72, playBottom - 6)
    .setOrigin(0.5, 1)
    .setDisplaySize(126, 166)
    .setDepth(205)
}

function syncFacade(scene, phase = scene.phase) {
  const facade = ensureFacade(scene)
  const visible = phase === 'cast' || phase === 'retrieve' || phase === 'battle'
  facade.container?.setVisible?.(visible)
  if (!visible) return

  const W = scene.scale.width
  const top = MOBILE_FRAME.topHudHeight
  const bottom = scene.scale.height - MOBILE_FRAME.bottomControlsHeight
  const h = bottom - top

  const isBattle = phase === 'battle'
  facade.fish.forEach((fish, index) => {
    fish?.setVisible?.(!isBattle)
    if (phase === 'retrieve' && fish) {
      fish.setAlpha(index === 0 ? 0.76 : 0.46)
    }
  })

  facade.line.clear()
  facade.lure?.setVisible?.(phase === 'retrieve')

  if (phase === 'retrieve' && facade.lure) {
    const cam = scene.cameras?.main
    const sx = scene.bobber?.visible
      ? Math.max(132, Math.min(W - 42, scene.bobber.x - (cam?.scrollX ?? 0)))
      : W * 0.76
    const sy = scene.bobber?.visible
      ? Math.max(top + 130, Math.min(bottom - 64, scene.bobber.y - (cam?.scrollY ?? 0)))
      : top + h * 0.58

    facade.lure.setPosition(sx, sy)
    facade.line.lineStyle(2, 0xffffff, 0.90)
    facade.line.lineBetween(108, bottom - 108, sx - 8, sy + 4)
  }

  if (isBattle) {
    facade.backdrop?.setAlpha?.(0.94)
  } else {
    facade.backdrop?.setAlpha?.(1)
  }
}

function tuneBattle(scene) {
  const battle = scene.phase === 'battle'
  if (!battle) return

  const hero = scene.battleHero
  if (hero?.active) {
    const rarity = scene.fish?.rarity ?? 'common'
    const width = rarity === 'legendary' ? 252 : rarity === 'rare' ? 238 : 226
    hero
      .setPosition(scene.scale.width / 2, 330)
      .setDisplaySize(width, Math.round(width * 0.56))
      .setDepth(170)
      .setVisible(true)
  }

  scene.battleHeroGlow?.setVisible?.(true)
  scene._targetFishGfx?.setAlpha?.(0)
  scene.lineGfx?.clear?.()
  scene.bobber?.setVisible?.(false)
  scene._rcCastDock?.setVisible?.(false)
  scene._rcRetrieveDock?.setVisible?.(false)
  scene._mobileHudSetVisible?.(false)
  scene.retrieveUI?.hide?.()
}

function tuneResult(scene) {
  if (scene.phase !== 'result') return
  scene._mockFacade?.container?.setVisible?.(false)

  const hero = scene._resultHeroFish
  if (hero?.active) {
    hero
      .setPosition(scene.scale.width / 2, 286)
      .setDisplaySize(226, 226)
      .setDepth(150)
      .setVisible(true)
  }

  scene.resName?.setY?.(18)
  scene.resPts?.setY?.(74)
  scene.resHint?.setY?.(119)
  scene.resultOverlay?.setVisible?.(true)
}

function apply(scene, phase = scene.phase) {
  syncFacade(scene, phase)
  tunePlayer(scene, phase)
  if (phase === 'battle') tuneBattle(scene)
  if (phase === 'result') tuneResult(scene)
}

/**
 * Final mock-first composition pass.
 *
 * Fishing logic remains world-space. Presentation is rendered as a fixed
 * 390x844 screen-space facade so legacy camera/background layers can no longer
 * determine the composition.
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
    this.time?.delayedCall?.(0, () => apply(this, this.phase))
    return result
  }

  const originalUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (...args) {
    const result = originalUpdate?.apply(this, args)
    if (this.phase === 'retrieve') syncFacade(this, 'retrieve')
    if (this.phase === 'battle') {
      syncFacade(this, 'battle')
      tuneBattle(this)
    }
    return result
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    this._mockFacade?.container?.destroy?.(true)
    this._mockFacade = null
    return originalCleanup.apply(this, args)
  }
}
