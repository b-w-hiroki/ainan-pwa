# AINAN Cast/Retrieve fishing-field distinction — controlled preview

## Reason

The production `CastPresentationHost` already renders approved high-quality Harbor and Retrieve master images for all three fishing grounds. Battle renders independent, species-specific hero art plus the area overlay; this makes Harbor/Bay/Cape appear comparatively similar in Cast and Retrieve.

The canonical Harbor world and player should **not** be replaced by procedural blue gradients, flat rocks or lower-quality AI art. Until a clean world-only source is accepted in #140, area differentiation must stay secondary to fishing gameplay and the approved composition.

## Implementation: preview only

- `?qa=1&scene=GameScene&qaLocation=pointB&qaMockPhase=cast&castLocationPreview=1`
- `?qa=1&scene=GameScene&qaLocation=pointC&qaMockPhase=retrieve&castLocationPreview=1`
- Reuse existing `ASSETS.fishingField.locationBay` / `locationCape` overlays **within** the sole `CastPresentationHost`, beneath fish shadows/aim and character where applicable. Normal game sessions do not add them.
- Bay alpha .22, Cape alpha .19; the approved full-frame Cast/Retrieve master remains intact. No change to cast angle, water physics, fish odds, economy, save state or RC3.

## QA evidence / acceptance gates

`scripts/capture-cast-retrieve-location-preview.mjs` records six 390×844 captures `90`–`95` in `artifacts/location-preview/`. It verifies actual GameScene location, phase, owner, art texture, layer order, input visibility and screenshot capture.

**Human image inspection still required.** Reject overlays that cover the player/rod, paste rocks onto existing buildings, destroy readable shadows/lure, or create a generic vector collage over approved water. Compare Harbor, Bay, Cape in each phase against production screenshots `46-mock-cast.png` and `47-mock-retrieve.png`. Only promote to default after both phases pass that visual gate and automated QA; then measure screenshots for all three grounds as actual production output.

#140 (coherent world-only pier+water restoration) and #118 (true wide reflow) are independent blockers for moving the character or enabling landscape production. A visually rejected location pilot should be closed, not merged into live art.

## Cast/Retrieve 実画素コントラスト検証（2026-10-15）

`scripts/capture-cast-retrieve-location-preview.mjs` は6画面を単に保存するだけでなく、390×844 WebGLのPNGをデコードし、HUD文字とボタンを除外した水域 **x=60..349 / y=140..549** のRGB差分を比較する。3地点の各組合せ×Cast/Retrieve計6比較で、実際の水面部分が変化していなければCIを失敗させる。出力は `location-phase-pixel-contrast.json` に保存する。

旧preview証跡（PR #191時点）の水域で24以上のRGB変化があった実画素は、およそCast: 港vs湾 6,480・港vs岬 17,700、Retrieve: 港vs湾 1,770・港vs岬 14,300。文字だけが変化した画面や完全に同じPNGは受け入れない。水域差分が少ない湾Retrieveは今後の美術改善対象として残す。

**この数値QAは本番採用の承認ではない。** 現状の水/岩/建築との遠近や材質の一貫性、主役の見え方、#140の背景再構築は依然として視覚レビューが必要。QA用の場所別overlayを無条件に通常ゲームへ反映しない。
