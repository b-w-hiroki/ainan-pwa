# AINAN fishing-field asset management

The fishing field is managed as small replaceable parts, not as one finished illustration.

## Layers

1. `water_base`
2. `water_pattern`
3. `water_highlight`
4. `underwater_depth`
5. field objects
6. fish shadows
7. lure
8. line
9. ripple / wake / bite FX
10. fixed mobile UI

## Rules

- 390×844 is the canonical phone frame.
- Fishing readability wins over character visibility.
- Long casts pan the 900×1400 world; never zoom the whole game out.
- Fish behavior is primarily expressed through position, speed, direction, wake and short asset swaps.
- Text stays code-rendered where possible.
- Every production part is registered in `asset-definitions.json` and `assetManifest.js`.

## Status

The initial integrated set contains layered water, medium fish idle/turn, lure and small ripple. Small/large fish, rocks, seaweed, follow wake, bite ripple and HIT flash remain the next asset batch.
