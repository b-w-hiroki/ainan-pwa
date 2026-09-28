# Fishing installer ownership

This document defines the post-1.0 ownership boundary for GameScene installers.

## Gameplay

Owns rules/state/input/economy. Presentation modules must not change catch balance.

Examples:
- Retrieve gameplay / completion
- tackle sync
- cast-zone fish selection
- midgame progression
- boss phases
- retention

## Presentation

Owns screen composition and visual feedback only.

The canonical order is centralized in `installFishingRuntime.js`.
The final presentation owner remains `installFishingPresentationGuard`.

## QA

QA-only routing/fixtures live behind `?qa=1` and must not influence normal play.

## Final guards

1. stamina session gate
2. fishing feel pass
3. fishing presentation guard

## Next consolidation step

After 1.0 release, merge wrappers that independently patch the same GameScene method:
- `create`
- `update`
- `_enterCast`
- `_enterRetrieve`
- `_enterBattle`
- `_finishBattle`

Do this method-by-method with the 50-screen guard before/after. Do not combine balance changes with wrapper consolidation.
