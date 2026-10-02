# AINAN UI component system v1

The visual baseline is the approved bright harbor/fishing mock: rounded foam-white
surfaces, ocean-blue outlines, sun-yellow primary accents, and restrained navy
shadows. Text and changing values remain live Phaser text.

## Interaction and spacing

| Token | Value | Use |
| --- | ---: | --- |
| Minimum touch target | 44 px | Back and compact controls |
| Comfortable touch target | 48 px | Buttons and cards |
| Footer tab hit area | 68 × 72 px | Five persistent destinations |
| Footer frame | 374 × 80 px at 390-wide | 8 px side inset, 6 px bottom inset |
| Primary button | 300 × 68 px | One main action per view |
| Card radius | 17 px | Equipment and inventory |
| Button radius | 20 px | Primary, secondary, ghost |
| Panel radius | 24 px | Large grouped content |
| Spacing scale | 4 / 8 / 12 / 16 / 24 px | Internal gaps and margins |

Safe-area insets are applied by the document around the full 390 × 844 logical
canvas. UI components retain the internal 6–8 px breathing room after that inset.

## Type hierarchy

| Role | Size | Weight |
| --- | ---: | ---: |
| Action | 20–21 px | 900 |
| Component title | 18 px | 900 |
| Label | 14 px | 900 |
| Metadata | 12 px | 900 |
| Micro status | 10 px | 900 |

Labels, prices, counts, status, rewards, and next actions are never part of raster
assets.

## Component states

| Component | States |
| --- | --- |
| Footer tab | idle, keyboard focus, pressed, selected, disabled |
| Action button | idle, hover/focus, pressed, disabled |
| Equipment card | idle/owned, selected/equipped, locked, insufficient, disabled/unowned |
| Meter | track, current fill, highlight; mint/ocean/sun/coral tones |
| Result action | secondary town action, primary retry action, pressed, input-locked |

Selected state uses an ocean-blue surface plus a sun-yellow indicator. Locked and
disabled are neutral grey; insufficient uses coral without altering prices or
ownership logic.

## Hierarchy and behavior

1. One prominent primary action occupies the lower action zone.
2. Secondary actions retain full-size targets with lower-contrast surfaces.
3. Back is a 76 × 44 ghost button with an 84 × 52 hit area.
4. Footer arrow keys move focus; Enter/Space activates the focused destination;
   Escape returns keyboard focus to the page action.
5. Primary actions ignore duplicate activation for 220 ms.
6. Reduced-motion disables button pulse and press scaling. Sound-off changes no
   control state.

## Responsive contract

The game remains a 390 × 844 logical portrait canvas. At 375 × 667 and 844 × 390,
the browser fits the entire canvas without cropping. Primary actions, footer tabs,
back, status, and result actions remain present; surrounding letterbox space is
intentional in landscape.
