const QA_QUERY_KEY = 'qa'
const BUILD_SHA = String(import.meta.env?.VITE_BUILD_SHA ?? 'dev').slice(0, 7)

function qaEnabled() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get(QA_QUERY_KEY) === '1'
}

function makeButton(scene, x, y, w, label, onTap) {
  const bg = scene.add.rectangle(x, y, w, 26, 0xf8fdff, 0.94)
    .setStrokeStyle(1.5, 0x9bcfe5, 0.95)
    .setScrollFactor(0)
    .setDepth(1002)
    .setInteractive({ useHandCursor: true })
  const text = scene.add.text(x, y, label, {
    fontFamily: 'M PLUS Rounded 1c, sans-serif',
    fontSize: '9px',
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

function forceHookMiss(scene) {
  if (!['retrieve', 'wait'].includes(scene.phase)) {
    scene.resultUI?.toast('QA: 先にキャストして着水させる')
    return
  }
  scene._killWaitTimers?.()
  scene._stopRetrieveRuntime?.()
  scene.phase = 'wait'
  scene._bobberBaseY = scene.bobber?.y ?? scene.anchorY
  scene.waitTapActive = false
  scene._onMiss?.()
}

function forceBattleEscape(scene) {
  if (scene.phase !== 'battle') {
    scene.resultUI?.toast('QA: 先にBattleへ入る')
    return
  }
  scene.battleState.escape = 100
  scene._syncBattleUI?.()
  scene._finishBattle?.('escaped')
}

function forceCatch(scene) {
  if (scene.phase === 'result') return
  if (scene.phase !== 'battle') {
    scene._killWaitTimers?.()
    scene._stopRetrieveRuntime?.()
    scene._enterBattle?.()
  }
  scheduleQaCall(scene, 40, () => {
    if (scene.phase === 'battle') scene._finishBattle?.('caught')
  })
}


function qaActionState() {
  if (!qaEnabled() || typeof window === 'undefined') return { action: null, player: null }
  const p = new URLSearchParams(window.location.search)
  return {
    action: ['battle', 'caught'].includes(p.get('qaAction')) ? p.get('qaAction') : null,
    player: ['hit', 'battle', 'boss', 'result'].includes(p.get('qaPlayer')) ? p.get('qaPlayer') : null,
  }
}

function ensureQaHitCue(scene) {
  scene._qaHitCue?.destroy?.(true)
  const W = scene.scale.width
  const c = scene.add.container(W / 2, 326).setDepth(1005).setScrollFactor(0)
  const ring = scene.add.circle(0, 0, 56, 0xffd95a, 0.10)
    .setStrokeStyle(4, 0xffd95a, 0.96)
  const text = scene.add.text(0, -2, 'HIT!', {
    fontFamily: 'M PLUS Rounded 1c, sans-serif',
    fontSize: '30px',
    fontStyle: 'bold',
    color: '#ffd95a',
    stroke: '#073754',
    strokeThickness: 6,
  }).setOrigin(0.5)
  const sub = scene.add.text(0, 38, '今！タップ', {
    fontFamily: 'M PLUS Rounded 1c, sans-serif',
    fontSize: '12px',
    fontStyle: 'bold',
    color: '#ffffff',
    backgroundColor: 'rgba(7,55,84,.86)',
    padding: { x: 10, y: 4 },
  }).setOrigin(0.5)
  c.add([ring, text, sub])
  scene._qaHitCue = c
}

function prepareQaBattleSubject(scene) {
  const runtime = scene.bg?._fishRuntime?.find(item => item?.gfx?.active)
    ?? scene.bg?._fishRuntime?.[0]
  if (runtime?.gfx) {
    scene._targetFishIndex = runtime.index ?? 0
    scene._targetFishGfx = runtime.gfx
    scene.fish = runtime.fishDef ?? scene.fish
    runtime.gfx.setVisible?.(true)
  }
}

function isHistoryRestore() {
  if (typeof performance === 'undefined') return false
  return performance.getEntriesByType?.('navigation')?.[0]?.type === 'back_forward'
}

function qaSceneReady(scene) {
  const resultTextReady = [
    scene.scoreValText,
    scene.resLabel,
    scene.resEmoji,
    scene.resName,
    scene.resPts,
    scene.resHint,
  ].every(text => text?.active && text.frame?.data?.drawImage)
  return Boolean(
    scene._qaSceneAlive &&
    scene.sys?.isActive?.() &&
    scene.cameras?.main?.scene &&
    scene.hintText?.active &&
    scene.hintText?.canvas &&
    scene.hintText?.frame?.data?.drawImage &&
    scene._battleFishName?.active &&
    scene._battleFishName?.frame?.data?.drawImage &&
    scene.rageTag?.active &&
    scene.rageTag?.frame?.data?.drawImage &&
    resultTextReady
  )
}

function cancelQaTimers(scene) {
  scene._qaTimers?.forEach(timer => timer?.remove?.(false))
  scene._qaTimers?.clear?.()
}

function stopQaScene(scene) {
  if (!scene._qaSceneAlive) return
  scene._qaSceneAlive = false
  scene._qaLifecycleToken = (scene._qaLifecycleToken ?? 0) + 1
  cancelQaTimers(scene)
  scene._battleTimer?.remove?.(false)
  scene._battleTimer = null
}

function scheduleQaCall(scene, delay, callback) {
  const lifecycleToken = scene._qaLifecycleToken
  let timer = null
  timer = scene.time.delayedCall(delay, () => {
    scene._qaTimers?.delete?.(timer)
    if (scene._qaLifecycleToken !== lifecycleToken || !qaSceneReady(scene)) return
    callback()
  })
  scene._qaTimers ??= new Set()
  scene._qaTimers.add(timer)
  return timer
}

function forceQaAction(scene) {
  if (qaMockPhase() || isHistoryRestore()) return
  const { action, player } = qaActionState()
  if (!action && !player) return
  const forceToken = (scene._qaForceToken ?? 0) + 1
  scene._qaForceToken = forceToken

  scheduleQaCall(scene, 650, () => {
    if (scene._qaForceToken !== forceToken) return

    if (action === 'battle') {
      prepareQaBattleSubject(scene)
      scene._killWaitTimers?.()
      scene._stopRetrieveRuntime?.()
      scene._enterBattle?.()
      return
    }

    if (action === 'caught') {
      prepareQaBattleSubject(scene)
      scene._killWaitTimers?.()
      scene._stopRetrieveRuntime?.()
      if (scene.phase !== 'battle') scene._enterBattle?.()
      scheduleQaCall(scene, 180, () => {
        if (scene._qaForceToken === forceToken && scene.phase === 'battle') scene._finishBattle?.('caught')
      })
      return
    }

    if (player === 'hit') {
      scene._killWaitTimers?.()
      scene._stopRetrieveRuntime?.()
      scene.phase = 'wait'
      scene.waitTapActive = true
      scene.hitHint?.setVisible?.(true)
      scene._mobileHudSetStatus?.('HIT!')
      ensureQaHitCue(scene)
    }
  })
}

function qaMockPhase() {
  if (!qaEnabled()) return null
  const value = new URLSearchParams(window.location.search).get('qaMockPhase')
  return ['cast', 'retrieve', 'battle', 'result'].includes(value) ? value : null
}

function forceMockPhase(scene) {
  const phase = qaMockPhase()
  if (!phase || phase === 'cast') return

  scheduleQaCall(scene, 700, () => {
    if (phase === 'retrieve') {
      const x = scene.anchorX + 210
      const y = scene.anchorY - 300
      scene._enterRetrieve?.(x, y)
      scene.bobber?.setPosition?.(x, y)?.setVisible?.(true)
      scene._syncRetrieveWorldUI?.()
      return
    }

    const runtime = scene.bg?._fishRuntime?.find(item => item?.gfx?.active)
      ?? scene.bg?._fishRuntime?.[0]
    if (runtime?.gfx) {
      scene._targetFishIndex = runtime.index ?? 0
      scene._targetFishGfx = runtime.gfx
      runtime.gfx.setVisible?.(true)
    }

    scene._enterBattle?.()
    if (phase === 'result') {
      scheduleQaCall(scene, 260, () => {
        if (scene.phase === 'battle') scene._finishBattle?.('caught')
      })
    }
  })
}

function buildQaHud(scene) {
  const W = scene.scale.width
  const items = []

  const bg = scene.add.rectangle(W / 2, 47, W - 8, 90, 0x071a28, 0.88)
    .setStrokeStyle(1, 0xffffff, 0.22)
    .setScrollFactor(0)
    .setDepth(1000)
  items.push(bg)

  const title = scene.add.text(10, 7, `VS QA ${BUILD_SHA}`, {
    fontFamily: 'M PLUS Rounded 1c, sans-serif',
    fontSize: '9px',
    fontStyle: 'bold',
    color: '#ffd95a',
  }).setScrollFactor(0).setDepth(1003)
  items.push(title)

  scene._qaStatusText = scene.add.text(10, 23, '', {
    fontFamily: 'M PLUS Rounded 1c, sans-serif',
    fontSize: '9px',
    fontStyle: 'bold',
    color: '#ffffff',
  }).setScrollFactor(0).setDepth(1003)
  items.push(scene._qaStatusText)

  const near = makeButton(scene, W - 122, 26, 44, '近', () => restartPreset(scene, { point: 'pointA', rodType: 'basic' }))
  const mid = makeButton(scene, W - 72, 26, 44, '中', () => restartPreset(scene, { point: 'pointA', rodType: 'carbon' }))
  const far = makeButton(scene, W - 22, 26, 44, '遠', () => restartPreset(scene, { point: 'pointA', rodType: 'premium' }))

  const miss = makeButton(scene, W - 174, 69, 64, 'HITミス', () => forceHookMiss(scene))
  const escape = makeButton(scene, W - 104, 69, 64, '逃走', () => forceBattleEscape(scene))
  const caught = makeButton(scene, W - 34, 69, 64, '釣果GET', () => forceCatch(scene))
  items.push(...near, ...mid, ...far, ...miss, ...escape, ...caught)

  scene._qaHudObjects = items
  scene._qaPanelHeight = 92
}

function syncMockSubject(scene) {
  if (!scene._qaEnabled || typeof window === 'undefined') return
  const phase = new URLSearchParams(window.location.search).get('qaMockPhase')
  if (phase !== 'battle') {
    scene._qaMockSubject?.destroy?.()
    scene._qaMockSubject = null
    return
  }

  if (scene._qaMockSubject?.active) {
    scene._qaMockSubject.setVisible?.(true)
    return
  }

  const key = scene.textures?.exists?.('ff_fish_shadow_m_idle_01')
    ? 'ff_fish_shadow_m_idle_01'
    : scene.textures?.exists?.('fish_aji_icon') ? 'fish_aji_icon' : null

  if (key) {
    scene._qaMockSubject = scene.add.image(scene.scale.width / 2, 330, key)
      .setDisplaySize(key === 'fish_aji_icon' ? 150 : 176, key === 'fish_aji_icon' ? 150 : 88)
      .setDepth(1004)
      .setScrollFactor(0)
      .setAlpha(0.98)
  } else {
    const g = scene.add.graphics().setDepth(1004).setScrollFactor(0)
    g.fillStyle(0x0b3046, 0.94)
    g.fillEllipse(scene.scale.width / 2, 330, 168, 76)
    g.fillTriangle(scene.scale.width / 2 + 70, 330, scene.scale.width / 2 + 112, 298, scene.scale.width / 2 + 112, 362)
    scene._qaMockSubject = g
  }
}

function syncQaHud(scene) {
  if (!scene._qaStatusText) return
  const phase = String(scene.phase ?? '-').toUpperCase()
  const rod = scene.rod?.id ?? scene.env?.player?.rodType ?? '-'
  const decisions = scene.retrieveState?.decisionCount ?? 0
  const fish = scene._retrieveTargetFish?.fishDef?.name
    ?? scene._retrieveTargetFish?.fishDef?.id
    ?? scene.fish?.name
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
    this._qaSceneAlive = true
    this._qaLifecycleToken = (this._qaLifecycleToken ?? 0) + 1
    this._qaTimers = new Set()
    this._qaStopScene = () => stopQaScene(this)
    this._qaStopOnHidden = () => {
      if (document.hidden) stopQaScene(this)
    }
    this.events.once('shutdown', this._qaStopScene)
    document.addEventListener('visibilitychange', this._qaStopOnHidden)
    window.addEventListener('pagehide', this._qaStopScene)
    window.addEventListener('beforeunload', this._qaStopScene)
    const result = originalCreate.apply(this, args)
    this._qaEnabled = qaEnabled()
    if (this._qaEnabled) {
      if (!qaMockPhase()) buildQaHud(this)
      forceQaAction(this)
      if (qaMockPhase() === 'cast') {
        this.time.delayedCall(0, () => {
          if (!this.sys?.isActive?.()) return
          this._blueprintCastInstruction?.destroy?.(true)
          this._blueprintCastInstruction = null
          this.powerGfx?.clear?.()
          this.powerLabel?.setVisible?.(false)
          this._rcCastDock?.setVisible?.(false)
          this._finalCastOverlay?.setVisible?.(true)
        })
      }
    }
    return result
  }

  const originalOnDown = GameScene.prototype._onDown
  GameScene.prototype._onDown = function (pointer) {
    if (this._qaEnabled && !qaMockPhase() && pointer?.y <= (this._qaPanelHeight ?? 92)) return
    return originalOnDown.call(this, pointer)
  }

  const originalUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (...args) {
    const result = originalUpdate?.apply(this, args)
    if (this._qaEnabled) {
      syncQaHud(this)
      syncMockSubject(this)
    }
    return result
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    stopQaScene(this)
    if (this._qaStopScene) {
      document.removeEventListener('visibilitychange', this._qaStopOnHidden)
      window.removeEventListener('pagehide', this._qaStopScene)
      window.removeEventListener('beforeunload', this._qaStopScene)
      this._qaStopScene = null
      this._qaStopOnHidden = null
    }
    this._qaForceToken = (this._qaForceToken ?? 0) + 1
    this._qaHudObjects?.forEach(obj => obj?.destroy?.())
    this._qaHudObjects = null
    this._qaStatusText = null
    this._qaMockSubject?.destroy?.()
    this._qaMockSubject = null
    this._qaHitCue?.destroy?.(true)
    this._qaHitCue = null
    return originalCleanup.apply(this, args)
  }
}
