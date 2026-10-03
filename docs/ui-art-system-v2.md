# AINAN UI art system v2

This rollout extends the approved Home sample across the AINAN product without changing gameplay rules, prices, rewards, ownership, save data, character motion, rod/line behavior, or fishing journey routing.

## Visual language

- Cream-white enamel surfaces with a deep navy outer contour.
- Ocean-cyan inner rims and restrained lower-edge thickness.
- Sunny yellow for primary actions and selected/equipped state.
- Pale blue-gray for disabled/locked state and pale coral for shortages.
- Upper-left gloss and wave ornaments remain inside a 12% safe inset.
- Dynamic labels, numbers, long copy, icons, keyboard focus, pressed feedback, and hit regions remain code-native.

## Production assets

The v1 kit provides the footer shell, selected tab, five purpose-specific icons, and primary/secondary/pressed/disabled buttons. The v2 kit adds:

| Asset | Role | Slice-safe intent |
| --- | --- | --- |
| `panel-large.png` | headers, equipment preview, inventory panel | 48 px protected corners |
| `card-*.png` | idle, selected, pressed, disabled/locked, shortage | center 72% stretchable |
| `dialog.png` | confirmation and equipment detail | title band and 44 px corners protected |
| `chip.png` | resources and compact status | center stretchable |
| `gauge-track.png` | cast power and battle tension | end caps protected |
| `operation-dock.png` | cast/retrieve control area | perimeter protected |
| `back-shell.png` | shared back action | center reserved for live label |
| `result-card.png` | caught/failed information | center reserved for live values/copy |

Original generated sheets stay beside deterministic PowerShell extraction scripts. No whole-screen raster composition is used.

## Screen coverage

- Home: primary CTA and global footer.
- Map: header, detail dialog, shared back action and footer.
- Equipment: loadout preview, equipped/accessory slots, inventory cards, ownership/lock/shortage states and detail dialog.
- Town: summary header and global footer; existing town/facility art remains authoritative.
- Menu and related scenes: material cards, shared buttons/back action and footer.
- Fishing: cast operation dock, cast power gauge, battle tension track, result information card and live result actions.
- Result: caught, escaped, retry, equipment review and port return keep their existing routing and 78–80 px hit regions.

## Interaction and responsive contract

- Minimum touch target: 44 px; primary and result actions remain 48–80 px.
- Footer hit height: 72 px with a 6 px logical bottom inset.
- Pointer pressed state retains the 180–220 ms transition lock.
- Keyboard footer navigation, Enter/Space activation and Escape behavior remain intact.
- Reduced motion disables decorative pulsing/scaling; sound-off remains silent.
- Browser verified at 390×844, 375×667 and 844×390 with the full portrait canvas reachable in landscape.

## QA boundary

Browser evidence covers Home → Map → Home → Equipment, equipment detail, Town, Menu, cast, battle, caught result and escaped result. Physical iPhone verification remains separate.
