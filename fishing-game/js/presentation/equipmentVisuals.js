import { getEquipment, getInventory, ROD_META } from '../game/progress.js'
import { ACCESSORY_META, getAccessoryState } from '../game/midgameProgression.js'

const ROD_SOURCE = Object.freeze({ grip: [130, 515], tip: [169, 379], width: 390, height: 844 })

export const DEFAULT_ROD_VISUAL_ID = 'carbon'
export const ROD_VISUALS = Object.freeze({
  basic: Object.freeze({
    name: ROD_META.basic.name, asset: 'fishingMotionRodBasic', accent: 0xe0c76b,
    source: ROD_SOURCE, lengthScale: 0.94,
    flex: Object.freeze({ cast: 0.002, retrieve: 0.004, battle: 0.026, result: 0.012 }),
    line: Object.freeze({ color: 0xf5f0d8, width: 1.3, alpha: 0.82, curve: 14 }),
  }),
  carbon: Object.freeze({
    name: ROD_META.carbon.name, asset: 'fishingMotionRodCarbon', accent: 0x6e83ff,
    source: ROD_SOURCE, lengthScale: 1,
    flex: Object.freeze({ cast: 0.002, retrieve: 0.004, battle: 0.02, result: 0.01 }),
    line: Object.freeze({ color: 0xeafcff, width: 1.35, alpha: 0.86, curve: 18 }),
  }),
  premium: Object.freeze({
    name: ROD_META.premium.name, asset: 'fishingMotionRodPremium', accent: 0xd37cff,
    source: ROD_SOURCE, lengthScale: 1.08,
    flex: Object.freeze({ cast: 0.001, retrieve: 0.003, battle: 0.014, result: 0.008 }),
    line: Object.freeze({ color: 0xffefaa, width: 1.5, alpha: 0.9, curve: 22 }),
  }),
})

const anchors = values => Object.freeze(Object.fromEntries(Object.entries(values).map(([pose, value]) => [pose, Object.freeze(value)])))

export const ACCESSORY_VISUALS = Object.freeze({
  cap: Object.freeze({
    slot: 'hat', name: '汐風キャップ', mark: '潮', accent: 0x35c6df, trim: 0xffd95a,
    anchors: anchors({
      idle: [163, 107, 0], castWindup: [151, 78, -4], castMid: [157, 99, -2], castRelease: [166, 101, -2],
      fightLeft: [137, 148, -5], fightMid: [166, 99, -2], fightRight: [118, 140, -8],
      joyLift: [125, 94, -8], joyMid: [133, 105, -8], joyHold: [126, 93, -8],
      sadDrop: [169, 84, 1], sadMid: [184, 121, 5], sadSlump: [176, 101, 4],
    }),
  }),
  bag: Object.freeze({
    slot: 'bag', name: 'タックルバッグ', mark: 'T', accent: 0xff765a, trim: 0x5bc8e8,
    anchors: anchors({
      idle: [137, 332, 0], castWindup: [143, 341, 0], castMid: [141, 337, 0], castRelease: [139, 339, 0],
      fightLeft: [165, 337, 0], fightMid: [144, 338, 0], fightRight: [148, 335, 0],
      joyLift: [141, 338, 0], joyMid: [142, 338, 0], joyHold: [140, 339, 0],
      sadDrop: [143, 337, 0], sadMid: [143, 341, 0], sadSlump: [134, 329, 0],
    }),
  }),
})

function resolveAccessory(slot, state) {
  const requestedId = state.equipped?.[slot] ?? null
  const meta = ACCESSORY_META[requestedId]
  if (!requestedId || meta?.slot !== slot || !state.owned?.[requestedId] || !ACCESSORY_VISUALS[requestedId]) return null
  return requestedId
}

export function getVisualLoadout(requestedRodType = null) {
  const equipment = getEquipment()
  const inventory = getInventory()
  const accessories = getAccessoryState()
  const requested = requestedRodType ?? equipment.rodType ?? DEFAULT_ROD_VISUAL_ID
  const requestedValid = Boolean(ROD_VISUALS[requested])
  const requestedOwned = requestedValid && (inventory.rods?.[requested] ?? 0) > 0
  const fallbackId = ['basic', DEFAULT_ROD_VISUAL_ID, 'premium'].find(id => (inventory.rods?.[id] ?? 0) > 0) ?? 'basic'
  const rodId = requestedValid && requestedOwned ? requested : fallbackId
  const baitId = ['worm', 'shrimp', 'special'].includes(equipment.baitType) ? equipment.baitType : 'worm'

  return Object.freeze({
    rod: Object.freeze({
      id: rodId,
      requestedId: requested,
      fallback: rodId !== requested,
      fallbackReason: !requestedValid ? 'invalid' : !requestedOwned ? 'unowned' : null,
      ...ROD_VISUALS[rodId],
    }),
    baitId,
    accessories: Object.freeze({
      hat: resolveAccessory('hat', accessories),
      bag: resolveAccessory('bag', accessories),
    }),
  })
}

export function createAccessoryAccent(scene, id) {
  const visual = ACCESSORY_VISUALS[id]
  if (!visual) return null
  const container = scene.add.container(0, 0).setVisible(false)
  const g = scene.add.graphics()
  if (id === 'cap') {
    g.fillStyle(0x173248, 0.28); g.fillCircle(1, 2, 15)
    g.fillStyle(visual.trim, 1); g.lineStyle(3, 0x173248, 0.9); g.fillCircle(0, 0, 13); g.strokeCircle(0, 0, 13)
    g.fillStyle(visual.accent, 1); g.fillCircle(0, 0, 8)
    g.lineStyle(2, 0xffffff, 0.9); g.lineBetween(-4, 1, -1, -2); g.lineBetween(-1, -2, 4, 1)
  } else {
    g.fillStyle(0x173248, 0.25); g.fillRoundedRect(-16, -10, 34, 25, 7)
    g.fillStyle(visual.accent, 1); g.lineStyle(3, 0x173248, 0.9); g.fillRoundedRect(-17, -13, 34, 24, 7); g.strokeRoundedRect(-17, -13, 34, 24, 7)
    g.fillStyle(visual.trim, 1); g.fillRoundedRect(-11, -7, 22, 12, 5)
    g.fillStyle(0xffffff, 0.94); g.fillCircle(0, -1, 3.5)
  }
  container.add(g)
  container.setData('accessoryId', id)
  return container
}
