import { BackgroundManager } from '../scenes/components/BackgroundManager.js'
import { MOBILE_FRAME } from '../config/mobileFrame.js'

const TEXT_RES = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1

const THEMES = {
  pointA: {
    top: 0x45cce8,
    mid: 0x1689b7,
    deep: 0x07527d,
    abyss: 0x053957,
    glow: 0xcdf8ff,
    accent: 0x79e8ef,
  },
  pointB: {
    top: 0x55d4cc,
    mid: 0x168f96,
    deep: 0x075c70,
    abyss: 0x064352,
    glow: 0xd5fff4,
    accent: 0x89f0d8,
  },
  pointC: {
    top: 0x3eb8d8,
    mid: 0x176f9c,
    deep: 0x123f68,
    abyss: 0x0a2b4b,
    glow: 0xd8f2ff,
    accent: 0x84c8f0,
  },
}

const PLAYER_SCALE = {
  cast: 0.58,
  catch: 0.92,
}

function themeFor(point) {
  return THEMES[point] ?? THEMES.pointA
}

function drawWaterWorld(manager, W, H, pointId = 'pointA') {
  const scene = manager.scene
  const theme = themeFor(pointId)
  const g = scene.add.graphics().setDepth(0)

  // The entire fishing world is water. Camera motion reveals more sea rather
  // than more UI/shore, which keeps the phone screen focused on fishing.
  g.fillGradientStyle(theme.top, theme.top, theme.deep, theme.deep, 1)
  g.fillRect(0, 0, W, H)

  // Broad depth bands create a readable near/far sense without requiring a
  // photoreal background asset.
  g.fillStyle(theme.glow, 0.08)
  g.fillRect(0, 120, W, 170)
  g.fillStyle(theme.mid, 0.18)
  g.fillRect(0, 420, W, 310)
  g.fillStyle(theme.deep, 0.20)
  g.fillRect(0, 760, W, 350)
  g.fillStyle(theme.abyss, 0.28)
  g.fillRect(0, 1080, W, H - 1080)

  // Surface glare / soft horizon. On the initial phone composition this sits
  // near the top of the water field; on long casts it simply becomes another
  // water-light band instead of exposing a giant sky area.
  g.fillStyle(0xffffff, 0.14)
  g.fillEllipse(W * 0.50, 525, W * 1.18, 62)
  g.fillStyle(theme.glow, 0.10)
  g.fillEllipse(W * 0.46, 560, W * 1.05, 100)

  const streaks = [
    [70, 650, 155, 10, 0.13], [300, 690, 205, 11, 0.10], [610, 628, 190, 9, 0.13],
    [180, 780, 230, 9, 0.08], [500, 825, 170, 8, 0.09], [760, 755, 160, 7, 0.08],
    [95, 940, 185, 7, 0.07], [390, 980, 250, 8, 0.06], [700, 920, 185, 7, 0.07],
    [220, 1110, 180, 6, 0.05], [575, 1160, 220, 6, 0.05],
  ]
  streaks.forEach(([x, y, w, h, alpha]) => {
    g.fillStyle(0xffffff, alpha)
    g.fillEllipse(x, y, w, h)
  })

  // Small caustic fragments make the water feel alive while remaining quiet
  // enough that fish shadows and the lure stay dominant.
  const flecks = [
    [90, 610], [215, 645], [420, 590], [735, 650], [820, 720],
    [130, 830], [330, 870], [545, 760], [675, 895], [255, 1010],
    [470, 1055], [790, 1030], [120, 1190], [620, 1240],
  ]
  flecks.forEach(([x, y], i) => {
    g.fillStyle(i % 3 === 0 ? theme.accent : 0xffffff, i % 3 === 0 ? 0.11 : 0.08)
    g.fillEllipse(x, y, 44 + (i % 4) * 12, 4 + (i % 2) * 2)
  })

  // A tiny lower-edge pier cue anchors the cast animation but stays almost
  // entirely behind the fixed control area on the phone.
  g.fillStyle(0x173248, 0.52)
  g.fillRect(0, H - 72, W, 72)
  g.fillStyle(0xffffff, 0.16)
  g.fillRect(0, H - 72, W, 3)

  manager._blueprintWaterGfx = g

  // A few moving highlights are enough to keep a large blue field from reading
  // as a static flat fill.
  manager._blueprintWaterGlints = [
    { x: 165, y: 700, w: 112 },
    { x: 520, y: 855, w: 146 },
    { x: 740, y: 1060, w: 104 },
  ].map((def, index) => {
    const glint = scene.add.ellipse(def.x, def.y, def.w, 6, 0xffffff, 0.10).setDepth(2)
    scene.tweens.add({
      targets: glint,
      x: def.x + 70 + index * 12,
      alpha: 0.04,
      duration: 2800 + index * 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
    return glint
  })

  return g
}

function drawReadableFish(g, type, sc) {
  const bodyAlpha = type === 'rare' ? 0.82 : type === 'uncommon' ? 0.74 : 0.66
  const shadow = 0x061e31
  const bodyW = (type === 'rare' ? 40 : type === 'uncommon' ? 36 : 33) * sc
  const bodyH = (type === 'rare' ? 18 : 16) * sc

  g.clear()

  // Soft water shadow halo separates fish from the background without turning
  // them into icons.
  g.fillStyle(0x061e31, 0.12)
  g.fillEllipse(0, 2, bodyW * 1.36, bodyH * 1.55)

  g.fillStyle(shadow, bodyAlpha)
  g.fillEllipse(0, 0, bodyW, bodyH)
  g.fillTriangle(
    bodyW * 0.43, 0,
    bodyW * 0.73, -bodyH * 0.60,
    bodyW * 0.73, bodyH * 0.60,
  )

  g.fillStyle(shadow, bodyAlpha * 0.88)
  g.fillTriangle(
    -bodyW * 0.12, -bodyH * 0.43,
    bodyW * 0.08, -bodyH * 0.42,
    -bodyW * 0.01, -bodyH * 0.88,
  )

  if (type !== 'common') {
    g.lineStyle(type === 'rare' ? 2 : 1.4, 0xbcecff, type === 'rare' ? 0.32 : 0.20)
    g.strokeEllipse(0, 0, bodyW * 1.08, bodyH * 1.18)
  }
}

function setPlayer(scene, visible, scale = 1) {
  const sprite = scene._playerSprite
  if (!sprite) return
  sprite.setVisible(visible)
  scene._playerShadow?.setVisible(visible)
  if (visible && scene._playerDisplayW && scene._playerDisplayH) {
    sprite.setDisplaySize(scene._playerDisplayW * scale, scene._playerDisplayH * scale)
  }
}

function hideTackle(scene) {
  const tackle = scene.tackleUI
  if (!tackle) return
  const hideBtn = btn => {
    if (!btn) return
    Object.values(btn).forEach(obj => obj?.setVisible?.(false))
  }
  hideBtn(tackle._rodBtn)
  hideBtn(tackle._baitBtn)
  tackle._rodPanel?.setVisible(false)
  tackle._baitPanel?.setVisible(false)
  tackle._openPanel = null
  tackle.disable?.()
}

function buildCastInstruction(scene) {
  const W = scene.scale.width
  const y = MOBILE_FRAME.playBottom - 24
  const bg = scene.add.graphics().setDepth(92).setScrollFactor(0)
  bg.fillStyle(0x062c44, 0.78)
  bg.fillRoundedRect(W / 2 - 116, y - 15, 232, 30, 13)
  bg.lineStyle(1.2, 0xffffff, 0.20)
  bg.strokeRoundedRect(W / 2 - 116, y - 15, 232, 30, 13)

  const text = scene.add.text(W / 2, y, '長押しでパワー → 離してキャスト', {
    fontFamily: 'M PLUS Rounded 1c, sans-serif',
    resolution: TEXT_RES,
    fontSize: '10px',
    fontStyle: 'bold',
    color: '#ffffff',
  }).setOrigin(0.5).setDepth(93).setScrollFactor(0)

  scene._blueprintCastInstruction = scene.add.container(0, 0, [bg, text])
    .setDepth(92)
    .setScrollFactor(0)
    .setVisible(false)
}

function showCastInstruction(scene, visible) {
  scene._blueprintCastInstruction?.setVisible(Boolean(visible))
}

/**
 * Hard reset of the fishing composition around the canonical mobile blueprint.
 * This intentionally replaces the legacy scenic composition instead of merely
 * restyling it: water/fish/lure are the game, character is presentation.
 */
export function installBlueprintFishingField(GameScene) {
  if (GameScene.prototype.__ainanBlueprintFishingFieldInstalled) return
  GameScene.prototype.__ainanBlueprintFishingFieldInstalled = true

  // Replace scenic harbor backgrounds with a continuous readable water world.
  BackgroundManager.prototype.buildBackground = function (W, H, pointId = 'pointA') {
    return drawWaterWorld(this, W, H, pointId)
  }

  BackgroundManager.prototype._drawFish = function (g, type, sc) {
    drawReadableFish(g, type, sc)
  }

  const originalBgDestroy = BackgroundManager.prototype.destroy
  BackgroundManager.prototype.destroy = function (...args) {
    this._blueprintWaterGlints?.forEach(obj => {
      this.scene?.tweens?.killTweensOf?.(obj)
      obj?.destroy?.()
    })
    this._blueprintWaterGlints = null
    this._blueprintWaterGfx?.destroy?.()
    this._blueprintWaterGfx = null
    return originalBgDestroy.apply(this, args)
  }

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    buildCastInstruction(this)

    // The old long-cast character inset competes with the actual playfield.
    // Long casts may simply leave the fisherman off-screen.
    this.playerActionInset?.destroy?.()
    this.playerActionInset = null

    this.castHintBg?.setVisible(false)
    this.hintText?.setVisible(false)
    this._castDistanceBadge?.setVisible(false)
    this._distanceBadge?.setVisible(false)
    hideTackle(this)

    if (this.phase === 'cast') {
      setPlayer(this, true, PLAYER_SCALE.cast)
      showCastInstruction(this, true)
    }
    return result
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    const result = originalEnterCast.apply(this, args)
    hideTackle(this)
    this.castHintBg?.setVisible(false)
    this.hintText?.setVisible(false)
    this._castDistanceBadge?.setVisible(false)
    this._distanceBadge?.setVisible(false)
    setPlayer(this, true, PLAYER_SCALE.cast)
    showCastInstruction(this, true)
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
    // Retrieve is the longest state: remove the fisherman completely and give
    // the phone to the water, lure and fish shadows.
    setPlayer(this, false)
    this.playerActionInset?.setVisible?.(false)
    this._castDistanceBadge?.setVisible(false)
    this._distanceBadge?.setVisible(false)
    showCastInstruction(this, false)
    return result
  }

  const originalSyncRetrieveWorldUI = GameScene.prototype._syncRetrieveWorldUI
  GameScene.prototype._syncRetrieveWorldUI = function (...args) {
    const result = originalSyncRetrieveWorldUI.apply(this, args)
    this._distanceBadge?.setVisible(false)
    this._castDistanceBadge?.setVisible(false)
    return result
  }

  const originalBeginRetrieveBite = GameScene.prototype._beginRetrieveBite
  GameScene.prototype._beginRetrieveBite = function (...args) {
    const result = originalBeginRetrieveBite.apply(this, args)
    setPlayer(this, false)
    return result
  }

  const originalOpenHitWindow = GameScene.prototype._openHitWindow
  GameScene.prototype._openHitWindow = function (...args) {
    const result = originalOpenHitWindow.apply(this, args)
    setPlayer(this, false)
    return result
  }

  const originalEnterBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    const result = originalEnterBattle.apply(this, args)
    // Battle remains fish + line + water. Character animation is reserved for
    // the hook/catch beats rather than occupying the battle field.
    setPlayer(this, false)
    return result
  }

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (outcome, ...args) {
    const result = originalFinishBattle.call(this, outcome, ...args)
    if (outcome === 'caught') {
      setPlayer(this, true, PLAYER_SCALE.catch)
    } else {
      setPlayer(this, false)
    }
    showCastInstruction(this, false)
    return result
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    this._blueprintCastInstruction?.destroy(true)
    this._blueprintCastInstruction = null
    return originalCleanup.apply(this, args)
  }
}
