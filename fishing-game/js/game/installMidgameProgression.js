import { BOSS_META, consumeMealUse, getActiveMeal, getProgressionBonuses, grantCatchLoot } from './midgameProgression.js'
import { backupSave } from './saveSystem.js'
import { haptic, playSfx, startAmbient, stopAmbient } from './feedback.js'

function bossForScene(scene) {
  return Object.values(BOSS_META).find(meta => meta.pointId === scene.env?.point && meta.fishId === scene.fish?.id) ?? null
}

export function installMidgameProgression(GameScene) {
  if (GameScene.prototype.__ainanMidgameProgressionInstalled) return
  GameScene.prototype.__ainanMidgameProgressionInstalled = true

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    this._sessionMeal = getActiveMeal()
    const result = originalCreate.apply(this, args)
    if (this._sessionMeal) consumeMealUse()
    this.input?.once?.('pointerdown', () => startAmbient('sea'))
    this.events?.once?.('shutdown', () => stopAmbient())
    return result
  }

  const originalSyncTackle = GameScene.prototype._syncTackle
  GameScene.prototype._syncTackle = function (...args) {
    const result = originalSyncTackle.apply(this, args)
    const bonus = getProgressionBonuses(this.rod?.id ?? this.env?.player?.rodType ?? 'basic', this._sessionMeal)
    this._midgameBonus = bonus
    if (this.rod) {
      this.rod.pullPower *= bonus.pullPowerMod
      this.rod.castRange *= bonus.castRangeMod
      this.rod.attractRadius *= bonus.attractRadiusMod
      this.castRangePx = Math.min(this.scale.height * 0.82, this.baseCastRangePx * this.rod.castRange)
    }
    if (this.bait) this.bait.biteRateBonus += bonus.biteRateBonus
    return result
  }

  const originalConsumeBait = GameScene.prototype._consumeBaitForCast
  GameScene.prototype._consumeBaitForCast = function (...args) {
    const baitId = this.env?.player?.baitType ?? 'worm'
    const current = this.env?.player?.inventory?.baits?.[baitId] ?? 0
    const chance = this._midgameBonus?.baitSaveChance ?? 0
    if (baitId !== 'worm' && current > 0 && chance > 0 && Math.random() < chance) {
      this.resultUI?.toast?.('バッグ効果：エサを節約！')
      return true
    }
    return originalConsumeBait.apply(this, args)
  }

  const originalCalcScore = GameScene.prototype.calcScore
  GameScene.prototype.calcScore = function (...args) {
    return Math.round(originalCalcScore.apply(this, args) * (this._midgameBonus?.scoreMod ?? 1))
  }

  const originalOpenHit = GameScene.prototype._openHitWindow
  GameScene.prototype._openHitWindow = function (...args) {
    const result = originalOpenHit.apply(this, args)
    playSfx('hit')
    haptic(this.fish?.rarity === 'legendary' ? [35, 45, 60] : 28)
    return result
  }

  const originalEnterBattle = GameScene.prototype._enterBattle
  GameScene.prototype._enterBattle = function (...args) {
    const result = originalEnterBattle.apply(this, args)
    const boss = bossForScene(this)
    if (boss) {
      playSfx('boss')
      haptic([40, 35, 80])
      this.resultUI?.toast?.(`AREA BOSS　${boss.title}`)
    }
    return result
  }

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (outcome, ...args) {
    const before = this.catches?.length ?? 0
    const result = originalFinishBattle.call(this, outcome, ...args)
    if (outcome === 'caught' && (this.catches?.length ?? 0) > before) {
      const lastCatch = this.catches[this.catches.length - 1]
      const loot = grantCatchLoot(this.fish, lastCatch, this.env?.point)
      playSfx(this.fish?.rarity === 'legendary' ? 'legend' : 'catch')
      haptic(this.fish?.rarity === 'legendary' ? [60, 40, 90] : [30, 35, 45])
      const materialText = Object.entries(loot?.grants ?? {}).map(([id, qty]) => `${id}+${qty}`).join(' / ')
      if (materialText) this.resHint?.setText?.(`素材GET: ${materialText}　町へ持ち帰ろう`)
      if (loot?.boss) this.resLabel?.setText?.('★ BOSS RECORD ★')
      backupSave()
    } else if (outcome !== 'caught') {
      playSfx('escape')
      haptic(45)
    }
    return result
  }
}

export function installTownSensoryFeedback(TownScene, HomeScene) {
  if (!TownScene.prototype.__ainanTownSensoryInstalled) {
    TownScene.prototype.__ainanTownSensoryInstalled = true
    const originalUpgrade = TownScene.prototype._upgrade
    TownScene.prototype._upgrade = function (...args) {
      playSfx('townUp')
      haptic([25, 25, 45])
      return originalUpgrade.apply(this, args)
    }
  }

  if (!HomeScene.prototype.__ainanHomeAmbientInstalled) {
    HomeScene.prototype.__ainanHomeAmbientInstalled = true
    const originalCreate = HomeScene.prototype.create
    HomeScene.prototype.create = function (...args) {
      const result = originalCreate.apply(this, args)
      this.input?.once?.('pointerdown', () => startAmbient('harbor'))
      this.events?.once?.('shutdown', () => stopAmbient())
      return result
    }
  }
}
