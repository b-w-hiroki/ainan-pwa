# AINAN Cast/Retrieve fishing-field distinction — controlled preview

## Reason

The production `CastPresentationHost` already renders approved high-quality Harbor and Retrieve master images for all three fishing grounds. Battle renders independent, species-specific hero art plus the area overlay; this makes Harbor/Bay/Cape appear comparatively similar in Cast and Retrieve.

The canonical Harbor world and player should **not** be replaced by procedural blue gradients, flat rocks or lower-quality AI art. Until a clean world-only source is accepted in #140, area differentiation must stay secondary to fishing gameplay and the approved composition.

## Implementation: preview only

- `?qa=1&scene=GameScene&qaLocation=pointB&qaMockPhase=cast&castLocationPreview=1`
- `?qa=1&scene=GameScene&qaLocation=pointC&qaMockPhase=retrieve&castLocationPreview=1`
- Reuse existing `ASSETS.fishingField.locationBay` / `locationCape` overlays **within** the sole `CastPresentationHost`, beneath fish shadows/aim and character where applicable. Normal game sessions do not add them.
- Bay alpha .22, Cape alpha .19; the approved full-frame Cast/Retrieve master remains intact. No change to cast angle, water physics, fish odds, economy, save state or RC3.

## QA evidence / acceptance gates

`scripts/capture-cast-retrieve-location-preview.mjs` records six 390×844 captures `90`–`95` in `artifacts/location-preview/`. It verifies actual GameScene location, phase, owner, art texture, layer order, input visibility and screenshot capture.

**Human image inspection still required.** Reject overlays that cover the player/rod, paste rocks onto existing buildings, destroy readable shadows/lure, or create a generic vector collage over approved water. Compare Harbor, Bay, Cape in each phase against production screenshots `46-mock-cast.png` and `47-mock-retrieve.png`. Only promote to default after both phases pass that visual gate and automated QA; then measure screenshots for all three grounds as actual production output.

#140 (coherent world-only pier+water restoration) and #118 (true wide reflow) are independent blockers for moving the character or enabling landscape production. A visually rejected location pilot should be closed, not merged into live art.
