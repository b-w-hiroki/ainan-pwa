// Presentation-only Battle Jump arc for the three reviewed pilot species.
// Does not change fish behaviour, rage length, reel progress, damage or catches.
// The same source hero texture stays in its existing CastPresentationHost owner.
const SPECIES = Object.freeze({
  aji: Object.freeze({ lift: 34, drift: 3 }),
  saba: Object.freeze({ lift: 43, drift: 5 }),
  kue: Object.freeze({ lift: 54, drift: 3 }),
})

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
const ease = t => t * t * (3 - 2 * t)

export const JUMP_CYCLE_MS = 960

export function battleJumpFrame(fishId, elapsedMs, reducedMotion = false) {
  if (!Object.hasOwn(SPECIES, fishId)) return null
  const species = SPECIES[fishId]
  const ms = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) % JUMP_CYCLE_MS : 0
  if (reducedMotion) return Object.freeze({
    phase: 'reduced-motion', liftY: 0, driftX: 0,
    angleDeg: -8, splashAlpha: 0.44,
  })
  let lift = 0, phase = 'settle'
  if (ms < 200) {
    phase = 'rise'
    lift = ease(ms / 200)
  } else if (ms < 390) {
    phase = 'airborne'
    lift = 1
  } else if (ms < 620) {
    phase = 'descend'
    lift = 1 - ease((ms - 390) / 230)
  } else if (ms < 820) {
    phase = 'splash'
  }
  const drift = Math.sin(Math.PI * clamp(ms / 620, 0, 1)) * species.drift
  const splashAlpha = phase === 'splash'
    ? 0.82 * (1 - (ms - 620) / 200)
    : phase === 'rise' ? 0.55 * (1 - ms / 200) + 0.08
      : phase === 'descend' ? 0.16 + 0.52 * ((ms - 390) / 230)
        : 0.08
  return Object.freeze({
    phase,
    liftY: -Math.round(species.lift * lift * 100) / 100,
    driftX: Math.round(drift * 100) / 100,
    angleDeg: -8 - Math.round(9 * lift * 100) / 100,
    splashAlpha: Math.round(clamp(splashAlpha, 0.08, 0.82) * 100) / 100,
  })
}
