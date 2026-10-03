# AINAN cast layer set v1 — review prototype

Status: prototype only. The approved in-game presentation is not replaced.

## Included

- Seven independent normalized PNG layers on one `390×844` coordinate system:
  - `sky`
  - `clouds`
  - `distantHarbor`
  - `sea`
  - `platform`
  - `character` (rodless)
  - `heldRod` (line excluded)
- One normal composite and three edit comparisons.
- A layer inventory image with transparency checkerboard.
- `asset-manifest.json` containing source pixel bounds, transparency flags and anchors.
- `motion-preview.html` plus a browser smoke test for independent cloud and rod movement.

## Fixed anchors

| Anchor | Coordinate |
|---|---|
| design canvas | `390×844` |
| visual horizon | `y=258` |
| platform upper region | `y=500` |
| character foot/base | `(92, 670)` |
| character hand / rod grip | `(130, 515)` |
| rod tip / code line start | `(169, 379)` |
| cast target | `(310, 235)` |

The line is deliberately drawn in Canvas/SVG from the rod-tip anchor rather than baked into the rod PNG.

## Review variants

1. `normal` — baseline composition.
2. `wide-sea` — moves the sea/horizon emphasis without changing the character assets.
3. `character-moved` — moves character and held rod together by a shared offset.
4. `rod-only` — rotates only the held rod around the hand/grip anchor; the character stays fixed.

## Differences and unfinished points

- The new layers preserve the approved bright harbor palette, rear three-quarter seated fisher identity and major composition.
- The generated character cutout has small reinterpretations in cap contour, hair clumps, waist equipment and glove silhouette. It is suitable for direction review, not final replacement.
- The distant harbor is reconstructed from available clean-water/approved references, so individual boat and pier placement is not pixel-identical.
- The foreground platform was reconstructed behind the removed character. Concrete seams and prop placement need a final paint-over if this direction is approved.
- The held rod is intentionally thin at gameplay scale. A final pass should match shaft bend and accent placement to the approved frame after the character cutout is locked.
- Weather is not implemented as a game rule. Cloud motion is only a layer-independence demonstration.
- The approved default files under `fishing-game/assets/approved-mock/` are unchanged.

## Rebuild and verify

From the repository root:

```text
node prototypes/cast-layer-set-v1/build-previews.mjs
node prototypes/cast-layer-set-v1/motion-smoke.mjs
npm run qa:cast-layering
```

The prototype uses the existing local Playwright installation for preview rendering only. No network or production setting is required.
