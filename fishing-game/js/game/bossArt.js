import { ASSETS } from '../config/assetManifest.js'
import { BOSS_META } from './midgameProgression.js'

export const BOSS_ART = {
  harborRunner: ASSETS.bosses.harborRunner,
  bayHunter: ASSETS.bosses.bayHunter,
  kue: ASSETS.bosses.kue,
}

export function getBossMetaForScene(scene) {
  return Object.values(BOSS_META).find(meta =>
    meta.pointId === scene.env?.point && meta.fishId === scene.fish?.id
  ) ?? null
}

export function getBossArt(id) {
  return BOSS_ART[id] ?? null
}

export function getBossArtForScene(scene) {
  const meta = getBossMetaForScene(scene)
  return meta ? getBossArt(meta.id) : null
}
