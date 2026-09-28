# Fishing cleanup audit

Post-1.0 cleanup pass.

## Removed

### Follow-up audit
- 12 legacy town facility-level SVGs (`market/pier/guide/festival × lv1/lv3/lv5`)
  - manifest-only entries; current Town/Upgrade/Services presentation does not load or render `ASSETS.facilityLevels`
  - current town progression uses native composition plus `ASSETS.facilities` and NPC art
- `installResultPayoffVisuals.js`
  - folded into canonical `installFishingResultPresentation.js` by PR #62, removing a duplicate Result wrapper layer


- `assets/characters/fishing_player_hero.webp`
  - duplicate of the production `generated/fishing_player_hero.webp`
- `assets/generated/fishing_left_pier_decor.webp`
  - superseded by stable native Phaser pier decoration
  - removed from manifest and preload path
- `assets/ui/result_new_record.webp`
  - superseded by native NEW RECORD badge
  - removed from manifest

## Kept intentionally

- canonical mock/reference documents
- production fish icons and fishing-field SVG assets
- legacy presentation modules still installed by `main.js`
- old NPC source assets until a separate full-reference audit proves they are unused

## Validation

- production build
- 50-screen visual guard
- no missing asset requests
