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
    if (action === 'idle') return 1.52
    if (action === 'slowReel') return 0.78
    return 0.58
  }
  if (prefer === 'twitch') {
    if (action === 'twitch') return 1.60
    if (action === 'slowReel') return 0.78
    return 0.50
  }
  if (prefer === 'slow') {
    if (action === 'slowReel') return 1.52
    if (action === 'twitch') return 0.92
    return 0.58
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

export function updateFishInterest(runtime, ctx) {
  const fish = runtime.fishDef
  const profile = fish.retrieve ?? {
    prefer: 'mixed', idealAppeal: [0.3, 0.7], caution: 0.2, biteThreshold: 82,
  }
  const dist = ctx.distance
  const distFactor = distanceFactor(dist)

  if (distFactor <= 0) {
    runtime.interest = clamp(runtime.interest - 4.2, 0, 100)
  } else {
    const actionMod = actionPreference(profile.prefer, ctx.action)
    const baitMod = baitFactor(fish, ctx.baitType)
    const envMod = environmentFactor(fish, ctx.env)
    const appealMod = appealFactor(profile, ctx.appeal)
    const townMod = clamp(ctx.townAttractMod ?? 1, 0.8, 1.6)
    const cautionPenalty = (profile.caution ?? 0.2) * Math.max(0, ctx.appeal - 0.78) * 8
    const gain = 4.6 * distFactor * actionMod * baitMod * envMod * appealMod * townMod
    runtime.interest = clamp(runtime.interest + gain - cautionPenalty, 0, 100)
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
