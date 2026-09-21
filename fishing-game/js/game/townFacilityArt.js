import { ASSETS } from '../config/assetManifest.js'

const LEVEL_ART = {
  market: { 1: ASSETS.facilityLevels.marketLv1, 3: ASSETS.facilityLevels.marketLv3, 5: ASSETS.facilityLevels.marketLv5 },
  pier: { 1: ASSETS.facilityLevels.pierLv1, 3: ASSETS.facilityLevels.pierLv3, 5: ASSETS.facilityLevels.pierLv5 },
  guide: { 1: ASSETS.facilityLevels.guideLv1, 3: ASSETS.facilityLevels.guideLv3, 5: ASSETS.facilityLevels.guideLv5 },
  festival: { 1: ASSETS.facilityLevels.festivalLv1, 3: ASSETS.facilityLevels.festivalLv3, 5: ASSETS.facilityLevels.festivalLv5 },
}

const LEGACY = {
  market: ASSETS.facilities.market,
  pier: ASSETS.facilities.pier,
  guide: ASSETS.facilities.guide,
  festival: ASSETS.facilities.festival,
}

export function facilityArtTier(level = 0) {
  if (level >= 5) return 5
  if (level >= 3) return 3
  return 1
}

export function getTownFacilityArt(id, level = 0) {
  return LEVEL_ART[id]?.[facilityArtTier(level)] ?? LEGACY[id]
}

export function getTownFacilityArtSet() {
  return Object.values(ASSETS.facilityLevels)
}
