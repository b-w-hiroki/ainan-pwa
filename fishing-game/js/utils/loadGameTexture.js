import Phaser from 'phaser'

// Chromium on Windows can decode an SVG Image yet reject it at texImage2D.
// Rasterize the decoded image before Phaser uploads it to WebGL. Keep the
// source SVG and its key; PNG assets retain the normal image-loader path.
export function loadGameTexture(scene, asset) {
  if (!/\.svg(?:\?|$)/i.test(asset.path)) {
    scene.load.image(asset.key, asset.path)
    return
  }

  const file = new Phaser.Loader.FileTypes.SVGFile(scene.load, asset.key, asset.path)
  const complete = file.onProcessComplete
  file.onProcessComplete = function () {
    const image = this.data
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth || image.width
    canvas.height = image.naturalHeight || image.height
    const context = canvas.getContext('2d')
    if (!context || !canvas.width || !canvas.height) {
      this.onProcessError()
      return
    }
    context.drawImage(image, 0, 0)
    this.data = canvas
    complete.call(this)
  }
  file.addToCache = function () {
    this.cache.addCanvas(this.key, this.data)
  }
  scene.load.addFile(file)
}
