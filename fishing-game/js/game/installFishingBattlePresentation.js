import { ASSETS } from '../config/assetManifest.js'

const BATTLE_FISH_KEYS = {
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

function clearBattleHero(scene) {
  scene._battleHeroTween?.stop?.()
  scene._battleHeroTween?.destroy?.()
  scene._battleHeroTween = null
  scene._battleHeroFish?.destroy?.()
  scene._battleHeroFish = null
}

function buildBattleHero(scene) {
  clearBattleHero(scene)
  const key = BATTLE_FISH_KEYS[scene.fish?.id]
  if (!key || !scene.textures?.exists?.(key)) return null

  const rarity = scene.fish?.rarity ?? 'common'
  const width = rarity === 'legendary' ? 190 : rarity === 'rare' ? 176 : rarity === 'uncommon' ? 164 : 154
  const hero = scene.add.image(scene.scale.width * 0.50, 330, key)
    .setDisplaySize(width, width * 0.52)
    .setDepth(122)
    .setScrollFactor(0)
    .setAlpha(0.96)

  scene._battleHeroFish = hero
  scene._battleHeroTween = scene.tweens.add({
    targets: hero,
    y: hero.y - 6,
    angle: 3,
    duration: 900,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })
  return hero
}

function clearBattleScreenHero(scene) {
  scene._battleScreenHero?.destroy?.()
  scene._battleScreenHero = null
}

function buildBattleScreenHero(scene) {
  clearBattleScreenHero(scene)
  const key = ASSETS.fishingField?.fishShadowMediumIdle?.key
  if (key && scene.textures?.exists?.(key)) {
    scene._battleScreenHero = scene.add.image(scene.scale.width / 2, 330, key)
      .setDisplaySize(176, 88)
      .setDepth(54)
      .setScrollFactor(0)
      .setAlpha(0.94)
    return
  }

  const g = scene.add.graphics().setDepth(54).setScrollFactor(0)
  g.fillStyle(0x0b3046, 0.92)
  g.fillEllipse(scene.scale.width / 2, 330, 168, 76)
  g.fillTriangle(scene.scale.width / 2 + 70, 330, scene.scale.width / 2 + 112, 298, scene.scale.width / 2 + 112, 362)
  scene._battleScreenHero = g
}

function findBattleTarget(scene) {
  if (scene._targetFishGfx?.active) return scene._targetFishGfx
  const runtime = scene.bg?._fishRuntime?.find(item => item?.gfx?.active)
  if (!runtime) return null
  scene.bg?._fishTweens?.[runtime.index]?.stop?.()
  scene._targetFishIndex = runtime.index
  scene._targetFishGfx = runtime.gfx
  return runtime.gfx
}

function dimBackgroundFish(scene, target) {
  if (!scene._battleFishAlphaRestore) {
    scene._battleFishAlphaRestore = (scene.bg?._fishGfx ?? []).map(fish => ({ fish, alpha: fish?.alpha ?? 1 }))
  }
  scene._battleFishAlphaRestore.forEach(({ fish }) => {
    if (!fish?.active) return
    fish.setAlpha(fish === target ? 1 : 0.16)
  })
}

function restoreBackgroundFish(scene) {
  scene._battleFishAlphaRestore?.forEach(({ fish, alpha }) => fish?.active && fish.setAlpha(alpha))
  scene._battleFishAlphaRestore = null
}

function anchorBattleFish(scene, fish) {
  if (!fish?.active || scene.phase !== 'battle') return
  const cam = scene.cameras.main
  const t = scene.time.now / 1000
  const feel = scene.fish?.feel ?? {}
  const speed = feel.battleSpeed ?? 3.2
  const waveX = feel.battleWaveX ?? 12
  const waveY = feel.battleWaveY ?? 7
  const screenX = scene.scale.width * 0.48 + Math.sin(t * speed) * waveX
  const screenY = 330 + Math.sin(t * (speed + 0.9)) * waveY
  fish.setPosition(cam.scrollX + screenX, cam.scrollY + screenY)
  fish.setAngle(Math.sin(t * (speed + 0.5)) * Math.min(8, 3 + waveX * 0.16) * (fish.scaleX < 0 ? -1 : 1))
}

function emphasizeBattleFish(scene, fish) {
  if (!fish) return
  const image = fish._assetImage
  if (image && !scene._battleFishRestore) {
    scene._battleFishRestore = {
      fish,
      image,
      width: image.displayWidth,
      height: image.displayHeight,
      depth: fish.depth,
    }
  }

  const rarity = scene.fish?.rarity ?? 'common'
  const width = rarity === 'legendary' ? 180 : rarity === 'rare' ? 164 : rarity === 'uncommon' ? 148 : 136
  const scale = scene.fish?.feel?.battleScale ?? 1
  if (image) image.setDisplaySize(width * scale, width * 0.5 * scale)
  fish.setDepth(33).setAlpha(1)
  fish._followWake?.setAlpha?.(0)
  dimBackgroundFish(scene, fish)
  anchorBattleFish(scene, fish)
}

function restoreBattleFish(scene) {
  const restore = scene._battleFishRestore
  if (restore?.image?.active) restore.image.setDisplaySize(restore.width, restore.height)
  if (restore?.fish?.active) restore.fish.setDepth(restore.depth ?? 22).setAngle(0)
  scene._battleFishRestore = null
  restoreBackgroundFish(scene)
}

function enforceBattleComposition(scene) {
  if (scene.phase !== 'battle') return
  scene.retrieveCoach?.hide?.()
  scene.lineGfx?.clear?.()
  scene.bobber?.setVisible?.(false)
  scene._assetLureRipple?.setVisible?.(false)
  anchorBattleFish(scene, scene._targetFishGfx)
  dimBackgroundFish(scene, scene._targetFishGfx)
}

/**
 * Battle uses the same water world as Retrieve, but removes the lure-as-subject
 * composition. One enlarged hooked fish and one physical line own the field.
 */
export function installFishingBattlePresentation(GameScene) {
  if (GameScene.prototype.__ainanFishingBattlePresentationInstalled) return
  GameScene.prototype.__ainanFishingBattlePresentationInstalled = true

  const originalEnterBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    const targetBefore = findBattleTarget(this)
    const result = originalEnterBattle.apply(this, args)
    const target = this._targetFishGfx?.active ? this._targetFishGfx : targetBefore
    emphasizeBattleFish(this, target)
    buildBattleHero(this)
    if (target?.active) target.setAlpha?.(0.18)
    enforceBattleComposition(this)
    if (this.phase === 'battle' && !this._battleScreenHero?.active) buildBattleScreenHero(this)
    return result
  }

  const originalUpdate = GameScene.prototype.update
  GameScene.prototype.update = function (...args) {
    // Anchor before the legacy Battle continuity line is drawn so the line and
    // fish read as one interaction in the same frame.
    if (this.phase === 'battle') anchorBattleFish(this, this._targetFishGfx)
    const result = originalUpdate?.apply(this, args)
    enforceBattleComposition(this)
    return result
  }

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (...args) {
    clearBattleHero(this)
    restoreBattleFish(this)
    return originalFinishBattle.apply(this, args)
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    clearBattleHero(this)
    restoreBattleFish(this)
    return originalEnterCast.apply(this, args)
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    clearBattleHero(this)
    restoreBattleFish(this)
    return originalCleanup.apply(this, args)
  }
}
