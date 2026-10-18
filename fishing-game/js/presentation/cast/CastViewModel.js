import { oscillatePower } from '../../game/cast.js'
import { getVisualLoadout } from '../equipmentVisuals.js'
import { getFishingGroundName } from '../../game/fishingGroundNames.js'

export function readCastViewModel(scene) {
  const isCharging = Boolean(scene.isCharging)
  const charge01 = isCharging
    ? oscillatePower(scene.time.now - scene.chargeStartedAt)
    : 0.62

  const fish = scene.fish ?? null
  const lastCatch = scene.catches?.[scene.catches.length - 1] ?? null
  const outcome = scene._castPresentationOutcome ?? null
  const caught = outcome === 'caught' && lastCatch?.fishId === fish?.id
  const visualLoadout = getVisualLoadout(scene.rod?.id ?? scene.env?.player?.rodType)
  const battleState = scene.battleState
  const now = scene.time?.now ?? 0
  const rageRemainingMs = (battleState?.nextRageAt ?? Infinity) - now
  const openingRemainingMs = (battleState?.rageOpeningUntil ?? 0) - now
  const openingDurationMs = fish?.rageOpeningMs ?? 1200
  const rageTelegraph = Boolean(battleState && !battleState.isRaging
    && rageRemainingMs > 0 && rageRemainingMs <= 760)
  const rageOpeningAvailable = Boolean(battleState && !battleState.isRaging
    && openingRemainingMs > 0 && !battleState.rageOpeningUsed)
  const openingSwipeAgeMs = now - (battleState?.lastOpeningSwipeAt ?? 0)
  const openingSwipeHit = Boolean(battleState?.lastOpeningSwipeAt
    && openingSwipeAgeMs >= 0 && openingSwipeAgeMs <= 1400)

  return Object.freeze({
    phase: scene.phase,
    locationLabel: getFishingGroundName(scene.env?.point),
    distanceLabel: scene.phase === 'cast' ? '28m' : '18m',
    tackleLabel: scene.rod?.name ?? '',
    rodType: visualLoadout.rod.id,
    rodRequestedType: visualLoadout.rod.requestedId,
    rodVisualFallback: visualLoadout.rod.fallback,
    accessories: visualLoadout.accessories,
    isCharging,
    retrieve: Object.freeze({
      action: scene.retrieveState?.action ?? 'idle',
      appeal01: scene.retrieveState?.appeal ?? 0,
      lureX: scene.bobber?.x ?? scene.retrieveState?.lureX ?? 205,
      lureY: scene.bobber?.y ?? scene.retrieveState?.lureY ?? 370,
    }),
    battle: Object.freeze({
      fishId: fish?.id ?? 'tai',
      fishName: fish?.name ?? 'FISH',
      tension01: Math.max(0, Math.min(1, (battleState?.escape ?? 0) / 100)),
      reel01: Math.max(0, Math.min(1, (battleState?.reel ?? 0) / 100)),
      isRaging: Boolean(battleState?.isRaging),
      rageTelegraph,
      rageOpeningAvailable,
      rageOpening01: rageOpeningAvailable
        ? Math.max(0, Math.min(1, openingRemainingMs / openingDurationMs))
        : 0,
      openingSwipeHit,
    }),
    result: Object.freeze({
      outcome,
      fishId: fish?.id ?? 'tai',
      fishName: fish?.name ?? 'FISH',
      sizeCm: caught ? lastCatch.sizeCm : null,
      score: caught ? lastCatch.score : null,
      totalScore: scene.totalScore ?? 0,
    }),
    charge01,
    aim: Object.freeze({
      x: scene._rcCastAimX ?? 278,
      y: scene._rcCastAimY ?? 355,
      angleDeg: scene._castAngle ?? -45,
    }),
  })
}
