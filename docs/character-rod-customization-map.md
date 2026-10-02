# Character and rod customization map

This describes what the local integration actually supports. It does not claim a player-facing customization screen exists.

## Rendering and overlap

The 390 × 844 presentation root now uses four visual bands:

1. phase background / water / fish,
2. animated character + separated rod + line + held fish,
3. phase foreground UI (`battleForeground` / `resultForeground`),
4. shared HUD, controls, and hit targets.

Cast controls were already in front of the character. Battle footer/header and Result card/actions previously lived behind the character because the motion root was appended last. They now render in dedicated foreground containers. Retrieve returns to its approved baked character after the Cast release completes. Per-phase layouts keep the animated feet above the UI boundary rather than clipping one universal large frame.

## What can be changed now

| Area | Current change cost | Entry point | Limits |
|---|---|---|---|
| Character position, scale, foot baseline | Config-only | `CHARACTER_MOTION_LAYOUTS` in `CharacterMotionController.js` | Four phase layouts only; no user setting UI. |
| Pose speed / loop / follow-through | Config-only | `CHARACTER_MOTION_TIMING` | Input, collision, reward, and save timing remain independent. |
| Hand, grip, rod-tip, held-fish anchors | Config-only | `CHARACTER_MOTION_POSES` | Anchors must be re-QA'd in all 13 frames after a body/pose change. |
| Rod visibility, line endpoint/color/width | Small code/config edit | `_applyRod()` | Not exposed to players. |
| Sea/harbor composite | Asset swap | approved Cast/Retrieve/Battle/Result background assets | Composite mock may contain baked details; swapping only one visual band may break style continuity. |
| Separated sky/cloud/sea/platform | Config/asset edit | `CAST_LAYER_CONFIG`, `CastLayeredScene` and `?castLayers=1` | Layered mode is a development path; the approved composite remains the default. |
| Weather tint/cloud strength | Config-only in layered mode | `CAST_LAYER_CONFIG.weather.presets` | Existing `env.weather` gameplay conditions are not yet mapped automatically to these presets. |
| Caught fish visual | Existing species asset mapping | `FISH_ART` and `setFishTexture()` | Species mapping exists; held-fish scale may need species-specific bounds. |

## What requires asset work

### Character appearance

Hair, face, skin tone, cap, clothes, body proportions, and waist gear are baked into 13 transparent pose PNGs. A color or outfit change currently requires either:

- replacing all 13 frames and rechecking anchors, or
- first separating the character into reusable body/hair/cap/top/bottom/gear layers and defining how each part deforms across poses.

A global Phaser tint can recolor the whole frame, but cannot safely recolor only the shirt or hair and is not suitable as an outfit system.

### Rod appearance

The motion controller currently uses one approved `held-rod.png`. Replacing that PNG changes material, color, handle, and guide appearance while keeping pose anchors. Large changes to length or bend require new source grip/tip metadata or a segmented rod renderer.

The inventory already contains Basic/Carbon/Premium icons and gameplay stats. Those equipment choices affect cast range, pull power, attraction radius, and progression, but the animated held rod is not yet selected from `scene.rod.id` / `env.player.rodType`. Therefore rod visual customization is not yet connected even though rod selection and performance exist.

## Recommended next structure

1. Add a `ROD_VISUALS` manifest keyed by `basic`, `carbon`, and `premium`, each with texture, source grip/tip, bend presets, and line style.
2. Resolve the visual from `scene.rod.id` inside the motion controller without changing the existing gameplay stats.
3. Separate character identity layers only after the first real customization set is approved. Use shared pose skeleton/anchors so outfits do not multiply animation code.
4. Map `env.timeOfDay` and `env.weather` to approved sky/cloud/sea presets after composite and layered backgrounds reach visual parity.
5. Add a customization UI only after those manifests exist; today there is no usable character appearance selector.
