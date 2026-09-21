import { getDailyScoreMod } from './retentionProgress.js'

export function installRetentionProgress(GameScene) {
  if (GameScene.prototype.__ainanRetentionProgressInstalled) return
  GameScene.prototype.__ainanRetentionProgressInstalled = true

  const originalCalcScore = GameScene.prototype.calcScore
  GameScene.prototype.calcScore = function (...args) {
    return Math.round(originalCalcScore.apply(this, args) * getDailyScoreMod(this.fish?.id))
  }

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (outcome, ...args) {
    const before = this.catches?.length ?? 0
    const result = originalFinishBattle.call(this, outcome, ...args)
    if (outcome === 'caught' && (this.catches?.length ?? 0) > before) {
      const item = this.catches[this.catches.length - 1]
      item.point = this.env?.point ?? item.point ?? 'pointA'
      item.season = this.env?.season ?? item.season ?? null
      item.timeOfDay = this.env?.timeOfDay ?? item.timeOfDay ?? null
      item.weather = this.env?.weather ?? item.weather ?? null
      localStorage.setItem('ainan_catches', JSON.stringify(this.catches))
    }
    return result
  }
}