const layer = (overrides = {}) => Object.freeze({
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  alpha: 1,
  visible: true,
  z: 0,
  ...overrides,
})

export const CAST_LAYER_CONFIG = Object.freeze({
  design: Object.freeze({ width: 390, height: 844 }),
  layers: Object.freeze({
    sky: layer({ z: 0 }),
    clouds: layer({ z: 10 }),
    sea: layer({ z: 20 }),
    distantHarbor: layer({ z: 30 }),
    platform: layer({ z: 40 }),
    character: layer({ z: 50 }),
    heldRod: layer({ z: 60 }),
    fish: layer({ z: 70 }),
    target: layer({ z: 80 }),
    hud: layer({ z: 90 }),
    controls: layer({ z: 100 }),
  }),
  horizonY: 258,
  dockTop: 620,
  player: Object.freeze({
    x: 90 * (390 / 391),
    y: 465 * (844 / 783),
    width: 180 * (390 / 391),
    height: 230 * (844 / 783),
    modularX: 82,
    modularY: 668,
    modularWidth: 154,
    modularHeight: 220,
    handAnchor: Object.freeze({ x: 130, y: 486 }),
    modularHandAnchor: Object.freeze({ x: 130, y: 515 }),
  }),
  rod: Object.freeze({
    joints: Object.freeze([
      Object.freeze({ x: 130, y: 486 }),
      Object.freeze({ x: 151, y: 429 }),
      Object.freeze({ x: 169, y: 379 }),
    ]),
    modularJoints: Object.freeze([
      Object.freeze({ x: 130, y: 515 }),
      Object.freeze({ x: 151, y: 444 }),
      Object.freeze({ x: 169, y: 379 }),
    ]),
    shaftWidth: 5,
    shaftColor: 0x122434,
    accentWidth: 1.5,
    accentColor: 0xef8c37,
    lineStart: Object.freeze({ x: 169, y: 379 }),
  }),
  target: Object.freeze({ x: 310, y: 235, width: 74, height: 34 }),
  fish: Object.freeze([
    Object.freeze({ x: 133, y: 193, width: 88 }),
    Object.freeze({ x: 98, y: 318, width: 78 }),
    Object.freeze({ x: 309, y: 368, width: 72 }),
  ]),
  controls: Object.freeze({
    gauge: Object.freeze({ x: 36, y: 669, width: 320, height: 14 }),
    castButton: Object.freeze({ x: 195, y: 748, radius: 62 }),
    back: Object.freeze({ x: 31, y: 40, width: 54, height: 52 }),
  }),
  weather: Object.freeze({
    default: 'clear',
    presets: Object.freeze({
      clear: Object.freeze({ overlayColor: 0xffffff, overlayAlpha: 0, cloudAlpha: 0.84, cloudSpeedX: 0 }),
      overcast: Object.freeze({ overlayColor: 0x6b8293, overlayAlpha: 0.18, cloudAlpha: 0.96, cloudSpeedX: 2 }),
      rainReady: Object.freeze({ overlayColor: 0x38546b, overlayAlpha: 0.30, cloudAlpha: 1, cloudSpeedX: 4 }),
    }),
  }),
})

export function readCastLayerDevOptions(search = '') {
  const params = new URLSearchParams(search)
  const selected = params.get('castLayer')
  const adjustment = selected && CAST_LAYER_CONFIG.layers[selected]
    ? {
        name: selected,
        x: Number(params.get('castLayerX') ?? 0) || 0,
        y: Number(params.get('castLayerY') ?? 0) || 0,
        scale: Number(params.get('castLayerScale') ?? 1) || 1,
        visible: params.get('castLayerVisible') !== '0',
      }
    : null
  const requestedWeather = params.get('castWeather')
  return Object.freeze({
    enabled: params.get('castLayers') === '1',
    adjustment,
    weather: CAST_LAYER_CONFIG.weather.presets[requestedWeather]
      ? requestedWeather
      : CAST_LAYER_CONFIG.weather.default,
  })
}
