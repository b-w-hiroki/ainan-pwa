// Phaser 3 uses logical renderer sizes. Increase only the default framebuffer;
// scene/camera/input/ScaleManager sizes and offscreen textures stay logical.
// Keep this adapter local to this game's context, never WebGL prototypes.
// Current scenes use sprites/Graphics/geometry masks. New light/bitmap-mask
// or post-FX pipelines require separate density coverage before use here.
export function renderDensity(width, height, dpr, limit = 4096) {
  if (!(width > 0 && height > 0)) return 1
  const requested = Number.isFinite(dpr) ? Math.max(1, Math.min(2, dpr)) : 1
  return Math.max(1, Math.min(requested, limit / width, limit / height,
    Math.sqrt(4_000_000 / (width * height))))
}

export function installDenseRendering(game) {
  const renderer = game.renderer
  const gl = renderer?.gl
  if (!gl || game._denseRendering || typeof renderer.resize !== 'function'
    || typeof renderer.resetViewport !== 'function') return
  const canvas = game.canvas
  const original = {
    bindFramebuffer: gl.bindFramebuffer, viewport: gl.viewport, scissor: gl.scissor,
    resize: renderer.resize, resetViewport: renderer.resetViewport,
  }
  const viewportLimit = gl.getParameter(gl.MAX_VIEWPORT_DIMS)
  const limit = Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), ...viewportLimit)
  let bound = gl.getParameter(gl.FRAMEBUFFER_BINDING)
  let ratioX = 1, ratioY = 1, resizing = false
  const params = new URLSearchParams(window.location.search)
  const baseline = params.get('qa') === '1' && params.get('qaDensity') === '1'
  const state = game._denseRendering = { density: 1, logicalWidth: 0, logicalHeight: 0 }
  gl.bindFramebuffer = function (target, buffer) {
    original.bindFramebuffer.call(gl, target, buffer)
    if (target === gl.FRAMEBUFFER || target === gl.DRAW_FRAMEBUFFER) bound = buffer
  }
  const physicalRect = (x, y, width, height) => {
    if (ratioX === 1 && ratioY === 1) return [x,y,width,height]
    const left = Math.round(x * ratioX), bottom = Math.round(y * ratioY)
    return [left, bottom, Math.round((x + width) * ratioX) - left,
      Math.round((y + height) * ratioY) - bottom]
  }
  gl.viewport = function (x, y, width, height) {
    original.viewport.call(gl, ...(bound === null ? physicalRect(x,y,width,height) : [x,y,width,height]))
  }
  gl.scissor = function (x, y, width, height) {
    const rect = bound !== null ? [x,y,width,height] : resizing
      ? [0,0,canvas.width,canvas.height] : physicalRect(x,y,width,height)
    original.scissor.call(gl, ...rect)
  }
  renderer.resetViewport = function () {
    original.resetViewport.call(renderer)
    renderer.drawingBufferHeight = renderer.height
  }
  renderer.resize = function (width, height) {
    const density = renderDensity(width, height, baseline ? 1 : window.devicePixelRatio, limit)
    const pixelWidth = Math.round(width * density), pixelHeight = Math.round(height * density)
    ratioX = width > 0 ? pixelWidth / width : 1
    ratioY = height > 0 ? pixelHeight / height : 1
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight
    resizing = true
    try {
      original.resize.call(renderer, width, height)
    } finally {
      resizing = false
      renderer.drawingBufferHeight = height
    }
    Object.assign(state, { density, logicalWidth: width, logicalHeight: height,
      pixelWidth, pixelHeight })
    if (bound === null) {
      original.viewport.call(gl,0,0,pixelWidth,pixelHeight)
      renderer.resetScissor()
    }
    return renderer
  }
  const sync = () => renderer.resize(game.scale.baseSize.width, game.scale.baseSize.height)
  const restore = () => {
    bound = gl.getParameter(gl.FRAMEBUFFER_BINDING)
    sync()
  }
  game.scale.on('resize', sync)
  renderer.on('restorewebgl', restore)
  window.addEventListener('resize', sync)
  game.events.once('destroy', () => {
    game.scale.off('resize', sync)
    renderer.off('restorewebgl', restore)
    window.removeEventListener('resize', sync)
    for (const method of ['bindFramebuffer','viewport','scissor']) gl[method] = original[method]
    renderer.resize = original.resize
    renderer.resetViewport = original.resetViewport
  })
  sync()
}
