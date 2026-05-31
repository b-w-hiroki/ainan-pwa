export function addCoverImage(scene, key, width, height, depth = 0) {
  if (!scene.textures.exists(key)) return null

  const image = scene.add.image(width / 2, height / 2, key).setDepth(depth)
  const scale = Math.max(width / image.width, height / image.height)
  image.setScale(scale)
  return image
}

export function addReadableOverlay(scene, width, height, depth = 1) {
  const g = scene.add.graphics().setDepth(depth)

  g.fillGradientStyle(0x123a54, 0x123a54, 0x123a54, 0x123a54, 0.28, 0.28, 0.02, 0.02)
  g.fillRect(0, 0, width, height * 0.42)

  g.fillGradientStyle(0x1a2a3a, 0x1a2a3a, 0x1a2a3a, 0x1a2a3a, 0.0, 0.0, 0.32, 0.32)
  g.fillRect(0, height * 0.58, width, height * 0.42)

  return g
}
