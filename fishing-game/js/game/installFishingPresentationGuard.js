import { BackgroundManager } from '../scenes/components/BackgroundManager.js'
import { RetrieveUI } from '../scenes/components/RetrieveUI.js'
import { ASSETS } from '../config/assetManifest.js'
import { MOBILE_FRAME } from '../config/mobileFrame.js'

const FIELD = ASSETS.fishingField
const FISH_ICON_BY_ID = {
  aji: ASSETS.fish.ajiIcon.key,
  tai: ASSETS.fish.madaiIcon.key,
  bass: ASSETS.fish.blackBassIcon.key,
  buri: ASSETS.fish.buriIcon.key,
  kue: ASSETS.fish.kueIcon.key,
  saba: ASSETS.fish.sabaIcon.key,
  isaki: ASSETS.fish.isakiIcon.key,
  hirame: ASSETS.fish.hirameIcon.key,
  kanpachi: ASSETS.fish.kanpachiIcon.key,
}

function collectPlayerObjects(scene, added = []) {
  const existing = scene._fishingPresentationObjects ?? []
  const refs = added.filter(obj => {
    const depth = obj?.depth ?? -1
    return obj === scene._playerSprite || obj === scene._playerShadow || obj?.texture?.key === 'ch_player_default' || (depth >= 40 && depth <= 42)
  })
  scene._fishingPresentationObjects = [...new Set([...existing, ...refs])]
}

function setFishingPlayerVisible(scene, visible) {
  // If the animation spritesheet failed and we fell back to the large legacy
  // standing illustration, hide the fallback completely. A missing character
  // is less harmful than covering the fishing field.
  const hasAnimatedPlayer = Boolean(scene._playerSprite)
  const resolvedVisible = hasAnimatedPlayer ? Boolean(visible) : false
  const objects = new Set([
    ...(scene._fishingPresentationObjects ?? []),
    scene._playerSprite,
    scene._playerShadow,
  ])
  objects.forEach(obj => obj?.setVisible?.(resolvedVisible))
}

function drawRetrieveLineToPlayfieldEdge(scene) {
  if (scene.phase !== 'retrieve' || !scene.bobber?.visible || !scene.lineGfx) return
  scene.lineGfx.clear()
  scene.lineGfx.lineStyle(1.8, 0xffffff, 0.86)
  scene.lineGfx.lineBetween(scene.anchorX, scene.anchorY, scene.bobber.x, scene.bobber.y)
}

function hideTackleChrome(scene) {
  const tackle = scene.tackleUI
  if (!tackle) return
  for (const btn of [tackle._rodBtn, tackle._baitBtn]) {
    if (!btn) continue
    Object.values(btn).forEach(obj => obj?.setVisible?.(false))
  }
  tackle._rodPanel?.setVisible?.(false)
  tackle._baitPanel?.setVisible?.(false)
}

function buildFinalControlChrome(scene) {
  if (scene._rcCastDock || scene._rcRetrieveDock) return
  const W = scene.scale.width
  const top = scene.scale.height - MOBILE_FRAME.bottomControlsHeight

  const cast = scene.add.container(0, 0).setDepth(210).setScrollFactor(0).setVisible(false)
  const castBg = scene.add.graphics().setScrollFactor(0)
  castBg.fillStyle(0xf8fdff, 0.98)
  castBg.fillRect(0, top, W, MOBILE_FRAME.bottomControlsHeight)
  castBg.lineStyle(2, 0x9bcfe5, 0.72)
  castBg.lineBetween(0, top, W, top)
  const powerLabel = scene.add.text(24, top + 23, 'パワー', {
    fontFamily: 'M PLUS Rounded 1c, sans-serif', resolution: 1,
    fontSize: '12px', fontStyle: 'bold', color: '#173248',
  }).setOrigin(0, 0.5)
  const track = scene.add.graphics()
  track.fillStyle(0xd9edf6, 1)
  track.fillRoundedRect(82, top + 18, 198, 10, 5)
  track.fillStyle(0x58b8df, 1)
  track.fillRoundedRect(82, top + 18, 126, 10, 5)
  const throwBg = scene.add.circle(W / 2, top + 108, 44, 0x2f9ed4, 1)
    .setStrokeStyle(3, 0xffffff, 0.96)
  const throwText = scene.add.text(W / 2, top + 108, '投げる', {
    fontFamily: 'M PLUS Rounded 1c, sans-serif', resolution: 1,
    fontSize: '16px', fontStyle: 'bold', color: '#ffffff',
  }).setOrigin(0.5)
  const throwHit = scene.add.circle(W / 2, top + 108, 48, 0x000000, 0)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', pointer => {
      pointer?.event?.stopPropagation?.()
      if (scene.phase !== 'cast' || scene.isCharging) return
      scene.isCharging = true
      scene.chargeStartedAt = scene.time.now
    })
    .on('pointerup', pointer => {
      pointer?.event?.stopPropagation?.()
      if (scene.phase === 'cast' && scene.isCharging) scene._onUp?.()
    })
  cast.add([castBg, powerLabel, track, throwBg, throwText, throwHit])

  const retrieve = scene.add.container(0, 0).setDepth(210).setScrollFactor(0).setVisible(false)
  const retrieveBg = scene.add.graphics()
  retrieveBg.fillStyle(0x073754, 0.98)
  retrieveBg.fillRect(0, top, W, MOBILE_FRAME.bottomControlsHeight)
  retrieveBg.lineStyle(2, 0x8edfff, 0.42)
  retrieveBg.lineBetween(0, top, W, top)
  const retrieveHint = scene.add.text(W / 2, top + 21, '魚影の反応を見ながら操作', {
    fontFamily: 'M PLUS Rounded 1c, sans-serif', resolution: 1,
    fontSize: '11px', fontStyle: 'bold', color: '#dff5ff',
  }).setOrigin(0.5)

  const makeAction = (x, fill, mark, label, down, up = null) => {
    const bg = scene.add.circle(x, top + 91, 38, fill, 1).setStrokeStyle(3, 0xffffff, 0.94)
    const icon = scene.add.text(x, top + 82, mark, {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', resolution: 1,
      fontSize: '24px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5)
    const txt = scene.add.text(x, top + 137, label, {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', resolution: 1,
      fontSize: '11px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5)
    const hit = scene.add.circle(x, top + 91, 43, 0x000000, 0).setInteractive({ useHandCursor: true })
    hit.on('pointerdown', pointer => { pointer?.event?.stopPropagation?.(); down?.() })
    if (up) {
      hit.on('pointerup', pointer => { pointer?.event?.stopPropagation?.(); up() })
      hit.on('pointerupoutside', up)
      hit.on('pointerout', up)
    }
    return [bg, icon, txt, hit]
  }
  retrieve.add([
    retrieveBg, retrieveHint,
    ...makeAction(W * 0.22, 0x248cd6, 'Ⅱ', '待つ', () => scene._setRetrieveIdle?.()),
    ...makeAction(W * 0.50, 0x2ebd67, '↻', 'ちょい巻き', () => scene._twitchRetrieve?.()),
    ...makeAction(W * 0.78, 0xf2a01f, '≫', 'ゆっくり巻く', () => scene._startSlowRetrieve?.(), () => scene._stopSlowRetrieve?.()),
  ])

  scene._rcCastDock = cast
  scene._rcRetrieveDock = retrieve
}

function clearRcBattleHero(scene) {
  scene._rcBattleHeroTween?.stop?.()
  scene._rcBattleHeroTween?.destroy?.()
  scene._rcBattleHeroTween = null
  scene._rcBattleHero?.destroy?.()
  scene._rcBattleHero = null
}

function showRcBattleHero(scene) {
  clearRcBattleHero(scene)
  const W = scene.scale.width
  const cx = W / 2
  const cy = 338
  const hero = scene.add.graphics().setDepth(160).setScrollFactor(0)

  hero.fillStyle(0x072f46, 0.98)
  hero.lineStyle(4, 0x9fe8f4, 0.92)
  hero.fillEllipse(cx, cy, 166, 74)
  hero.strokeEllipse(cx, cy, 166, 74)

  hero.fillStyle(0x0a3c58, 1)
  hero.fillTriangle(cx + 68, cy, cx + 116, cy - 34, cx + 116, cy + 34)
  hero.lineStyle(3, 0x9fe8f4, 0.78)
  hero.strokeTriangle(cx + 68, cy, cx + 116, cy - 34, cx + 116, cy + 34)

  hero.fillStyle(0x0a3c58, 1)
  hero.fillTriangle(cx - 14, cy - 31, cx + 12, cy - 57, cx + 30, cy - 29)
  hero.fillTriangle(cx - 4, cy + 31, cx + 22, cy + 51, cx + 35, cy + 27)

  hero.fillStyle(0xffffff, 0.9)
  hero.fillCircle(cx - 48, cy - 10, 6)
  hero.fillStyle(0x173248, 1)
  hero.fillCircle(cx - 46, cy - 10, 2.5)

  hero.lineStyle(3, 0xffffff, 0.58)
  hero.beginPath()
  hero.moveTo(cx - 36, cy + 8)
  hero.lineTo(cx + 34, cy + 2)
  hero.strokePath()

  scene._rcBattleHero = hero
}

function applyPhasePresentation(scene, phase = scene.phase) {
  const cast = phase === 'cast'
  const retrieve = phase === 'retrieve'
  const battle = phase === 'battle'
  const result = phase === 'result'

  hideTackleChrome(scene)
  scene.castHintBg?.setVisible?.(false)
  scene.hintText?.setVisible?.(false)
  scene._blueprintCastInstruction?.setVisible?.(cast)
  scene.retrieveUI?.hide?.()
  scene._rcCastDock?.setVisible?.(cast)
  scene._rcRetrieveDock?.setVisible?.(retrieve)

  scene._mobileHudSetVisible?.(cast || retrieve)
  clearRcBattleHero(scene)
  scene.battleHero?.setVisible?.(battle)
  scene.battleHeroGlow?.setVisible?.(battle)
  if (battle) {
    scene.escapeBar?.setVisible?.(true)
    scene.reelCTA?.setVisible?.(!scene.battleState?.isRaging)
    const target = scene._targetFishGfx?.active
      ? scene._targetFishGfx
      : scene.bg?._fishRuntime?.find(item => item?.gfx?.active)?.gfx
    if (target?.active) {
      scene._targetFishGfx = target
      scene.bg?._fishTweens?.[scene._targetFishIndex]?.stop?.()
      target.setVisible?.(true)
      target.setAlpha?.(1)
      target.setDepth?.(40)
      const cam = scene.cameras?.main
      target.setPosition?.((cam?.scrollX ?? 0) + scene.scale.width * 0.50, (cam?.scrollY ?? 0) + 330)
      const image = target._assetImage
      if (image) image.setDisplaySize(176, 88)
    }
  }

  if (result) {
    scene.escapeBar?.setVisible?.(false)
    scene.battlePanel?.setVisible?.(false)
    scene.reelCTA?.setVisible?.(false)
    scene.rageTag?.setVisible?.(false)
    scene.dangerFx?.setAlpha?.(0)
    scene.resultOverlay?.setVisible?.(true)
    scene.battleHero?.setVisible?.(false)
    scene.battleHeroGlow?.setVisible?.(false)
    scene._mobileHudSetVisible?.(false)
  }
}

/**
 * Last-line presentation guard for the canonical mobile fishing composition.
 * It prevents legacy fallback character art from leaking back into Retrieve /
 * Bite / Battle and swaps the primary Retrieve control to the managed asset.
 */
export function installFishingPresentationGuard(GameScene) {
  if (GameScene.prototype.__ainanFishingPresentationGuardInstalled) return
  GameScene.prototype.__ainanFishingPresentationGuardInstalled = true

  GameScene.prototype._applyRcFishingPresentation = function (phase = this.phase) {
    buildFinalControlChrome(this)
    applyPhasePresentation(this, phase)
  }

  const originalBuildPlayer = BackgroundManager.prototype.buildPlayer
  BackgroundManager.prototype.buildPlayer = function (...args) {
    const before = this.scene.children.list.length
    const result = originalBuildPlayer.apply(this, args)
    collectPlayerObjects(this.scene, this.scene.children.list.slice(before))
    return result
  }

  const originalButton = RetrieveUI.prototype._button
  RetrieveUI.prototype._button = function (...args) {
    const [, , w, h, , , , , , primary = false] = args
    const result = originalButton.apply(this, args)
    const asset = FIELD.retrieveButtonShortReel
    if (!primary || !asset?.key || !this.scene.textures.exists(asset.key)) return result

    const oldBg = result.container?.list?.[0]
    const image = this.scene.add.image(0, 0, asset.key)
      .setDisplaySize(w, h)
      .setScrollFactor(0)
    if (oldBg) {
      result.container.remove(oldBg)
      oldBg.destroy()
    }
    result.container.addAt(image, 0)
    return result
  }

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    buildFinalControlChrome(this)
    collectPlayerObjects(this)
    setFishingPlayerVisible(this, ['cast', 'retrieve'].includes(this.phase))
    this._applyRcFishingPresentation?.(this.phase)
    return result
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    const result = originalEnterCast.apply(this, args)
    setFishingPlayerVisible(this, true)
    this._applyRcFishingPresentation?.('cast')
    return result
  }

  const originalFireCast = GameScene.prototype._fireCast
  GameScene.prototype._fireCast = function (...args) {
    const result = originalFireCast.apply(this, args)
    setFishingPlayerVisible(this, true)
    this._blueprintCastInstruction?.setVisible?.(false)
    return result
  }

  const originalEnterRetrieve = GameScene.prototype._enterRetrieve
  GameScene.prototype._enterRetrieve = function (...args) {
    const result = originalEnterRetrieve.apply(this, args)
    setFishingPlayerVisible(this, true)
    this._applyRcFishingPresentation?.('retrieve')
    drawRetrieveLineToPlayfieldEdge(this)
    return result
  }

  const originalSyncRetrieveWorldUI = GameScene.prototype._syncRetrieveWorldUI
  GameScene.prototype._syncRetrieveWorldUI = function (...args) {
    const result = originalSyncRetrieveWorldUI.apply(this, args)
    drawRetrieveLineToPlayfieldEdge(this)
    return result
  }

  const originalBeginRetrieveBite = GameScene.prototype._beginRetrieveBite
  GameScene.prototype._beginRetrieveBite = function (...args) {
    const result = originalBeginRetrieveBite.apply(this, args)
    setFishingPlayerVisible(this, false)
    this._applyRcFishingPresentation?.('battle')
    return result
  }

  const originalOpenHitWindow = GameScene.prototype._openHitWindow
  GameScene.prototype._openHitWindow = function (...args) {
    const result = originalOpenHitWindow.apply(this, args)
    setFishingPlayerVisible(this, false)
    return result
  }

  const originalEnterBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    const result = originalEnterBattle.apply(this, args)
    setFishingPlayerVisible(this, false)
    this._applyRcFishingPresentation?.('battle')
    return result
  }

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (outcome, ...args) {
    const result = originalFinishBattle.call(this, outcome, ...args)
    setFishingPlayerVisible(this, false)
    this._applyRcFishingPresentation?.('result')
    return result
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    this._rcCastDock?.destroy?.(true)
    this._rcRetrieveDock?.destroy?.(true)
    this._rcCastDock = null
    this._rcRetrieveDock = null
    clearRcBattleHero(this)
    this._fishingPresentationObjects = null
    return originalCleanup.apply(this, args)
  }
}
