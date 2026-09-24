# Mock alignment task list

Reference: four user-provided 390×844 fishing mock screens.

## P0 — Fishing structure
- [x] Reserve 64px top HUD / central playfield / 176px bottom controls
- [x] Move player into lower-left world space
- [x] Remove persistent player reaction card during Battle
- [x] Compact tackle controls outside primary action row
- [x] Add dark bottom action dock
- [x] Add three circular actions: 待つ / ちょい巻き / ゆっくり巻く
- [x] Wire the three actions to phase-appropriate fishing behavior
- [x] Match top HUD distance/location layout to reference
- [x] Match lure/line focal position and fish-shadow scale to reference
- [ ] Confirm no UI overlaps player/fish/lure

## P0 — Battle / Result
- [x] Keep Battle fish as primary subject
- [x] Remove persistent Battle player inset
- [x] Enlarge caught fish on Result
- [x] Reduce legacy Battle swipe/reel chrome that conflicts with reference
- [x] Result: consolidate fish name / size / points into one information card
- [x] Result: expose two clear CTAs (町へ持ち帰る / もう一度釣る)

## P1 — Core screens
- [x] Reduce Map header
- [x] Reduce Town header
- [ ] Re-check Home / Map / Town against mock-first rule
- [ ] Remove any card that covers primary character/location art

## QA / Done
- [ ] Capture 390×844 Fishing normal / Battle / Boss / Result
- [ ] Show screenshots in chat every iteration
- [ ] Compare against the four reference mock screens
- [ ] Build + smoke + mobile E2E green
- [ ] Merge only after visual review
