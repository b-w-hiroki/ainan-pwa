import Phaser from 'phaser'
import { BackgroundManager } from '../scenes/components/BackgroundManager.js'
import { RetrieveUI } from '../scenes/components/RetrieveUI.js'
import { FishingCameraController, FISHING_WORLD } from '../scenes/components/FishingCameraController.js'
import { FISH_LIST } from './fish.js'
import { updateFishInterest, fishReactionSymbol, FISH_INTEREST_STATE } from './fishInterest.js'
import { buildTrajectory, clampLanding, computeCastAngle } from './cast.js'
import { getTownBonuses } from './progress.js'

const BASE_CAST_WORLD_PX = 420
const TWITCH_DISTANCE_PX = 30
const SLOW_REEL_SPEED = 54
const BITE_RADIUS = 48
const INTEREST_TICK_MS = 150
const RETRIEVE_END_DISTANCE = 66
const WORLD_FISH_DURATION_SCALE = 1.65

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

function setFixed(obj) {
  obj?.setScrollFactor?.(0)
  return obj
}

function setTackleVisible(scene, visible) {
  const tackle = scene.tackleUI
  if (!tackle) return
  const setBtn = (btn, show) => {
    if (!btn) return
    Object.values(btn).forEach(obj => obj?.setVisible?.(show))
  }
  setBtn(tackle._rodBtn, visible)
  setBtn(tackle._baitBtn, visible)
  tackle._rodPanel?.setVisible(false)
  tackle._baitPanel?.setVisible(false)
  tackle._openPanel = null
  if (visible) tackle.enable?.()
  else tackle.disable?.()
}

function eligibleFish(scene) {
  const baitType = scene.env?.player?.baitType ?? 'worm'
  return FISH_LIST.filter(fish => {
    if (!fish.habitat.includes(scene.env?.point)) return false
    if (fish.id === 'kue' && baitType !== 'special') return false
    return true
  })
}

function pickFishForShadow(scene, shadowDef, index) {
  const candidates = eligibleFish(scene)
  if (candidates.length === 0) return FISH_LIST[0]
  if (shadowDef.t === 'rare') {
    const legendary = candidates.find(f => f.rarity === 'legendary')
    if (legendary) return legendary
  }
  const sameRarity = candidates.filter(f => f.rarity === shadowDef.t)
  if (sameRarity.length) return sameRarity[index % sameRarity.length]
  return candidates[index % candidates.length]
}

function resetRuntimeFish(manager, index) {
  const runtime = manager._fishRuntime?.[index]
  if (!runtime) return
  runtime.state = FISH_INTEREST_STATE.CRUISE
  runtime.interest = 0
  runtime.lastDistance = Infinity
  runtime.reaction?.destroy()
  runtime.reaction = null
}

function fixInitialHud(scene) {
  scene.children.list.forEach(obj => {
    if ((obj.depth ?? 0) >= 45 && obj !== scene._playerSprite) setFixed(obj)
  })
  ;[
    scene.powerGfx,
    scene.powerLabel,
    scene.castHintBg,
    scene.hintText,
    scene.dangerFx,
    scene.scoreBar,
    scene.escapeBar,
    scene.battlePanel,
    scene.reelCTA,
    scene.hitHint,
    scene.rageTag,
    scene.resultOverlay,
    scene.schoolFx,
  ].forEach(setFixed)
  scene.tackleUI?._objects?.forEach(setFixed)
}

function fixObjectsCreatedAfter(scene, before) {
  const after = scene.children.list
  for (let i = before; i < after.length; i++) setFixed(after[i])
}

export function installRetrieveGameplay(GameScene) {
  if (GameScene.prototype.__ainanRetrieveGameplayInstalled) return
  GameScene.prototype.__ainanRetrieveGameplayInstalled = true

  // ─────────────────────────────────────────────────────────────
  // BackgroundManager → viewport ではなく Fishing World を使う
  // ─────────────────────────────────────────────────────────────
  const originalBuildBackground = BackgroundManager.prototype.buildBackground
  BackgroundManager.prototype.buildBackground = function (_W, _H, pointId = 'pointA') {
    return originalBuildBackground.call(this, FISHING_WORLD.width, FISHING_WORLD.height, pointId)
  }

  const originalBuildPlayer = BackgroundManager.prototype.buildPlayer
  BackgroundManager.prototype.buildPlayer = function () {
    // installPlayerAnimations が想定する W*0.5 / H*0.842 を利用して、
    // world 左下の desired position に配置する。
    const virtualW = FISHING_WORLD.player.x * 2
    const virtualH = FISHING_WORLD.player.y / 0.842
    const anchor = originalBuildPlayer.call(this, virtualW, virtualH)
    return {
      ...anchor,
      castRangePx: BASE_CAST_WORLD_PX,
    }
  }

  BackgroundManager.prototype.startFishTweens = function () {
    this._fishTweens.forEach(tw => { tw?.stop(); tw?.destroy() })
    this._fishTweens = []
    this._fishDefs.forEach((fd, i) => {
      const gfx = this._fishGfx[i]
      if (!gfx) return
      resetRuntimeFish(this, i)
      const sx = fd.rtl ? FISHING_WORLD.width + 90 : -90
      const ex = fd.rtl ? -90 : FISHING_WORLD.width + 90
      gfx.setPosition(sx, FISHING_WORLD.height * fd.y)
      gfx.setScale(fd.rtl ? -1 : 1, 1)
      this._fishTweens[i] = this.scene.tweens.add({
        targets: gfx,
        x: ex,
        duration: Math.round(fd.dur * WORLD_FISH_DURATION_SCALE),
        delay: Math.round(fd.delay * 0.6),
        repeat: -1,
        ease: 'Linear',
      })
    })
  }

  const originalSpawnFish = BackgroundManager.prototype.spawnFish
  BackgroundManager.prototype.spawnFish = function () {
    originalSpawnFish.call(this, FISHING_WORLD.width, FISHING_WORLD.height)
    this._fishRuntime = this._fishGfx.map((gfx, index) => ({
      index,
      gfx,
      fishDef: pickFishForShadow(this.scene, this._fishDefs[index], index),
      state: FISH_INTEREST_STATE.CRUISE,
      interest: 0,
      lastDistance: Infinity,
      reaction: null,
    }))
  }

  BackgroundManager.prototype.resetFishToStart = function (index) {
    if (index == null || !this._fishDefs[index]) return
    const fd = this._fishDefs[index]
    const gfx = this._fishGfx[index]
    if (!gfx) return
    resetRuntimeFish(this, index)
    const sx = fd.rtl ? FISHING_WORLD.width + 90 : -90
    const ex = fd.rtl ? -90 : FISHING_WORLD.width + 90
    gfx.setPosition(sx, FISHING_WORLD.height * fd.y)
    gfx.setScale(fd.rtl ? -1 : 1, 1)
    this._fishTweens[index]?.stop()
    this._fishTweens[index]?.destroy()
    this._fishTweens[index] = this.scene.tweens.add({
      targets: gfx,
      x: ex,
      duration: Math.round(fd.dur * WORLD_FISH_DURATION_SCALE),
      repeat: -1,
      ease: 'Linear',
    })
  }

  // ─────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────
  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    this.fishingCamera = new FishingCameraController(this)
    this.fishingCamera.setup(FISHING_WORLD.player.x, FISHING_WORLD.player.y)

    this.retrieveUI = new RetrieveUI(this)
    this.retrieveUI.build(this.scale.width, this.scale.height)
    fixInitialHud(this)

    this._retrieveInterestTimer = null
    this._retrieveTween = null
    this._retrieveTargetFish = null
    this._retrieveInBite = false
    return result
  }

  const originalSyncTackle = GameScene.prototype._syncTackle
  GameScene.prototype._syncTackle = function (...args) {
    const result = originalSyncTackle.apply(this, args)
    this.baseCastRangePx = BASE_CAST_WORLD_PX
    this.castRangePx = BASE_CAST_WORLD_PX * (this.rod?.castRange ?? 1)
    return result
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    this._stopRetrieveRuntime?.()
    const result = originalEnterCast.apply(this, args)
    this.retrieveUI?.hide()
    this._distanceBadge?.setVisible(false)
    this.castHintBg?.setVisible(true)
    this.hintText?.setVisible(true)
    setTackleVisible(this, true)
    this.fishingCamera?.focusPlayer(false)
    this._resetFishInterest?.()
    return result
  }

  // pointer は screen 座標なので、cast 角度だけ world 座標へ補正する。
  const originalOnDown = GameScene.prototype._onDown
  GameScene.prototype._onDown = function (pointer) {
    const wasCast = this.phase === 'cast'
    const result = originalOnDown.call(this, pointer)
    if (wasCast && this.phase === 'cast' && this.isCharging) {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
      this._castAngle = computeCastAngle(this.anchorX, this.anchorY, worldPoint.x, worldPoint.y)
    }
    return result
  }

  const originalOnMove = GameScene.prototype._onMove
  GameScene.prototype._onMove = function (pointer) {
    const result = originalOnMove.call(this, pointer)
    if (this.phase === 'cast' && this.isCharging) {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
      this._castAngle = computeCastAngle(this.anchorX, this.anchorY, worldPoint.x, worldPoint.y)
    }
    return result
  }

  // ─────────────────────────────────────────────────────────────
  // World cast + camera follow
  // ─────────────────────────────────────────────────────────────
  GameScene.prototype._fireCast = function (angleDeg, power01) {
    this.castGfx.clear()
    this.powerGfx.clear()
    this.powerLabel.setVisible(false)
    if (!this._consumeBaitForCast()) return

    if (this._playerSprite && this.textures.exists('ch_player_cast_anim')) {
      this._playerSprite.setTexture('ch_player_cast_anim', 4)
      if (this.anims.exists('ainan-player-cast-release')) this._playerSprite.play('ainan-player-cast-release', true)
    }

    const pts = buildTrajectory(this.anchorX, this.anchorY, angleDeg, power01, this.castRangePx)
    clampLanding(pts, FISHING_WORLD.waterBounds)
    const end = pts[pts.length - 1]
    const castDistance = Phaser.Math.Distance.Between(this.anchorX, this.anchorY, end.x, end.y)
    const duration = clamp(620 + castDistance * 0.42, 720, 1080)

    this.bobber.setPosition(this.anchorX, this.anchorY).setVisible(true)
    const path = { u: 0 }
    this.tweens.add({
      targets: path,
      u: pts.length - 1,
      duration,
      ease: 'Quad.out',
      onUpdate: () => {
        const i = Math.min(Math.floor(path.u), pts.length - 2)
        const f = path.u - i
        const a = pts[i], b = pts[i + 1]
        const x = a.x + (b.x - a.x) * f
        const y = a.y + (b.y - a.y) * f
        this.bobber.setPosition(x, y)
        this.lineGfx.clear()
        this.lineGfx.lineStyle(2, 0xffffff, 0.82)
        this.lineGfx.lineBetween(this.anchorX, this.anchorY, x, y)
        this.fishingCamera?.updateCastFollow(x, y)
      },
      onComplete: () => {
        this.bobberMgr.showSplash(end.x, end.y)
        this._enterRetrieve(end.x, end.y)
      },
    })
  }

  // ─────────────────────────────────────────────────────────────
  // Retrieve phase
  // ─────────────────────────────────────────────────────────────
  GameScene.prototype._enterRetrieve = function (x, y) {
    this.phase = 'retrieve'
    this._retrieveInBite = false
    this._killWaitTimers()
    this.tackleUI?.disable()
    setTackleVisible(this, false)
    this.hitHint.setVisible(false)
    this.castHintBg?.setVisible(false)
    this.hintText?.setVisible(false)

    this.retrieveState = {
      lureX: x,
      lureY: y,
      action: 'idle',
      appeal: 0.35,
      startedAt: this.time.now,
      twitchUntil: 0,
      slowHeld: false,
    }
    this.bobber.setPosition(x, y).setVisible(true)
    this._retrieveTargetFish = null
    this.retrieveUI?.show()
    this.retrieveUI?.syncAppeal(this.retrieveState.appeal)
    this.retrieveUI?.setHint('少しずつ巻いて、魚影の反応を見よう')
    this._ensureDistanceBadge()
    this._syncRetrieveWorldUI()
    this.fishingCamera?.holdLure(x, y)

    this._retrieveInterestTimer?.remove(false)
    this._retrieveInterestTimer = this.time.addEvent({
      delay: INTEREST_TICK_MS,
      loop: true,
      callback: () => {
        if (this.phase === 'retrieve') this._tickFishInterest()
      },
    })
  }

  GameScene.prototype._setRetrieveIdle = function () {
    if (this.phase !== 'retrieve' || !this.retrieveState) return
    this.retrieveState.slowHeld = false
    this.retrieveState.action = 'idle'
    this.retrieveUI?.setHint('止めて様子を見る。魚によっては止めが効く')
    this._setRetrievePlayerPose(false)
  }

  GameScene.prototype._twitchRetrieve = function () {
    if (this.phase !== 'retrieve' || !this.retrieveState || this._retrieveTween) return
    if (this.time.now < (this.retrieveState.twitchUntil ?? 0)) return
    this.retrieveState.action = 'twitch'
    this.retrieveState.twitchUntil = this.time.now + 320
    this.retrieveState.appeal = clamp(this.retrieveState.appeal + 0.18, 0, 1)
    this.retrieveUI?.syncAppeal(this.retrieveState.appeal)
    this.retrieveUI?.setHint('ちょい巻き。魚影の向きが変わるか見よう')
    this._setRetrievePlayerPose(true)

    const target = this._pointTowardPlayer(TWITCH_DISTANCE_PX)
    const bobberTarget = { x: target.x, y: target.y }
    this._retrieveTween = this.tweens.add({
      targets: this.bobber,
      x: bobberTarget.x,
      y: bobberTarget.y,
      duration: 250,
      ease: 'Sine.easeOut',
      onUpdate: () => this._syncRetrieveWorldUI(),
      onComplete: () => {
        this._retrieveTween = null
        if (this.phase !== 'retrieve') return
        this.retrieveState.action = 'idle'
        this._setRetrievePlayerPose(false)
      },
    })
  }

  GameScene.prototype._startSlowRetrieve = function () {
    if (this.phase !== 'retrieve' || !this.retrieveState) return
    this.retrieveState.slowHeld = true
    this.retrieveState.action = 'slowReel'
    this.retrieveUI?.setHint('ゆっくり巻き中。追ってくる魚を見逃さない')
    this._setRetrievePlayerPose(true, true)
  }

  GameScene.prototype._stopSlowRetrieve = function () {
    if (!this.retrieveState) return
    this.retrieveState.slowHeld = false
    if (this.phase === 'retrieve') this.retrieveState.action = 'idle'
    this._setRetrievePlayerPose(false)
  }

  GameScene.prototype._setRetrievePlayerPose = function (reeling, loop = false) {
    const sprite = this._playerSprite
    if (!sprite || !this.textures.exists('ch_player_fight_anim')) return
    if (reeling) {
      sprite.setTexture('ch_player_fight_anim', 3)
      if (this.anims.exists('ainan-player-fight-loop')) {
        sprite.play('ainan-player-fight-loop', true)
        if (!loop) this.time.delayedCall(260, () => {
          if (this.phase === 'retrieve' && this.retrieveState?.action !== 'slowReel') {
            sprite.stop().setTexture('ch_player_fight_anim', 2)
          }
        })
      }
    } else {
      sprite.stop().setTexture('ch_player_fight_anim', 2)
    }
  }

  GameScene.prototype._pointTowardPlayer = function (distancePx) {
    const dx = this.anchorX - this.bobber.x
    const dy = this.anchorY - this.bobber.y
    const len = Math.max(1, Math.hypot(dx, dy))
    return {
      x: this.bobber.x + (dx / len) * Math.min(distancePx, len),
      y: this.bobber.y + (dy / len) * Math.min(distancePx, len),
    }
  }

  GameScene.prototype._ensureDistanceBadge = function () {
    if (this._distanceBadge) {
      this._distanceBadge.setVisible(true)
      return
    }
    this._distanceBadge = this.add.text(0, 0, '', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(23,50,72,0.90)',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5, 1).setDepth(44)
  }

  GameScene.prototype._syncRetrieveWorldUI = function () {
    if (!this.retrieveState || !this.bobber?.visible) return
    this.retrieveState.lureX = this.bobber.x
    this.retrieveState.lureY = this.bobber.y
    const distPx = Phaser.Math.Distance.Between(this.anchorX, this.anchorY, this.bobber.x, this.bobber.y)
    const meters = distPx / FISHING_WORLD.pxPerMeter
    this._distanceBadge?.setPosition(this.bobber.x, this.bobber.y - 24).setText(`飛距離 ${meters.toFixed(1)}m`)
    this.lineGfx.clear()
    this.lineGfx.lineStyle(2, 0xffffff, 0.78)
    this.lineGfx.lineBetween(this.anchorX, this.anchorY, this.bobber.x, this.bobber.y)
    this.fishingCamera?.updateRetrieveFollow(this.bobber.x, this.bobber.y)
  }

  GameScene.prototype._stepRetrieve = function (deltaMs = 16) {
    if (this.phase !== 'retrieve' || !this.retrieveState) return
    const dt = deltaMs / 1000

    if (this.retrieveState.action === 'slowReel' && this.retrieveState.slowHeld && !this._retrieveTween) {
      const target = this._pointTowardPlayer(SLOW_REEL_SPEED * dt)
      this.bobber.setPosition(target.x, target.y)
      this.retrieveState.appeal += (0.55 - this.retrieveState.appeal) * Math.min(1, dt * 3.5)
    } else if (this.retrieveState.action === 'idle') {
      this.retrieveState.appeal = clamp(this.retrieveState.appeal - 0.025 * dt, 0.12, 1)
    } else if (this.retrieveState.action === 'twitch') {
      this.retrieveState.appeal = clamp(this.retrieveState.appeal - 0.06 * dt, 0.12, 1)
    }

    this.retrieveUI?.syncAppeal(this.retrieveState.appeal)
    this._syncRetrieveWorldUI()
    this._stepFishPursuit(dt)

    const distPx = Phaser.Math.Distance.Between(this.anchorX, this.anchorY, this.bobber.x, this.bobber.y)
    if (distPx <= RETRIEVE_END_DISTANCE) {
      this.resultUI?.toast('手元まで巻いた')
      this.time.delayedCall(280, () => {
        if (this.phase === 'retrieve') this._enterCast()
      })
    }
  }

  GameScene.prototype._tickFishInterest = function () {
    const runtimes = this.bg?._fishRuntime ?? []
    const townBonus = getTownBonuses()
    for (const runtime of runtimes) {
      const gfx = runtime.gfx
      if (!gfx?.active) continue
      const dist = Phaser.Math.Distance.Between(gfx.x, gfx.y, this.bobber.x, this.bobber.y)

      if (dist > 280 && runtime.state !== FISH_INTEREST_STATE.CRUISE) {
        this.bg.resetFishToStart(runtime.index)
        continue
      }

      const prev = runtime.state
      const next = updateFishInterest(runtime, {
        distance: dist,
        action: this.retrieveState.action,
        appeal: this.retrieveState.appeal,
        baitType: this.env?.player?.baitType ?? 'worm',
        env: this.env,
        townAttractMod: townBonus.attractRadiusMod ?? 1,
      })

      if (next !== FISH_INTEREST_STATE.CRUISE && prev === FISH_INTEREST_STATE.CRUISE) {
        this.bg._fishTweens[runtime.index]?.stop()
        this.bg._fishTweens[runtime.index]?.destroy()
        this.bg._fishTweens[runtime.index] = null
      }
      this._syncFishReaction(runtime)

      if (next === FISH_INTEREST_STATE.BITE_READY && dist <= BITE_RADIUS) {
        this._beginRetrieveBite(runtime)
        break
      }
    }
  }

  GameScene.prototype._syncFishReaction = function (runtime) {
    const symbol = fishReactionSymbol(runtime.state)
    if (!symbol) {
      runtime.reaction?.setVisible(false)
      return
    }
    if (!runtime.reaction) {
      runtime.reaction = this.add.text(runtime.gfx.x, runtime.gfx.y - 24, symbol, {
        fontFamily: 'Nunito, sans-serif', fontSize: '20px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#173248', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(24)
    }
    runtime.reaction.setText(symbol).setVisible(true).setPosition(runtime.gfx.x, runtime.gfx.y - 24)
  }

  GameScene.prototype._stepFishPursuit = function (dt) {
    const runtimes = this.bg?._fishRuntime ?? []
    for (const runtime of runtimes) {
      if (![FISH_INTEREST_STATE.FOLLOW, FISH_INTEREST_STATE.INSPECT, FISH_INTEREST_STATE.BITE_READY].includes(runtime.state)) {
        if (runtime.reaction?.visible) runtime.reaction.setPosition(runtime.gfx.x, runtime.gfx.y - 24)
        continue
      }
      const gfx = runtime.gfx
      const profile = runtime.fishDef.retrieve ?? {}
      const inspect = runtime.state === FISH_INTEREST_STATE.INSPECT || runtime.state === FISH_INTEREST_STATE.BITE_READY
      const orbit = inspect ? 18 : 7
      const phase = this.time.now * 0.002 + runtime.index
      const tx = this.bobber.x + Math.cos(phase) * orbit
      const ty = this.bobber.y + 18 + Math.sin(phase) * orbit * 0.45
      const dx = tx - gfx.x
      const dy = ty - gfx.y
      const len = Math.max(1, Math.hypot(dx, dy))
      const speed = (profile.followSpeed ?? 55) * (runtime.state === FISH_INTEREST_STATE.BITE_READY ? 1.18 : 1)
      const step = Math.min(len, speed * dt)
      gfx.x += (dx / len) * step
      gfx.y += (dy / len) * step
      gfx.setScale(dx >= 0 ? 1 : -1, 1)
      this._syncFishReaction(runtime)
    }
  }

  GameScene.prototype._beginRetrieveBite = function (runtime) {
    if (this.phase !== 'retrieve') return
    this._retrieveTargetFish = runtime
    this._retrieveInBite = true
    this.fish = runtime.fishDef
    this._targetFishIndex = runtime.index
    this._targetFishGfx = runtime.gfx
    this._retrieveInterestTimer?.remove(false)
    this._retrieveInterestTimer = null
    this.retrieveUI?.hide()
    this._distanceBadge?.setVisible(false)
    this.castHintBg?.setVisible(true)
    this.hintText?.setVisible(true).setText(`${this.fish.name}がルアーを見ている…`)
    this.fishingCamera?.holdLure(this.bobber.x, this.bobber.y)

    // 既存の bite 実装は phase === 'wait' を前提にしているので、
    // bite 中だけ互換 phase を使い、Battle 以降は既存実装へ戻す。
    this.phase = 'wait'
    this._startBobberBiteSequence()
  }

  GameScene.prototype._resetFishInterest = function () {
    this.bg?._fishRuntime?.forEach((runtime, index) => {
      resetRuntimeFish(this.bg, index)
    })
  }

  GameScene.prototype._stopRetrieveRuntime = function () {
    this._retrieveInterestTimer?.remove(false)
    this._retrieveInterestTimer = null
    this._retrieveTween?.stop()
    this._retrieveTween?.destroy()
    this._retrieveTween = null
    if (this.retrieveState) this.retrieveState.slowHeld = false
    this.retrieveState = null
    this._retrieveInBite = false
  }

  // ─────────────────────────────────────────────────────────────
  // Battle / Result camera handoff
  // ─────────────────────────────────────────────────────────────
  const originalEnterBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    this.retrieveUI?.hide()
    this._distanceBadge?.setVisible(false)
    setTackleVisible(this, false)
    const result = originalEnterBattle.apply(this, args)
    this.fishingCamera?.composeBattle(this._targetFishGfx?.x, this._targetFishGfx?.y)
    return result
  }

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (outcome) {
    const result = originalFinishBattle.call(this, outcome)
    if (outcome === 'caught') this.fishingCamera?.focusCatch()
    else this.fishingCamera?.focusPlayer(false)
    return result
  }

  // Dynamic cut-ins/confetti/toasts are screen UI. Fix objects created after calls.
  const originalBigHit = GameScene.prototype._showBigHitCutin
  GameScene.prototype._showBigHitCutin = function (...args) {
    const before = this.children.list.length
    const result = originalBigHit.apply(this, args)
    fixObjectsCreatedAfter(this, before)
    return result
  }

  const originalConfetti = GameScene.prototype._spawnCaughtConfetti
  GameScene.prototype._spawnCaughtConfetti = function (...args) {
    const before = this.children.list.length
    const result = originalConfetti.apply(this, args)
    fixObjectsCreatedAfter(this, before)
    return result
  }

  const originalUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (time, delta) {
    originalUpdate?.call(this, time, delta)
    if (this.phase === 'retrieve') this._stepRetrieve(delta ?? 16)
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    this._stopRetrieveRuntime?.()
    this.retrieveUI?.destroy()
    this.retrieveUI = null
    this._distanceBadge?.destroy()
    this._distanceBadge = null
    this.bg?._fishRuntime?.forEach(runtime => runtime.reaction?.destroy())
    return originalCleanup.apply(this, args)
  }
}
