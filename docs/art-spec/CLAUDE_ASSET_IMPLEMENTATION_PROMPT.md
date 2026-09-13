# Claude Code Prompt — AINAN Fishing Asset Integration

## Goal

Rework the AINAN fishing playfield so it uses animation-friendly, modular 2D assets instead of relying on a highly detailed single illustration.

Preserve the existing fishing gameplay logic and progression, but replace the visual presentation with a clean, mobile-first fishing field that is easy to animate, tune, and extend.

The target product surface is a single portrait smartphone frame at **390×844**.

The fishing field must prioritize **playability and readability** over illustration detail.

## Canonical references

Treat these repository files as the design source of truth:

- `docs/concept-art/canonical/README.md`
- `docs/concept-art/canonical/mobile-fishing-ui-blueprint.jpg`
- `docs/VERTICAL_SLICE_1_0_BACKLOG.md`

Core loop:

`CAST → RETRIEVE → BITE → BATTLE → CATCH → RESULT → TOWN`

The main fishing screen is not a character showcase.

During active fishing, visual priority is:

1. lure
2. fish shadows
3. fishing line / ripples / wakes
4. water playfield
5. character

If character visibility conflicts with fishing readability, fishing readability always wins.

## Preserve existing gameplay

Do not redesign the game rules unless a small change is strictly required for visual integration.

Preserve:

- cast distance
- near / mid / far distance bands
- long-cast camera follow
- no global zoom-out
- retrieve inputs: `待つ / ちょい巻き / ゆっくり巻く`
- fish interest states
- species-specific retrieve preferences
- HIT timing
- deterministic HIT input
- battle logic
- catch result routing
- Result → Town
- Town catch-arrival reaction
- town progression / unlock loop

Avoid unrelated refactors.

## Mobile layout contract

Logical frame: **390×844**.

- top 56–64 px: minimal HUD
- center: dominant water / fish / lure playfield
- bottom 160–180 px: contextual controls

The center playfield should occupy roughly **70% of the screen**.

Desktop width is not extra gameplay space. HUD and controls are fixed screen-space UI. The fishing world may be larger than the phone viewport and may pan behind the fixed screen frame.

Long casts must be solved with camera movement, not by zooming the whole game out.

## Asset philosophy

Do not create or depend on one highly detailed fishing illustration.

Build the playfield from modular layers that can be moved, faded, recolored, looped, replaced, and animated independently:

1. water base
2. water pattern
3. moving highlight layer
4. underwater depth layer
5. sparse field objects
6. fish shadows
7. lure
8. fishing line
9. ripple / wake / bite / splash FX
10. fixed HUD / controls

The result should look like a polished game field, not a concept-art image.

## Production asset folder

Put production-ready assets under:

`fishing-game/assets/fishing-field/`

### Water
- `water_base_01.png`
- `water_pattern_01.png`
- `water_highlight_01.png`
- `underwater_depth_01.png`
- `rock_01.png`
- `seaweed_01.png`

### Fish shadows
- `fish_shadow_s_idle_01.png`
- `fish_shadow_m_idle_01.png`
- `fish_shadow_l_idle_01.png`
- `fish_shadow_m_turn_01.png`

### Lure
- `lure_idle_01.png`
- `lure_pull_01.png`
- `lure_splash_01.png`
- `lure_trail_01.png`

### FX
- `fx_ripple_small_01.png`
- `fx_ripple_bite_01.png`
- `fx_follow_wave_01.png`
- `fx_hit_flash_01.png`

### UI
- `top_hud_bar_01.png`
- `distance_badge_01.png`
- `retrieve_button_wait_01.png`
- `retrieve_button_short_reel_01.png`
- `retrieve_button_slow_reel_01.png`

If any asset is missing, keep a code-rendered fallback rather than breaking the game.

## Animation requirements

Prefer Phaser transforms and tweens over large numbers of hand-drawn frames.

### Water
- base: static
- pattern: slow drift
- highlight: independent slow movement at low alpha
- depth: static or subtle parallax
- avoid rapid or distracting movement

### Fish shadows
Use a small number of reusable assets plus position, rotation, flip, scale, speed, wake intensity, alpha, and easing.

- cruise: steady horizontal movement + subtle vertical oscillation
- noticed: slow down + turn toward lure + brief hesitation
- follow: move toward lure + stronger wake
- inspect: orbit / circle / short stop
- biteReady: brief pause + subtle scale / wake emphasis + ripple cue
- flee: fast turn + acceleration away + stronger wake

The player should understand fish interest mainly by motion, not numbers.

### Lure
- idle: subtle bob + small ripple
- twitch: short burst toward player + short trail + small ripple
- slow reel: continuous movement + weak trail / wake
- bite: stronger ripple + small snap movement

### FX
Use short, readable, non-blocking effects. Do not cover the fish / lure relationship with large overlays.

## Character usage

The character is a presentation element.

- CAST: visible enough to sell the throw
- RETRIEVE: tiny peripheral presence or hidden
- BITE / HIT: tiny or hidden
- BATTLE: fish + line + water remain the focus
- CATCH: character may become large for the short success payoff

Do not place the character in the center during ordinary fishing.

## Files to inspect before editing

At minimum inspect:

- `fishing-game/js/scenes/GameScene.js`
- `fishing-game/js/scenes/components/BackgroundManager.js`
- `fishing-game/js/scenes/components/BobberManager.js`
- `fishing-game/js/scenes/components/CastUI.js`
- `fishing-game/js/scenes/components/RetrieveUI.js`
- `fishing-game/js/scenes/components/BattleUI.js`
- `fishing-game/js/scenes/components/FishingCameraController.js`
- `fishing-game/js/game/installRetrieveGameplay.js`
- `fishing-game/js/game/installBlueprintFishingField.js`
- `fishing-game/js/game/installMobileFishingShell.js`
- `fishing-game/js/config/assetManifest.js`
- `fishing-game/js/config/mobileFrame.js`

## Implementation order

1. Add / normalize asset-manifest entries and graceful fallbacks.
2. Replace the water presentation with layered modular assets.
3. Replace code-only fish silhouettes with reusable fish-shadow assets while preserving fish AI and hit detection.
4. Replace lure rendering with modular lure assets while preserving world position and mechanics.
5. Connect ripple / wake / notice / bite FX to existing fish-interest states.
6. Keep Retrieve controls fixed in the lower mobile control band.
7. Verify long casts pan the camera and never zoom the whole game out.
8. Verify Retrieve and Battle never reintroduce a dominant character.
9. Keep Result → Town routing intact.
10. Run build and Vertical Slice smoke QA.

## Acceptance criteria

The task is complete when:

- the 390×844 screen is visually dominated by the fishing field
- water reads as a designed game surface rather than a flat blue fill
- water art remains visually quiet enough for gameplay
- lure can be found immediately
- small / medium / large fish shadows are easy to distinguish
- fish reactions are readable through motion, direction, wake, and proximity
- Retrieve controls are reachable without covering the main playfield
- Battle continues visually in the same water field
- long casts use camera movement, never global zoom-out
- character does not dominate active fishing
- art assets are modular and animation-friendly
- optional missing assets fall back gracefully
- build remains green
- existing smoke QA remains green

## Output expected from Claude Code

Do the work directly in the repository. At completion report:

1. files changed
2. assets added
3. assets still missing
4. gameplay behavior intentionally preserved
5. fallback rendering still in use
6. build result
7. smoke QA result
8. remaining visual-tuning issues

Do not stop at a proposal. Implement the changes.
