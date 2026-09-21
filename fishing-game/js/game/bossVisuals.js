import { ASSETS } from '../config/assetManifest.js'
import { BOSS_META } from './midgameProgression.js'

const VISUALS = {
  harborRunner: { asset: ASSETS.bosses.harborRunner, accent: 0x5bb5d8, secondary: 0xffd95a, battleSize: [236, 144], resultSize: [238, 146] },
  bayHunter: { asset: ASSETS.bosses.bayHunter, accent: 0x8f80e8, secondary: 0x71d6a2, battleSize: [244, 149], resultSize: [246, 150] },
  kue: { asset: ASSETS.bosses.kue, accent: 0xff765a, secondary: 0xffd95a, battleSize: [278, 172], resultSize: [270, 167] },
}

export function getBossMetaForScene(scene) {
  return Object.values(BOSS_META).find(meta => meta.pointId === scene.env?.point && meta.fishId === scene.fish?.id) ?? null
}

export function getBossVisual(id) {
  return VISUALS[id] ?? null
}

export function getAllBossAssets() {
  return Object.values(VISUALS).map(item => item.asset)
}
