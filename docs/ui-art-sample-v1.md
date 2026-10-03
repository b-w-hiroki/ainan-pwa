# AINAN UI art sample v1

This checkpoint applies the new material direction only to the Home primary CTA and Home footer. Cards, equipment frames, gauges, and result panels remain deliberately unchanged until the art direction is approved.

## Material direction

- Cream-white enamel faces echo the approved fishing HUD and result controls.
- Deep navy outer contours keep controls readable over bright sea and character art.
- Ocean-cyan rims and restrained lower-edge depth provide separation without a heavy drop shadow.
- Sunny yellow identifies the primary action and selected navigation state.
- Upper-left gloss is kept inside the crop and safe inset; no highlight or ornament is allowed to cross a slice edge.
- All labels, values, hit regions, focus behavior, and accessibility states remain code-native.

## Export inventory

| Asset | Export size | Intended display | Safe region |
| --- | ---: | ---: | ---: |
| `footer-shell.png` | 768×117 | width − 8 × 93 | 32 px corners; center may stretch |
| `tab-selected.png` | 96×200 | 64×72 | center stays empty for icon/label |
| `icon-home.png` | 94×120 | 35×35 | 4 px transparent edge |
| `icon-equip.png` | 80×134 | 35×42 | 4 px transparent edge |
| `icon-town.png` | 104×129 | 39×35 | 4 px transparent edge |
| `icon-exchange.png` | 82×138 | 35×35 | 4 px transparent edge |
| `icon-menu.png` | 80×103 | 35×35 | 4 px transparent edge |
| `button-primary.png` | 688×240 | 318×84 incl. trim | center 76% reserved for live text |
| `button-secondary.png` | 688×240 | 318×84 incl. trim | center 76% reserved for live text |
| `button-primary-pressed.png` | 688×228 | pressed primary | separate visual state |
| `button-disabled.png` | 688×228 | disabled state | reduced saturation and contrast |

The original generated sheets are retained beside the production crops for provenance and future recropping. `scripts/extract-ui-art-v1.ps1` reproduces every crop without destructive source edits.

## Interaction contract retained

- Footer hit height: 72 px; button hit height: at least 48 px.
- Bottom safe inset: 6 px.
- Pointer pressed state and 220 ms activation lock remain unchanged.
- Keyboard focus and activation remain unchanged.
- Reduced-motion and sound-off behavior remain unchanged.
- Portrait 390×844, small portrait 375×667, and landscape 844×390 are browser-checked.

## Approval boundary

Approve or redirect the material language using the asset board and Home comparison before applying it to cards, equipment preview frames, meters, and result panels.
