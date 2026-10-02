# AINAN gameplay parts v1

## Scope

This batch fills visible quality gaps in the existing game schema without adding fish, equipment, economy rules, or interactions.

- Fish: `bass`, `saba`, `isaki`, `hirame`, `kanpachi`. The existing dedicated hero art remains authoritative for `aji`, `tai`, `buri`, and `kue`.
- Rods: `basic`, `carbon`, `premium`.
- Baits: `worm`, `shrimp`, `special`.
- Battle states: safe, warning, and danger, derived from the existing escape/tension value.
- Result effects: caught and escaped. Result copy, numbers, buttons, and hit regions remain live Phaser objects.

## File contract

Production files live under `fishing-game/assets/gameplay-parts-v1/`.

- Fish use `fish-<id>.png`, a 384 x 256 transparent canvas with a centered visual anchor.
- Equipment uses `rod-<id>.png` or `bait-<id>.png`, a 256 x 256 transparent canvas with 15–18 px minimum safe padding.
- State icons use `status-tension-<state>.png`, a 192 x 192 transparent canvas and centered anchor.
- Result effects use `result-<outcome>-<effect>.png`, a 512 x 512 transparent canvas and hollow center for layered fish/character art.

Generated source sheets are retained under `qa-artifacts/gameplay-parts-v1/source/` for future non-destructive recrops, outside the shipped asset tree. Runtime references are declared in `assetManifest.js`; source sheets are never loaded by the game.

## Runtime placement

- Inventory equipment art is fitted inside the existing card image bounds. Selection, lock, shortage, quantity, price, and ownership remain code-driven.
- Battle state icon anchor: `(373, 39)` in the 390 x 844 design space, displayed at 31 x 31.
- Result effect anchor: `(195, 304)`, displayed at 360 x 360 behind the fish and live result UI.
- Fish result art uses the existing result anchors and sizing logic; only its texture changes.

## Responsive and replacement rules

All anchors live in the existing 390 x 844 design coordinate system and inherit the current scene scale/letterbox behavior. Files can be replaced independently without editing copy, values, save data, hit regions, character motion, equipment appearance on the character, or Journey logic.
