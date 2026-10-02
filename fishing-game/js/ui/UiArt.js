import { ASSETS } from '../config/assetManifest.js'

export const UI_ART_ASSETS = Object.freeze([
  ASSETS.ui.artFooterShell, ASSETS.ui.artTabSelected,
  ASSETS.ui.artIconHome, ASSETS.ui.artIconEquip, ASSETS.ui.artIconTown, ASSETS.ui.artIconExchange, ASSETS.ui.artIconMenu,
  ASSETS.ui.artButtonPrimary, ASSETS.ui.artButtonSecondary, ASSETS.ui.artButtonPressed, ASSETS.ui.artButtonDisabled,
  ASSETS.ui.artPanelLargeV2, ASSETS.ui.artCardIdleV2, ASSETS.ui.artCardSelectedV2, ASSETS.ui.artCardPressedV2,
  ASSETS.ui.artCardDisabledV2, ASSETS.ui.artCardShortageV2, ASSETS.ui.artDialogV2, ASSETS.ui.artChipV2,
  ASSETS.ui.artGaugeTrackV2, ASSETS.ui.artBackShellV2, ASSETS.ui.artOperationDockV2, ASSETS.ui.artResultCardV2,
])

export function loadUiArt(scene) {
  UI_ART_ASSETS.forEach(asset => {
    if (asset?.status === 'ready' && !scene.textures.exists(asset.key)) scene.load.image(asset.key, asset.path)
  })
}

const CARD_KEYS = Object.freeze({
  idle: ASSETS.ui.artCardIdleV2.key,
  selected: ASSETS.ui.artCardSelectedV2.key,
  pressed: ASSETS.ui.artCardPressedV2.key,
  disabled: ASSETS.ui.artCardDisabledV2.key,
  locked: ASSETS.ui.artCardDisabledV2.key,
  shortage: ASSETS.ui.artCardShortageV2.key,
})

export function addArtSurface(scene, key, { x, y, w, h, depth = 0, origin = 0.5, alpha = 1 } = {}) {
  if (!key || !scene.textures.exists(key)) return null
  return scene.add.image(x, y, key).setOrigin(origin).setDisplaySize(w, h).setAlpha(alpha).setDepth(depth)
}

export function addArtPanel(scene, { x, y, w, h, depth = 0, alpha = 1 } = {}) {
  return addArtSurface(scene, ASSETS.ui.artPanelLargeV2.key, { x: x + w / 2, y: y + h / 2, w, h, depth, alpha })
}

export function addArtCard(scene, { x, y, w, h, state = 'idle', depth = 0, parent = null } = {}) {
  const key = CARD_KEYS[state] ?? CARD_KEYS.idle
  if (!scene.textures.exists(key)) return null
  const image = scene.add.image(x + w / 2, y + h / 2, key).setDisplaySize(w + 6, h + 6).setDepth(depth)
  parent?.add(image)
  return image
}

export function addArtDialog(scene, { x, y, w, h, depth = 0 } = {}) {
  return addArtSurface(scene, ASSETS.ui.artDialogV2.key, { x: x + w / 2, y: y + h / 2, w, h, depth })
}

export function addArtChip(scene, { x, y, w, h, depth = 0 } = {}) {
  return addArtSurface(scene, ASSETS.ui.artChipV2.key, { x: x + w / 2, y: y + h / 2, w, h, depth })
}

export function addArtGauge(scene, { x, y, w, h, depth = 0 } = {}) {
  return addArtSurface(scene, ASSETS.ui.artGaugeTrackV2.key, { x: x + w / 2, y: y + h / 2, w, h, depth })
}
