import { MOBILE_FRAME } from '../../config/mobileFrame.js'

export const FISHING_MOCK_LAYOUT = Object.freeze({
  viewport: { width: 390, height: 844 },
  topHud: { x: 0, y: 0, width: 390, height: MOBILE_FRAME.topHudHeight },
  playfield: {
    x: 0,
    y: MOBILE_FRAME.topHudHeight,
    width: 390,
    height: MOBILE_FRAME.height - MOBILE_FRAME.topHudHeight - MOBILE_FRAME.bottomControlsHeight,
  },
  controls: {
    x: 0,
    y: MOBILE_FRAME.height - MOBILE_FRAME.bottomControlsHeight,
    width: 390,
    height: MOBILE_FRAME.bottomControlsHeight,
  },
  cast: {
    player: { x: 72, y: 660, width: 126, height: 166 },
    target: { x: 278, y: 355 },
    fish: [
      { x: 286, y: 250, width: 58 },
      { x: 178, y: 372, width: 44 },
      { x: 304, y: 468, width: 50 },
    ],
    power: { x: 82, y: 700, width: 198, height: 10 },
    action: { x: 195, y: 776, radius: 44 },
  },
  retrieve: {
    player: { x: 72, y: 660, width: 126, height: 166 },
    lineStart: { x: 108, y: 558 },
    lureFallback: { x: 286, y: 392, width: 38 },
    fish: [
      { x: 286, y: 246, width: 58 },
      { x: 166, y: 368, width: 44 },
      { x: 306, y: 462, width: 50 },
    ],
    actions: [
      { x: 86, y: 760, radius: 39 },
      { x: 195, y: 760, radius: 43 },
      { x: 304, y: 760, radius: 39 },
    ],
  },
  battle: {
    fish: { x: 195, y: 334, width: 236, height: 132 },
    tension: { x: 92, y: 28, width: 222, height: 14 },
    instructionY: 790,
  },
  result: {
    fish: { x: 195, y: 282, width: 226, height: 226 },
    labelY: 120,
    nameY: 414,
    stats: { x: 48, y: 458, width: 294, height: 84 },
    primary: { x: 54, y: 580, width: 282, height: 58 },
    secondary: { x: 54, y: 650, width: 282, height: 48 },
  },
})
