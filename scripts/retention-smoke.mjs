import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

class MemoryStorage {
  constructor() { this.map = new Map() }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null }
  setItem(key, value) { this.map.set(key, String(value)) }
  removeItem(key) { this.map.delete(key) }
  clear() { this.map.clear() }
}
globalThis.localStorage = new MemoryStorage()

const progress = await import('../fishing-game/js/game/progress.js')
const retention = await import('../fishing-game/js/game/retentionProgress.js')
const save = await import('../fishing-game/js/game/saveSystem.js')

const now = new Date(2026, 8, 20, 12, 0, 0)
const focusA = retention.getDailyFocus(now)
const focusB = retention.getDailyFocus(now)
assert.equal(focusA.fishId, focusB.fishId, 'daily focus should be deterministic')
assert.equal(retention.getDailyScoreMod(focusA.fishId, now), 1.15)

const catches = [
  { fishId: focusA.fishId, sizeCm: 62, point: 'pointA', season: 'autumn', timeOfDay: 'noon', weather: 'sunny', score: 100, timestamp: now.getTime() },
  { fishId: focusA.fishId, sizeCm: 38, point: 'pointA', season: 'autumn', timeOfDay: 'noon', weather: 'sunny', score: 100, timestamp: now.getTime() + 1000 },
]
localStorage.setItem('ainan_catches', JSON.stringify(catches))
const daily = retention.getDailyChallengeState(now)
assert.equal(daily.focusTask.done, true)
assert.equal(daily.bigTask.done, true)
assert.equal(retention.claimDailyChallenge('focus', now), true)
assert.equal(retention.claimDailyChallenge('big', now), true)

const record = retention.getFishRecord(focusA.fishId)
assert.equal(record.count, 2)
assert.equal(record.best.sizeCm, 62)
assert.ok(record.places.includes('pointA'))

localStorage.setItem('ainan_catches', JSON.stringify(Array.from({ length: 10 }, (_, i) => ({ fishId: 'aji', sizeCm: 25 + i, score: 80, timestamp: now.getTime() + i }))))
const catch10 = retention.getAchievementStates().find(item => item.id === 'catch10')
assert.equal(catch10.done, true)
assert.equal(retention.claimAchievement('catch10'), true)
assert.ok(retention.getUnlockedTitles().includes('港の常連'))

progress.setScore(1234)
assert.equal(save.backupSave(), true)
progress.setScore(2345)
assert.equal(save.backupSave(), true)
progress.setScore(3456)
assert.equal(save.backupSave(), true)
assert.equal(save.getBackupSummaries().filter(item => item.valid).length, 3)
assert.equal(save.restoreBackup(2), true)
assert.equal(progress.getScore(), 2345)

const exported = save.exportSaveData()
progress.setScore(9999)
assert.equal(save.importSaveData(exported), true)
assert.equal(progress.getScore(), 2345)
const corrupt = JSON.parse(exported)
corrupt.data.ainan_score = '1'
assert.equal(save.importSaveData(JSON.stringify(corrupt)), false, 'checksum should reject corrupted imports')

const mainSource = readFileSync(new URL('../fishing-game/js/main.js', import.meta.url), 'utf8')
const homeSource = readFileSync(new URL('../fishing-game/js/scenes/HomeScene.js', import.meta.url), 'utf8')
const townSource = readFileSync(new URL('../fishing-game/js/scenes/TownScene.js', import.meta.url), 'utf8')
const bossSource = readFileSync(new URL('../fishing-game/js/game/installBossBattlePhases.js', import.meta.url), 'utf8')
for (const scene of ['DailyScene', 'AchievementScene']) assert.ok(mainSource.includes(scene), scene + ' must be registered')
assert.ok(homeSource.includes('_buildRetentionStrip'), 'home must surface onboarding and daily focus')
assert.ok(townSource.includes('_serviceDistrict'), 'town must render service district')
assert.ok(bossSource.includes('PHASE 3 / 最終攻防'), 'boss battle should have three phases')

console.log('Retention smoke QA passed')
console.log('  daily focus:', focusA.fishName)
console.log('  achievements / titles: OK')
console.log('  3-generation backup / checksum / import-export: OK')