import { oscillatePower } from '../../game/cast.js'

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

  return Object.freeze({
    phase: scene.phase,
    locationLabel: LOCATION_LABELS[scene.env?.point] ?? LOCATION_LABELS.pointA,
    distanceLabel: '28m',
    tackleLabel: scene.rod?.name ?? '',
    isCharging,
    charge01,
    aim: Object.freeze({
      x: scene._rcCastAimX ?? 278,
      y: scene._rcCastAimY ?? 355,
      angleDeg: scene._castAngle ?? -45,
    }),
  })
}
