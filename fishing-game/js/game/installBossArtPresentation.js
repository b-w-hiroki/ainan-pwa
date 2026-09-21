import { FISH_LIST } from './fish.js'
import { BOSS_META } from './midgameProgression.js'
import { getBossMetaForScene, getBossVisual } from './bossVisuals.js'
import { isReducedMotion } from './feedback.js'

function clearBossResult(scene) {
  scene._bossResultVisuals?.forEach(obj => obj?.destroy?.())
  scene._bossResultVisuals = []
  scene._bossResultTweens?.forEach(tw => { tw?.stop?.(); tw?.destroy?.() })
  scene._bossResultTweens = []
}

function clearBossBattleArt(scene) {
  const restore = scene._bossArtRestore
  if (restore?.image?.active) {
    if (restore.textureKey) restore.image.setTexture(restore.textureKey)
    restore.image.setDisplaySize(restore.width, restore.height)
  }
  scene._bossArtAura?.destroy?.()
  scene._bossArtAura = null
  scene._bossArtRestore = null
}

function applyBossBattleArt(scene) {
  const meta = getBossMetaForScene(scene)
  const visual = meta ? getBossVisual(meta.id) : null
  const art = visual?.asset
  const target = scene._targetFishGfx
  const image = target?._assetImage
  if (!meta || !art?.key || !image?.active || !scene.textures.exists(art.key)) return

  clearBossBattleArt(scene)
  const size = visual
  scene._bossArtRestore = {
    image,
    textureKey: image.texture?.key,
    width: image.displayWidth,
    height: image.displayHeight,
  }

  image.setTexture(art.key).setDisplaySize(...size.battleSize).setAlpha(1)
  target.setAlpha(1).setDepth(34)

  const aura = scene.add.graphics()
  aura.fillStyle(visual.accent, 0.13)
  aura.fillEllipse(0, 0, size.battleSize[0] * 1.12, size.battleSize[1] * 1.32)
  aura.lineStyle(3, visual.accent, 0.32)
  aura.strokeEllipse(0, 0, size.battleSize[0] * 1.03, size.battleSize[1] * 1.18)
  aura.lineStyle(3, visual.secondary, 0.22)
  aura.lineBetween(-size.battleSize[0] * 0.58, -28, size.battleSize[0] * 0.48, -28)
  aura.lineStyle(2, 0xffffff, 0.20)
  aura.lineBetween(-size.battleSize[0] * 0.52, 34, size.battleSize[0] * 0.44, 34)
  target.addAt?.(aura, 0)
  scene._bossArtAura = aura
}

function buildBossResult(scene, meta) {
  clearBossResult(scene)
  const visual = getBossVisual(meta.id)
  const art = visual?.asset
  if (!art?.key || !scene.textures.exists(art.key)) return
  const { width: W, height: H } = scene.scale
  const size = visual
  const objects = []
  const tweens = []

  if (scene._resultHeroFish?.active) {
    scene._resultHeroFish.setTexture(art.key).setDisplaySize(...size.resultSize).setAngle(0)
    scene._resultHeroFish.setY(H / 2 - 122)
  }

  scene.resLabel?.setText?.('BOSS CATCH')
  scene.resHint?.setText?.(meta.title + ' を制覇！')

  const glow = scene.add.ellipse(W / 2, H / 2 - 122, size.resultSize[0] * 1.2, size.resultSize[1] * 1.55, visual.accent, 0.12)
    .setDepth(128).setScrollFactor(0)
  objects.push(glow)

  const bannerBg = scene.add.graphics().setDepth(141).setScrollFactor(0)
  bannerBg.fillStyle(0x071a28, 0.94)
  bannerBg.lineStyle(2.5, visual.accent, 0.9)
  bannerBg.fillRoundedRect(W / 2 - 126, H / 2 - 264, 252, 48, 16)
  bannerBg.strokeRoundedRect(W / 2 - 126, H / 2 - 264, 252, 48, 16)
  objects.push(bannerBg)

  const top = scene.add.text(W / 2, H / 2 - 251, 'BOSS CATCH', {
    fontFamily: 'M PLUS Rounded 1c, sans-serif',
    fontSize: '10px', fontStyle: 'bold', color: '#ffd95a', letterSpacing: 2,
  }).setOrigin(0.5).setDepth(142).setScrollFactor(0)
  const title = scene.add.text(W / 2, H / 2 - 233, meta.title, {
    fontFamily: 'M PLUS Rounded 1c, sans-serif',
    fontSize: '14px', fontStyle: 'bold', color: '#ffffff',
  }).setOrigin(0.5).setDepth(142).setScrollFactor(0)
  objects.push(top, title)

  if (!isReducedMotion()) {
    tweens.push(scene.tweens.add({
      targets: glow,
      alpha: { from: 0.08, to: 0.20 },
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    }))
  }

  scene._bossResultVisuals = objects
  scene._bossResultTweens = tweens
}

function qaOverride(scene, data = {}) {
  if (typeof window === 'undefined') return data
  const params = new URLSearchParams(window.location.search)
  if (params.get('qa') !== '1') return data
  const directPoint = params.get('qaPoint')
  const id = params.get('qaBoss')
  const meta = id ? BOSS_META[id] : null
  if (meta) return { ...data, point: meta.pointId }
  if (['pointA', 'pointB', 'pointC'].includes(directPoint)) return { ...data, point: directPoint }
  return data
}

function qaForceFish(scene) {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  if (params.get('qa') !== '1') return
  const id = params.get('qaBoss')
  const meta = id ? BOSS_META[id] : null
  if (!meta) return
  const fish = FISH_LIST.find(item => item.id === meta.fishId)
  if (fish) scene.fish = fish
}

export function installBossArtPresentation(GameScene) {
  if (GameScene.prototype.__ainanBossArtPresentationInstalled) return
  GameScene.prototype.__ainanBossArtPresentationInstalled = true

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (data = {}, ...args) {
    const result = originalCreate.call(this, qaOverride(this, data), ...args)
    qaForceFish(this)
    return result
  }

  const originalEnter = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    const result = originalEnter.apply(this, args)
    applyBossBattleArt(this)
    return result
  }

  const originalUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (...args) {
    const result = originalUpdate?.apply(this, args)
    if (this.phase === 'battle' && this._bossArtAura) {
      const phase = this._bossPhase ?? 1
      this._bossArtAura.setScale(phase === 3 ? 1.12 : phase === 2 ? 1.06 : 1)
      this._bossArtAura.setAlpha(phase === 3 ? 1 : phase === 2 ? 0.88 : 0.72)
    }
    return result
  }

  const originalFinish = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (outcome, ...args) {
    const meta = getBossMetaForScene(this)
    const result = originalFinish.call(this, outcome, ...args)
    clearBossBattleArt(this)
    if (outcome === 'caught' && meta) this.time.delayedCall(0, () => buildBossResult(this, meta))
    return result
  }

  const originalCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    clearBossBattleArt(this)
    clearBossResult(this)
    return originalCast.apply(this, args)
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    clearBossBattleArt(this)
    clearBossResult(this)
    return originalCleanup.apply(this, args)
  }
}
