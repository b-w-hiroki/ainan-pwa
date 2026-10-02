import { oscillatePower } from '../../game/cast.js'
import { getVisualLoadout } from '../equipmentVisuals.js'

const LOCATION_LABELS = Object.freeze({
  pointA: '汐風港',
  pointB: '愛南湾',
  pointC: '外海岬',
})

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

  return Object.freeze({
    phase: scene.phase,
    locationLabel: LOCATION_LABELS[scene.env?.point] ?? LOCATION_LABELS.pointA,
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
      tension01: Math.max(0, Math.min(1, (scene.battleState?.escape ?? 0) / 100)),
      reel01: Math.max(0, Math.min(1, (scene.battleState?.reel ?? 0) / 100)),
      isRaging: Boolean(scene.battleState?.isRaging),
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
