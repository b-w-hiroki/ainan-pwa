const freeze = value => Object.freeze(value)

export const PULL_CAST_TUNING = freeze({
  gesture: freeze({
    minPullDistancePx: 64,
    fullPullDistancePx: 112,
    maxHorizontalRatio: 1.2,
    shortTapDistancePx: 18,
    originRadiusPx: 62,
  }),
  gauge: freeze({
    fillMs: 900,
    successStart: 0.62,
    successEnd: 0.82,
    lateThreshold: 1,
  }),
  motion: freeze({
    chargePoseBlendEnd: 0.18,
    cameraDelayAfterLureMs: 36,
    lureDetachBlendMs: 48,
    recoveryMs: 90,
  }),
  error: freeze({
    earlyMinDistanceScale: 0.72,
    earlyMaxAngleDeg: 8,
    lateMinDistanceScale: 0.90,
    lateMaxAngleDeg: 10,
    successMaxLandingErrorPx: 8,
  }),
  ui: freeze({
    handleRadiusPx: 43,
    handleBottomInsetPx: 178,
    reelBottomInsetPx: 82,
    gaugeWidthPx: 34,
    gaugeHeightPx: 142,
  }),
})

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function pullChargeRatio(elapsedMs) {
  return clamp(elapsedMs / PULL_CAST_TUNING.gauge.fillMs, 0, PULL_CAST_TUNING.gauge.lateThreshold)
}

export function slingshotAimFromPull(pullDx, pullDy, {
  minDistancePx = 180,
  maxDistancePx = 780,
  halfAngleDeg = 52,
} = {}) {
  const down = Math.max(0, pullDy)
  const pullDistance = Math.hypot(pullDx, down)
  const pullProgress = clamp(pullDistance / PULL_CAST_TUNING.gesture.fullPullDistancePx, 0, 1)
  const directionOk = down > 0
    && Math.abs(pullDx) <= Math.max(24, down * PULL_CAST_TUNING.gesture.maxHorizontalRatio)
  const angleDeg = clamp(
    Math.atan2(-pullDx, Math.max(1, down)) * 180 / Math.PI,
    -halfAngleDeg,
    halfAngleDeg,
  )
  const distancePx = minDistancePx + (maxDistancePx - minDistancePx) * pullProgress
  return freeze({ angleDeg, distancePx, pullDistance, pullProgress, directionOk })
}

export function classifyPullRelease(ratio, directionSign = 1) {
  const value = clamp(ratio, 0, 1)
  const sign = directionSign < 0 ? -1 : 1
  const { successStart, successEnd } = PULL_CAST_TUNING.gauge
  if (value < successStart) {
    const progress = value / successStart
    return freeze({
      rating: 'early',
      label: '早すぎ',
      distanceScale: PULL_CAST_TUNING.error.earlyMinDistanceScale + (1 - PULL_CAST_TUNING.error.earlyMinDistanceScale) * progress,
      angleOffsetDeg: sign * PULL_CAST_TUNING.error.earlyMaxAngleDeg * (1 - progress),
      chargeRatio: value,
    })
  }
  if (value <= successEnd) {
    return freeze({ rating: 'good', label: '成功', distanceScale: 1, angleOffsetDeg: 0, chargeRatio: value })
  }
  const late = (value - successEnd) / (1 - successEnd)
  return freeze({
    rating: 'late',
    label: '遅すぎ',
    distanceScale: 1 - (1 - PULL_CAST_TUNING.error.lateMinDistanceScale) * late,
    angleOffsetDeg: sign * PULL_CAST_TUNING.error.lateMaxAngleDeg * late,
    chargeRatio: value,
  })
}
