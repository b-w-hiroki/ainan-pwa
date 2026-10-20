// Phaser keeps a 390×844 logical scene while CSS may shrink the canvas.
export function canvasDisplayScale(scene) {
  const rect = scene.game.canvas.getBoundingClientRect()
  const scale = Math.min(rect.width / scene.scale.width, rect.height / scene.scale.height)
  return Number.isFinite(scale) && scale > 0 ? scale : 1
}

export function touchHeight(scene, logicalHeight, minimumCssHeight = 44) {
  return Math.max(logicalHeight, Math.min(72, Math.ceil(minimumCssHeight / canvasDisplayScale(scene))))
}
