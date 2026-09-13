export const MOBILE_FRAME = Object.freeze({
  width: 390,
  height: 844,
  margin: 16,
  topHudHeight: 64,
  bottomControlsHeight: 176,
  playTop: 72,
  playBottom: 668,
})

export const mobilePlayHeight = () => MOBILE_FRAME.playBottom - MOBILE_FRAME.playTop
