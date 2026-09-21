import { ASSETS } from '../config/assetManifest.js'
import { BOSS_META } from './midgameProgression.js'

export const BOSS_VISUALS = {
  harborRunner: { asset: ASSETS.bosses.harborRunner, accent: 0x5bb5d8, secondary: 0xffd95a, battle: [236, 144], result: [238, 146] },
  bayHunter: { asset: ASSETS.bosses.bayHunter, accent: 0x8f80e8, secondary: 0x71d6a2, battle: [244, 149], result: [246, 150] },
  kue: { asset: ASSETS.bosses.kue, accent: 0xff765a, secondary: 0xffd95a, battle: [278, 172], result: [270, 167] },
}

export const BOSS_ART = Object.fromEntries(Object.entries(BOSS_VISUALS).map(([id, visual]) => [id, visual.asset]))

export function getBossMetaForScene(scene) {
  return Object.values(BOSS_META).find(meta =>
    meta.pointId === scene.env?.point && meta.fishId === scene.fish?.id
  ) ?? null
}

export function getBossArt(id) {
  return BOSS_ART[id] ?? null
}

export function getBossVisual(id) {
  return BOSS_VISUALS[id] ?? null
}

export function getBossArtForScene(scene) {
  const meta = getBossMetaForScene(scene)
  return meta ? getBossArt(meta.id) : null
}

export function getAllBossAssets() {
  return Object.values(BOSS_VISUALS).map(item => item.asset)
}
