// World/UI separation proposal for future CastPresentationHost landscape reflow.
// Geometry only. The approved 390x844 production composition is unchanged.
// Units are *CSS pixels* at 1:1 logical landscape scale (not a scaled
// portrait game). All rectangles are axis-aligned and safe-area inset.
const clamp = (v, low, high) => Math.min(high, Math.max(low, v))
const rect = (x, y, width, height) => Object.freeze({ x, y, width, height })
const inset = (i = {}) => ({
  top: clamp(Number(i.top) || 0, 0, 80),
  right: clamp(Number(i.right) || 0, 0, 80),
  bottom: clamp(Number(i.bottom) || 0, 0, 80),
  left: clamp(Number(i.left) || 0, 0, 80),
})

export const LANDSCAPE_MIN_TOUCH = 44

export function makeFishingLandscapeLayout(width, height, safeArea = {}) {
  if (![width,height].every(n => Number.isFinite(n) && n > 0)) {
    throw new Error('Landscape viewport must have positive finite dimensions')
  }
  const s = inset(safeArea)
  const horizontal = width > height
  if (!horizontal) return Object.freeze({
    orientation: 'portrait',
    supported: false,
    reason: 'Production portrait is owned by 390x844 approved Host',
  })

  const space = rect(s.left, s.top, width-s.left-s.right, height-s.top-s.bottom)
  // The side rail is independent from the camera so lure, character and HUD
  // can remain in the world rather than being shrunk with the portrait dock.
  const railW = clamp(Math.round(space.width*0.22), 104, 150)
  const gap = 10
  const world = rect(space.x,space.y,space.width-railW-gap,space.height)
  const sideDock = rect(world.x+world.width+gap,space.y,railW,space.height)
  const hudHeight = 48
  const actionSize = clamp(Math.floor(Math.min(88,railW-24,(sideDock.height-40)/3.8)),44,88)
  const cx = Math.round(sideDock.x+sideDock.width/2)
  const firstY = Math.round(sideDock.y+Math.max(24,(sideDock.height-(3*actionSize+2*10))/2))
  const actions = Object.freeze([0,1,2].map(i=>rect(
    Math.round(cx-actionSize/2),firstY+i*(actionSize+10),actionSize,actionSize,
  )))
  const castSize = clamp(Math.round(Math.min(96,railW-20,sideDock.height-72)),44,96)
  const cast = rect(Math.round(cx-castSize/2),
    Math.round(sideDock.y+(sideDock.height-castSize)/2),castSize,castSize)
  const hud = rect(world.x+12,world.y+8,world.width-24,hudHeight)
  const back = rect(world.x+12,world.y+8,48,48)
  const supported = world.width>=460 && world.height>=300
    && actions.every(x=>x.width>=LANDSCAPE_MIN_TOUCH)
    && actions[2].y+actions[2].height<=sideDock.y+sideDock.height-8
  return Object.freeze({
    orientation:'landscape',
    supported,
    reason: supported ? 'geometry-only; awaiting world art/input owner reflow' : 'viewport too small for world and touch targets',
    viewport:rect(0,0,width,height), safeArea:Object.freeze(s),
    world,hud,back,sideDock,cast,actions,
  })
}

// Phaser pointer mapping after the world container has been composed at
// native landscape dimensions. Pointer coordinates are never scaled by the
// current 390/844 letterboxed-portrait ratio.
export function landscapePointerToWorld(pointer, world) {
  return Object.freeze({x:pointer.x-world.x,y:pointer.y-world.y})
}
