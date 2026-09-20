import { BOSS_META } from './midgameProgression.js'
import { haptic, playSfx } from './feedback.js'

function bossMeta(scene) {
  return Object.values(BOSS_META).find(meta => meta.pointId === scene.env?.point && meta.fishId === scene.fish?.id) ?? null
}

function clearBossHud(scene) {
  scene._bossPhaseHud?.destroy?.(true)
  scene._bossPhaseHud = null
  scene._bossPhase = 0
  scene._bossMeta = null
}

function buildBossHud(scene, meta) {
  clearBossHud(scene)
  const W = scene.scale.width
  const c = scene.add.container(W / 2, 128).setDepth(98).setScrollFactor(0)
  const bg = scene.add.graphics()
  bg.fillStyle(0x071a28, 0.92); bg.lineStyle(2, 0xffd95a, 0.9); bg.fillRoundedRect(-132, -24, 264, 48, 16); bg.strokeRoundedRect(-132, -24, 264, 48, 16)
  const title = scene.add.text(-116, -10, 'BOSS  ' + meta.title, { fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '10px', fontStyle: 'bold', color: '#ffd95a' })
  const phase = scene.add.text(-116, 8, 'PHASE 1 / 見極め', { fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '10px', fontStyle: 'bold', color: '#ffffff' })
  const barBg = scene.add.rectangle(52, 8, 110, 8, 0x274b61, 1).setOrigin(0, 0.5)
  const bar = scene.add.rectangle(52, 8, 36, 8, 0xffd95a, 1).setOrigin(0, 0.5)
  c.add([bg, title, phase, barBg, bar])
  scene._bossPhaseHud = c
  scene._bossPhaseText = phase
  scene._bossPhaseBar = bar
  scene._bossMeta = meta
  scene._bossPhase = 1
}

function setPhase(scene, next) {
  if (!scene._bossMeta || next <= scene._bossPhase) return
  scene._bossPhase = next
  const copy = next === 2 ? 'PHASE 2 / 猛追' : 'PHASE 3 / 最終攻防'
  scene._bossPhaseText?.setText(copy)
  scene._bossPhaseBar?.setDisplaySize(next === 2 ? 73 : 110, 8)
  scene.cameras.main.flash(next === 3 ? 220 : 140, 255, 216, 90, true)
  scene.cameras.main.shake(next === 3 ? 220 : 130, next === 3 ? 0.009 : 0.005)
  playSfx('boss')
  haptic(next === 3 ? [40, 30, 75] : [25, 25, 35])
  if (scene.battleState) {
    scene.battleState.nextRageAt = Math.min(scene.battleState.nextRageAt || Infinity, scene.time.now + (next === 3 ? 350 : 700))
    if (next === 3) scene.battleState.escape = Math.min(92, scene.battleState.escape + 6)
  }
}

export function installBossBattlePhases(GameScene) {
  if (GameScene.prototype.__ainanBossBattlePhasesInstalled) return
  GameScene.prototype.__ainanBossBattlePhasesInstalled = true
  const originalEnter = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    const result = originalEnter.apply(this, args)
    const meta = bossMeta(this)
    if (meta) buildBossHud(this, meta)
    return result
  }
  const originalUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (...args) {
    const result = originalUpdate?.apply(this, args)
    if (this.phase === 'battle' && this._bossMeta && this.battleState) {
      if (this.battleState.reel >= 88) setPhase(this, 3)
      else if (this.battleState.reel >= 68) setPhase(this, 2)
    }
    return result
  }
  const originalFinish = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (...args) { clearBossHud(this); return originalFinish.apply(this, args) }
  const originalCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) { clearBossHud(this); return originalCast.apply(this, args) }
  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) { clearBossHud(this); return originalCleanup.apply(this, args) }
}