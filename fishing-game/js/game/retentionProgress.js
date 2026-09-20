import { FISH_META, getCatches, getGems, getScore, getTownFacilities, getTownSummary, setGems, setScore } from './progress.js'
import { FISH_LIST, calcFishWeight } from './fish.js'
import { getWorldConditions } from './worldConditions.js'
import { getBossStates, getRodLevels } from './midgameProgression.js'

const readJson = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fallback)) } catch { return fallback }
}
const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value))

export const ONBOARDING_STEPS = [
  { id: 'fish', title: 'まず1匹釣ろう', desc: '釣り場へ行き、キャスト→誘い→HIT→釣果まで体験', scene: 'MapScene' },
  { id: 'town', title: '釣果を町へ', desc: '町おこし画面で施設と次の海を確認', scene: 'TownScene' },
  { id: 'service', title: '魚を町で活かそう', desc: '魚市場Lv.2で魚屋が開き、釣果を売れる', scene: 'HarborServicesScene' },
  { id: 'workshop', title: '工房で強くなろう', desc: '釣果素材を使い、竿やアクセサリを育成', scene: 'WorkshopScene' },
  { id: 'boss', title: '海の主へ挑戦', desc: '大物挑戦でエリアボスの記録サイズを狙う', scene: 'ChallengeScene' },
]

export function getOnboardingState() {
  const catches = getCatches()
  const facilities = getTownFacilities()
  const bosses = Object.values(getBossStates())
  const done = {
    fish: catches.length >= 1,
    town: localStorage.getItem('ainan_seen_town') === '1',
    service: localStorage.getItem('ainan_seen_services') === '1' || (facilities.market ?? 0) >= 2,
    workshop: localStorage.getItem('ainan_seen_workshop') === '1',
    boss: bosses.some(item => item.cleared),
  }
  const skipped = localStorage.getItem('ainan_onboarding_skipped') === '1'
  const currentIndex = ONBOARDING_STEPS.findIndex(step => !done[step.id])
  return {
    steps: ONBOARDING_STEPS.map((step, index) => ({ ...step, done: !!done[step.id], index })),
    current: currentIndex >= 0 ? ONBOARDING_STEPS[currentIndex] : null,
    completed: currentIndex < 0,
    skipped,
    doneCount: Object.values(done).filter(Boolean).length,
  }
}

export function skipOnboarding() {
  localStorage.setItem('ainan_onboarding_skipped', '1')
}

function dayKey(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

function catchesToday(date = new Date()) {
  const key = dayKey(date)
  return getCatches().filter(item => dayKey(new Date(item.timestamp ?? 0)) === key)
}

export function getDailyFocus(date = new Date()) {
  const env = getWorldConditions(date)
  const candidates = FISH_LIST.filter(fish => fish.id !== 'kue')
    .map(fish => ({ fish, weight: calcFishWeight(fish, { ...env, player: { baitType: 'worm' } }) }))
    .sort((a, b) => b.weight - a.weight)
  const seed = date.getFullYear() * 372 + (date.getMonth() + 1) * 31 + date.getDate()
  const pool = candidates.slice(0, Math.min(5, candidates.length))
  const selected = pool[seed % pool.length]?.fish ?? FISH_LIST[0]
  return {
    key: dayKey(date),
    fishId: selected.id,
    fishName: selected.name,
    rarity: selected.rarity,
    scoreBonus: 1.15,
    conditions: env,
  }
}

export function getDailyChallengeState(date = new Date()) {
  const focus = getDailyFocus(date)
  const catches = catchesToday(date)
  const focusCount = catches.filter(item => item.fishId === focus.fishId).length
  const biggest = catches.reduce((best, item) => Math.max(best, item.sizeCm ?? 0), 0)
  const claimed = readJson('ainan_daily_challenge_claimed', {})
  return {
    focus,
    focusTask: {
      id: 'focus',
      title: focus.fishName + 'を2匹釣る',
      progress: Math.min(2, focusCount),
      target: 2,
      done: focusCount >= 2,
      claimed: !!claimed[focus.key + ':focus'],
      rewardScore: 300,
      rewardGems: 0,
    },
    bigTask: {
      id: 'big',
      title: '60cm以上を釣る',
      progress: Math.min(60, biggest),
      target: 60,
      done: biggest >= 60,
      claimed: !!claimed[focus.key + ':big'],
      rewardScore: 0,
      rewardGems: 1,
    },
  }
}

export function claimDailyChallenge(taskId, date = new Date()) {
  const state = getDailyChallengeState(date)
  const task = taskId === 'big' ? state.bigTask : state.focusTask
  if (!task.done || task.claimed) return false
  const claimed = readJson('ainan_daily_challenge_claimed', {})
  claimed[state.focus.key + ':' + task.id] = true
  writeJson('ainan_daily_challenge_claimed', claimed)
  if (task.rewardScore) setScore(getScore() + task.rewardScore)
  if (task.rewardGems) setGems(getGems() + task.rewardGems)
  return true
}

export function getDailyScoreMod(fishId, date = new Date()) {
  return getDailyFocus(date).fishId === fishId ? 1.15 : 1
}

export const ACHIEVEMENT_META = [
  { id: 'catch10', title: '港の常連', desc: '魚を10匹釣る', target: 10, rewardScore: 300, titleReward: '港の常連' },
  { id: 'catch50', title: '百戦錬磨への道', desc: '魚を50匹釣る', target: 50, rewardScore: 800, titleReward: '熟練の釣り人' },
  { id: 'species9', title: '海の博物学者', desc: '9魚種すべて発見', target: 9, rewardGems: 2, titleReward: '海の博物学者' },
  { id: 'big100', title: 'メーターオーバー', desc: '100cm以上を釣る', target: 100, rewardGems: 1, titleReward: '大物師' },
  { id: 'boss3', title: '三海制覇', desc: '3エリアのボス記録達成', target: 3, rewardGems: 3, titleReward: '三海の覇者' },
  { id: 'town20', title: '港町プロデューサー', desc: '施設Lv合計20', target: 20, rewardScore: 1200, titleReward: '港町プロデューサー' },
  { id: 'rod15', title: '道具を極めし者', desc: '3本の竿をLv.5', target: 15, rewardScore: 1000, titleReward: '匠の釣り師' },
]

function achievementValue(id) {
  const catches = getCatches()
  if (id === 'catch10' || id === 'catch50') return catches.length
  if (id === 'species9') return new Set(catches.map(item => item.fishId)).size
  if (id === 'big100') return catches.reduce((max, item) => Math.max(max, item.sizeCm ?? 0), 0)
  if (id === 'boss3') return Object.values(getBossStates()).filter(item => item.cleared).length
  if (id === 'town20') return getTownSummary().totalLevel
  if (id === 'rod15') return Object.values(getRodLevels()).reduce((sum, lv) => sum + lv, 0)
  return 0
}

export function getAchievementStates() {
  const claimed = readJson('ainan_achievement_claimed', {})
  return ACHIEVEMENT_META.map(meta => {
    const value = achievementValue(meta.id)
    return { ...meta, value, done: value >= meta.target, claimed: !!claimed[meta.id] }
  })
}

export function claimAchievement(id) {
  const state = getAchievementStates().find(item => item.id === id)
  if (!state?.done || state.claimed) return false
  const claimed = readJson('ainan_achievement_claimed', {})
  claimed[id] = true
  writeJson('ainan_achievement_claimed', claimed)
  if (state.rewardScore) setScore(getScore() + state.rewardScore)
  if (state.rewardGems) setGems(getGems() + state.rewardGems)
  const titles = readJson('ainan_unlocked_titles', [])
  if (state.titleReward && !titles.includes(state.titleReward)) titles.push(state.titleReward)
  writeJson('ainan_unlocked_titles', titles)
  if (!localStorage.getItem('ainan_selected_title') && state.titleReward) localStorage.setItem('ainan_selected_title', state.titleReward)
  return true
}

export function getUnlockedTitles() {
  return readJson('ainan_unlocked_titles', [])
}

export function getSelectedTitle() {
  return localStorage.getItem('ainan_selected_title') || getUnlockedTitles()[0] || null
}

export function selectTitle(title) {
  if (!getUnlockedTitles().includes(title)) return false
  localStorage.setItem('ainan_selected_title', title)
  return true
}

export function getFishRecord(fishId) {
  const catches = getCatches().filter(item => item.fishId === fishId)
  if (!catches.length) return null
  const first = [...catches].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))[0]
  const best = catches.reduce((current, item) => (item.sizeCm ?? 0) > (current?.sizeCm ?? 0) ? item : current, null)
  const bestScore = catches.reduce((max, item) => Math.max(max, item.score ?? 0), 0)
  const places = [...new Set(catches.map(item => item.point).filter(Boolean))]
  const conditions = [...new Set(catches.map(item => [item.season, item.timeOfDay, item.weather].filter(Boolean).join('/')).filter(Boolean))]
  return { count: catches.length, first, best, bestScore, places, conditions }
}

export function markServicesSeen() { localStorage.setItem('ainan_seen_services', '1') }
export function markWorkshopSeen() { localStorage.setItem('ainan_seen_workshop', '1') }
