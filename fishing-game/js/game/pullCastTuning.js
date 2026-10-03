const freeze = value => Object.freeze(value)

export const PULL_CAST_TUNING = freeze({
  gesture: freeze({
    minPullDistancePx: 64,
    fullPullDistancePx: 112,
    maxHorizontalRatio: 0.72,
    shortTapDistancePx: 18,
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

export function classifyPullRelease(ratio, directionSign = 1) {
  const value = clamp(ratio, 0, 1)
  const sign = directionSign < 0 ? -1 : 1
  const { successStart, successEnd } = PULL_CAST_TUNING.gauge
  if (value < successStart) {
    const progress = value / successStart
    return freeze({
      rating: 'early',
      label: 'EARLY / 早い',
      distanceScale: PULL_CAST_TUNING.error.earlyMinDistanceScale + (1 - PULL_CAST_TUNING.error.earlyMinDistanceScale) * progress,
      angleOffsetDeg: sign * PULL_CAST_TUNING.error.earlyMaxAngleDeg * (1 - progress),
      chargeRatio: value,
    })
  }
  if (value <= successEnd) {
    return freeze({ rating: 'good', label: 'GOOD / 成功', distanceScale: 1, angleOffsetDeg: 0, chargeRatio: value })
  }
  const late = (value - successEnd) / (1 - successEnd)
  return freeze({
    rating: 'late',
    label: 'LATE / 遅い',
    distanceScale: 1 - (1 - PULL_CAST_TUNING.error.lateMinDistanceScale) * late,
    angleOffsetDeg: sign * PULL_CAST_TUNING.error.lateMaxAngleDeg * late,
    chargeRatio: value,
  })
}
