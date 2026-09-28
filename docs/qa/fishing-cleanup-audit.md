# Fishing cleanup audit

Post-1.0 cleanup pass.

## Removed

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
