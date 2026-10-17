// Independent painted parts. Anchors use the original 1254px body canvas;
// runtime conversion shares each body's existing scale/offset and actor layout.
export const CUTE_EQUIPMENT = Object.freeze({
  cap: { key: 'character_cute_cap', file: 'cap.png', bounds: [229,257,1160,856], width: 425 },
  bag: { key: 'character_cute_bag', file: 'bag.png', bounds: [366,265,959,957], width: 210 },
})
const a = {
  idle: [[645,235,0],[590,565,0]],
  castWindup: [[635,235,0],[620,565,-5]],
  castMid: [[627,235,0],[600,565,0]],
  castRelease: [[655,235,0],[595,565,0]],
  fightLeft: [[520,235,-4],[560,565,-8]],
  fightMid: [[603,235,0],[575,565,-3]],
  fightRight: [[567,235,-3],[565,565,-5]],
  joyLift: [[587,235,-4],[580,565,-3]],
  joyMid: [[567,235,-5],[560,565,-5]],
  joyHold: [[557,235,-5],[550,565,-5]],
  sadDrop: [[713,235,12],[605,560,6]],
  sadMid: [[750,235,18],[635,550,10]],
  sadSlump: [[758,288,23],[600,550,13]],
}
const b = {
  idle: [[645,250,0],[590,565,0]],
  castWindup: [[645,250,0],[620,565,-5]],
  castMid: [[637,250,0],[600,565,0]],
  castRelease: [[645,250,0],[595,565,0]],
  fightLeft: [[501,264,-4],[550,565,-8]],
  fightMid: [[595,250,0],[575,565,-3]],
  fightRight: [[595,250,-3],[565,565,-5]],
  joyLift: [[576,266,-4],[570,565,-3]],
  joyMid: [[561,253,-5],[550,565,-5]],
  joyHold: [[535,261,-5],[540,565,-5]],
  sadDrop: [[685,242,12],[605,560,6]],
  sadMid: [[815,230,14],[635,550,10]],
  sadSlump: [[773,252,17],[600,550,13]],
}
export function cuteEquipmentAssets() {
  return Object.values(CUTE_EQUIPMENT).map(({key,file})=>({
    key, path: `${import.meta.env?.BASE_URL ?? '/'}fishing-game/assets/candidates/w03-cute-equipment/${file}`, status: 'ready',
  }))
}
export function cuteEquipmentPlacement(appearance, pose, id, metadata) {
  const anchors = ({'cute-a-01':a,'cute-b-01':b})[appearance]?.[pose]
  const part = CUTE_EQUIPMENT[id]
  const offset = metadata?.poses?.[pose]?.offset
  if (!anchors || !part || !offset || !Number.isFinite(metadata.scale)) return null
  const [x,y,angle] = anchors[id==='cap'?0:1]
  const [left,top,right,bottom] = part.bounds
  return {
    point: [(x*metadata.scale+offset[0])/2,(y*metadata.scale+offset[1])/2],
    origin: [(left+right)/2/1254,(top+bottom)/2/1254],
    // Full transparent source size, not just the visible bounds.
    width: 1254/(right-left)*part.width*metadata.scale/2,
    angle,
  }
}
