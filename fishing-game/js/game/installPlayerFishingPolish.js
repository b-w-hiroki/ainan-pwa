import { getBossMetaForScene, getBossVisual } from './bossVisuals.js'
import { isReducedMotion } from './feedback.js'

const FIGHT_KEY = 'ch_player_fight_anim'
const CATCH_KEY = 'ch_player_catch_anim'
const FIGHT_LOOP = 'ainan-player-fight-loop'

function clearReaction(scene) {
  scene._playerReactionTweens?.forEach(t => { t?.stop?.(); t?.destroy?.() })
  scene._playerReactionTweens = []
  scene._playerReactionInset?.destroy?.(true)
  scene._playerReactionInset = null
}

function clearResultPartner(scene) {
  scene._playerResultPartner?.destroy?.(true)
  scene._playerResultPartner = null
}

function panel(scene, { label, accent, boss = false, persistent = false } = {}) {
  clearReaction(scene)
  if (!scene.textures.exists(FIGHT_KEY)) return null

  const { width: W, height: H } = scene.scale
  const x = W - (boss ? 48 : 42)
  const y = boss ? 146 : 136
  const c = scene.add.container(x, y).setDepth(138).setScrollFactor(0)
  const bg = scene.add.graphics()
  const w = boss ? 82 : 72
  const h = boss ? 92 : 82
  bg.fillStyle(0x06283f, 0.90)
  bg.lineStyle(boss ? 3 : 2, accent ?? 0x5bb5d8, boss ? 0.95 : 0.70)
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18)
  bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18)
  bg.fillStyle(accent ?? 0x5bb5d8, boss ? 0.18 : 0.10)
  bg.fillRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, 24, 10)

  const sprite = scene.add.sprite(0, h * 0.14, FIGHT_KEY, 0)
    .setDisplaySize(boss ? 58 : 50, boss ? 66 : 58)
  const text = scene.add.text(0, -h / 2 + 20, label ?? 'HIT!', {
    fontFamily: 'M PLUS Rounded 1c, sans-serif',
    fontSize: boss ? '8px' : '8px',
    fontStyle: 'bold',
    color: boss ? '#ffd95a' : '#ffffff',
    letterSpacing: boss ? 1 : 0,
  }).setOrigin(0.5)

  c.add([bg, sprite, text])
  scene._playerReactionInset = c
  scene._playerReactionTweens = []

  if (scene.anims.exists(FIGHT_LOOP)) sprite.play(FIGHT_LOOP, true)
  if (!isReducedMotion()) {
    scene._playerReactionTweens.push(scene.tweens.add({
      targets: c,
      scaleX: boss ? 1.04 : 1.02,
      scaleY: boss ? 1.04 : 1.02,
      duration: boss ? 620 : 820,
      yoyo: true,
      repeat: persistent ? -1 : 1,
      ease: 'Sine.easeInOut',
    }))
  }

  if (!persistent) {
    scene.time.delayedCall(620, () => {
      if (scene._playerReactionInset === c) {
        scene.tweens.add({
          targets: c, alpha: 0, x: c.x + 12, duration: 180,
          onComplete: () => {
            if (scene._playerReactionInset === c) clearReaction(scene)
          },
        })
      }
    })
  }
  return c
}

function showHit(scene) {
  panel(scene, { label: 'HIT!', accent: 0x5bb5d8, persistent: false })
}

function showBattle(scene) {
  const meta = getBossMetaForScene(scene)
  const visual = meta ? getBossVisual(meta.id) : null
  panel(scene, {
    label: meta ? 'BOSS FIGHT' : 'REEL!',
    accent: visual?.accent ?? 0x5bb5d8,
    boss: Boolean(meta),
    persistent: true,
  })
}

function showResultPartner(scene) {
  clearResultPartner(scene)
  if (!scene.textures.exists(CATCH_KEY) || scene.phase !== 'result') return

  const { width: W, height: H } = scene.scale
  const boss = getBossMetaForScene(scene)
  const visual = boss ? getBossVisual(boss.id) : null
  const c = scene.add.container(W / 2 + 118, H / 2 - 30).setDepth(144).setScrollFactor(0).setAlpha(0)
  const panelBg = scene.add.graphics()
  panelBg.fillStyle(0x06283f, 0.86)
  panelBg.lineStyle(2, visual?.accent ?? 0x5bb5d8, 0.82)
  panelBg.fillRoundedRect(-36, -48, 72, 98, 16)
  panelBg.strokeRoundedRect(-36, -48, 72, 98, 16)
  const glow = scene.add.ellipse(0, 10, boss ? 64 : 58, boss ? 76 : 70, visual?.accent ?? 0x5bb5d8, boss ? 0.15 : 0.10)
  const sprite = scene.add.sprite(0, 18, CATCH_KEY, 5).setDisplaySize(boss ? 58 : 52, boss ? 68 : 62)
  const badge = scene.add.text(0, -35, boss ? 'BOSS!' : 'NICE!', {
    fontFamily: 'M PLUS Rounded 1c, sans-serif',
    fontSize: '9px',
    fontStyle: 'bold',
    color: boss ? '#ffd95a' : '#ffffff',
    backgroundColor: boss ? 'rgba(7,26,40,.86)' : 'rgba(47,158,212,.82)',
    padding: { x: 6, y: 3 },
  }).setOrigin(0.5)
  c.add([panelBg, glow, sprite, badge])
  scene._playerResultPartner = c

  scene.tweens.add({
    targets: c,
    x: c.x + 8,
    alpha: 1,
    duration: 280,
    ease: 'Back.easeOut',
  })
}

function qaPlayerState() {
  if (typeof window === 'undefined') return null
  const p = new URLSearchParams(window.location.search)
  if (p.get('qa') !== '1') return null
  const state = p.get('qaPlayer')
  return ['hit', 'battle', 'boss', 'result'].includes(state) ? state : null
}

export function installPlayerFishingPolish(GameScene) {
  if (GameScene.prototype.__ainanPlayerFishingPolishInstalled) return
  GameScene.prototype.__ainanPlayerFishingPolishInstalled = true

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    const qa = qaPlayerState()
    if (qa === 'hit') this.time.delayedCall(250, () => panel(this, { label: 'HIT!', accent: 0x5bb5d8, persistent: true }))
    if (qa === 'battle' || qa === 'boss') this.time.delayedCall(250, () => clearReaction(this))
    return result
  }

  const originalHit = GameScene.prototype._openHitWindow
  GameScene.prototype._openHitWindow = function (...args) {
    const result = originalHit.apply(this, args)
    showHit(this)
    return result
  }

  const originalBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    const result = originalBattle.apply(this, args)
    // Mock-first composition: the hooked fish owns the playfield. Keep the player out of persistent Battle UI.
    clearReaction(this)
    return result
  }

  const originalUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (...args) {
    const result = originalUpdate?.apply(this, args)
    if (qaPlayerState() === 'result' && this.phase === 'result' && !this._playerResultPartner) {
      showResultPartner(this)
    }
    return result
  }

    const originalFinish = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (outcome, ...args) {
    clearReaction(this)
    const result = originalFinish.call(this, outcome, ...args)
    if (outcome === 'caught') this.time.delayedCall(1060, () => showResultPartner(this))
    else clearResultPartner(this)
    return result
  }

  const originalCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    clearReaction(this)
    clearResultPartner(this)
    return originalCast.apply(this, args)
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    clearReaction(this)
    clearResultPartner(this)
    return originalCleanup.apply(this, args)
  }
}
