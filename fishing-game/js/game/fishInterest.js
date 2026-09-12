const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

export const FISH_INTEREST_STATE = {
  CRUISE: 'cruise',
  NOTICED: 'noticed',
  FOLLOW: 'follow',
  INSPECT: 'inspect',
  BITE_READY: 'biteReady',
}

function distanceFactor(distance) {
  if (distance <= 60) return 1
  if (distance <= 120) return 0.72
  if (distance <= 180) return 0.36
  return 0
}

function actionPreference(prefer, action) {
  if (prefer === 'mixed') {
    if (action === 'twitch') return 1.28
    if (action === 'slowReel') return 1.18
    return 0.94
  }
  if (prefer === 'stop') {
    if (action === 'idle') return 1.58
    if (action === 'slowReel') return 0.70
    return 0.42
  }
  if (prefer === 'twitch') {
    if (action === 'twitch') return 1.66
    if (action === 'slowReel') return 0.68
    return 0.38
  }
  if (prefer === 'slow') {
    if (action === 'slowReel') return 1.58
    if (action === 'twitch') return 0.82
    return 0.44
  }
  return 1
}

function baitFactor(fish, baitType) {
  if (baitType === 'special') return fish.rarity === 'legendary' ? 1.35 : 1.10
  if (baitType === 'shrimp') return fish.rarity === 'rare' || fish.rarity === 'uncommon' ? 1.18 : 1.0
  return 1
}

function environmentFactor(fish, env) {
  const season = fish.seasonBonus?.[env.season] ?? 1
  const time = fish.timeBonus?.[env.timeOfDay] ?? 1
  const weather = fish.weatherBonus?.[env.weather] ?? 1
  return clamp((season + time + weather) / 3, 0.65, 1.40)
}

function appealFactor(profile, appeal) {
  const [min, max] = profile.idealAppeal ?? [0.3, 0.7]
  if (appeal >= min && appeal <= max) return 1.18
  const gap = appeal < min ? min - appeal : appeal - max
  return clamp(1 - gap * 1.35, 0.48, 1)
}

function updateStimulation(runtime, action, appeal) {
  const current = runtime.stimulation ?? 0
  let next = current
  if (action === 'twitch') next += 0.11
  else if (action === 'slowReel') next += 0.025
  else next -= 0.075
  if (appeal > 0.82) next += (appeal - 0.82) * 0.20
  runtime.stimulation = clamp(next, 0, 1.35)
  return runtime.stimulation
}

export function updateFishInterest(runtime, ctx) {
  const fish = runtime.fishDef
  const profile = fish.retrieve ?? {
    prefer: 'mixed', idealAppeal: [0.3, 0.7], caution: 0.2, biteThreshold: 82,
  }
  const dist = ctx.distance
  const distFactor = distanceFactor(dist)
  const caution = profile.caution ?? 0.2
  const stimulation = updateStimulation(runtime, ctx.action, ctx.appeal)
  const spookThreshold = 1.15 - caution * 0.45
  runtime.spooked = false

  if (distFactor <= 0) {
    runtime.interest = clamp(runtime.interest - 4.2, 0, 100)
    runtime.stimulation = clamp(stimulation - 0.05, 0, 1.35)
  } else if (dist <= 155 && stimulation >= spookThreshold) {
    // 近距離でルアーを動かし過ぎると、警戒心の強い魚ほど見切りやすい。
    runtime.interest = clamp(runtime.interest - (10 + caution * 16), 0, 100)
    runtime.spooked = true
  } else {
    const actionMod = actionPreference(profile.prefer, ctx.action)
    const baitMod = baitFactor(fish, ctx.baitType)
    const envMod = environmentFactor(fish, ctx.env)
    const appealMod = appealFactor(profile, ctx.appeal)
    const townMod = clamp(ctx.townAttractMod ?? 1, 0.8, 1.6)
    const cautionPenalty = caution * Math.max(0, ctx.appeal - 0.78) * 8

    // 好みと逆の操作を続けても時間経過だけで食わないよう、近距離では明確な見切りを入れる。
    const mismatchPenalty = dist <= 120 && actionMod < 0.72
      ? (0.72 - actionMod) * (7.5 + caution * 5)
      : 0
    const gain = 4.6 * distFactor * actionMod * baitMod * envMod * appealMod * townMod
    runtime.interest = clamp(runtime.interest + gain - cautionPenalty - mismatchPenalty, 0, 100)
  }

  const biteThreshold = profile.biteThreshold ?? 82
  let next = FISH_INTEREST_STATE.CRUISE
  if (runtime.interest >= biteThreshold) next = FISH_INTEREST_STATE.BITE_READY
  else if (runtime.interest >= 70) next = FISH_INTEREST_STATE.INSPECT
  else if (runtime.interest >= 45) next = FISH_INTEREST_STATE.FOLLOW
  else if (runtime.interest >= 20) next = FISH_INTEREST_STATE.NOTICED

  runtime.state = next
  runtime.lastDistance = dist
  return next
}

export function fishReactionSymbol(state) {
  if (state === FISH_INTEREST_STATE.NOTICED) return '!'
  if (state === FISH_INTEREST_STATE.FOLLOW) return '›'
  if (state === FISH_INTEREST_STATE.INSPECT) return '…'
  if (state === FISH_INTEREST_STATE.BITE_READY) return '✦'
  return ''
}
