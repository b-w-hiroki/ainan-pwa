const QA_QUERY_KEY = 'qa'

function qaEnabled() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get(QA_QUERY_KEY) === '1'
}

function makeButton(scene, x, label, onTap) {
  const bg = scene.add.rectangle(x, 30, 46, 30, 0xf8fdff, 0.94)
    .setStrokeStyle(1.5, 0x9bcfe5, 0.95)
    .setScrollFactor(0)
    .setDepth(1002)
    .setInteractive({ useHandCursor: true })
  const text = scene.add.text(x, 30, label, {
    fontFamily: 'M PLUS Rounded 1c, sans-serif',
    fontSize: '10px',
    fontStyle: 'bold',
    color: '#173248',
  }).setOrigin(0.5).setScrollFactor(0).setDepth(1003)

  bg.on('pointerdown', () => onTap())
  return [bg, text]
}

function restartPreset(scene, { point, rodType }) {
  scene.scene.restart({
    point,
    player: {
      rodType,
      baitType: 'worm',
    },
  })
}

function zoneFromDistance(meters) {
  if (!Number.isFinite(meters)) return '-'
  if (meters < 23) return '近'
  if (meters < 35) return '中'
  return '遠'
}

function buildQaHud(scene) {
  const W = scene.scale.width
  const items = []

  const bg = scene.add.rectangle(W / 2, 30, W - 8, 56, 0x071a28, 0.88)
    .setStrokeStyle(1, 0xffffff, 0.22)
    .setScrollFactor(0)
    .setDepth(1000)
  items.push(bg)

  const title = scene.add.text(10, 9, 'VS QA', {
    fontFamily: 'M PLUS Rounded 1c, sans-serif',
    fontSize: '9px',
    fontStyle: 'bold',
    color: '#ffd95a',
  }).setScrollFactor(0).setDepth(1003)
  items.push(title)

  scene._qaStatusText = scene.add.text(10, 27, '', {
    fontFamily: 'M PLUS Rounded 1c, sans-serif',
    fontSize: '9px',
    fontStyle: 'bold',
    color: '#ffffff',
  }).setScrollFactor(0).setDepth(1003)
  items.push(scene._qaStatusText)

  const near = makeButton(scene, W - 122, '近', () => restartPreset(scene, { point: 'pointA', rodType: 'basic' }))
  const mid = makeButton(scene, W - 72, '中', () => restartPreset(scene, { point: 'pointA', rodType: 'carbon' }))
  const far = makeButton(scene, W - 22, '遠', () => restartPreset(scene, { point: 'pointA', rodType: 'premium' }))
  items.push(...near, ...mid, ...far)

  scene._qaHudObjects = items
  scene._qaPanelHeight = 58
}

function syncQaHud(scene) {
  if (!scene._qaStatusText) return
  const phase = String(scene.phase ?? '-').toUpperCase()
  const rod = scene.rod?.id ?? scene.env?.player?.rodType ?? '-'
  const decisions = scene.retrieveState?.decisionCount ?? 0
  const fish = scene._retrieveTargetFish?.fishDef?.name
    ?? scene._retrieveTargetFish?.fishDef?.id
    ?? '-'
  const fishState = scene._retrieveTargetFish?.state ?? '-'

  let meters = null
  if (scene.bobber?.visible && scene.anchorX != null && scene.anchorY != null) {
    const dx = scene.bobber.x - scene.anchorX
    const dy = scene.bobber.y - scene.anchorY
    meters = Math.hypot(dx, dy) / 18
  }
  const distance = Number.isFinite(meters) ? `${meters.toFixed(1)}m/${zoneFromDistance(meters)}` : '-'

  const battle = scene.phase === 'battle'
    ? ` ${scene.battleState?.isRaging ? 'RAGE' : 'CALM'} E${Math.round(scene.battleState?.escape ?? 0)} R${Math.round(scene.battleState?.reel ?? 0)}`
    : ''

  scene._qaStatusText.setText(`${phase}  ${rod}  ${distance}\nD:${decisions}  F:${fish}/${fishState}${battle}`)
}

/**
 * Opt-in Vertical Slice QA overlay.
 * Enabled only with ?qa=1 and never shown in normal play.
 */
export function installVerticalSliceQaMode(GameScene) {
  if (GameScene.prototype.__ainanVerticalSliceQaModeInstalled) return
  GameScene.prototype.__ainanVerticalSliceQaModeInstalled = true

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    this._qaEnabled = qaEnabled()
    if (this._qaEnabled) buildQaHud(this)
    return result
  }

  const originalOnDown = GameScene.prototype._onDown
  GameScene.prototype._onDown = function (pointer) {
    if (this._qaEnabled && pointer?.y <= (this._qaPanelHeight ?? 58)) return
    return originalOnDown.call(this, pointer)
  }

  const originalUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (...args) {
    const result = originalUpdate?.apply(this, args)
    if (this._qaEnabled) syncQaHud(this)
    return result
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    this._qaHudObjects?.forEach(obj => obj?.destroy?.())
    this._qaHudObjects = null
    this._qaStatusText = null
    return originalCleanup.apply(this, args)
  }
}
