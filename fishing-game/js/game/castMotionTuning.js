const freezePhase = phase => Object.freeze({
  offsetX: 0,
  offsetY: 0,
  bodyScale: 1,
  bodyAngleDeg: 0,
  rodAngleOffsetDeg: 0,
  ...phase,
})

const freezeProfile = profile => Object.freeze({
  ...profile,
  phases: Object.freeze(profile.phases.map(freezePhase)),
  camera: Object.freeze(profile.camera),
})

export const CAST_MOTION_PROFILES = Object.freeze({
  standard: freezeProfile({
    label: 'STANDARD',
    phases: [
      { id: 'ready', pose: 'idle', durationMs: 70, ease: 'Sine.easeOut' },
      { id: 'drawBack', pose: 'castMid', durationMs: 120, ease: 'Sine.easeIn', offsetX: -2, bodyAngleDeg: -2, rodAngleOffsetDeg: -5 },
      { id: 'charge', pose: 'castWindup', durationMs: 150, ease: 'Sine.easeOut', offsetX: -3, bodyAngleDeg: -4, rodAngleOffsetDeg: -9 },
      { id: 'swing', pose: 'castRelease', durationMs: 105, ease: 'Cubic.easeIn', offsetX: 3, offsetY: -1, bodyAngleDeg: 2, rodAngleOffsetDeg: 6 },
      { id: 'followThrough', pose: 'castRelease', durationMs: 180, ease: 'Back.easeOut', offsetX: 2, bodyAngleDeg: 1, rodAngleOffsetDeg: 10 },
    ],
    release: Object.freeze({ phase: 'swing', offsetMs: 48 }),
    camera: {
      panStartMs: 285,
      panDurationMs: 220,
      panDistancePx: 105,
      panEase: 'Sine.easeInOut',
      flightFollowAmount: 0.18,
      landingPanMs: 220,
      landingEase: 'Sine.easeOut',
    },
  }),
  charged: freezeProfile({
    label: 'CHARGE+',
    phases: [
      { id: 'ready', pose: 'idle', durationMs: 80, ease: 'Sine.easeOut' },
      { id: 'drawBack', pose: 'castMid', durationMs: 150, ease: 'Sine.easeIn', offsetX: -3, bodyAngleDeg: -3, rodAngleOffsetDeg: -7 },
      { id: 'charge', pose: 'castWindup', durationMs: 260, ease: 'Sine.easeOut', offsetX: -5, offsetY: 1, bodyAngleDeg: -5, rodAngleOffsetDeg: -12 },
      { id: 'swing', pose: 'castRelease', durationMs: 115, ease: 'Cubic.easeIn', offsetX: 4, offsetY: -2, bodyAngleDeg: 3, rodAngleOffsetDeg: 8 },
      { id: 'followThrough', pose: 'castRelease', durationMs: 210, ease: 'Back.easeOut', offsetX: 3, bodyAngleDeg: 1.5, rodAngleOffsetDeg: 12 },
    ],
    release: Object.freeze({ phase: 'swing', offsetMs: 52 }),
    camera: {
      panStartMs: 420,
      panDurationMs: 250,
      panDistancePx: 118,
      panEase: 'Sine.easeInOut',
      flightFollowAmount: 0.16,
      landingPanMs: 240,
      landingEase: 'Sine.easeOut',
    },
  }),
})

export const CAST_FLIGHT_TUNING = Object.freeze({
  baseMs: 620,
  distanceFactorMsPerPx: 0.42,
  minMs: 720,
  maxMs: 1080,
  ease: 'Quad.out',
})

export const CAST_MOTION_GLOBAL = Object.freeze({
  defaultProfile: 'standard',
  reducedMotionDurationScale: 0.48,
  playerDisplay: Object.freeze({ width: 150, height: 195 }),
  sourceFrame: Object.freeze({ width: 320, height: 420 }),
})

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function castMotionProfileName(search = typeof window === 'undefined' ? '' : window.location.search) {
  const requested = new URLSearchParams(search).get('castMotion')
  return CAST_MOTION_PROFILES[requested] ? requested : CAST_MOTION_GLOBAL.defaultProfile
}

export function resolveCastMotionProfile(search, reducedMotion = false) {
  const name = castMotionProfileName(search)
  const source = CAST_MOTION_PROFILES[name]
  const durationScale = reducedMotion ? CAST_MOTION_GLOBAL.reducedMotionDurationScale : 1
  const phases = source.phases.map(phase => ({
    ...phase,
    durationMs: Math.max(1, Math.round(phase.durationMs * durationScale)),
    bodyAngleDeg: reducedMotion ? 0 : phase.bodyAngleDeg,
    rodAngleOffsetDeg: reducedMotion ? phase.rodAngleOffsetDeg * 0.35 : phase.rodAngleOffsetDeg,
  }))
  const phaseStartMs = {}
  let totalMs = 0
  phases.forEach(phase => {
    phaseStartMs[phase.id] = totalMs
    totalMs += phase.durationMs
  })
  const releasePhase = phases.find(phase => phase.id === source.release.phase)
  const releaseEventMs = phaseStartMs[source.release.phase]
    + Math.min(releasePhase?.durationMs ?? 0, Math.round(source.release.offsetMs * durationScale))
  const camera = {
    ...source.camera,
    panStartMs: Math.round(source.camera.panStartMs * durationScale),
    panDurationMs: Math.round(source.camera.panDurationMs * durationScale),
    panDistancePx: reducedMotion ? source.camera.panDistancePx * 0.4 : source.camera.panDistancePx,
    flightFollowAmount: reducedMotion ? 0.52 : source.camera.flightFollowAmount,
  }
  return { name, label: source.label, phases, phaseStartMs, releaseEventMs, totalMs, camera }
}

export function castFlightDurationMs(distancePx) {
  const raw = CAST_FLIGHT_TUNING.baseMs + distancePx * CAST_FLIGHT_TUNING.distanceFactorMsPerPx
  return clamp(raw, CAST_FLIGHT_TUNING.minMs, CAST_FLIGHT_TUNING.maxMs)
}
