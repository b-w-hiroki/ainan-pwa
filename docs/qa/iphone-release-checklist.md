# AINAN iPhone Release QA

## Automated before device QA

The release candidate must be green for all of the following:

- RC version: 1.0.0-rc.2
- RC baseline main: 063cc917570a0e8c3dd2f79323b0dc56e2a106f8

- Production build
- Production dependency audit (high+)
- All game smoke QA suites
- 50 mobile screenshots at 390x844
- Visual screenshot guard
- PWA manifest is served
- App icon is served
- Service worker is served
- viewport-fit=cover
- safe-area CSS
- Save v3 / checksum / three rolling backups / import-export

## Physical iPhone Safari

Use a current iPhone and Safari.

### Layout
- No content under the Dynamic Island / status area.
- Bottom navigation stays above the home indicator.
- Home, Map, Fishing, Result, Town, Menu and Settings have no clipped text.
- Tap targets remain usable in portrait orientation.
- Rotation does not leave the game in a broken scale state after returning to portrait.

### Fishing
- Cast press/release responds on first touch.
- Retrieve gestures do not scroll the page.
- HIT input does not double-trigger.
- Boss battle remains responsive during Phase 2 / Phase 3.
- Result buttons do not trigger the background tap handler.

### Audio and haptics
- First user interaction unlocks game audio.
- Sea/harbor ambience starts only after user interaction.
- Sound setting survives reload.
- Haptics occur for HIT / catch / boss / growth when enabled.
- Reduced Motion removes decorative loops without hiding required feedback.

### PWA install
- Add to Home Screen succeeds.
- Icon is present and visually centered.
- App opens without Safari chrome.
- Safe-area remains correct when launched from Home Screen.
- Relaunch after force-close opens successfully.

### Save persistence
- Catch at least one fish.
- Change equipment.
- Upgrade one town facility.
- Close the installed PWA completely.
- Relaunch and verify all three changes remain.
- Export save data from Settings.
- Create another backup-generating change.
- Restore backup slot 1 and verify state rollback.
- Re-import exported data and verify state restoration.

### Lifecycle
- Put app in background during Home.
- Resume after 30 seconds.
- Repeat during Fishing.
- Repeat during Result.
- No duplicated audio, timers, overlays or input listeners after resume.

### Performance
- Play for at least 10 minutes.
- Test one normal battle and each of the three boss battles.
- No sustained visual hitching during fish movement or result effects.
- Device does not become unusually hot for the session length.
- No obvious memory-related degradation after repeated scene transitions.

## Release decision

Release candidate is ready when:

- CI is green.
- No blank or duplicate key screenshot is present.
- All physical-iPhone checks above pass.
- Save export/import and one backup restore are verified on device.
