# AINAN portrait + landscape & foreground extraction plan

## Current state (2026-10-12)

- **Portrait 390×844 is production-approved.** The fixed Phaser canvas uses `Phaser.Scale.FIT`; CSS sizes it to preserve the 390×844 portrait logical coordinate system. The final fishing owner is `CastPresentationHost`.
- **Landscape 844×390 is currently a centered, scaled portrait game, not a separate landscape composition.** Touch targets remain logical portrait rectangles and may become too small physically. The design and QA must not claim true dual-orientation completion from a non-clipped screenshot.
- **Harbor master:** approved `cast-harbor-composite-base.png` (391×783). The `extract-harbor-approved-master.mjs` generator now exports the original approved sea / nonsea and three extra static derived regions (background, player, pier). Pixels recomposite **exactly**; under-occlusion pixels are NOT reconstructed and the masks are not yet motion-ready.
- Approved player already has a separate `ui.fishingApprovedCastPlayerVisible` cutout. The rod and line also have Phaser-native drawing components, with separate pose coordinates. **Do not duplicate** a baked player or rod when promoting the new layers.

## Foreground master protocol

1. Keep the approved full-screen composite active in regular gameplay; the test variants are `?qa=1&castApprovedSplit=1` (two static layers) and `?qa=1&castApprovedForeground=1` (four derived layers).
2. Current four parts: `background → water → pier region → player region`. The new layers are in the SAME `CastPresentationHost` owner, without extra input hit areas or wrappers. No movement is allowed yet; the visible source contains occluded water/pier areas with **no information** to restore.
3. Before animate or reposition: refine the subject mask around player hair/rod hands, extract high-quality silhouette anchored to `fishingApprovedCastPlayerVisible`, reconstruct the pier/sea *behind* the original subject with art-direction-matched inpainting, and independently identify rod/line (existing Phaser drawing may remain procedural). Only then allow world camera parallax, swaying and pose animation.
4. Compare default versus split at 390×844. Reject white seams, black alpha artifacts, duplicated character, rod/line mismatch, water flicker and differences from the current art style.
5. Preserve asset provenance, use the migration inventory's `manifested` state rather than claiming a production replacement; record `reviewEvidence` only after screenshots and actual gameplay.

## Device orientation acceptance path

| Stage | Portrait | Landscape |
| --- | --- | --- |
| Baseline recording (this PR) | Capture existing 390×844 approved field, check input/owner | Capture 844×390 current layout, check canvas clipping/scroll and measure physical size of a 44px logical tap target |
| Responsive design prototype (next PR) | Keep current subject/CTA proportions | Recompose world into 844×390, place compact HUD at edge, move bottom Cast/3 Retrieve controls to a side dock; preserve large visible fish/lure/water area |
| Input and camera (future PR) | Existing slingshot unchanged | Transform viewport pointer coordinates to world and UI hit areas independently; never rotate the entire UI or blindly scale portrait HUD to ~46% |
| Complete QA gate (future) | 320/390/430 portrait + physical iPhone | 844×390 (and smaller landscape safe-area) **real swipe/reel/Battle/Result→Town**, no clipping, touch targets at least 44 CSS px, reload and background-resume safety |

The real Playwright capture `scripts/capture-foreground-orientation.mjs` deliberately logs `adaptiveLandscapeReady=false` when portrait letterboxing yields too-small physical controls. This is a *failure signal / task definition*, **not** a bug hidden by relaxing the release tests.

Do not switch to `Phaser.Scale.RESIZE` for the entire application without first addressing all scenes (Home, Map, Town, Collections, Menus, PWA), the world camera, and saved/QA screen dimensions. Keep RC `1.0.0-rc.3` until physical iPhone release gate #27 is complete.
