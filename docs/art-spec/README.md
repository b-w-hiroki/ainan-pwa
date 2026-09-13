# AINAN fishing-field asset management

The fishing field is managed as small replaceable parts, not as one finished illustration.

## Layers

1. `water_base`
2. `water_pattern`
3. `water_highlight`
4. `underwater_depth`
5. field objects (`rock`, `seaweed`)
6. fish shadows (`small`, `medium`, `large`, turn state)
7. lure + trail
8. line
9. ripple / follow wake / bite / HIT FX
10. fixed mobile UI

## Rules

- 390×844 is the canonical phone frame.
- Fishing readability wins over character visibility.
- Long casts pan the 900×1400 world; never zoom the whole game out.
- Fish behavior is primarily expressed through position, speed, direction, wake and short asset swaps.
- Text stays code-rendered where possible.
- Every production part is registered in `asset-definitions.json` and `assetManifest.js`.
- Every generated source concept is tracked in `GENERATED_ASSET_PROVENANCE.md`.

## Integrated set

- layered animated water
- small / medium / large fish shadows
- medium turning pose
- lure + movement trail
- idle ripple + follow wake + bite ripple + HIT flash
- rock + swaying seaweed field objects
- primary short-reel button skin

The next visual pass should tune density, scale, alpha and timing from actual 390×844 captures rather than adding more decorative asset categories.
