# AI Production Workflow

## Roles

## Codex

- Game implementation review
- Phaser integration
- Asset manifest and file placement
- Visual QA in local browser
- Build verification
- Commit preparation

## Claude Code

- Larger refactors
- Implementation handoff tasks
- Scene-by-scene code changes
- Existing codebase cleanup

## GPT Image

- Background illustrations
- Character cutouts
- Fish icons
- UI decorative materials
- Mood and style exploration

## Suno

- BGM draft generation
- Jingle ideas
- Short ambience loops

For final game implementation, generated audio should be exported and normalized outside the game, then added as local assets.

## Asset Pipeline

1. Define asset intent in `docs/VISUAL_DIRECTION.md`.
2. Generate image with no baked-in UI text.
3. Save original generated file outside the repo.
4. Copy selected output into `fishing-game/assets/`.
5. Register the file in `fishing-game/js/config/assetManifest.js`.
6. Preload it in the Phaser scene.
7. Render Phaser text/UI above the image.
8. Verify at 390 x 844 logical canvas and desktop browser preview.

## Current Progress

- [x] Visual direction document
- [x] Asset folder structure
- [x] Asset manifest
- [x] Title/Home harbor background generated
- [x] TitleScene image-backed background
- [x] HomeScene image-backed background
- [x] GameScene point A image-backed background
- [x] MapScene warmer illustrated-map style background
- [ ] Dedicated map background image
- [ ] Dedicated bay/cape fishing backgrounds
- [ ] Guide character cutout
- [ ] Player character cutout
- [ ] Fish icon set
- [ ] Result card decorative frame
- [ ] Sound asset plan

## Next Generation Order

1. `bg_map_town`
2. `bg_fishing_bay`
3. `bg_fishing_cape`
4. `ch_guide_default`
5. `ch_player_default`
6. `fish_aji_icon`
7. `fish_madai_icon`
8. `fish_black_bass_icon`
9. `fish_buri_icon`
10. `fish_kue_icon`
11. `ui_result_frame`
12. `ui_spot_pin_*`

## Acceptance Criteria

- The game still starts from `fishing-game/index.html`.
- `npm.cmd run build` passes.
- No browser console errors in Title, Home, Map, or Game scenes.
- Text remains Phaser-rendered and crisp.
- Generated images contain no text, logos, real place names, or municipality references.
- UI overlays keep enough contrast on top of artwork.
