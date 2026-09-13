import { FONT, UI_COLORS } from '../config/fontStyles.js'
import { MOBILE_FRAME } from '../config/mobileFrame.js'

const TEXT_RES = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1

function pointName(point) {
  return {
    pointA: '汐風港',
    pointB: '蒼海湾',
    pointC: '黒潮崎',
  }[point] ?? '釣り場'
}

function buildTopHud(scene, W) {
  const c = scene.add.container(0, 0).setDepth(96).setScrollFactor(0)

  const bg = scene.add.graphics().setScrollFactor(0)
  bg.fillStyle(0x073754, 0.88)
  bg.fillRoundedRect(8, 7, W - 16, 48, 15)
  bg.lineStyle(1.5, 0x8edfff, 0.48)
  bg.strokeRoundedRect(8, 7, W - 16, 48, 15)
  bg.fillStyle(0xffffff, 0.09)
  bg.fillRoundedRect(18, 13, W - 36, 9, 5)

  const backBg = scene.add.circle(31, 31, 17, 0xffffff, 0.14)
    .setStrokeStyle(1.5, 0xffffff, 0.30)
    .setScrollFactor(0)
  const back = scene.add.text(31, 30, '‹', {
    fontFamily: FONT,
    resolution: TEXT_RES,
    fontSize: '29px',
    fontWeight: '900',
    color: '#ffffff',
  }).setOrigin(0.5).setScrollFactor(0)
  const backHit = scene.add.circle(31, 31, 23, 0x000000, 0)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', pointer => pointer?.event?.stopPropagation?.())
    .on('pointerup', pointer => {
      pointer?.event?.stopPropagation?.()
      scene._cleanup?.()
      scene.scene.start('MapScene')
    })

  const location = scene.add.text(56, 31, pointName(scene.env?.point), {
    fontFamily: FONT,
    resolution: TEXT_RES,
    fontSize: '13px',
    fontWeight: '900',
    color: '#ffffff',
  }).setOrigin(0, 0.5).setScrollFactor(0)

  const statusBg = scene.add.graphics().setScrollFactor(0)
  statusBg.fillStyle(0x021d2d, 0.42)
  statusBg.fillRoundedRect(W - 132, 15, 108, 32, 12)

  const status = scene.add.text(W - 78, 31, 'キャスト', {
    fontFamily: FONT,
    resolution: TEXT_RES,
    fontSize: '12px',
    fontWeight: '900',
    color: '#dff5ff',
  }).setOrigin(0.5).setScrollFactor(0)

  c.add([bg, backBg, back, backHit, location, statusBg, status])
  scene._mobileFishingHud = c
  scene._mobileFishingStatus = status
  scene._mobileHudSetStatus = text => status?.setText(text || '')
  scene._mobileHudSetVisible = visible => c?.setVisible(Boolean(visible))
}

/**
 * Mobile-first screen shell matching docs/concept-art/canonical/mobile-fishing-ui-blueprint.jpg.
 * The phone frame is fixed UI; only the fishing world moves behind it.
 */
export function installMobileFishingShell(GameScene) {
  if (GameScene.prototype.__ainanMobileFishingShellInstalled) return
  GameScene.prototype.__ainanMobileFishingShellInstalled = true

  // Replace the old floating location badge with one compact fixed top bar.
  GameScene.prototype._buildLocationBadge = function (W) {
    buildTopHud(this, W)
  }

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    // The old lower-left map button consumes fishing space. Navigation now
    // lives in the fixed top shell.
    this.resultUI?._backBtn?.destroy(true)
    this.resultUI._backBtn = null
    this._mobileHudSetVisible?.(!['battle', 'result'].includes(this.phase))
    return result
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    const result = originalEnterCast.apply(this, args)
    this._mobileHudSetVisible?.(true)
    this._mobileHudSetStatus?.('キャスト')
    return result
  }

  const originalEnterRetrieve = GameScene.prototype._enterRetrieve
  GameScene.prototype._enterRetrieve = function (...args) {
    const result = originalEnterRetrieve.apply(this, args)
    this._mobileHudSetVisible?.(true)
    this._mobileHudSetStatus?.('残り --')
    return result
  }

  const originalSyncRetrieveWorldUI = GameScene.prototype._syncRetrieveWorldUI
  GameScene.prototype._syncRetrieveWorldUI = function (...args) {
    const result = originalSyncRetrieveWorldUI.apply(this, args)
    if (this.phase === 'retrieve' && this.bobber?.visible) {
      const pxPerMeter = this.fishingCamera?.world?.pxPerMeter ?? 18
      const meters = Math.hypot(this.bobber.x - this.anchorX, this.bobber.y - this.anchorY) / pxPerMeter
      this._mobileHudSetStatus?.(`残り ${meters.toFixed(0)}m`)
    }
    return result
  }

  const originalOpenHitWindow = GameScene.prototype._openHitWindow
  GameScene.prototype._openHitWindow = function (...args) {
    const result = originalOpenHitWindow.apply(this, args)
    this._mobileHudSetVisible?.(true)
    this._mobileHudSetStatus?.('HIT!')
    return result
  }

  const originalEnterBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    const result = originalEnterBattle.apply(this, args)
    // BattleUI uses the same upper 64px for tension, so the normal bar yields.
    this._mobileHudSetVisible?.(false)
    return result
  }

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (...args) {
    const result = originalFinishBattle.apply(this, args)
    this._mobileHudSetVisible?.(false)
    return result
  }

  const originalShowResultFishVisual = GameScene.prototype._showResultFishVisual
  GameScene.prototype._showResultFishVisual = function (...args) {
    const result = originalShowResultFishVisual.apply(this, args)
    if (this.resIcon) this.resIcon.setPosition(0, -116).setDisplaySize(118, 118)
    this.resEmoji?.setY(-116).setFontSize?.(82)
    return result
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    this._mobileFishingHud?.destroy(true)
    this._mobileFishingHud = null
    this._mobileFishingStatus = null
    this._mobileHudSetStatus = null
    this._mobileHudSetVisible = null
    return originalCleanup.apply(this, args)
  }
}
