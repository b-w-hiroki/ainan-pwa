// Landscape fishing layout contract. Experimental geometry only: Phaser still
// runs the production-approved 390×844 portrait canvas until scene-owned
// cameras, dock/input and all other scenes have been adapted and reviewed.
const clamp = (n, min, max) => Math.max(min, Math.min(max, n))
const rect = (x, y, width, height) => Object.freeze({ x, y, width, height })

export function layoutLandscapeFishing(width, height, insets = {}) {
  // Reject fractional viewport/safe-area geometry: CSS pointer hit regions
  // must remain stable when devices rotate and inset readings change.
  const values = [width, height, insets.left ?? 0, insets.right ?? 0, insets.top ?? 0, insets.bottom ?? 0]
  if (!values.every(Number.isFinite) || values.some(v => v < 0) || width <= height || width < 600 || height < 300) return null
  if (insets.left + insets.right + insets.top + insets.bottom < 0) return null
  const safe = {
    left: insets.left ?? 0, right: insets.right ?? 0,
    top: insets.top ?? 0, bottom: insets.bottom ?? 0,
  }
  // The entire safe-area must fit before allocating the 3 independent rails.
  if (safe.left + safe.right >= width || safe.top + safe.bottom >= height) return null
  const outer = 10
  const gap = 12
  const left = safe.left + outer
  const top = safe.top + outer
  const availableWidth = width - safe.left - safe.right - outer * 2
  const availableHeight = height - safe.top - safe.bottom - outer * 2
  // Below 336px of usable height, the gauge, three 52px reel targets and
  // 110px cast pad cannot coexist without overlap. Reject rather than shrink.
  if (availableHeight < 336) return null
  const railWidth = clamp(Math.round(availableWidth * 0.14), 84, 112)
  const controlWidth = clamp(Math.round(availableWidth * 0.19), 128, 156)
  const worldWidth = availableWidth - railWidth - controlWidth - gap * 2
  if (worldWidth < 330) return null

  const rail = rect(left, top, railWidth, availableHeight)
  const world = rect(left + railWidth + gap, top, worldWidth, availableHeight)
  const dock = rect(world.x + world.width + gap, top, controlWidth, availableHeight)
  const back = rect(rail.x + 2, rail.y + 2, 52, 52)
  const status = rect(rail.x + 2, rail.y + 66, rail.width - 4, Math.min(108, rail.height - 84))
  // Reserve distinct physical hit areas. These are phase-specific controls,
  // but their geometry must never cause an accidental overlap on reflow.
  const gauge = rect(dock.x + 10, dock.y + 12, dock.width - 20, 20)
  const retrieve = [0, 1, 2].map(i => rect(dock.x + 8, dock.y + 46 + i * 60, dock.width - 16, 52))
  const castCenter = Object.freeze({ x: dock.x + dock.width / 2, y: dock.y + dock.height - 63, radius: 55 })
  const resultActions = [0, 1].map(i => rect(dock.x + 8, dock.y + 90 + i * 94, dock.width - 16, 64))
  return Object.freeze({
    viewport: rect(0, 0, width, height), safe, rail, world, dock, back, status, gauge,
    castCenter, retrieve: Object.freeze(retrieve), resultActions: Object.freeze(resultActions),
    minimumTouchPixels: 44, stage: 'geometry-only-not-rendered',
  })
}

export function pointerInWorld(x, y, layout) {
  if (!layout || !Number.isFinite(x) || !Number.isFinite(y)) return null
  const r = layout.world
  if (x < r.x || x > r.x + r.width || y < r.y || y > r.y + r.height) return null
  return Object.freeze({ x: (x - r.x) / r.width, y: (y - r.y) / r.height })
}

export function rectanglesOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x
    && a.y < b.y + b.height && a.y + a.height > b.y
}
