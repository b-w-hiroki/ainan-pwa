import { ASSETS } from '../../config/assetManifest.js'
import { CAST_LAYER_CONFIG, readCastLayerDevOptions } from './castLayerConfig.js'

const addLayer = (scene, root, name, config) => {
  const node = scene.add.container(config.x, config.y)
    .setScale(config.scaleX, config.scaleY)
    .setAlpha(config.alpha)
    .setVisible(config.visible)
    .setDepth(config.z)
  node.name = `cast-layer-${name}`
  root.add(node)
  return node
}

export function applyCastLayerAdjustment(node, name, options) {
  const config = CAST_LAYER_CONFIG.layers[name]
  if (!node || !config) return node
  node.setPosition(config.x, config.y)
    .setScale(config.scaleX, config.scaleY)
    .setAlpha(config.alpha)
    .setVisible(config.visible)
  if (options?.adjustment?.name === name) {
    node.setPosition(node.x + options.adjustment.x, node.y + options.adjustment.y)
      .setScale(node.scaleX * options.adjustment.scale, node.scaleY * options.adjustment.scale)
      .setVisible(options.adjustment.visible)
  }
  return node
}

const drawSky = (scene, node) => {
  const gfx = scene.add.graphics()
  gfx.fillGradientStyle(0x1598e6, 0x1598e6, 0xdff5ff, 0xdff5ff, 1)
  gfx.fillRect(0, 0, 390, 280)
  gfx.fillStyle(0xffe061, 1)
  gfx.fillCircle(318, 82, 36)
  node.add(gfx)
}

const drawClouds = (scene, node) => {
  const gfx = scene.add.graphics()
  gfx.fillStyle(0xffffff, 0.84)
  ;[
    [61, 92, 41, 11], [95, 87, 28, 9],
    [224, 117, 38, 10], [253, 113, 25, 8],
  ].forEach(([x, y, width, height]) => gfx.fillEllipse(x, y, width * 2, height * 2))
  node.add(gfx)
}

const drawDistantHarbor = (scene, node) => {
  const gfx = scene.add.graphics()
  gfx.fillStyle(0x7bc794, 1)
  gfx.fillPoints([{ x: 0, y: 208 }, { x: 82, y: 154 }, { x: 145, y: 167 }, { x: 226, y: 147 }, { x: 390, y: 156 }, { x: 390, y: 278 }, { x: 0, y: 278 }], true)
  gfx.fillStyle(0x17664e, 0.96)
  gfx.fillPoints([{ x: 0, y: 237 }, { x: 112, y: 202 }, { x: 231, y: 195 }, { x: 390, y: 213 }, { x: 390, y: 280 }, { x: 0, y: 280 }], true)
  const houses = [
    [18, 231, 44, 34, 0xf8f2dd, 0xe96952], [72, 224, 38, 40, 0xeef8ff, 0x4786a8],
    [119, 229, 46, 36, 0xfff1d2, 0xef8f5f], [172, 217, 50, 48, 0xf2f8f4, 0x64ae79],
    [232, 226, 41, 39, 0xfff6df, 0xe26a53], [280, 218, 49, 47, 0xeef7ff, 0x4f8eb1],
  ]
  houses.forEach(([x, y, width, height, wall, roof]) => {
    gfx.fillStyle(wall, 0.96); gfx.fillRect(x, y, width, height)
    gfx.fillStyle(roof, 1); gfx.fillTriangle(x - 5, y + 1, x + width / 2, y - 17, x + width + 5, y + 1)
  })
  gfx.fillStyle(0xf2f2ed, 1); gfx.fillRoundedRect(321, 173, 8, 76, 3)
  gfx.fillStyle(0xd94837, 1); gfx.fillTriangle(307, 176, 343, 176, 325, 156); gfx.fillRect(319, 176, 12, 16)
  node.add(gfx)
}

const drawSea = (scene, node, dockTop) => {
  const gfx = scene.add.graphics()
  gfx.fillGradientStyle(0x18aee0, 0x18aee0, 0x07517d, 0x07517d, 1)
  gfx.fillRect(0, CAST_LAYER_CONFIG.horizonY, 390, dockTop - CAST_LAYER_CONFIG.horizonY)
  gfx.lineStyle(2, 0xdff9ff, 0.46)
  ;[302, 348, 411, 487, 567].forEach((y, index) => {
    gfx.beginPath(); gfx.moveTo(-10, y); gfx.lineTo(76 + index * 7, y - 8); gfx.lineTo(195, y + 2); gfx.lineTo(300, y - 5); gfx.lineTo(400, y + 3); gfx.strokePath()
  })
  node.add(gfx)
}

const drawPlatform = (scene, node) => {
  const gfx = scene.add.graphics()
  gfx.fillStyle(0xaa9674, 1)
  gfx.lineStyle(3, 0x5f5143, 1)
  gfx.fillPoints([{ x: 0, y: 612 }, { x: 146, y: 570 }, { x: 212, y: 730 }, { x: 0, y: 756 }], true)
  gfx.strokePoints([{ x: 0, y: 612 }, { x: 146, y: 570 }, { x: 212, y: 730 }, { x: 0, y: 756 }], true)
  gfx.fillStyle(0xa67847, 1); gfx.fillRoundedRect(138, 601, 22, 92, 6)
  gfx.fillStyle(0xbd8f58, 1); gfx.fillRoundedRect(126, 610, 48, 14, 5)
  gfx.fillStyle(0x2788cf, 1); gfx.fillRoundedRect(7, 655, 72, 45, 8)
  gfx.fillStyle(0xeef9ff, 1); gfx.fillRect(7, 663, 72, 8)
  node.add(gfx)
}

const drawRod = (scene, node, rod) => {
  const gfx = scene.add.graphics()
  const joints = rod.modularJoints ?? rod.joints
  const stroke = (width, color) => {
    gfx.lineStyle(width, color, 1)
    gfx.beginPath()
    gfx.moveTo(joints[0].x, joints[0].y)
    joints.slice(1).forEach(point => gfx.lineTo(point.x, point.y))
    gfx.strokePath()
  }
  stroke(rod.shaftWidth, rod.shaftColor)
  stroke(rod.accentWidth, rod.accentColor)
  gfx.lineStyle(2, 0xeafcff, 0.9)
  gfx.lineBetween(rod.lineStart.x, rod.lineStart.y, CAST_LAYER_CONFIG.target.x, CAST_LAYER_CONFIG.target.y)
  node.add(gfx)
}

const addFullCanvasAsset = (scene, node, asset) => {
  if (!asset?.key || !scene.textures.exists(asset.key)) return null
  const image = scene.add.image(195, 422, asset.key).setDisplaySize(390, 844)
  node.add(image)
  return image
}

export function createLayeredCastScene(scene) {
  const config = CAST_LAYER_CONFIG
  const options = readCastLayerDevOptions(typeof window === 'undefined' ? '' : window.location.search)
  const root = scene.add.container(0, 0)
  const nodes = {}
  Object.entries(config.layers).forEach(([name, layerConfig]) => { nodes[name] = addLayer(scene, root, name, layerConfig) })
  root.sort('depth')

  if (!addFullCanvasAsset(scene, nodes.sky, ASSETS.ui.fishingLayerSky)) drawSky(scene, nodes.sky)
  if (!addFullCanvasAsset(scene, nodes.clouds, ASSETS.ui.fishingLayerClouds)) drawClouds(scene, nodes.clouds)
  if (!addFullCanvasAsset(scene, nodes.sea, ASSETS.ui.fishingLayerSea)) drawSea(scene, nodes.sea, config.dockTop)
  if (!addFullCanvasAsset(scene, nodes.distantHarbor, ASSETS.ui.fishingLayerDistantHarbor)) drawDistantHarbor(scene, nodes.distantHarbor)
  if (!addFullCanvasAsset(scene, nodes.platform, ASSETS.ui.fishingLayerPlatform)) drawPlatform(scene, nodes.platform)
  const characterAsset = ASSETS.characters.fishingCastRodless
  if (characterAsset?.key && scene.textures.exists(characterAsset.key)) {
    nodes.character.add(scene.add.image(config.player.modularX, config.player.modularY, characterAsset.key)
      .setOrigin(0.5, 1)
      .setDisplaySize(config.player.modularWidth, config.player.modularHeight))
  }
  drawRod(scene, nodes.heldRod, config.rod)

  const weatherOverlay = scene.add.rectangle(195, 310, 390, 620, 0xffffff, 0)
  nodes.sky.add(weatherOverlay)
  const weather = config.weather.presets[options.weather]
  weatherOverlay.setFillStyle(weather.overlayColor, weather.overlayAlpha)
  nodes.clouds.setAlpha(weather.cloudAlpha)

  Object.entries(nodes).forEach(([name, node]) => applyCastLayerAdjustment(node, name, options))

  return Object.freeze({ root, nodes, options, weather })
}
