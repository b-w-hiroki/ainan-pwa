# Landscape Harbor water material — source-faithful prototype

**Status: review-only. Not registered as a production asset and not shown in ordinary gameplay.**

## Source and reproduction

- Reference: `fishing-game/assets/approved-mock/harbor-clean-water-390x844.png`.
- Authoring: `scripts/art/build-landscape-water-panorama.mjs`, deterministic source-preserving SVG with three horizontal placements of the same approved high-resolution image. The source SHA-256 is recorded in the generated SVG.
- Viewport: 844×390, crop original source water rows 220–610. Horizontal edge joins at x390 and x780 use mirrored orientation so the source pixels match exactly at the seams. No flat cyan fills, blur interpolation, geometric grid, or unrelated generative art.
- Rendered screenshot: `artifacts/orientation/79-landscape-water-material-review.png` from CI, alongside `landscape-approved-water-candidate.svg`.

## Explicit limitations

1. Horizontal mirror symmetry may still be visible. Artwork consistency and perceived depth must be checked by a human before any source is promoted; a mathematically seamless edge is not proof of a convincing sea.
2. The material contains **water only**; no independently authored wide harbor/shoreline, pier, boats, clouds, foreground, player, fishing rod, fish shadows or UI.
3. It is not plugged into `CastPresentationHost` or `GameScene`, and is not preloaded by the production game. The current landscape interface is still a portrait layout shrunk to a narrow column.
4. A production landscape build must integrate a matching world master with the geometry contract in `landscapeFishingGeometry.js`, maintain safe areas, input/camera coordinates and 44 CSS px controls, plus true Cast→Retrieve→Battle→Result→Town navigation.
5. Reject this prototype if its repeated light caustics look artificial, or if its Harbor style diverges from the approved portrait game.

## QA and decision

Run `node scripts/art/build-landscape-water-panorama.mjs` then `npm exec --yes --package=playwright@1.55.0 -- node scripts/capture-landscape-water-panorama.mjs`. CI uploads both source-derived SVG and a real 844×390 PNG. Review beside current 390×844 Harbor screenshots and the landscape capture in `artifacts/orientation/67-landscape-current.png`.

Do not mark Issue #118 done from this proof of material reuse. Do not advance 1.0.0 without physical iPhone #27.
