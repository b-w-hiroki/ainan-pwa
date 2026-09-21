import { BOSS_META, getBossStates } from './midgameProgression.js'
import { getBossMetaForScene, getBossVisual } from './bossVisuals.js'
import { haptic, isReducedMotion, playSfx } from './feedback.js'

const PERSONALITY = {
  harborRunner: { label: 'SPEED', sub: '高速で海面を切り裂く', motion: 'runner' },
  bayHunter: { label: 'HUNTER', sub: '急な切り返しで揺さぶる', motion: 'hunter' },
  kue: { label: 'HEAVY', sub: '深場から重量で押し返す', motion: 'heavy' },
}

function qaPersistentEncounter() {
  if (typeof window === 'undefined') return false
  const p = new URLSearchParams(window.location.search)
  return p.get('qa') === '1' && p.get('qaEncounter') === '1'
}

function clearEncounter(scene) {
  scene._bossEncounterTweens?.forEach(t => { t?.stop?.(); t?.destroy?.() })
  scene._bossEncounterTweens = []
  scene._bossEncounterCutin?.destroy?.(true)
  scene._bossEncounterCutin = null
}

function showEncounter(scene, meta) {
  clearEncounter(scene)
  const visual = getBossVisual(meta.id)
  const art = visual?.asset
  const profile = PERSONALITY[meta.id] ?? PERSONALITY.harborRunner
  const { width: W, height: H } = scene.scale
  const c = scene.add.container(W / 2, H * 0.33).setDepth(205).setScrollFactor(0).setAlpha(0)
  const scrim = scene.add.rectangle(0, H * 0.17, W, H, 0x03111c, 0.64)
  const band = scene.add.graphics()
  band.fillStyle(0x061b2c, 0.97)
  band.lineStyle(3, visual?.accent ?? 0xff765a, 0.98)
  band.fillRoundedRect(-W / 2 + 14, -92, W - 28, 184, 26)
  band.strokeRoundedRect(-W / 2 + 14, -92, W - 28, 184, 26)
  band.fillStyle(visual?.accent ?? 0xff765a, 0.12)
  band.fillRoundedRect(-W / 2 + 26, -80, W - 52, 160, 22)

  const kicker = scene.add.text(-W / 2 + 40, -67, 'BOSS ENCOUNTER', {
    fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '11px', fontStyle: 'bold',
    color: '#ffd95a', letterSpacing: 2,
  })
  const title = scene.add.text(-W / 2 + 40, -39, meta.title, {
    fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: meta.id === 'kue' ? '27px' : '24px',
    fontStyle: 'bold', color: '#ffffff',
  })
  const trait = scene.add.text(-W / 2 + 40, 46, profile.label + '  /  ' + profile.sub, {
    fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '10px', fontStyle: 'bold',
    color: '#dff5ff',
  })

  const artImg = art?.key && scene.textures.exists(art.key)
    ? scene.add.image(W / 2 - 105, 6, art.key).setDisplaySize(meta.id === 'kue' ? 186 : 172, meta.id === 'kue' ? 115 : 105)
    : null

  const speed = scene.add.graphics()
  for (let i = 0; i < 5; i++) {
    speed.lineStyle(2 + (i % 2), i % 2 ? 0xffffff : (visual?.secondary ?? 0xffd95a), 0.20)
    speed.lineBetween(-W / 2 + 36, 70 + i * 8, W / 2 - 38 - i * 13, 70 + i * 8)
  }

  c.add([scrim, band, speed, kicker, title, trait])
  if (artImg) c.add(artImg)
  scene._bossEncounterCutin = c
  scene._bossEncounterTweens = []
  scene.cameras.main.flash(180, 255, 230, 170, true)
  scene.cameras.main.shake(180, meta.id === 'kue' ? 0.010 : 0.006)
  playSfx('boss')
  haptic(meta.id === 'kue' ? [45, 35, 80] : [30, 25, 45])

  if (isReducedMotion()) {
    c.setAlpha(1)
  } else {
    c.setX(W / 2 + 36)
    scene._bossEncounterTweens.push(scene.tweens.add({
      targets: c, x: W / 2, alpha: 1, duration: 220, ease: 'Back.easeOut',
    }))
    if (artImg) {
      const sy = artImg.scaleY
      scene._bossEncounterTweens.push(scene.tweens.add({
        targets: artImg, scaleX: artImg.scaleX * 1.04, scaleY: sy * 1.04,
        duration: 620, yoyo: true, repeat: qaPersistentEncounter() ? -1 : 1, ease: 'Sine.easeInOut',
      }))
    }
  }

  if (!qaPersistentEncounter()) {
    scene.time.delayedCall(950, () => {
      if (!scene._bossEncounterCutin) return
      scene.tweens.add({
        targets: c, alpha: 0, y: c.y - 18, duration: 260,
        onComplete: () => clearEncounter(scene),
      })
    })
  }
}

function applyPersonality(scene) {
  const meta = scene._bossEventMeta
  const target = scene._targetFishGfx
  if (!meta || !target?.active || scene.phase !== 'battle') return
  const t = scene.time.now / 1000
  const phase = scene._bossPhase ?? 1
  const intensity = phase === 3 ? 1.5 : phase === 2 ? 1.22 : 1

  if (meta.id === 'harborRunner') {
    target.x += Math.sin(t * 7.6) * 13 * intensity
    target.y += Math.sin(t * 4.2) * 3
    target.setAngle(Math.sin(t * 6.8) * 5)
  } else if (meta.id === 'bayHunter') {
    const snap = Math.sign(Math.sin(t * 2.4))
    target.x += snap * 8 * intensity
    target.y += Math.sin(t * 5.1) * 8 * intensity
    target.setAngle(snap * 7 + Math.sin(t * 4) * 3)
  } else if (meta.id === 'kue') {
    target.x += Math.sin(t * 1.5) * 4
    target.y += Math.sin(t * 1.15) * 9 * intensity
    target.setAngle(Math.sin(t * 1.2) * 2.2)
    const pulse = 1 + Math.sin(t * 1.4) * 0.018
    target.setScale((target.scaleX < 0 ? -1 : 1) * Math.abs(target.scaleX) * pulse, target.scaleY * pulse)
  }
}

function clearResultBadge(scene) {
  scene._bossRecordBadge?.destroy?.(true)
  scene._bossRecordBadge = null
}

function showResultBadge(scene, meta, beforeBest, afterBest) {
  clearResultBadge(scene)
  const isNew = afterBest > beforeBest
  const first = beforeBest <= 0
  const { width: W, height: H } = scene.scale
  const y = H / 2 + 78
  const c = scene.add.container(W / 2, y).setDepth(146).setScrollFactor(0).setAlpha(0)
  const bg = scene.add.graphics()
  bg.fillStyle(first ? 0xffd95a : isNew ? 0xff765a : 0x173248, 0.96)
  bg.lineStyle(2, 0xffffff, 0.68)
  bg.fillRoundedRect(-120, -22, 240, 44, 15)
  bg.strokeRoundedRect(-120, -22, 240, 44, 15)
  const label = scene.add.text(0, -5, first ? '★ TROPHY UNLOCKED ★' : isNew ? '★ NEW RECORD ★' : 'BOSS CLEARED', {
    fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '12px', fontStyle: 'bold',
    color: first ? '#173248' : '#ffffff', letterSpacing: 1,
  }).setOrigin(0.5)
  const best = scene.add.text(0, 12, 'BEST  ' + afterBest + 'cm', {
    fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '10px', fontStyle: 'bold',
    color: first ? '#805b00' : '#fff4d2',
  }).setOrigin(0.5)
  c.add([bg, label, best])
  scene._bossRecordBadge = c
  scene.tweens.add({ targets: c, alpha: 1, y: y - 4, duration: 260, ease: 'Back.easeOut' })
  if (first || isNew) {
    playSfx(first ? 'legend' : 'catch')
    haptic(first ? [35, 30, 70, 30, 90] : [25, 20, 45])
  }
}

export function installBossEventPolish(GameScene) {
  if (GameScene.prototype.__ainanBossEventPolishInstalled) return
  GameScene.prototype.__ainanBossEventPolishInstalled = true

  const originalEnter = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    const result = originalEnter.apply(this, args)
    const meta = getBossMetaForScene(this)
    this._bossEventMeta = meta
    if (meta) showEncounter(this, meta)
    return result
  }

  const originalUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (...args) {
    const result = originalUpdate?.apply(this, args)
    applyPersonality(this)
    return result
  }

  const originalFinish = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (outcome, ...args) {
    const meta = this._bossEventMeta ?? getBossMetaForScene(this)
    const beforeState = meta ? getBossStates()[meta.id] : null
    const beforeBest = beforeState?.sizeCm ?? 0
    clearEncounter(this)
    const result = originalFinish.call(this, outcome, ...args)
    if (outcome === 'caught' && meta) {
      this.time.delayedCall(30, () => {
        const after = getBossStates()[meta.id]
        const afterBest = after?.sizeCm ?? beforeBest
        showResultBadge(this, meta, beforeBest, afterBest)
      })
    } else {
      clearResultBadge(this)
    }
    return result
  }

  const originalCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    clearEncounter(this)
    clearResultBadge(this)
    this._bossEventMeta = null
    return originalCast.apply(this, args)
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    clearEncounter(this)
    clearResultBadge(this)
    this._bossEventMeta = null
    return originalCleanup.apply(this, args)
  }
}
